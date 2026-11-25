// services/csvParser.js
//
// Convierte un archivo CSV subido por el usuario en registros listos para
// la tabla correspondiente (presion_arterial o composicion_corporal).
// No usa inteligencia artificial: un CSV ya tiene estructura, asi que se
// parsea directamente -> es instantaneo y no cuesta nada.
//
// Para que no dependa de que el usuario use exactamente los mismos nombres
// de columna que la base de datos, se reconocen varios alias comunes por
// cada campo (en espanol e ingles, con o sin acentos).

const { parse } = require('csv-parse/sync');

const ALIAS_PRESION = {
  fecha: ['fecha', 'date'],
  momento_dia: ['momento_dia', 'momento del dia', 'time of day', 'momento'],
  sistolica: ['sistolica', 'systolic', 'presion sistolica'],
  diastolica: ['diastolica', 'diastolic', 'presion diastolica'],
  frecuencia_cardiaca: ['frecuencia_cardiaca', 'frecuencia cardiaca', 'heart rate', 'pulso'],
  contexto: ['contexto', 'context', 'notas_contexto'],
};

const ALIAS_COMPOSICION = {
  fecha: ['fecha', 'date'],
  peso: ['peso', 'weight'],
  porcentaje_grasa: ['porcentaje_grasa', '% grasa', 'grasa corporal', 'body fat', 'body fat %'],
  masa_muscular: ['masa_muscular', 'muscle mass', 'masa muscular'],
  grasa_visceral: ['grasa_visceral', 'visceral fat'],
  imc: ['imc', 'bmi'],
  porcentaje_agua: ['porcentaje_agua', '% agua', 'body water', 'agua corporal'],
  metabolismo_basal: ['metabolismo_basal', 'bmr', 'basal metabolic rate'],
};

// Quita acentos: normaliza a forma NFD (separa letra + marca diacritica) y
// luego elimina las marcas diacriticas con la propiedad unicode \p{Diacritic}.
function normalizarEncabezado(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function construirMapaDeColumnas(encabezados, alias) {
  const mapa = {}; // nombre_canonico -> nombre_real_de_columna
  const encabezadosNormalizados = encabezados.map(normalizarEncabezado);

  for (const [campoCanonico, posibles] of Object.entries(alias)) {
    const posiblesNormalizados = posibles.map(normalizarEncabezado);
    const indice = encabezadosNormalizados.findIndex((e) => posiblesNormalizados.includes(e));
    if (indice !== -1) {
      mapa[campoCanonico] = encabezados[indice];
    }
  }
  return mapa;
}

function aNumeroONull(valor) {
  if (valor === undefined || valor === null || valor.toString().trim() === '') return null;
  const n = Number(valor.toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parsearCSV(contenidoTexto, tipo) {
  const filas = parse(contenidoTexto, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (filas.length === 0) {
    return { registros: [], advertencias: ['El archivo CSV no tiene filas de datos.'] };
  }

  const encabezados = Object.keys(filas[0]);
  const alias = tipo === 'presion' ? ALIAS_PRESION : ALIAS_COMPOSICION;
  const mapa = construirMapaDeColumnas(encabezados, alias);

  if (!mapa.fecha) {
    return { registros: [], advertencias: ['No se encontro una columna de fecha reconocible.'] };
  }

  const advertencias = [];
  const registros = filas.map((fila, indice) => {
    if (tipo === 'presion') {
      const registro = {
        fecha: fila[mapa.fecha],
        momento_dia: mapa.momento_dia ? fila[mapa.momento_dia] : null,
        sistolica: aNumeroONull(fila[mapa.sistolica]),
        diastolica: aNumeroONull(fila[mapa.diastolica]),
        frecuencia_cardiaca: mapa.frecuencia_cardiaca ? aNumeroONull(fila[mapa.frecuencia_cardiaca]) : null,
        contexto: mapa.contexto ? fila[mapa.contexto] : null,
      };
      if (registro.sistolica === null || registro.diastolica === null) {
        advertencias.push(`Fila ${indice + 2}: falta sistolica o diastolica, revisar antes de guardar.`);
      }
      return registro;
    }

    return {
      fecha: fila[mapa.fecha],
      peso: mapa.peso ? aNumeroONull(fila[mapa.peso]) : null,
      porcentaje_grasa: mapa.porcentaje_grasa ? aNumeroONull(fila[mapa.porcentaje_grasa]) : null,
      masa_muscular: mapa.masa_muscular ? aNumeroONull(fila[mapa.masa_muscular]) : null,
      grasa_visceral: mapa.grasa_visceral ? aNumeroONull(fila[mapa.grasa_visceral]) : null,
      imc: mapa.imc ? aNumeroONull(fila[mapa.imc]) : null,
      porcentaje_agua: mapa.porcentaje_agua ? aNumeroONull(fila[mapa.porcentaje_agua]) : null,
      metabolismo_basal: mapa.metabolismo_basal ? aNumeroONull(fila[mapa.metabolismo_basal]) : null,
    };
  });

  return { registros, advertencias };
}

module.exports = { parsearCSV };
