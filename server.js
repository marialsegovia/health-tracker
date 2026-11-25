// server.js
//
// Punto de entrada de la aplicacion. Levanta el servidor web, conecta las
// rutas de la API (presion arterial, composicion corporal, carga de
// archivos) y sirve las paginas del frontend (carpeta public/).
//
// Para arrancarlo: npm start

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const rutasPresion = require('./routes/presion');
const rutasComposicion = require('./routes/composicion');
const rutasSubir = require('./routes/subir');

const app = express();
const PUERTO = process.env.PORT || 3100;

// Aseguramos que exista la carpeta de archivos subidos (queda fuera de git).
const CARPETA_UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

// Limite de tamano para el cuerpo de las peticiones JSON (evita abusos).
app.use(express.json({ limit: '2mb' }));

// Paginas y archivos estaticos del frontend.
app.use(express.static(path.join(__dirname, 'public')));

// API.
app.use('/api/presion', rutasPresion);
app.use('/api/composicion', rutasComposicion);
app.use('/api/subir', rutasSubir);

app.listen(PUERTO, () => {
  console.log(`Health Tracker escuchando en http://localhost:${PUERTO}`);
});
