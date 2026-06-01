const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); 
const dotenv = require('dotenv'); 

// 1. Configuración de dotenv apuntando a la raíz de ecointercambio
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 2. Inicialización de la aplicación Express (¡Esto debe ir antes de usar app!)
const app = express();

// 3. Middlewares Globales
app.use(cors({
  origin: "*", // Permite acceso desde cualquier lugar (soluciona problemas de CORS)
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(bodyParser.json());

// 4. Conexión a la Base de Datos y Rutas
const db = require('./db');
const matchAlertRoutes = require('./routes/matchAlert');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/match', require('./routes/match'));
app.use('/api/mensajes', require('./routes/mensajes'));
app.use('/api/sugerencias', require('./routes/sugerencias'));
app.use('/api/match-alerts', matchAlertRoutes);
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/transacciones', require('./routes/transacciones'));

// 5. Configuración del Servidor HTTP y WebSockets (Socket.io)
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Alineado con el CORS de express para evitar bloqueos en la nube
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// 6. Mensaje de confirmación de la DB al arrancar
db.query("SELECT 1")
  .then(() => console.log('✅ Conexión exitosa a la base de datos (Aiven)'))
  .catch(err => console.error('❌ Error crítico al conectar a la base de datos:', err.message));

// 7. Lógica de Socket.io para mensajería en tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('mensaje', async (data) => {
    const { de_usuario, para_usuario, mensaje } = data;

    try {
      const sql = `
        INSERT INTO mensajes (de_usuario, para_usuario, mensaje)
        VALUES (?, ?, ?)
      `;
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

// 8. Encendido del Servidor (Prioriza el puerto de Render)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('Servidor corriendo en puerto', PORT);
});

/* ==========================================================================
   FUNCIONES DE LIMPIEZA Y DEPURACIÓN DE LA BASE DE DATOS (MANTENER COMENTADAS)
   ========================================================================== */

const limpiarUsuarios = async () => {
  try {
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("TRUNCATE TABLE usuarios");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("🧹 ¡Tabla 'usuarios' vaciada con éxito burlando los candados!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla:", err.message);
  }
};
//limpiarUsuarios();

const limpiarProductosUnaVez = async () => {
  try {
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("TRUNCATE TABLE productos");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("🧹 ¡Tabla 'productos' vaciada automáticamente desde server.js!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla de productos:", err.message);
  }
};
// limpiarProductosUnaVez();

const limpiarTransaccionesUnaVez = async () => {
  try {
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("TRUNCATE TABLE transacciones");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("🧹 ¡Tabla 'transacciones' vaciada automáticamente desde server.js!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla de transacciones:", err.message);
  }
};
// limpiarTransaccionesUnaVez();