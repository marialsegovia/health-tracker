// public/nav.js
//
// Barra de navegacion compartida entre todas las paginas. Se inserta en
// cada pagina con un solo <script> y un <div id="nav-contenedor">, para no
// repetir el mismo HTML en cada archivo.

function dibujarNav(paginaActiva) {
  const enlaces = [
    { href: '/', texto: 'Resumen', id: 'index' },
    { href: '/presion.html', texto: 'Presion arterial', id: 'presion' },
    { href: '/composicion.html', texto: 'Composicion corporal', id: 'composicion' },
    { href: '/subir.html', texto: 'Subir documento', id: 'subir' },
    { href: '/historial.html', texto: 'Historial', id: 'historial' },
  ];

  const contenedor = document.getElementById('nav-contenedor');
  if (!contenedor) return;

  const html = enlaces
    .map((e) => `<a href="${e.href}" class="${e.id === paginaActiva ? 'activo' : ''}">${e.texto}</a>`)
    .join('');

  contenedor.innerHTML = `<strong>Health Tracker</strong>${html}`;
}
