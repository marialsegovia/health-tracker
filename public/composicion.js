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

function dibujarEstadisticasComposicion(mediciones) {
  const zona = document.getElementById('zona-estadisticas');

  if (mediciones.length === 0) {
    zona.innerHTML = '<p>Aun no tienes mediciones guardadas. <a href="/subir.html">Sube tu primer documento</a>.</p>';
    return;
  }

  const ordenadas = [...mediciones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const ultima = ordenadas[ordenadas.length - 1];

  zona.innerHTML = `
    <div class="estadistica">
      <div class="etiqueta">Ultima medicion (${ultima.fecha})</div>
      <div class="valor">${ultima.peso ?? '-'} kg</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">% Grasa</div>
      <div class="valor">${ultima.porcentaje_grasa ?? '-'}</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">Masa muscular</div>
      <div class="valor">${ultima.masa_muscular ?? '-'} kg</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">Mediciones registradas</div>
      <div class="valor">${mediciones.length}</div>
    </div>
  `;
}

cargarPaginaComposicion();
