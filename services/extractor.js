// services/extractor.js
//
// Llama a la API de Claude para extraer datos estructurados de un PDF o una
// foto (por ejemplo, un resultado de laboratorio o un reporte de una
// bascula de composicion corporal). El documento se envia una sola vez a
// la API de Anthropic para que Claude lo lea; no se publica ni se guarda
// alla - es el mismo nivel de confianza que pegar informacion en una
// conversacion normal de Claude.
//
// Se usa "salida estructurada" (output_config.format): en vez de pedirle a
// Claude texto libre y tener que interpretarlo despues, se le da el
// "molde" exacto de datos que esperamos (un JSON Schema) y la respuesta
// llega garantizada en ese formato exacto - sin necesidad de librerias
// externas de validacion.

const Anthropic = require('@anthropic-ai/sdk');

const MODELO = 'claude-opus-5';

const client = new Anthropic();

function campoTexto(descripcion) {
  return { type: 'string', description: descripcion };
}

function campoTextoNulo(descripcion) {
  return { anyOf: [{ type: 'string' }, { type: 'null' }], description: descripcion };
}

function campoNumero(descripcion) {
  return { type: 'number', description: descripcion };
}

function campoNumeroNulo(descripcion) {
  return { anyOf: [{ type: 'number' }, { type: 'null' }], description: descripcion };
}

const ESQUEMA_PRESION = {
  type: 'object',
  properties: {
    registros: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fecha: campoTexto('Fecha de la lectura en formato ISO AAAA-MM-DD'),
          momento_dia: campoTextoNulo('Ej: mañana, tarde, noche. Usa null si no se indica.'),
          sistolica: campoNumero('Presion sistolica en mmHg'),
          diastolica: campoNumero('Presion diastolica en mmHg'),
          frecuencia_cardiaca: campoNumeroNulo('Frecuencia cardiaca en latidos por minuto, si aparece'),
          contexto: campoTextoNulo('Ej: en ayunas, en reposo. Usa null si no se indica.'),
        },
        required: ['fecha', 'momento_dia', 'sistolica', 'diastolica', 'frecuencia_cardiaca', 'contexto'],
        additionalProperties: false,
      },
    },
  },
  required: ['registros'],
  additionalProperties: false,
};

const ESQUEMA_COMPOSICION = {
  type: 'object',
  properties: {
    registros: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fecha: campoTexto('Fecha de la medicion en formato ISO AAAA-MM-DD'),
          peso: campoNumeroNulo('Peso en kilogramos'),
          porcentaje_grasa: campoNumeroNulo('Porcentaje de grasa corporal'),
          masa_muscular: campoNumeroNulo('Masa muscular en kilogramos'),
          grasa_visceral: campoNumeroNulo('Nivel de grasa visceral'),
          imc: campoNumeroNulo('Indice de masa corporal'),
          porcentaje_agua: campoNumeroNulo('Porcentaje de agua corporal'),
          metabolismo_basal: campoNumeroNulo('Metabolismo basal (BMR) en kilocalorias'),
        },
        required: [
          'fecha', 'peso', 'porcentaje_grasa', 'masa_muscular',
          'grasa_visceral', 'imc', 'porcentaje_agua', 'metabolismo_basal',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['registros'],
  additionalProperties: false,
};

const INSTRUCCION_PRESION = `
Este documento (PDF o foto) deberia contener una o mas lecturas de presion
arterial. Extrae cada lectura que encuentres como un registro separado.

Reglas importantes:
- Convierte todas las fechas al formato ISO AAAA-MM-DD.
- Si un dato no aparece claramente en el documento, usa null - nunca
  inventes ni aproximes un valor que no puedas leer con certeza.
- Si el documento no contiene ninguna lectura de presion arterial
  reconocible, devuelve una lista de registros vacia.
`.trim();

const INSTRUCCION_COMPOSICION = `
Este documento (PDF o foto) deberia contener una o mas mediciones de
composicion corporal (de una bascula inteligente, un InBody, etc.).
Extrae cada medicion que encuentres como un registro separado.

Reglas importantes:
- Convierte todas las fechas al formato ISO AAAA-MM-DD.
- Si un dato no aparece claramente en el documento, usa null - nunca
  inventes ni aproximes un valor que no puedas leer con certeza.
- Si el documento no contiene ninguna medicion de composicion corporal
  reconocible, devuelve una lista de registros vacia.
`.trim();

function construirBloqueDocumento(buffer, mimetype) {
  const datosBase64 = buffer.toString('base64');

  if (mimetype === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: datosBase64 },
    };
  }

  return {
    type: 'image',
    source: { type: 'base64', media_type: mimetype, data: datosBase64 },
  };
}

async function extraerDeDocumento(buffer, mimetype, tipo) {
  const esquema = tipo === 'presion' ? ESQUEMA_PRESION : ESQUEMA_COMPOSICION;
  const instruccion = tipo === 'presion' ? INSTRUCCION_PRESION : INSTRUCCION_COMPOSICION;
  const bloqueDocumento = construirBloqueDocumento(buffer, mimetype);

  const respuesta = await client.messages.create({
    model: MODELO,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [bloqueDocumento, { type: 'text', text: instruccion }],
      },
    ],
    output_config: { format: { type: 'json_schema', schema: esquema } },
  });

  if (respuesta.stop_reason === 'refusal') {
    throw new Error('Claude no pudo procesar este documento (fue rechazado por los filtros de seguridad).');
  }

  const bloqueTexto = respuesta.content.find((bloque) => bloque.type === 'text');
  if (!bloqueTexto) {
    throw new Error('La respuesta de Claude no tuvo el formato esperado. Intenta de nuevo.');
  }

  const datos = JSON.parse(bloqueTexto.text);
  const registros = datos.registros;
  const advertencias =
    registros.length === 0
      ? ['No se encontraron registros reconocibles en el documento. Puedes intentar con otra foto/escaneo, o verificar que el tipo seleccionado sea correcto.']
      : [];

  return { registros, advertencias };
}

module.exports = { extraerDeDocumento };
