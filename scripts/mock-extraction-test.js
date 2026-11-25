// scripts/mock-extraction-test.js
//
// Prueba el servicio de extraccion (services/extractor.js) contra
// documentos de prueba generados aqui mismo, con datos ficticios - antes
// de usarlo con documentos reales. Util para confirmar que el enlace con
// la API de Claude y el formato de respuesta funcionan bien.
//
// Como usarlo:
//   npm run test:extraction

require('dotenv').config();
const { extraerDeDocumento } = require('../services/extractor');

// Genera un PDF minimo (sin ninguna libreria externa) con un par de lineas
// de texto, simulando un reporte de laboratorio simple.
function crearPdfConTexto(lineas) {
  const comandosTexto = lineas
    .map((linea, indice) => {
      const textoEscapado = linea.replace(/([()\\])/g, '\\$1');
      const posicion = indice === 0 ? '20 150 Td' : '0 -18 Td';
      return `${posicion} (${textoEscapado}) Tj`;
    })
    .join('\n');

  const contenidoStream = `BT /F1 12 Tf\n${comandosTexto}\nET`;

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 300 200] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(contenidoStream)} >>\nstream\n${contenidoStream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objetos.forEach((cuerpo, indice) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${indice + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });

  const offsetXref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objetos.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${offsetXref}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

// PNG transparente de 1x1 pixel: sirve para probar el caso de "documento
// sin informacion reconocible" (debe devolver una lista vacia, no inventar datos).
const PNG_VACIO_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function correrPrueba(nombre, buffer, mimetype, tipo) {
  console.log(`\n=== ${nombre} ===`);
  try {
    const resultado = await extraerDeDocumento(buffer, mimetype, tipo);
    console.log('Registros extraidos:', JSON.stringify(resultado.registros, null, 2));
    console.log('Advertencias:', resultado.advertencias);
  } catch (error) {
    console.log('Error:', error.message);
    if (error.message.includes('401') || /auth/i.test(error.message)) {
      console.log(
        'Sugerencia: revisa que ANTHROPIC_API_KEY en tu archivo .env sea una clave real y valida.'
      );
    }
  }
}

async function main() {
  const pdfPresion = crearPdfConTexto([
    'Reporte de presion arterial',
    'Fecha: 2026-01-10',
    'Presion: 128/82 mmHg',
    'Frecuencia cardiaca: 70 bpm',
    'Contexto: en reposo',
  ]);

  const pdfComposicion = crearPdfConTexto([
    'Reporte de composicion corporal',
    'Fecha: 2026-01-10',
    'Peso: 68.2 kg',
    'Grasa corporal: 22.1 %',
    'Masa muscular: 30.5 kg',
  ]);

  const pngVacio = Buffer.from(PNG_VACIO_BASE64, 'base64');

  await correrPrueba('PDF sintetico de presion arterial', pdfPresion, 'application/pdf', 'presion');
  await correrPrueba('PDF sintetico de composicion corporal', pdfComposicion, 'application/pdf', 'composicion');
  await correrPrueba('Imagen vacia (debe devolver lista vacia, no inventar datos)', pngVacio, 'image/png', 'presion');
}

main();
