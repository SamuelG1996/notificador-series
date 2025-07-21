const express = require("express");
const app = express();
const utilsSeriesReporteClaro = require('./utilsSeriesReporteClaro');
const port = process.env.PORT || 3000;
const { createTablaHTMLSeries } = require("./utilsSeries"); // tu módulo
const { Resend } = require("resend");

// Middleware para parsear JSON
app.use(express.json());

// 🔔 Ruta POST principal para enviar correos (tu endpoint actual)
app.post("/utilsSeries", async (req, res) => {
  try {
    const { centro } = req.body;

    if (!centro) {
      return res.status(400).json({ message: "Centro no proporcionado." });
    }

    // Tu lógica interna (simplificada aquí)
    const htmlBody = await createTablaHTMLSeries(centro);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "Series Notificador <notificaciones@clarocorp.tech>",
      to: ["tu_correo@ejemplo.com"],
      subject: `Series en stock - ${centro}`,
      html: htmlBody
    });

    if (error) throw error;

    res.status(200).json({ message: `Correos enviados para centro ${centro}` });
  } catch (err) {
    console.error("❌ Error en /utilsSeries:", err);
    res.status(500).json({ message: "Error interno", error: err.message });
  }
});

// ✅ Ruta para mantener vivo el servidor con HEAD/GET
app.head("/ping", (req, res) => {
  res.status(200).end();
});

app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

// 🟢 Ruta base opcional
app.get("/", (req, res) => {
  res.status(200).send("Servidor de notificaciones operativo.");
});

// 📨 NUEVA ruta para enviar resumen global de conciliación
app.post("/utilsSeriesReporteClaro", utilsSeriesReporteClaro);

// 🛠 Levanta el servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en puerto ${port}`);
});
