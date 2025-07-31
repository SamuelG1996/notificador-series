const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

// 🔐 Supabase
const supabase = createClient(
  "https://bsrtuievwjtzwejuxqee.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcnR1aWV2d2p0endlanV4cWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NTEyNjYsImV4cCI6MjA2NDEyNzI2Nn0.A9tCs-Zi-7jw5LUFs7ViIR2vHb9tNMj6c7YeeNOdmWI"
);

// 💌 Cliente Resend
const resend = new Resend("re_dHbT7BFx_LTwQP6eqY86nGCY29NPTGYJk");

// 📄 Construir HTML
function buildHtmlSeries(empresa, registros) {
  const tabla = {};

  for (const item of registros) {
    const estadoContrata = (item.estado_contrata || "SIN ESTADO").trim().toUpperCase();
    let estadoSoporte = (item.estado_soporte || "").trim().toUpperCase();
    if (!estadoSoporte || estadoSoporte === "-") estadoSoporte = "PENDIENTE";

    if (!tabla[estadoContrata]) tabla[estadoContrata] = {};
    if (!tabla[estadoContrata][estadoSoporte]) tabla[estadoContrata][estadoSoporte] = 0;
    tabla[estadoContrata][estadoSoporte]++;
  }

  const soporteEstados = new Set();
  for (const contrata of Object.values(tabla)) {
    Object.keys(contrata).forEach(e => soporteEstados.add(e));
  }
  const columnas = [...soporteEstados];

  // Totales por columna
  const totales = {};
  for (const estadoS of columnas) totales[estadoS] = 0;

  for (const fila of Object.values(tabla)) {
    for (const estadoS of columnas) {
      totales[estadoS] += fila[estadoS] || 0;
    }
  }

  let html = `
    <p style="margin-bottom: 8px;">Estimado equipo de <strong>${empresa}</strong>,</p>
    <p style="margin-top: 0; margin-bottom: 18px; font-size: 14px;">
      A continuación, les compartimos el resumen actualizado del estado de sus equipos registrados en el portal.
    </p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
      <tr><th>Estado Contrata</th>${columnas.map(e => `<th>${e}</th>`).join("")}</tr>`;

  for (const estadoC of Object.keys(tabla)) {
    html += `<tr><td><b>${estadoC}</b></td>`;
    for (const estadoS of columnas) {
      const count = tabla[estadoC][estadoS] || 0;
      html += `<td style="text-align:center;">${count > 0 ? count : "-"}</td>`;
    }
    html += `</tr>`;
  }

  html += `<tr><td><b>Total</b></td>`;
  for (const estadoS of columnas) {
    html += `<td style="text-align:center; font-weight:bold;">${totales[estadoS] > 0 ? totales[estadoS] : "-"}</td>`;
  }
  html += `</tr></table><br>
    <p>📅 Revisión al ${new Date().toLocaleDateString("es-PE")}</p>
    <p>👉 Por favor, revisa el portal para más información. Es importante que todos los registros cuenten con un estado.</p>
  `;

  return html;
}

// 📤 Ruta GET para envío manual o cron
router.get("/utilsSeries", async (req, res) => {
  try {
    console.log("📥 Iniciando envío de resumen de series...");

    // 🧾 Obtener todas las series por bloques
    const registros = [];
    const paso = 1000;
    let desde = 0;
    let continuar = true;

    while (continuar) {
      const { data, error } = await supabase
        .from("series_contrata")
        .select("*")
        .range(desde, desde + paso - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        continuar = false;
      } else {
        registros.push(...data);
        desde += paso;
        if (data.length < paso) continuar = false;
      }
    }

    console.log(`📊 Total de registros obtenidos: ${registros.length}`);

    // 🔀 Agrupar por empresa
    const agrupados = {};
    for (const item of registros) {
      const empresa = item.empresa?.trim() || "SIN EMPRESA";
      if (!agrupados[empresa]) agrupados[empresa] = [];
      agrupados[empresa].push(item);
    }

    // 📧 Enviar correos por empresa
    for (const [empresa, registrosEmpresa] of Object.entries(agrupados)) {
      if (registrosEmpresa.length === 0) continue;

      const { data: contactos, error: errorContacto } = await supabase
        .from("contacto_empresa")
        .select("correo_contacto")
        .eq("empresa", empresa);

      if (errorContacto) {
        console.error(`❌ Error obteniendo correos para ${empresa}:`, errorContacto.message);
        continue;
      }

      const correos = contactos.map(c => c.correo_contacto.trim()).filter(Boolean);

      if (correos.length === 0) {
        console.warn(`⚠️ No hay correos registrados para: ${empresa}`);
        continue;
      }

      const html = buildHtmlSeries(empresa, registrosEmpresa);

      console.log(`📨 Enviando resumen a ${empresa} (${correos.join(", ")})...`);

      await resend.emails.send({
        from: "Soporte Portal Inventario <soporte@portalgestioninventario.com>",
        to: correos,
        cc: ["chancahuanaa@hitss.com"],
        subject: `📊 Resumen de estados de materiales seriados - ${empresa}`,
        html,
      });

      console.log(`✅ Correo enviado correctamente a ${empresa}`);
    }

    res.status(200).json({ message: "📬 Correos enviados correctamente." });
  } catch (err) {
    console.error("❌ Error al enviar correos:", err.message);
    res.status(500).json({ error: "Error al enviar correos." });
  }
});

module.exports = router;
