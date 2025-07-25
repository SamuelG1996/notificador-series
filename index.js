const express = require("express");
const cors = require("cors");

const app = express();

// 👇 Tus dos módulos de rutas
const enviarCorreoSeries = require("./EnviarCorreoSeries"); // maneja /api/utilsSeries
const utilsSeriesReporteClaro = require("./utilsSeriesReporteClaro"); // maneja /api/utilsSeriesReporteClaro
const utilsBacklogReporte = require("./utilsBacklogReporte");

// 🛡️ Middlewares
app.use(cors());
app.use(express.json());

// 🔌 Rutas de la API
app.use("/api", enviarCorreoSeries);
app.use("/api", utilsSeriesReporteClaro);
app.use("/api", utilsBacklogReporte);

// ✅ Endpoint para "despertar" el servidor (cronjob)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// 🧪 Ruta raíz para prueba rápida
app.get("/", (req, res) => {
  res.send("✅ API Notificador-Series activa");
});

// 🚀 Puerto de despliegue
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
});
