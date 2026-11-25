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

// Construye una tarjeta de estadistica usando createElement + textContent
// (nunca innerHTML con datos del usuario/base de datos) para que un valor
// malicioso guardado en un registro (ej. via un CSV o una correccion en el
// historial) no pueda inyectar HTML/JS en esta pagina.
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

function dibujarEstadisticasPresion(lecturas) {
  const zona = document.getElementById('zona-estadisticas');
  zona.innerHTML = '';

  if (lecturas.length === 0) {
    const vacio = document.createElement('p');
    const enlace = document.createElement('a');
    enlace.href = '/subir.html';
    enlace.textContent = 'Sube tu primer documento';
    vacio.append('Aun no tienes lecturas guardadas. ', enlace, '.');
    zona.appendChild(vacio);
    return;
  }

  const ordenadas = [...lecturas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const ultima = ordenadas[ordenadas.length - 1];
  const promedioSistolica = promedio(ordenadas.map((l) => l.sistolica));
  const promedioDiastolica = promedio(ordenadas.map((l) => l.diastolica));

  zona.append(
    crearTarjetaEstadistica(`Ultima lectura (${ultima.fecha})`, `${ultima.sistolica}/${ultima.diastolica}`),
    crearTarjetaEstadistica('Promedio sistolica', promedioSistolica.toFixed(0)),
    crearTarjetaEstadistica('Promedio diastolica', promedioDiastolica.toFixed(0)),
    crearTarjetaEstadistica('Lecturas registradas', lecturas.length.toString())
  );
}

function promedio(numeros) {
  return numeros.reduce((suma, n) => suma + n, 0) / numeros.length;
}

cargarPaginaPresion();
