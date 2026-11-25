// public/grafica-lineas.js
//
// Gráfica de líneas en SVG puro (sin ninguna librería externa: nada de
// CDN, todo corre local). Dibuja una o varias series en el tiempo, con
// cuadricula tenue, marcadores en el extremo, etiqueta directa del
// ultimo valor, y un "crosshair" con tooltip al pasar el mouse. Si hay
// 2 o mas series, se muestra una leyenda; si es una sola, no (el titulo
// de la tarjeta ya dice que se esta mostrando).
//
// No incluye ninguna linea de referencia clinica: solo dibuja los
// valores que el usuario tiene guardados.

function crearGraficaLineas(idContenedor, series, opciones = {}) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const formatoValor = opciones.formatoValor || ((v) => v.toString());
  const ALTO = opciones.alto || 220;
  const MARGEN = { arriba: 20, derecha: 86, abajo: 28, izquierda: 44 };

  // --- 1. Preparar los datos: unir fechas, filtrar nulos por serie ---
  const seriesConDatos = series.map((s) => ({
    ...s,
    puntos: s.puntos
      .filter((p) => p.valor !== null && p.valor !== undefined)
      .map((p) => ({ fecha: new Date(p.fecha + 'T00:00:00'), valor: p.valor })),
  }));

  const todosLosPuntos = seriesConDatos.flatMap((s) => s.puntos);
  if (todosLosPuntos.length === 0) {
    contenedor.innerHTML = '<p style="color:#898781;">Todavia no hay datos suficientes para graficar.</p>';
    return;
  }

  const fechaMin = new Date(Math.min(...todosLosPuntos.map((p) => p.fecha.getTime())));
  const fechaMax = new Date(Math.max(...todosLosPuntos.map((p) => p.fecha.getTime())));
  const valores = todosLosPuntos.map((p) => p.valor);
  const { minimo, maximo, pasos } = calcularTicksLimpios(Math.min(...valores), Math.max(...valores));

  // --- 2. Medidas y escalas ---
  const ANCHO = contenedor.clientWidth || 600;
  const anchoGrafica = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoGrafica = ALTO - MARGEN.arriba - MARGEN.abajo;

  const rangoFechas = Math.max(1, fechaMax.getTime() - fechaMin.getTime());
  const escalaX = (fecha) => MARGEN.izquierda + ((fecha.getTime() - fechaMin.getTime()) / rangoFechas) * anchoGrafica;
  const escalaY = (valor) => MARGEN.arriba + altoGrafica - ((valor - minimo) / (maximo - minimo)) * altoGrafica;

  // --- 3. Construir el SVG ---
  const nsSvg = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(nsSvg, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', ALTO);
  svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', opciones.etiquetaAccesible || 'Grafica de evolucion en el tiempo');

  const colorGrid = getComputedStyle(contenedor.closest('.viz-root') || document.body).getPropertyValue('--viz-grid') || '#e1e0d9';
  const colorEje = getComputedStyle(contenedor.closest('.viz-root') || document.body).getPropertyValue('--viz-eje') || '#c3c2b7';
  const colorTextoMuted = getComputedStyle(contenedor.closest('.viz-root') || document.body).getPropertyValue('--viz-texto-muted') || '#898781';
  const colorTextoSec = getComputedStyle(contenedor.closest('.viz-root') || document.body).getPropertyValue('--viz-texto-sec') || '#52514e';

  // Gridlines horizontales (hairline, recesivas) + etiquetas del eje Y.
  pasos.forEach((valorTick) => {
    const y = escalaY(valorTick);
    const linea = document.createElementNS(nsSvg, 'line');
    linea.setAttribute('x1', MARGEN.izquierda);
    linea.setAttribute('x2', ANCHO - MARGEN.derecha);
    linea.setAttribute('y1', y);
    linea.setAttribute('y2', y);
    linea.setAttribute('stroke', colorGrid);
    linea.setAttribute('stroke-width', '1');
    svg.appendChild(linea);

    const etiqueta = document.createElementNS(nsSvg, 'text');
    etiqueta.setAttribute('x', MARGEN.izquierda - 8);
    etiqueta.setAttribute('y', y + 3);
    etiqueta.setAttribute('text-anchor', 'end');
    etiqueta.setAttribute('font-size', '10');
    etiqueta.setAttribute('fill', colorTextoMuted);
    etiqueta.textContent = formatoValor(valorTick);
    svg.appendChild(etiqueta);
  });

  // Eje X: unas pocas fechas de muestra para no saturar.
  const etiquetasX = seleccionarFechasMuestra(todosLosPuntos.map((p) => p.fecha), 5);
  etiquetasX.forEach((fecha) => {
    const x = escalaX(fecha);
    const etiqueta = document.createElementNS(nsSvg, 'text');
    etiqueta.setAttribute('x', x);
    etiqueta.setAttribute('y', ALTO - 8);
    etiqueta.setAttribute('text-anchor', 'middle');
    etiqueta.setAttribute('font-size', '10');
    etiqueta.setAttribute('fill', colorTextoMuted);
    etiqueta.textContent = formatearFechaCorta(fecha);
    svg.appendChild(etiqueta);
  });

  // Linea base del eje X.
  const ejeBase = document.createElementNS(nsSvg, 'line');
  ejeBase.setAttribute('x1', MARGEN.izquierda);
  ejeBase.setAttribute('x2', ANCHO - MARGEN.derecha);
  ejeBase.setAttribute('y1', MARGEN.arriba + altoGrafica);
  ejeBase.setAttribute('y2', MARGEN.arriba + altoGrafica);
  ejeBase.setAttribute('stroke', colorEje);
  ejeBase.setAttribute('stroke-width', '1');
  svg.appendChild(ejeBase);

  // Lineas de cada serie + marcador final + etiqueta directa del ultimo valor.
  seriesConDatos.forEach((serie) => {
    if (serie.puntos.length === 0) return;

    const puntosOrdenados = [...serie.puntos].sort((a, b) => a.fecha - b.fecha);
    const d = puntosOrdenados
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${escalaX(p.fecha)} ${escalaY(p.valor)}`)
      .join(' ');

    const path = document.createElementNS(nsSvg, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', serie.color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    const ultimo = puntosOrdenados[puntosOrdenados.length - 1];
    const cx = escalaX(ultimo.fecha);
    const cy = escalaY(ultimo.valor);

    const marcador = document.createElementNS(nsSvg, 'circle');
    marcador.setAttribute('cx', cx);
    marcador.setAttribute('cy', cy);
    marcador.setAttribute('r', '5');
    marcador.setAttribute('fill', serie.color);
    marcador.setAttribute('stroke', 'var(--viz-surface)');
    marcador.setAttribute('stroke-width', '2');
    svg.appendChild(marcador);

    const etiquetaValor = document.createElementNS(nsSvg, 'text');
    etiquetaValor.setAttribute('x', cx + 10);
    etiquetaValor.setAttribute('y', cy + 4);
    etiquetaValor.setAttribute('font-size', '11');
    etiquetaValor.setAttribute('font-weight', '600');
    etiquetaValor.setAttribute('fill', colorTextoSec);
    etiquetaValor.textContent = formatoValor(ultimo.valor);
    svg.appendChild(etiquetaValor);
  });

  // --- 4. Crosshair + tooltip (capa de interaccion) ---
  const lineaCrosshair = document.createElementNS(nsSvg, 'line');
  lineaCrosshair.setAttribute('y1', MARGEN.arriba);
  lineaCrosshair.setAttribute('y2', MARGEN.arriba + altoGrafica);
  lineaCrosshair.setAttribute('stroke', colorEje);
  lineaCrosshair.setAttribute('stroke-width', '1');
  lineaCrosshair.setAttribute('visibility', 'hidden');
  svg.appendChild(lineaCrosshair);

  const capaHit = document.createElementNS(nsSvg, 'rect');
  capaHit.setAttribute('x', MARGEN.izquierda);
  capaHit.setAttribute('y', MARGEN.arriba);
  capaHit.setAttribute('width', anchoGrafica);
  capaHit.setAttribute('height', altoGrafica);
  capaHit.setAttribute('fill', 'transparent');
  svg.appendChild(capaHit);

  // --- 5. Montar en el DOM ---
  contenedor.innerHTML = '';

  if (seriesConDatos.length > 1) {
    const leyenda = document.createElement('div');
    leyenda.className = 'grafica-leyenda';
    seriesConDatos.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'item';
      const llave = document.createElement('span');
      llave.className = 'llave';
      llave.style.backgroundColor = s.color;
      const texto = document.createElement('span');
      texto.textContent = s.nombre; // textContent: nunca innerHTML con datos del usuario
      item.append(llave, texto);
      leyenda.appendChild(item);
    });
    contenedor.appendChild(leyenda);
  }

  const envoltorioSvg = document.createElement('div');
  envoltorioSvg.className = 'grafica-svg-wrap';
  const tooltip = document.createElement('div');
  tooltip.className = 'grafica-tooltip';
  tooltip.hidden = true;
  envoltorioSvg.append(svg, tooltip);
  contenedor.appendChild(envoltorioSvg);

  capaHit.addEventListener('pointermove', (evento) => {
    const rect = svg.getBoundingClientRect();
    const xRelativo = ((evento.clientX - rect.left) / rect.width) * ANCHO;
    const fechaAproximada = new Date(fechaMin.getTime() + ((xRelativo - MARGEN.izquierda) / anchoGrafica) * rangoFechas);

    let masCercano = todosLosPuntos[0];
    let distanciaMin = Infinity;
    todosLosPuntos.forEach((p) => {
      const distancia = Math.abs(p.fecha.getTime() - fechaAproximada.getTime());
      if (distancia < distanciaMin) {
        distanciaMin = distancia;
        masCercano = p;
      }
    });

    const x = escalaX(masCercano.fecha);
    lineaCrosshair.setAttribute('x1', x);
    lineaCrosshair.setAttribute('x2', x);
    lineaCrosshair.setAttribute('visibility', 'visible');

    tooltip.innerHTML = '';
    const titulo = document.createElement('div');
    titulo.style.fontWeight = '700';
    titulo.style.marginBottom = '0.25rem';
    titulo.textContent = formatearFechaCorta(masCercano.fecha);
    tooltip.appendChild(titulo);

    seriesConDatos.forEach((s) => {
      const puntoEnFecha = s.puntos.find((p) => p.fecha.getTime() === masCercano.fecha.getTime());
      if (!puntoEnFecha) return;
      const fila = document.createElement('div');
      fila.className = 'fila';
      const llave = document.createElement('span');
      llave.className = 'llave';
      llave.style.backgroundColor = s.color;
      const nombre = document.createElement('span');
      nombre.textContent = s.nombre;
      const valor = document.createElement('span');
      valor.className = 'valor';
      valor.textContent = formatoValor(puntoEnFecha.valor);
      fila.append(llave, nombre, valor);
      tooltip.appendChild(fila);
    });

    tooltip.hidden = false;
    tooltip.style.left = `${(x / ANCHO) * envoltorioSvg.clientWidth}px`;
    tooltip.style.top = `${escalaY(masCercano.valor ?? minimo)}px`;
  });

  capaHit.addEventListener('pointerleave', () => {
    lineaCrosshair.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  });

  // --- 6. Alternativa accesible: tabla de datos (siempre reconstruible sin el grafico) ---
  const botonTabla = document.createElement('button');
  botonTabla.className = 'grafica-toggle-tabla';
  botonTabla.textContent = 'Ver tabla de datos';

  const tabla = document.createElement('table');
  tabla.className = 'grafica-tabla';
  tabla.hidden = true;
  const fechasUnicas = [...new Set(todosLosPuntos.map((p) => p.fecha.getTime()))].sort();
  const filasHtml = fechasUnicas
    .map((tiempo) => {
      const fecha = new Date(tiempo);
      const celdas = seriesConDatos
        .map((s) => {
          const punto = s.puntos.find((p) => p.fecha.getTime() === tiempo);
          return `<td>${punto ? formatoValor(punto.valor) : '-'}</td>`;
        })
        .join('');
      return `<tr><td>${formatearFechaCorta(fecha)}</td>${celdas}</tr>`;
    })
    .join('');
  tabla.innerHTML = `
    <thead><tr><th>Fecha</th>${seriesConDatos.map((s) => `<th>${s.nombre}</th>`).join('')}</tr></thead>
    <tbody>${filasHtml}</tbody>
  `;

  botonTabla.addEventListener('click', () => {
    tabla.hidden = !tabla.hidden;
    botonTabla.textContent = tabla.hidden ? 'Ver tabla de datos' : 'Ocultar tabla de datos';
  });

  contenedor.append(botonTabla, tabla);
}

function calcularTicksLimpios(min, max) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rango = max - min;
  const pasoBruto = rango / 4;
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoBruto)));
  const normalizado = pasoBruto / magnitud;
  let paso;
  if (normalizado < 1.5) paso = 1 * magnitud;
  else if (normalizado < 3) paso = 2 * magnitud;
  else if (normalizado < 7) paso = 5 * magnitud;
  else paso = 10 * magnitud;

  const minimo = Math.floor(min / paso) * paso;
  const maximo = Math.ceil(max / paso) * paso;
  const pasos = [];
  for (let v = minimo; v <= maximo + paso * 0.01; v += paso) {
    pasos.push(Math.round(v * 100) / 100);
  }
  return { minimo, maximo, pasos };
}

function seleccionarFechasMuestra(fechas, cantidad) {
  const unicas = [...new Set(fechas.map((f) => f.getTime()))].sort((a, b) => a - b).map((t) => new Date(t));
  if (unicas.length <= cantidad) return unicas;
  const resultado = [];
  for (let i = 0; i < cantidad; i++) {
    const indice = Math.round((i / (cantidad - 1)) * (unicas.length - 1));
    resultado.push(unicas[indice]);
  }
  return resultado;
}

function formatearFechaCorta(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
