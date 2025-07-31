
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
    .map(([codigo, s]) => {
      const subtotal = s.vencido + s.por_vencer + s.en_plazo;
      return `
        <tr>
          <td>${NOMBRES_CODIGOS[codigo] || codigo}</td>
          <td style="text-align:center;">${s.vencido}</td>
          <td style="text-align:center;">${s.por_vencer}</td>
          <td style="text-align:center;">${s.en_plazo}</td>
          <td style="text-align:center; font-weight: bold;">${subtotal}</td>
        </tr>
      `;
    })
    .join("");

  return `
     <p style="font-family: Calibri, sans-serif; font-size: 13px;">
      <strong>Estimado equipo:</strong>
    </p>
    <p style="font-family: Calibri, sans-serif; font-size: 13px;">
  A continuación, les compartimos el resumen actualizado de los <strong>equipos pendientes</strong> según el estudio de factibilidad, destinados a ser utilizados en SOTs que aún no han sido atendidas (<strong>Backlog</strong>).
      </p>
  <p style="font-family: Calibri, sans-serif; font-size: 13px;">
  Este reporte muestra las cantidades clasificadas en tres categorías:
  <ul style="margin-top: 5px; font-size: 13px; font-family: Calibri, sans-serif;">
    <li><strong>Vencido</strong>: fecha de compromiso anterior a la fecha actual.</li>
    <li><strong>Por vencer</strong>: fecha de compromiso dentro de los próximos 60 días.</li>
    <li><strong>En plazo</strong>: fecha de compromiso posterior a los 60 días desde hoy.</li>
  </ul>
</p>
      <p style="font-family: Calibri, sans-serif; font-size: 13px;margin-bottom: 20px;">
        Este reporte ha sido actualizado al día <strong>${new Date(Date.now() - 86400000).toLocaleDateString("es-PE")}</strong>
      </p>
    <table border="1" cellpadding="6" cellspacing="0"
          style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 13px;">
      <thead style="background:#f0f0f0;">
        <tr>
          <th>PRODUCTO</th>
          <th>VENCIDO</th>
          <th>POR VENCER</th>
          <th>EN PLAZO</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;">Sin datos</td></tr>`}
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
      .in("nuevo_codigo", codes)
      .eq("estado_soporte", "PENDIENTE"); 
    
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


await resend.emails.send({
  from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
  to: "guardias@hitss.com",
  subject: "📌 Resumen de Pendientes en Backlog Recurrente",
  html,
});

    res.status(200).json({ message: "Correo de backlog enviado correctamente." });
  } catch (err) {
    console.error("Error al enviar reporte backlog:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
