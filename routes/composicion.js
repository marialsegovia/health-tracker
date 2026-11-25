// routes/composicion.js
//
// API para gestionar los registros de composicion corporal: listar, crear,
// actualizar y eliminar.

const express = require('express');
const router = express.Router();
const db = require('../data/db');

function numeroONull(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// GET /api/composicion -> todas las mediciones, ordenadas por fecha.
router.get('/', (req, res) => {
  res.json(db.obtenerComposicion());
});

// POST /api/composicion -> crea una medicion nueva.
router.post('/', (req, res) => {
  const { fecha } = req.body;

  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere la fecha.' });
  }

  const id = db.crearComposicion({
    fecha,
    peso: numeroONull(req.body.peso),
    porcentaje_grasa: numeroONull(req.body.porcentaje_grasa),
    masa_muscular: numeroONull(req.body.masa_muscular),
    grasa_visceral: numeroONull(req.body.grasa_visceral),
    imc: numeroONull(req.body.imc),
    porcentaje_agua: numeroONull(req.body.porcentaje_agua),
    metabolismo_basal: numeroONull(req.body.metabolismo_basal),
    fuente_documento: req.body.fuente_documento,
    notas: req.body.notas,
  });

  res.status(201).json({ id });
});

// PUT /api/composicion/:id -> corrige una medicion existente.
router.put('/:id', (req, res) => {
  const actualizado = db.actualizarComposicion(req.params.id, req.body);
  if (!actualizado) {
    return res.status(404).json({ error: 'Registro no encontrado.' });
  }
  res.json(actualizado);
});

// DELETE /api/composicion/:id -> elimina una medicion.
router.delete('/:id', (req, res) => {
  const eliminado = db.eliminarComposicion(req.params.id);
  if (!eliminado) {
    return res.status(404).json({ error: 'Registro no encontrado.' });
  }
  res.status(204).end();
});

module.exports = router;
