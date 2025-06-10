const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const matchRoutes = require('./routes/match');
const mensajesRoutes = require('./routes/mensajes');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/mensajes', mensajesRoutes);
app.listen(3000, () => console.log('Servidor en puerto 3000'));
