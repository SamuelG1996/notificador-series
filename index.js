const express = require("express");
const app = express();
const enviarCorreoSeries = require("./enviarCorreoSeries");

app.use(express.json());
app.use(enviarCorreoSeries);

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
});