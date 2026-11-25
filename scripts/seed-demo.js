// scripts/seed-demo.js
//
// Genera datos de ejemplo FICTICIOS (no son datos reales de nadie) para
// que cualquiera que clone este repositorio pueda ver la app funcionando
// de inmediato, sin tener que subir documentos propios.
//
// OJO: este script BORRA lo que haya en la base de datos local y lo
// reemplaza por estos datos de ejemplo. Util para dejar la demo "de
// fabrica", pero no lo corras si ya tienes tus datos reales guardados
// y quieres conservarlos.
//
// Como usarlo:
//   npm run seed

const db = require('../data/db');

function sumarDias(fechaBase, dias) {
  const fecha = new Date(fechaBase);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function ruido(maximo) {
  return Math.round((Math.random() - 0.5) * maximo * 2 * 10) / 10;
}

function limpiarTablas() {
  db.db.exec('DELETE FROM presion_arterial; DELETE FROM composicion_corporal; DELETE FROM documentos_subidos;');
}

function generarPresion(fechaInicio, semanas) {
  const contextos = ['en reposo', 'en ayunas', null];
  const momentos = ['mañana', 'tarde', null];

  for (let i = 0; i < semanas; i++) {
    // Tendencia ficticia: va mejorando levemente semana a semana.
    const sistolicaBase = 142 - i * 1.1;
    const diastolicaBase = 92 - i * 0.7;

    db.crearPresion({
      fecha: sumarDias(fechaInicio, i * 7),
      momento_dia: momentos[i % momentos.length],
      sistolica: Math.round(sistolicaBase + ruido(3)),
      diastolica: Math.round(diastolicaBase + ruido(2)),
      frecuencia_cardiaca: Math.round(72 + ruido(4)),
      contexto: contextos[i % contextos.length],
      fuente_documento: 'demo-generado',
    });
  }
}

function generarComposicion(fechaInicio, semanas) {
  for (let i = 0; i < semanas; i++) {
    const pesoBase = 82 - i * 0.35;
    const grasaBase = 31 - i * 0.3;
    const musculoBase = 32 + i * 0.15;

    db.crearComposicion({
      fecha: sumarDias(fechaInicio, i * 7),
      peso: Math.round((pesoBase + ruido(0.6)) * 10) / 10,
      porcentaje_grasa: Math.round((grasaBase + ruido(0.8)) * 10) / 10,
      masa_muscular: Math.round((musculoBase + ruido(0.4)) * 10) / 10,
      grasa_visceral: Math.max(1, Math.round(12 - i * 0.2)),
      imc: Math.round((29 - i * 0.12 + ruido(0.3)) * 10) / 10,
      porcentaje_agua: Math.round((52 + i * 0.1 + ruido(1)) * 10) / 10,
      metabolismo_basal: Math.round(1550 + ruido(30)),
      fuente_documento: 'demo-generado',
    });
  }
}

function main() {
  console.log('Generando datos de ejemplo (ficticios) y reemplazando la base de datos local...');
  limpiarTablas();

  const fechaInicio = '2025-09-01';
  const semanas = 16;

  generarPresion(fechaInicio, semanas);
  generarComposicion(fechaInicio, semanas);

  console.log(`Listo: ${semanas} lecturas de presion y ${semanas} mediciones de composicion corporal (datos ficticios).`);
}

main();
