// public/presion.js
//
// Carga las lecturas de presion arterial y las muestra como estadisticas
// simples + una grafica de tendencia (sistolica/diastolica).

async function cargarPaginaPresion() {
  const respuesta = await fetch('/api/presion');
  const lecturas = await respuesta.json();

  dibujarEstadisticasPresion(lecturas);

  crearGraficaLineas(
    'grafica-presion',
    [
      {
        nombre: 'Sistolica',
        color: 'var(--viz-serie-1)',
        puntos: lecturas.map((l) => ({ fecha: l.fecha, valor: l.sistolica })),
      },
      {
        nombre: 'Diastolica',
        color: 'var(--viz-serie-2)',
        puntos: lecturas.map((l) => ({ fecha: l.fecha, valor: l.diastolica })),
      },
    ],
    {
      formatoValor: (v) => `${Math.round(v)}`,
      etiquetaAccesible: 'Evolucion de presion sistolica y diastolica en el tiempo',
    }
  );
}

function dibujarEstadisticasPresion(lecturas) {
  const zona = document.getElementById('zona-estadisticas');

  if (lecturas.length === 0) {
    zona.innerHTML = '<p>Aun no tienes lecturas guardadas. <a href="/subir.html">Sube tu primer documento</a>.</p>';
    return;
  }

  const ordenadas = [...lecturas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const ultima = ordenadas[ordenadas.length - 1];
  const promedioSistolica = promedio(ordenadas.map((l) => l.sistolica));
  const promedioDiastolica = promedio(ordenadas.map((l) => l.diastolica));

  zona.innerHTML = `
    <div class="estadistica">
      <div class="etiqueta">Ultima lectura (${ultima.fecha})</div>
      <div class="valor">${ultima.sistolica}/${ultima.diastolica}</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">Promedio sistolica</div>
      <div class="valor">${promedioSistolica.toFixed(0)}</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">Promedio diastolica</div>
      <div class="valor">${promedioDiastolica.toFixed(0)}</div>
    </div>
    <div class="estadistica">
      <div class="etiqueta">Lecturas registradas</div>
      <div class="valor">${lecturas.length}</div>
    </div>
  `;
}

function promedio(numeros) {
  return numeros.reduce((suma, n) => suma + n, 0) / numeros.length;
}

cargarPaginaPresion();
