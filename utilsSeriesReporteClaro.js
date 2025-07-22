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

// 📩 Ruta POST
router.post("/utilsSeriesReporteClaro", async (req, res) => {
  try {
  const { data: filas, error } = await supabase.rpc("envio_claro_conciliacion_series");
    if (error) throw error;

    filas.sort((a, b) => b.total - a.total);

    const htmlTable = `
  <p style="font-family: Calibri, sans-serif; font-size: 13px;">
    📅 Estado de conciliación de inventario por contrata – Actualizado al ${new Date().toLocaleDateString("es-PE")}
  </p>
  <table border="1" cellpadding="6" cellspacing="0"
        style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 13px;">
    <thead style="background:#f0f0f0;">
      <tr>
        <th>EMPRESA</th>
        <th>CONCILIADO</th>
        <th>EN REVISIÓN</th>
        <th>PENDIENTE</th>
        <th><strong>TOTAL</strong></th>
      </tr>
    </thead>
    <tbody>
      ${filas
        .map(
          (row) => `
        <tr>
          <td><strong>${row.empresa}</strong></td>
          <td>${row.conc === 0 ? "-" : `S/ ${row.conc.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}</td>
          <td>${row.rev === 0 ? "-" : `S/ ${row.rev.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}</td>
          <td>${row.pend === 0 ? "-" : `S/ ${row.pend.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}</td>
          <td><strong>${row.total === 0 ? "-" : `S/ ${row.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}</strong></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
`;

   await resend.emails.send({
      from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
      to: [
        "guardias@hitss.com",
        "claudia.henriquez@claro.com.pe",
        "chancahuanaa@globalhitss.com",
      ],
      subject: "Resumen de estados de Conciliación de Inventario",
      html: htmlTable,
    });

    res.status(200).json({ message: "Correo enviado correctamente." });
  } catch (err) {
    console.error("Error al enviar resumen:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
