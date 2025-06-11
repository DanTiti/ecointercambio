const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const db = require('./db');  // conexión a base de datos
const matchAlertRoutes = require('./routes/matchAlert');

// Crear instancia de Express primero
const app = express();

// CORS configurado para múltiples orígenes
const corsOptions = {
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
};
app.use(cors(corsOptions)); // Aplica CORS correctamente

// Middleware
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Multer para subir imágenes
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/match', require('./routes/match'));
app.use('/api/mensajes', require('./routes/mensajes'));
app.use('/api/sugerencias', require('./routes/sugerencias'));
app.use('/api/match', matchAlertRoutes);

// Crear servidor HTTP y conectar Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('mensaje', async (data) => {
    const { de_usuario, para_usuario, mensaje } = data;

    try {
      const sql = "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)";
      await db.query(sql, [de_usuario, para_usuario, mensaje]);

      io.emit(`mensaje-${de_usuario}`, {
        de_usuario,
        mensaje,
        creado_en: new Date().toISOString()
      });

      io.emit(`mensaje-${para_usuario}`, {
        de_usuario,
        mensaje,
        creado_en: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error al guardar mensaje:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
server.listen(3000, () => {
  console.log('Servidor en puerto 3000');
});
