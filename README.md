# Health Tracker

Visualizador local de tu propia evolucion de salud: presion arterial e
indicadores de composicion corporal, a partir de documentos que tu subes
(CSV, PDF o fotos). No formularios de captura manual, no consejos
medicos, no interpretaciones - solo organiza y grafica lo que ya tienes.

---

## 1. Que hace esta aplicacion

- Subes un archivo (CSV, PDF o foto) de un resultado de laboratorio o de
  una bascula de composicion corporal.
- Si es CSV, la app lo lee directamente. Si es PDF o foto, se usa la API
  de Claude para leer los valores (extraccion con IA).
- Antes de guardar nada, te muestra una tabla con lo que se extrajo para
  que la revises y corrijas si algo salio mal.
- Una vez confirmas, los datos quedan guardados localmente en tu
  computador (nunca en internet) y aparecen en las graficas de tendencia.

**Esta aplicacion NO es un medico ni un asesor de salud.** Solo visualiza
los numeros que tu ya tienes; no da recomendaciones ni interpreta si un
valor es "bueno" o "malo".

## 2. Que necesitas antes de empezar

- **Node.js** (ya deberia estar instalado en esta maquina via `nvm`).
- Una **clave de API de Anthropic** (console.anthropic.com -> API Keys).
  Necesaria solo para leer PDFs y fotos - los CSV no la necesitan.

## 3. Como instalar y correr el proyecto

```bash
# 1. Activar Node.js en esta terminal (si no esta activo)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Entrar a la carpeta del proyecto
cd /Users/marialuisasegovia/health-tracker

# 3. Instalar las dependencias (solo la primera vez, o cuando cambien)
npm install

# 4. Configurar tu clave de API
cp .env.example .env
# Abre el archivo .env con cualquier editor de texto y reemplaza el
# valor de ANTHROPIC_API_KEY por tu clave real. Este archivo nunca se
# sube a git (ya esta excluido en .gitignore).

# 5. (Opcional) Generar datos de ejemplo para probar la app
npm run seed

# 6. Arrancar el servidor
npm start
```

Cuando veas `Health Tracker escuchando en http://localhost:3100`, abre
esa direccion en tu navegador.

### Si el puerto ya esta ocupado

```bash
lsof -ti:3100 | xargs kill -9
```

## 4. Como usarla

1. **Subir documento**: elige si es "presion" o "composicion", sube el
   archivo, revisa/corrige la tabla que aparece, y haz clic en "Guardar
   filas marcadas".
2. **Presion arterial / Composicion corporal**: graficas de tendencia en
   el tiempo, sin ninguna interpretacion clinica.
3. **Historial**: para corregir o eliminar cualquier registro guardado.
4. **Resumen**: vista rapida de tus ultimos valores.

## 5. Estructura del proyecto y que hace cada parte

```
health-tracker/
├── server.js                 Arranca el servidor web
├── data/
│   ├── db.js                   Esquema de la base de datos + funciones para leer/escribir
│   └── health.db                (NO esta en git) tus datos reales, locales a tu maquina
├── routes/
│   ├── presion.js                API: crear/leer/corregir/borrar lecturas de presion
│   ├── composicion.js             API: lo mismo para composicion corporal
│   └── subir.js                    Recibe el archivo subido y decide como procesarlo
├── services/
│   ├── csvParser.js                 Lee archivos CSV directamente (sin IA)
│   └── extractor.js                  Llama a la API de Claude para leer PDFs/fotos
├── public/                    Todo lo que se ve en el navegador
│   ├── index.html / index.js          Pagina de resumen
│   ├── presion.html / presion.js        Grafica de presion arterial
│   ├── composicion.html / composicion.js Graficas de composicion corporal
│   ├── subir.html / subir.js              Pagina de carga y revision
│   ├── historial.html / historial.js       Tabla editable de todos los registros
│   ├── grafica-lineas.js                    Motor de graficas (SVG, sin librerias externas)
│   ├── style.css / nav.js                    Estilos y barra de navegacion compartidos
├── scripts/
│   ├── seed-demo.js                 Genera datos de ejemplo FICTICIOS para la demo
│   └── mock-extraction-test.js        Prueba la extraccion de IA con documentos de prueba
├── uploads/                   (NO esta en git) copia local de lo que subes
└── .github/workflows/
    ├── ci.yml                   Prueba automatica de que la app arranca bien
    └── agp-workflow.yml          Sonatype Guide - Agent P (seguridad de dependencias)
```

### Explicacion de cada pieza clave

**`server.js`** - El punto de entrada. Conecta todas las rutas y sirve las
paginas del navegador.

**`data/db.js`** - Define las tres tablas (`presion_arterial`,
`composicion_corporal`, `documentos_subidos`) y expone funciones ya
preparadas para usarlas, evitando por diseno cualquier riesgo de
inyeccion SQL (nunca se concatena texto en una consulta).

**`services/csvParser.js`** - Convierte un CSV en registros listos para
guardar. Reconoce varios nombres de columna comunes (espanol/ingles, con
o sin acentos), asi que no tienes que usar un formato exacto.

**`services/extractor.js`** - Envia un PDF o foto a la API de Claude
(`claude-opus-5`) pidiendole una respuesta en un formato exacto (JSON
Schema), para garantizar que los datos regresen siempre con la forma
correcta. Incluye instrucciones explicitas de nunca inventar un valor
que no se pueda leer con certeza.

**`routes/subir.js`** - Recibe el archivo, valida que sea un tipo
permitido (CSV, PDF, JPG, PNG) y de tamano razonable (hasta 10MB),
guarda una copia local de respaldo, y decide si usar el lector de CSV o
la extraccion con IA.

**`public/grafica-lineas.js`** - El motor que dibuja las graficas de
tendencia, hecho en SVG puro sin ninguna libreria ni conexion a
internet. Incluye un "crosshair" (linea que sigue al mouse) con un
recuadro que muestra los valores exactos, y un boton para ver los mismos
datos en una tabla simple.

**`scripts/seed-demo.js`** - Genera datos de ejemplo totalmente
inventados (no son datos reales de nadie), para que este repositorio
publico se pueda probar sin necesitar documentos propios.

## 6. Privacidad y seguridad

- Tus datos reales viven **solo** en el archivo `data/health.db` en tu
  maquina. Ese archivo (y sus acompanantes `-wal`/`-shm`) estan excluidos
  de git y nunca se suben a GitHub.
- La carpeta `uploads/` (copias de los documentos que subes) tambien
  esta excluida de git.
- Tu clave de API (`.env`) tampoco se sube nunca.
- Cuando subes un PDF o foto, se envia una sola vez a la API de
  Anthropic para que Claude lo lea - el mismo nivel de confianza que
  pegar informacion en una conversacion normal de Claude. No se publica
  ni se usa para entrenar nada.
- Todas las consultas a la base de datos usan "prepared statements"
  (parametrizadas), por diseno, para prevenir inyeccion SQL.
- El repositorio incluye el workflow de **Agent P (Sonatype Guide)**,
  que revisa automaticamente que las dependencias del proyecto no
  tengan vulnerabilidades conocidas.

## 7. Comandos disponibles

| Comando               | Que hace                                              |
|-----------------------|--------------------------------------------------------|
| `npm install`           | Descarga todas las dependencias necesarias              |
| `npm start`              | Arranca el servidor en `http://localhost:3100`          |
| `npm run dev`             | Igual, pero reinicia solo si cambia el codigo           |
| `npm run seed`            | Reemplaza los datos locales por datos de ejemplo        |
| `npm run test:extraction`  | Prueba la extraccion de IA con documentos sinteticos |
