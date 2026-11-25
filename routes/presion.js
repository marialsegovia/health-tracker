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
  const actualizado = db.actualizarPresion(req.params.id, req.body);
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
