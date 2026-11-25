// public/index.js
//
// Pagina de resumen: trae las dos fuentes de datos y muestra unas pocas
// estadisticas clave de cada una.

async function cargarResumen() {
  const [presion, composicion] = await Promise.all([
    fetch('/api/presion').then((r) => r.json()),
    fetch('/api/composicion').then((r) => r.json()),
  ]);

  const zona = document.getElementById('zona-resumen');
  const tarjetas = [];

  if (presion.length > 0) {
    const ultima = [...presion].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).pop();
    tarjetas.push(crearTarjeta('Ultima presion', `${ultima.sistolica}/${ultima.diastolica}`, ultima.fecha));
  } else {
    tarjetas.push(crearTarjeta('Presion arterial', 'Sin datos', ''));
  }

  if (composicion.length > 0) {
    const ultima = [...composicion].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).pop();
    tarjetas.push(crearTarjeta('Ultimo peso', ultima.peso !== null ? `${ultima.peso} kg` : 'Sin dato', ultima.fecha));
  } else {
    tarjetas.push(crearTarjeta('Composicion corporal', 'Sin datos', ''));
  }

  tarjetas.push(crearTarjeta('Lecturas de presion', presion.length.toString(), 'total'));
  tarjetas.push(crearTarjeta('Mediciones de composicion', composicion.length.toString(), 'total'));

  zona.innerHTML = '';
  tarjetas.forEach((t) => zona.appendChild(t));
}

function crearTarjeta(etiqueta, valor, subetiqueta) {
  const div = document.createElement('div');
  div.className = 'estadistica';

  const elEtiqueta = document.createElement('div');
  elEtiqueta.className = 'etiqueta';
  elEtiqueta.textContent = etiqueta;

  const elValor = document.createElement('div');
  elValor.className = 'valor';
  elValor.textContent = valor;

  div.append(elEtiqueta, elValor);

  if (subetiqueta) {
    const elSub = document.createElement('div');
    elSub.className = 'etiqueta';
    elSub.textContent = subetiqueta;
    div.appendChild(elSub);
  }

  return div;
}

cargarResumen();
