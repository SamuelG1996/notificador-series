
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

// 🔐 Conexión a Supabase
const supabase = createClient(
  "https://bsrtuievwjtzwejuxqee.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcnR1aWV2d2p0endlanV4cWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NTEyNjYsImV4cCI6MjA2NDEyNzI2Nn0.A9tCs-Zi-7jw5LUFs7ViIR2vHb9tNMj6c7YeeNOdmWI"
);

// 💌 Cliente Resend
const resend = new Resend("re_dHbT7BFx_LTwQP6eqY86nGCY29NPTGYJk");

// Parámetros por defecto
const CODES_TO_NOTIFY = (process.env.CODES_TO_NOTIFY || "4072977,4073823,4070801,4055536").split(",").map(c => c.trim()).filter(Boolean);
const DAYS_POR_VENCER = parseInt(process.env.DAYS_POR_VENCER || "60", 10);

// --- Helpers ---
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diffInDays = (fecha) => Math.ceil((startOfDay(new Date(fecha)) - startOfDay(new Date())) / MS_PER_DAY);
const clasificar = (diff) =>
  diff <= 0 ? "vencido" : diff <= DAYS_POR_VENCER ? "por_vencer" : "en_plazo";

const NOMBRES_CODIGOS = {
  "4072977": "Router Huawei",
  "4073823": "ONT Huawei",
  "4070801": "Cisco C8300",
  "4055536": "Kit Microondas",
};

function buildHtmlTable(summary) {
  const rows = Object.entries(summary)
    .map(
      ([codigo, s]) => `
        <tr>
          <td>${NOMBRES_CODIGOS[codigo] || codigo}</td>
          <td style="text-align:center;">${s.vencido}</td>
          <td style="text-align:center;">${s.por_vencer}</td>
          <td style="text-align:center;">${s.en_plazo}</td>
        </tr>`
    )
    .join("");

  return `
    <p style="font-family: Calibri, sans-serif; font-size: 13px;">
      📅 Resumen Backlog por estado – Actualizado al ${new Date().toLocaleDateString("es-PE")}
    </p>
    <table border="1" cellpadding="6" cellspacing="0"
          style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 13px;">
      <thead style="background:#f0f0f0;">
        <tr>
          <th>Producto</th>
          <th>VENCIDO</th>
          <th>POR VENCER</th>
          <th>EN PLAZO</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="4" style="text-align:center;">Sin datos</td></tr>`}
      </tbody>
    </table>
  `;
}

// --- Endpoint ---
router.get("/utilsBacklogReporte", async (req, res) => {
  try {
    // Códigos dinámicos desde query o variable de entorno
    const codes = req.query.codes
      ? req.query.codes.split(",").map(c => c.trim())
      : CODES_TO_NOTIFY;

    if (!codes.length) {
      return res.status(400).json({ error: "No hay códigos para notificar" });
    }

    // Consulta a Supabase
    const { data, error } = await supabase
      .from("backlog_compras")
      .select("nuevo_codigo, fecha_compromiso")
      .in("nuevo_codigo", codes);

    if (error) throw error;

    // Resumen inicial
    const summary = {};
    for (const c of codes) {
      summary[c] = { vencido: 0, por_vencer: 0, en_plazo: 0 };
    }

    // Clasificación por estado
    for (const row of data) {
      const estado = clasificar(diffInDays(row.fecha_compromiso));
      summary[row.nuevo_codigo][estado]++;
    }

    const html = buildHtmlTable(summary);


    const destinatarios = [
  "guardias@hitss.com",
];

for (const email of destinatarios) {
  await resend.emails.send({
    from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
    to: email, // Aquí uno por uno
    subject: "Resumen de estados de Backlog",
    html,
  });
}

    res.status(200).json({ message: "Correo de backlog enviado correctamente." });
  } catch (err) {
    console.error("Error al enviar reporte backlog:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
