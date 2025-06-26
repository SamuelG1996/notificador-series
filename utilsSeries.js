function createTablaHTMLSeries(empresa, registros) {
  const tabla = {};

  for (const item of registros) {
    const estadoContrata = (item.estado_contrata || "SIN ESTADO").trim().toUpperCase();
    const estadoSoporte = (item.estado_soporte || "").trim().toUpperCase() || "PENDIENTE";

    if (!tabla[estadoContrata]) tabla[estadoContrata] = {};
    if (!tabla[estadoContrata][estadoSoporte]) tabla[estadoContrata][estadoSoporte] = 0;
    tabla[estadoContrata][estadoSoporte]++;
  }

  const soporteEstados = new Set();
  for (const contrata of Object.values(tabla)) {
    Object.keys(contrata).forEach(e => soporteEstados.add(e));
  }
  const columnas = [...soporteEstados];

  // 🧮 Calcular totales por columna
  const totales = {};
  for (const estadoS of columnas) {
    totales[estadoS] = 0;
  }
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
  `;

  html += `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">`;
  html += `<tr><th>Estado Contrata</th>${columnas.map(e => `<th>${e}</th>`).join("")}</tr>`;

  for (const estadoC of Object.keys(tabla)) {
    html += `<tr><td><b>${estadoC}</b></td>`;
    for (const estadoS of columnas) {
      const count = tabla[estadoC][estadoS] || 0;
      html += `<td style="text-align:center;">${count > 0 ? count : "-"}</td>`;
    }
    html += `</tr>`;
  }

  // ➕ Fila de totales
  html += `<tr><td><b>Total</b></td>`;
  for (const estadoS of columnas) {
    html += `<td style="text-align:center; font-weight:bold;">${totales[estadoS] > 0 ? totales[estadoS] : "-"}</td>`;
  }
  html += `</tr>`;

  html += `</table><br><p>📅 Revisión al ${new Date().toLocaleDateString()}</p>
  <p>👉 Por favor, revisa el portal para más información. Es importante que todos los registros cuenten con un estado.</p>`;
  return html;
}

module.exports = { createTablaHTMLSeries };
