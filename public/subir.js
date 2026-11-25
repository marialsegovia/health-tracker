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

function dibujarTablaResultado(tipo, registros, advertencias, nombreArchivo) {
  if (registros.length === 0) {
    zonaResultado.innerHTML = '<p>No se encontraron registros en este archivo.</p>';
  }

  const columnas = COLUMNAS[tipo];

  const filasHtml = registros
    .map((registro, indice) => {
      const celdas = columnas
        .map((columna) => {
          const valor = registro[columna.clave] ?? '';
          const tipoInput = columna.clave === 'fecha' ? 'date' : CAMPOS_NUMERICOS.has(columna.clave) ? 'number' : 'text';
          return `<td><input type="${tipoInput}" step="any" data-fila="${indice}" data-campo="${columna.clave}" value="${valor}" /></td>`;
        })
        .join('');
      return `<tr><td><input type="checkbox" class="check-fila" data-fila="${indice}" checked /></td>${celdas}</tr>`;
    })
    .join('');

  const encabezados = columnas.map((c) => `<th>${c.etiqueta}</th>`).join('');
  const advertenciasHtml = advertencias.length
    ? `<div class="advertencias"><strong>Revisa antes de guardar:</strong><ul>${advertencias
        .map((a) => `<li>${a}</li>`)
        .join('')}</ul></div>`
    : '';

  zonaResultado.innerHTML = `
    ${advertenciasHtml}
    <div class="tarjeta">
      <table>
        <thead><tr><th></th>${encabezados}</tr></thead>
        <tbody id="cuerpo-tabla">${filasHtml}</tbody>
      </table>
      <div style="margin-top:1rem;">
        <button id="boton-guardar">Guardar filas marcadas</button>
      </div>
    </div>
  `;

  document.getElementById('boton-guardar').addEventListener('click', () => {
    guardarFilasMarcadas(tipo, registros.length, nombreArchivo);
  });
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
