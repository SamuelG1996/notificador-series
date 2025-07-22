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
    const { data: series, error } = await supabase
      .from("series_contrata")
      .select("codigo, empresa, estado_contrata, estado_soporte");

    if (error) throw error;

    const codigosUnicos = [...new Set(series.map((s) => s.codigo))];
    const { data: precios, error: precioError } = await supabase
      .from("material_precios")
      .select("material, precio, fecha_data")
      .in("material", codigosUnicos);

    if (precioError) throw precioError;

    const preciosPorCodigo = {};
    for (const p of precios || []) {
      const actual = preciosPorCodigo[p.material];
      if (!actual || new Date(p.fecha_data) > new Date(actual.fecha_data)) {
        preciosPorCodigo[p.material] = Number(p.precio) || 0;
      }
    }

    const resumen = {};
    for (const serie of series) {
      const empresa = serie.empresa || "-";
      const precio = preciosPorCodigo[serie.codigo] || 0;
      if (precio === 0) continue;

      if (!resumen[empresa]) resumen[empresa] = { conc: 0, rev: 0, pend: 0 };

      const { estado_contrata, estado_soporte } = serie;
      const soporte = (estado_soporte || "").toUpperCase();
      const contrataVacia = !estado_contrata || estado_contrata.trim() === "";

      if (soporte === "VALIDADO") resumen[empresa].conc += precio;
      else if (
        ["PENDIENTE", "EN REVISION", "FALTANTE"].includes(soporte) &&
        !contrataVacia
      ) resumen[empresa].rev += precio;
      else resumen[empresa].pend += precio;
    }

    const filas = Object.entries(resumen).map(([empresa, val]) => ({
      empresa,
      conc: val.conc,
      rev: val.rev,
      pend: val.pend,
      total: val.conc + val.rev + val.pend,
    }));

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

    const destinatarios = [
      "guardias@hitss.com",
      "samuelguardiabautista@gmail.com",
    ];

    await resend.emails.send({
      from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
      to: destinatarios,
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
