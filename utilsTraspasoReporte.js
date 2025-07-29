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

function buildHtmlResumenTraspasos(summary) {
  const rows = Object.entries(summary)
    .map(([responsable, s]) => {
      const total = s.pendiente + s.observado + s.en_proceso;
      return `
        <tr>
          <td>${responsable}</td>
          <td style="text-align:center;">${s.pendiente}</td>
          <td style="text-align:center;">${s.observado}</td>
          <td style="text-align:center;">${s.en_proceso}</td>
          <td style="text-align:center; font-weight: bold;">${total}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <p style="font-family: Calibri, sans-serif; font-size: 13px;">
      <strong>Estimado equipo:</strong>
    </p>
    <p style="font-family: Calibri, sans-serif; font-size: 13px;">
       A continuación, les compartimos el resumen actualizado del estado de las <strong>solicitudes de traspaso pendientes</strong> que las contratistas han registrado en el Portal de Inventario.
        Este reporte incluye únicamente las solicitudes que se encuentran en estado <strong>"Pendiente"</strong>, <strong>"Observado"</strong> o <strong>"En proceso"</strong>. 
        Las solicitudes que ya fueron <strong>atendidas o anuladas</strong> no se incluyen en la siguiente tabla.
      </p>
  
      <p style="font-family: Calibri, sans-serif; font-size: 13px;margin-bottom: 20px;">
        Este reporte ha sido actualizado al día <strong>${new Date().toLocaleDateString("es-PE")}</strong>
      </p>
      
    <table border="1" cellpadding="6" cellspacing="0"
          style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 13px;">
      <thead style="background:#f0f0f0;">
        <tr>
          <th>Usuario Responsable</th>
          <th>Pendiente</th>
          <th>Observado</th>
          <th>En Proceso</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;">Sin datos</td></tr>`}
      </tbody>
    </table>
  `;
}

router.get("/utilsTraspasoReporte", async (req, res) => {
  try {
    const estadosValidos = ["Pendiente", "Observado", "En proceso"];

    const { data, error } = await supabase
      .from("traspasos")
      .select("estado, responsable_nombre")
      .in("estado", estadosValidos);

    if (error) throw error;

    const resumen = {};

    for (const row of data) {
      const responsable = row.responsable_nombre || "Sin asignar";
      if (!resumen[responsable]) {
        resumen[responsable] = { pendiente: 0, observado: 0, en_proceso: 0 };
      }

      switch (row.estado) {
        case "Pendiente":
          resumen[responsable].pendiente++;
          break;
        case "Observado":
          resumen[responsable].observado++;
          break;
        case "En proceso":
          resumen[responsable].en_proceso++;
          break;
      }
    }

    const html = buildHtmlResumenTraspasos(resumen);

    await resend.emails.send({
      from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
      to: ["guardias@hitss.com", "chancahuanaa@hitss.com"], 
      cc: ["flor.delacruz@claro.com.pe", "claudia.henriquez@claro.com.pe"],
      subject: "📅 Resumen de solicitudes de traspaso pendientes",
      html,
    });

    res.status(200).json({ message: "Reporte de traspasos enviado correctamente." });
  } catch (err) {
    console.error("Error al enviar reporte de traspasos:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
