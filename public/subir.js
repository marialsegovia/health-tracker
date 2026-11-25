// public/subir.js
//
// Logica de la pagina de carga: envia el archivo al backend, muestra la
// tabla editable con lo que se extrajo, y guarda las filas que el usuario
// confirme. Nada se guarda en la base de datos hasta que el usuario hace
// clic en "Guardar filas marcadas".

const COLUMNAS = {
  presion: [
    { clave: 'fecha', etiqueta: 'Fecha' },
    { clave: 'momento_dia', etiqueta: 'Momento del dia' },
    { clave: 'sistolica', etiqueta: 'Sistolica' },
    { clave: 'diastolica', etiqueta: 'Diastolica' },
    { clave: 'frecuencia_cardiaca', etiqueta: 'Frec. cardiaca' },
    { clave: 'contexto', etiqueta: 'Contexto' },
  ],
  composicion: [
    { clave: 'fecha', etiqueta: 'Fecha' },
    { clave: 'peso', etiqueta: 'Peso (kg)' },
    { clave: 'porcentaje_grasa', etiqueta: '% Grasa' },
    { clave: 'masa_muscular', etiqueta: 'Masa muscular (kg)' },
    { clave: 'grasa_visceral', etiqueta: 'Grasa visceral' },
    { clave: 'imc', etiqueta: 'IMC' },
    { clave: 'porcentaje_agua', etiqueta: '% Agua' },
    { clave: 'metabolismo_basal', etiqueta: 'Metabolismo basal' },
  ],
};

const CAMPOS_NUMERICOS = new Set([
  'sistolica', 'diastolica', 'frecuencia_cardiaca',
  'peso', 'porcentaje_grasa', 'masa_muscular', 'grasa_visceral',
  'imc', 'porcentaje_agua', 'metabolismo_basal',
]);

const zonaMensajes = document.getElementById('zona-mensajes');
const zonaResultado = document.getElementById('zona-resultado');
const formulario = document.getElementById('formulario-subir');
const botonSubir = document.getElementById('boton-subir');

function mostrarMensaje(texto, tipoClase) {
  zonaMensajes.innerHTML = `<div class="${tipoClase}">${texto}</div>`;
}

function limpiarMensajes() {
  zonaMensajes.innerHTML = '';
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarMensajes();
  zonaResultado.innerHTML = '';

  const tipo = document.getElementById('campo-tipo').value;
  const archivoInput = document.getElementById('campo-archivo');
  const archivo = archivoInput.files[0];

  if (!archivo) {
    mostrarMensaje('Selecciona un archivo primero.', 'mensaje-error');
    return;
  }

  const datosFormulario = new FormData();
  datosFormulario.append('tipo', tipo);
  datosFormulario.append('archivo', archivo);

  botonSubir.disabled = true;
  botonSubir.textContent = 'Analizando...';

  try {
    const respuesta = await fetch('/api/subir', { method: 'POST', body: datosFormulario });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(datos.error || 'No se pudo procesar el archivo.', 'mensaje-error');
      return;
    }

    dibujarTablaResultado(tipo, datos.registros, datos.advertencias, archivo.name);
  } catch (error) {
    mostrarMensaje('Error de conexion con el servidor: ' + error.message, 'mensaje-error');
  } finally {
    botonSubir.disabled = false;
    botonSubir.textContent = 'Analizar archivo';
  }
});

