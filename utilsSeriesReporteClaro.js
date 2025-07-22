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
      <p>Revisión al ${new Date().toLocaleDateString("es-PE")}</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: Arial;">
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
              <td>S/ ${row.conc.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}</td>
              <td>S/ ${row.rev.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}</td>
              <td>S/ ${row.pend.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}</td>
              <td><strong>S/ ${row.total.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}</strong></td>
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
        "samuelguardiabautista@gmail.com",
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
