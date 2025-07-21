const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createTablaHTMLSeries } = require("./utilsSeries");
const utilsSeriesReporteClaro = require("./utilsSeriesReporteClaro");
const enviarCorreoSeries = require("./EnviarCorreoSeries");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors());
app.use(express.json());

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("✅ API Notificador-Series activa");
});

// Ruta ping (GET y HEAD)
app.head("/ping", (req, res) => res.status(200).end());
app.get("/ping", (req, res) => res.status(200).send("OK"));

// 📩 Ruta para enviar correo por centro
app.post("/utilsSeries", async (req, res) => {
  try {
    const { centro } = req.body;
    if (!centro) {
      return res.status(400).json({ message: "Centro no proporcionado." });
    }

    const htmlBody = await createTablaHTMLSeries(centro);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "Series Notificador <notificaciones@clarocorp.tech>",
      to: ["tu_correo@ejemplo.com"], // 👈 cámbialo a tus correos reales
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

// 📊 Ruta para resumen global de conciliación
app.post("/utilsSeriesReporteClaro", utilsSeriesReporteClaro);

// 📨 Otras rutas de correo, si existen
app.use(enviarCorreoSeries);

// 🛠 Inicia el servidor
app.listen(PORT, () => {
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
});
