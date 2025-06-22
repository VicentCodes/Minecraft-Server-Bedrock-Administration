const express = require('express');
const path = require('path');
const app = express();
const indexRouter = require('./routes/index');

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para formularios
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CSS, imágenes, etc.) bajo /panel
app.use('/panel', express.static(path.join(__dirname, 'public')));

// Todas las rutas activas del panel estarán bajo /panel
app.use('/panel', indexRouter);

// Puerto del servidor
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}/panel/players`);
});