// Toda esta funcion construye el DOM con createElement/textContent y la
// propiedad .value (nunca innerHTML con texto interpolado). Los valores de
// "registro" vienen de un CSV o de lo que Claude transcribio de un PDF/foto
// - texto que no controlamos - asi que nunca se insertan como HTML, solo
// como texto o como el valor real de un input.
function dibujarTablaResultado(tipo, registros, advertencias, nombreArchivo) {
  zonaResultado.innerHTML = '';

  if (registros.length === 0) {
    const vacio = document.createElement('p');
    vacio.textContent = 'No se encontraron registros en este archivo.';
    zonaResultado.appendChild(vacio);
    return;
  }

  const columnas = COLUMNAS[tipo];

  if (advertencias.length > 0) {
    const divAdvertencias = document.createElement('div');
    divAdvertencias.className = 'advertencias';
    const titulo = document.createElement('strong');
    titulo.textContent = 'Revisa antes de guardar:';
    const lista = document.createElement('ul');
    advertencias.forEach((texto) => {
      const li = document.createElement('li');
      li.textContent = texto;
      lista.appendChild(li);
    });
    divAdvertencias.append(titulo, lista);
    zonaResultado.appendChild(divAdvertencias);
  }

  const tarjeta = document.createElement('div');
  tarjeta.className = 'tarjeta';

  const tabla = document.createElement('table');
  const thead = document.createElement('thead');
  const filaEncabezado = document.createElement('tr');
  filaEncabezado.appendChild(document.createElement('th')); // columna del checkbox
  columnas.forEach((columna) => {
    const th = document.createElement('th');
    th.textContent = columna.etiqueta;
    filaEncabezado.appendChild(th);
  });
  thead.appendChild(filaEncabezado);
  tabla.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = 'cuerpo-tabla';

  registros.forEach((registro, indice) => {
    const fila = document.createElement('tr');

    const tdCheckbox = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'check-fila';
    checkbox.dataset.fila = indice;
    checkbox.checked = true;
    tdCheckbox.appendChild(checkbox);
    fila.appendChild(tdCheckbox);

    columnas.forEach((columna) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = columna.clave === 'fecha' ? 'date' : CAMPOS_NUMERICOS.has(columna.clave) ? 'number' : 'text';
      if (input.type === 'number') input.step = 'any';
      input.dataset.fila = indice;
      input.dataset.campo = columna.clave;
      input.value = registro[columna.clave] ?? ''; // propiedad .value, nunca el atributo HTML
      td.appendChild(input);
      fila.appendChild(td);
    });

    tbody.appendChild(fila);
  });

  tabla.appendChild(tbody);
  tarjeta.appendChild(tabla);

  const divBoton = document.createElement('div');
  divBoton.style.marginTop = '1rem';
  const botonGuardar = document.createElement('button');
  botonGuardar.id = 'boton-guardar';
  botonGuardar.textContent = 'Guardar filas marcadas';
  botonGuardar.addEventListener('click', () => {
    guardarFilasMarcadas(tipo, registros.length, nombreArchivo);
  });
  divBoton.appendChild(botonGuardar);
  tarjeta.appendChild(divBoton);

  zonaResultado.appendChild(tarjeta);
}

async function guardarFilasMarcadas(tipo, totalFilas, nombreArchivo) {
  const boton = document.getElementById('boton-guardar');
  boton.disabled = true;
  boton.textContent = 'Guardando...';

  const columnas = COLUMNAS[tipo];
  const rutaApi = tipo === 'presion' ? '/api/presion' : '/api/composicion';
  const peticiones = [];

  for (let fila = 0; fila < totalFilas; fila++) {
    const marcado = document.querySelector(`.check-fila[data-fila="${fila}"]`).checked;
    if (!marcado) continue;

    const registro = { fuente_documento: nombreArchivo };
    columnas.forEach((columna) => {
      const input = document.querySelector(`input[data-fila="${fila}"][data-campo="${columna.clave}"]`);
      const valorCrudo = input.value;
      registro[columna.clave] = valorCrudo === '' ? null : valorCrudo;
    });

    peticiones.push(
      fetch(rutaApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      })
    );
  }

  const resultados = await Promise.allSettled(peticiones);
  const exitosos = resultados.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  const fallidos = resultados.length - exitosos;

  boton.disabled = false;
  boton.textContent = 'Guardar filas marcadas';

  if (fallidos === 0) {
    mostrarMensaje(`${exitosos} registro(s) guardado(s) correctamente.`, 'mensaje-exito');
    zonaResultado.innerHTML = '';
    document.getElementById('formulario-subir').reset();
  } else {
    mostrarMensaje(`${exitosos} guardado(s), ${fallidos} fallaron. Revisa los datos e intenta de nuevo.`, 'mensaje-error');
  }
}
