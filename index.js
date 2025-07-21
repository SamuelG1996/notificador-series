const express = require("express");
const cors = require("cors"); // 👈 Importa el middleware CORS

const app = express();
const enviarCorreoSeries = require("./EnviarCorreoSeries");

// Aplica CORS para todas las rutas
app.use(cors()); // 👈 Esto soluciona el error CORS
app.use(express.json());
app.use(enviarCorreoSeries);

// Ruta raíz para verificar si el servidor está vivo
app.get("/", (req, res) => {
  res.send("✅ API Notificador-Series activa");
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
});
