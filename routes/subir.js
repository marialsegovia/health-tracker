// routes/subir.js
//
// Endpoint de carga de archivos. El usuario elige si el archivo es de
// "presion" o "composicion" y sube un CSV, PDF o foto. Esta ruta NO guarda
// nada en la base de datos todavia: solo devuelve los registros propuestos
// para que el usuario los revise/corrija en pantalla antes de confirmar
// (esa confirmacion pasa por las rutas normales de /api/presion o
// /api/composicion, ver routes/presion.js y routes/composicion.js).

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const db = require('../data/db');
const { parsearCSV } = require('../services/csvParser');
const { extraerDeDocumento } = require('../services/extractor');

const router = express.Router();

const TIPOS_PERMITIDOS = new Set(['presion', 'composicion']);

const MIME_PERMITIDOS = new Set([
  'text/csv',
  'application/vnd.ms-excel', // algunos navegadores etiquetan CSV asi
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const CARPETA_UPLOADS = path.join(__dirname, '..', 'uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    if (!MIME_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Usa CSV, PDF, JPG o PNG.'));
    }
    cb(null, true);
  },
});

// Guarda una copia del archivo original en uploads/ (fuera de git) con un
// nombre seguro, para que el usuario conserve el documento de referencia.
function guardarCopiaLocal(archivo) {
  const extension = path.extname(archivo.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const nombreSeguro = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  fs.writeFileSync(path.join(CARPETA_UPLOADS, nombreSeguro), archivo.buffer);
  return nombreSeguro;
}

// Middleware que envuelve a Multer para convertir sus errores (tipo de
// archivo no permitido, archivo demasiado grande) en una respuesta 400
// limpia, en vez del 500 con stack trace que Express mostraria por defecto.
function cargarArchivo(req, res, next) {
  upload.single('archivo')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
}

router.post('/', cargarArchivo, async (req, res) => {
  const { tipo } = req.body;

  if (!TIPOS_PERMITIDOS.has(tipo)) {
    return res.status(400).json({ error: 'El campo "tipo" debe ser "presion" o "composicion".' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo.' });
  }

  const nombreGuardado = guardarCopiaLocal(req.file);

  try {
    if (req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/vnd.ms-excel') {
      const { registros, advertencias } = parsearCSV(req.file.buffer.toString('utf-8'), tipo);

      db.registrarDocumento({
        nombre_archivo: nombreGuardado,
        tipo: 'csv',
        estado: registros.length > 0 ? 'propuesto' : 'sin_registros',
        registros_creados: registros.length,
      });

      return res.json({ tipo, registros, advertencias });
    }

    // PDF o imagen -> extraccion con la API de Claude (services/extractor.js).
    const { registros, advertencias } = await extraerDeDocumento(req.file.buffer, req.file.mimetype, tipo);

    db.registrarDocumento({
      nombre_archivo: nombreGuardado,
      tipo: req.file.mimetype === 'application/pdf' ? 'pdf' : 'imagen',
      estado: registros.length > 0 ? 'propuesto' : 'sin_registros',
      registros_creados: registros.length,
    });

    return res.json({ tipo, registros, advertencias });
  } catch (error) {
    db.registrarDocumento({
      nombre_archivo: nombreGuardado,
      tipo: req.file.mimetype,
      estado: 'error',
      registros_creados: 0,
    });
    console.error('Error al procesar la carga:', error.message);
    return res.status(502).json({ error: 'No se pudo procesar el archivo: ' + error.message });
  }
});

module.exports = router;
