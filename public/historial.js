// public/historial.js
//
// Lista todos los registros guardados (presion y composicion) en una
// tabla con botones para corregir o eliminar. Cualquier campo de texto
// libre (contexto, notas, fuente del documento) se inserta con
// textContent, nunca con innerHTML, porque ese texto puede venir de un
// documento subido y no debe interpretarse como HTML.

const COLUMNAS_PRESION = [
  { clave: 'fecha', etiqueta: 'Fecha' },
  { clave: 'sistolica', etiqueta: 'Sistolica' },
  { clave: 'diastolica', etiqueta: 'Diastolica' },
  { clave: 'frecuencia_cardiaca', etiqueta: 'Frec. cardiaca' },
  { clave: 'momento_dia', etiqueta: 'Momento' },
  { clave: 'contexto', etiqueta: 'Contexto' },
  { clave: 'fuente_documento', etiqueta: 'Fuente' },
];

const COLUMNAS_COMPOSICION = [
  { clave: 'fecha', etiqueta: 'Fecha' },
  { clave: 'peso', etiqueta: 'Peso' },
  { clave: 'porcentaje_grasa', etiqueta: '% Grasa' },
  { clave: 'masa_muscular', etiqueta: 'M. muscular' },
  { clave: 'grasa_visceral', etiqueta: 'G. visceral' },
  { clave: 'imc', etiqueta: 'IMC' },
  { clave: 'porcentaje_agua', etiqueta: '% Agua' },
  { clave: 'metabolismo_basal', etiqueta: 'Metabolismo' },
  { clave: 'fuente_documento', etiqueta: 'Fuente' },
];

async function cargarHistorial() {
  const [presion, composicion] = await Promise.all([
    fetch('/api/presion').then((r) => r.json()),
    fetch('/api/composicion').then((r) => r.json()),
  ]);

  dibujarTabla('tabla-presion', COLUMNAS_PRESION, presion, '/api/presion');
  dibujarTabla('tabla-composicion', COLUMNAS_COMPOSICION, composicion, '/api/composicion');
}

function dibujarTabla(idContenedor, columnas, registros, rutaApi) {
  const contenedor = document.getElementById(idContenedor);
  contenedor.innerHTML = '';

  if (registros.length === 0) {
    const vacio = document.createElement('p');
    vacio.textContent = 'Todavia no hay registros.';
    contenedor.appendChild(vacio);
    return;
  }

  const tabla = document.createElement('table');
  const encabezado = document.createElement('tr');
  columnas.forEach((c) => {
    const th = document.createElement('th');
    th.textContent = c.etiqueta;
    encabezado.appendChild(th);
  });
  encabezado.appendChild(document.createElement('th')); // columna de acciones
  const thead = document.createElement('thead');
  thead.appendChild(encabezado);
  tabla.appendChild(thead);

  const tbody = document.createElement('tbody');
  [...registros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach((registro) => {
    tbody.appendChild(crearFila(registro, columnas, rutaApi));
  });
  tabla.appendChild(tbody);

  contenedor.appendChild(tabla);
}

function crearFila(registro, columnas, rutaApi) {
  const fila = document.createElement('tr');
  let enEdicion = false;

  function renderizar() {
    fila.innerHTML = '';
    columnas.forEach((columna) => {
      const td = document.createElement('td');
      const valor = registro[columna.clave];

      if (enEdicion && columna.clave !== 'fuente_documento') {
        const input = document.createElement('input');
        input.type = columna.clave === 'fecha' ? 'date' : typeof valor === 'number' ? 'number' : 'text';
        input.value = valor ?? '';
        input.dataset.campo = columna.clave;
        td.appendChild(input);
      } else {
        td.textContent = valor ?? '-'; // textContent: seguro con texto libre
      }
      fila.appendChild(td);
    });

    const tdAcciones = document.createElement('td');

    if (enEdicion) {
      const botonGuardar = document.createElement('button');
      botonGuardar.textContent = 'Guardar';
      botonGuardar.addEventListener('click', async () => {
        const cambios = {};
        fila.querySelectorAll('input[data-campo]').forEach((input) => {
          cambios[input.dataset.campo] = input.value === '' ? null : input.value;
        });
        const respuesta = await fetch(`${rutaApi}/${registro.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cambios),
        });
        if (respuesta.ok) {
          Object.assign(registro, await respuesta.json());
          enEdicion = false;
          renderizar();
        } else {
          alert('No se pudo guardar el cambio.');
        }
      });

      const botonCancelar = document.createElement('button');
      botonCancelar.className = 'secundario';
      botonCancelar.textContent = 'Cancelar';
      botonCancelar.addEventListener('click', () => {
        enEdicion = false;
        renderizar();
      });

      tdAcciones.append(botonGuardar, botonCancelar);
    } else {
      const botonEditar = document.createElement('button');
      botonEditar.textContent = 'Editar';
      botonEditar.addEventListener('click', () => {
        enEdicion = true;
        renderizar();
      });

      const botonEliminar = document.createElement('button');
      botonEliminar.className = 'secundario';
      botonEliminar.textContent = 'Eliminar';
      botonEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este registro? Esta accion no se puede deshacer.')) return;
        const respuesta = await fetch(`${rutaApi}/${registro.id}`, { method: 'DELETE' });
        if (respuesta.ok) {
          fila.remove();
        } else {
          alert('No se pudo eliminar el registro.');
        }
      });

      tdAcciones.append(botonEditar, botonEliminar);
    }

    fila.appendChild(tdAcciones);
  }

  renderizar();
  return fila;
}

cargarHistorial();
