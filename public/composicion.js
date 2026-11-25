// public/composicion.js
//
// Carga las mediciones de composicion corporal. Cada metrica tiene su
// propia unidad (kg, %), asi que se grafica por separado - nunca dos
// unidades distintas comparten el mismo eje vertical.

async function cargarPaginaComposicion() {
  const respuesta = await fetch('/api/composicion');
  const mediciones = await respuesta.json();

  dibujarEstadisticasComposicion(mediciones);

  crearGraficaLineas(
    'grafica-peso',
    [{ nombre: 'Peso', color: 'var(--viz-serie-1)', puntos: mediciones.map((m) => ({ fecha: m.fecha, valor: m.peso })) }],
    { formatoValor: (v) => `${v} kg`, etiquetaAccesible: 'Evolucion del peso en el tiempo' }
  );

  crearGraficaLineas(
    'grafica-grasa',
    [{ nombre: '% Grasa', color: 'var(--viz-serie-2)', puntos: mediciones.map((m) => ({ fecha: m.fecha, valor: m.porcentaje_grasa })) }],
    { formatoValor: (v) => `${v}%`, etiquetaAccesible: 'Evolucion del porcentaje de grasa corporal en el tiempo' }
  );

  crearGraficaLineas(
    'grafica-musculo',
    [{ nombre: 'Masa muscular', color: 'var(--viz-serie-3)', puntos: mediciones.map((m) => ({ fecha: m.fecha, valor: m.masa_muscular })) }],
    { formatoValor: (v) => `${v} kg`, etiquetaAccesible: 'Evolucion de la masa muscular en el tiempo' }
  );
}

// createElement + textContent (nunca innerHTML con datos del usuario/base
// de datos): un valor malicioso guardado en un registro no debe poder
// inyectar HTML/JS en esta pagina.
function crearTarjetaEstadistica(etiqueta, valor) {
  const div = document.createElement('div');
  div.className = 'estadistica';
  const elEtiqueta = document.createElement('div');
  elEtiqueta.className = 'etiqueta';
  elEtiqueta.textContent = etiqueta;
  const elValor = document.createElement('div');
  elValor.className = 'valor';
  elValor.textContent = valor;
  div.append(elEtiqueta, elValor);
  return div;
}

function dibujarEstadisticasComposicion(mediciones) {
  const zona = document.getElementById('zona-estadisticas');
  zona.innerHTML = '';

  if (mediciones.length === 0) {
    const vacio = document.createElement('p');
    const enlace = document.createElement('a');
    enlace.href = '/subir.html';
    enlace.textContent = 'Sube tu primer documento';
    vacio.append('Aun no tienes mediciones guardadas. ', enlace, '.');
    zona.appendChild(vacio);
    return;
  }

  const ordenadas = [...mediciones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const ultima = ordenadas[ordenadas.length - 1];

  zona.append(
    crearTarjetaEstadistica(`Ultima medicion (${ultima.fecha})`, `${ultima.peso ?? '-'} kg`),
    crearTarjetaEstadistica('% Grasa', `${ultima.porcentaje_grasa ?? '-'}`),
    crearTarjetaEstadistica('Masa muscular', `${ultima.masa_muscular ?? '-'} kg`),
    crearTarjetaEstadistica('Mediciones registradas', mediciones.length.toString())
  );
}

cargarPaginaComposicion();
