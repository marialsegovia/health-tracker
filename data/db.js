// data/db.js
//
// Capa de datos: aqui se define la estructura de la base de datos y se
// exponen funciones ya preparadas (prepared statements) para leer y
// escribir, de forma que el resto de la aplicacion nunca construya SQL a
// mano. Las prepared statements evitan por diseno la inyeccion SQL: los
// valores siempre se pasan como parametros, nunca concatenados en el texto
// de la consulta.
//
// La base de datos vive en un archivo local (data/health.db). Ese archivo
// esta excluido de git (ver .gitignore): contiene los datos reales de salud
// del usuario y nunca debe salir de esta maquina.

const path = require('path');
const Database = require('better-sqlite3');

const RUTA_BASE_DATOS = path.join(__dirname, 'health.db');
const db = new Database(RUTA_BASE_DATOS);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS presion_arterial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    momento_dia TEXT,
    sistolica INTEGER NOT NULL,
    diastolica INTEGER NOT NULL,
    frecuencia_cardiaca INTEGER,
    contexto TEXT,
    fuente_documento TEXT,
    notas TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS composicion_corporal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    peso REAL,
    porcentaje_grasa REAL,
    masa_muscular REAL,
    grasa_visceral REAL,
    imc REAL,
    porcentaje_agua REAL,
    metabolismo_basal REAL,
    fuente_documento TEXT,
    notas TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documentos_subidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_archivo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    fecha_subida TEXT NOT NULL DEFAULT (datetime('now')),
    estado TEXT NOT NULL,
    registros_creados INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_presion_fecha ON presion_arterial(fecha);
  CREATE INDEX IF NOT EXISTS idx_composicion_fecha ON composicion_corporal(fecha);
`);

// --- Presion arterial ---

const stmtCrearPresion = db.prepare(`
  INSERT INTO presion_arterial
    (fecha, momento_dia, sistolica, diastolica, frecuencia_cardiaca, contexto, fuente_documento, notas)
  VALUES
    (@fecha, @momento_dia, @sistolica, @diastolica, @frecuencia_cardiaca, @contexto, @fuente_documento, @notas)
`);

function crearPresion(registro) {
  const info = stmtCrearPresion.run({
    fecha: registro.fecha,
    momento_dia: registro.momento_dia ?? null,
    sistolica: registro.sistolica,
    diastolica: registro.diastolica,
    frecuencia_cardiaca: registro.frecuencia_cardiaca ?? null,
    contexto: registro.contexto ?? null,
    fuente_documento: registro.fuente_documento ?? null,
    notas: registro.notas ?? null,
  });
  return info.lastInsertRowid;
}

function obtenerPresion() {
  return db.prepare('SELECT * FROM presion_arterial ORDER BY fecha ASC').all();
}

function actualizarPresion(id, cambios) {
  const actual = db.prepare('SELECT * FROM presion_arterial WHERE id = ?').get(id);
  if (!actual) return null;
  const fusionado = { ...actual, ...cambios };
  db.prepare(`
    UPDATE presion_arterial SET
      fecha = @fecha, momento_dia = @momento_dia, sistolica = @sistolica,
      diastolica = @diastolica, frecuencia_cardiaca = @frecuencia_cardiaca,
      contexto = @contexto, notas = @notas
    WHERE id = @id
  `).run({ ...fusionado, id });
  return db.prepare('SELECT * FROM presion_arterial WHERE id = ?').get(id);
}

function eliminarPresion(id) {
  const info = db.prepare('DELETE FROM presion_arterial WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Composicion corporal ---

const stmtCrearComposicion = db.prepare(`
  INSERT INTO composicion_corporal
    (fecha, peso, porcentaje_grasa, masa_muscular, grasa_visceral, imc, porcentaje_agua, metabolismo_basal, fuente_documento, notas)
  VALUES
    (@fecha, @peso, @porcentaje_grasa, @masa_muscular, @grasa_visceral, @imc, @porcentaje_agua, @metabolismo_basal, @fuente_documento, @notas)
`);

function crearComposicion(registro) {
  const info = stmtCrearComposicion.run({
    fecha: registro.fecha,
    peso: registro.peso ?? null,
    porcentaje_grasa: registro.porcentaje_grasa ?? null,
    masa_muscular: registro.masa_muscular ?? null,
    grasa_visceral: registro.grasa_visceral ?? null,
    imc: registro.imc ?? null,
    porcentaje_agua: registro.porcentaje_agua ?? null,
    metabolismo_basal: registro.metabolismo_basal ?? null,
    fuente_documento: registro.fuente_documento ?? null,
    notas: registro.notas ?? null,
  });
  return info.lastInsertRowid;
}

function obtenerComposicion() {
  return db.prepare('SELECT * FROM composicion_corporal ORDER BY fecha ASC').all();
}

function actualizarComposicion(id, cambios) {
  const actual = db.prepare('SELECT * FROM composicion_corporal WHERE id = ?').get(id);
  if (!actual) return null;
  const fusionado = { ...actual, ...cambios };
  db.prepare(`
    UPDATE composicion_corporal SET
      fecha = @fecha, peso = @peso, porcentaje_grasa = @porcentaje_grasa,
      masa_muscular = @masa_muscular, grasa_visceral = @grasa_visceral,
      imc = @imc, porcentaje_agua = @porcentaje_agua,
      metabolismo_basal = @metabolismo_basal, notas = @notas
    WHERE id = @id
  `).run({ ...fusionado, id });
  return db.prepare('SELECT * FROM composicion_corporal WHERE id = ?').get(id);
}

function eliminarComposicion(id) {
  const info = db.prepare('DELETE FROM composicion_corporal WHERE id = ?').run(id);
  return info.changes > 0;
}

// --- Bitacora de documentos subidos ---

const stmtRegistrarDocumento = db.prepare(`
  INSERT INTO documentos_subidos (nombre_archivo, tipo, estado, registros_creados)
  VALUES (@nombre_archivo, @tipo, @estado, @registros_creados)
`);

function registrarDocumento({ nombre_archivo, tipo, estado, registros_creados = 0 }) {
  const info = stmtRegistrarDocumento.run({ nombre_archivo, tipo, estado, registros_creados });
  return info.lastInsertRowid;
}

function obtenerDocumentos() {
  return db.prepare('SELECT * FROM documentos_subidos ORDER BY fecha_subida DESC').all();
}

module.exports = {
  db,
  crearPresion,
  obtenerPresion,
  actualizarPresion,
  eliminarPresion,
  crearComposicion,
  obtenerComposicion,
  actualizarComposicion,
  eliminarComposicion,
  registrarDocumento,
  obtenerDocumentos,
};
