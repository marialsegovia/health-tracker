// routes/presion.js
//
// API para gestionar los registros de presion arterial: listar, crear,
// actualizar y eliminar. El frontend (public/presion.html e historial.html)
// llama a estas rutas.

const express = require('express');
const router = express.Router();
const db = require('../data/db');

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Filtra y convierte el cuerpo de una peticion PUT a solo los campos
// permitidos, con el mismo tipo que exige la base de datos. Antes, PUT
// guardaba req.body tal cual (sin validar), lo que permitia guardar
// texto arbitrario en campos que deberian ser numericos.
function sanearCambiosPresion(body) {
  const cambios = {};

  if (body.fecha !== undefined) {
    if (typeof body.fecha !== 'string' || !FECHA_ISO.test(body.fecha)) {
      return { error: 'fecha debe tener el formato AAAA-MM-DD.' };
    }
    cambios.fecha = body.fecha;
  }
  if (body.sistolica !== undefined) {
    if (!esNumeroValido(Number(body.sistolica))) return { error: 'sistolica debe ser numerica.' };
    cambios.sistolica = Number(body.sistolica);
  }
  if (body.diastolica !== undefined) {
    if (!esNumeroValido(Number(body.diastolica))) return { error: 'diastolica debe ser numerica.' };
    cambios.diastolica = Number(body.diastolica);
  }
  if (body.frecuencia_cardiaca !== undefined) {
    cambios.frecuencia_cardiaca = body.frecuencia_cardiaca === null || body.frecuencia_cardiaca === '' ? null : Number(body.frecuencia_cardiaca);
  }
  if (body.momento_dia !== undefined) cambios.momento_dia = body.momento_dia === null ? null : String(body.momento_dia);
  if (body.contexto !== undefined) cambios.contexto = body.contexto === null ? null : String(body.contexto);
  if (body.notas !== undefined) cambios.notas = body.notas === null ? null : String(body.notas);

  return { cambios };
}

// GET /api/presion -> todas las lecturas, ordenadas por fecha.
router.get('/', (req, res) => {
  res.json(db.obtenerPresion());
});

// POST /api/presion -> crea una lectura nueva.
router.post('/', (req, res) => {
  const { fecha, sistolica, diastolica } = req.body;

  if (!fecha || !esNumeroValido(Number(sistolica)) || !esNumeroValido(Number(diastolica))) {
    return res.status(400).json({
      error: 'Se requiere fecha, sistolica y diastolica (numericas).',
    });
  }

  const id = db.crearPresion({
    fecha,
    momento_dia: req.body.momento_dia,
    sistolica: Number(sistolica),
    diastolica: Number(diastolica),
    frecuencia_cardiaca: req.body.frecuencia_cardiaca ? Number(req.body.frecuencia_cardiaca) : null,
    contexto: req.body.contexto,
    fuente_documento: req.body.fuente_documento,
    notas: req.body.notas,
  });

  res.status(201).json({ id });
});

// PUT /api/presion/:id -> corrige una lectura existente.
router.put('/:id', (req, res) => {
  const { error, cambios } = sanearCambiosPresion(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const actualizado = db.actualizarPresion(req.params.id, cambios);
  if (!actualizado) {
    return res.status(404).json({ error: 'Registro no encontrado.' });
  }
  res.json(actualizado);
});

// DELETE /api/presion/:id -> elimina una lectura.
router.delete('/:id', (req, res) => {
  const eliminado = db.eliminarPresion(req.params.id);
  if (!eliminado) {
    return res.status(404).json({ error: 'Registro no encontrado.' });
  }
  res.status(204).end();
});

module.exports = router;
