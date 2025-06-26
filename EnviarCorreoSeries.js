const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { createTablaHTMLSeries } = require("./utilsSeries");
const { Resend } = require("resend");

// 🔐 Conexión a Supabase
const supabase = createClient(
  "https://bsrtuievwjtzwejuxqee.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcnR1aWV2d2p0endlanV4cWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NTEyNjYsImV4cCI6MjA2NDEyNzI2Nn0.A9tCs-Zi-7jw5LUFs7ViIR2vHb9tNMj6c7YeeNOdmWI"
);

// 💌 Cliente Resend
const resendClient = new Resend("re_dHbT7BFx_LTwQP6eqY86nGCY29NPTGYJk");

router.post("/api/utilsSeries", async (req, res) => {
  try {
    console.log("📥 Iniciando notificación de series...");

    // 📦 Obtener todas las series
    const { data: registros, error } = await supabase
      .from("series_contrata")
      .select("*");

    if (error) throw new Error("Error obteniendo registros: " + error.message);

    // 🧠 Agrupar por empresa
    const agrupados = {};
    for (const item of registros) {
      const empresa = item.empresa?.trim() || "SIN EMPRESA";
      if (!agrupados[empresa]) agrupados[empresa] = [];
      agrupados[empresa].push(item);
    }

    // 🔁 Por cada empresa: obtener correos, generar HTML y enviar
    for (const [empresa, registrosEmpresa] of Object.entries(agrupados)) {
      // 📧 Obtener correos de contacto_empresa
      const { data: contactos, error: errorContacto } = await supabase
        .from("contacto_empresa")
        .select("correo_contacto")
        .eq("empresa", empresa);

      if (errorContacto) {
        console.error(`❌ Error obteniendo correos para ${empresa}:`, errorContacto.message);
        continue;
      }

      const correos = contactos.map((c) => c.correo_contacto.trim()).filter(Boolean);

      if (correos.length === 0) {
        console.warn(`⚠️ No hay correos registrados para: ${empresa}`);
        continue;
      }

      // 📄 Generar HTML del resumen
      const html = createTablaHTMLSeries(empresa, registrosEmpresa);

      // 📤 Enviar correo
      console.log(`📨 Enviando resumen a ${empresa} (${correos.join(", ")})...`);

      await resendClient.emails.send({
        from: "ClaroCorp+ <notificaciones@clarocorp.pe>",
        to: correos,
        subject: `📊 Resumen de estados de tus equipos - ${empresa}`,
        html,
      });

      console.log(`✅ Correo enviado correctamente a ${empresa}`);
    }

    res.status(200).json({ message: "📬 Correos enviados correctamente." });
  } catch (err) {
    console.error("❌ Error general en notificarSeries:", err.message);
    res.status(500).json({ error: "Error al enviar correos." });
  }
});

module.exports = router;
