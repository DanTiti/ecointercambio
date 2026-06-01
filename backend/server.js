const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // <-- Agregamos path para manejar rutas absolutas
const dotenv = require('dotenv'); // <-- Agregamos dotenv

// 🔥 Configuración de dotenv apuntando a la raíz de ecointercambio (un nivel arriba de backend)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const db = require('./db');
const matchAlertRoutes = require('./routes/matchAlert');

const app = express();

app.use(cors()); // Permite todo por defecto, sin restricciones

app.use(bodyParser.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/match', require('./routes/match'));
app.use('/api/mensajes', require('./routes/mensajes'));
app.use('/api/sugerencias', require('./routes/sugerencias'));
app.use('/api/match-alerts', matchAlertRoutes);
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/transacciones', require('./routes/transacciones'));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// Mensaje de confirmación para estar 100% seguros de que la DB conecta al arrancar
db.query("SELECT 1")
  .then(() => console.log('✅ Conexión exitosa a la base de datos (Aiven)'))
  .catch(err => console.error('❌ Error crítico al conectar a la base de datos:', err.message));

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

// Ahora sí va a leer el puerto de tu .env (25244) en lugar del 3000 por defecto
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('Servidor corriendo en puerto', PORT);
});

/* const limpiarUsuarios = async () => {
  try {
    // 1. Apagamos la revisión de llaves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // 2. Vaciamos la tabla de usuarios
    await db.query("TRUNCATE TABLE usuarios");
    
    // 3. Volvemos a encender la revisión (¡Súper importante!)
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("🧹 ¡Tabla 'usuarios' vaciada con éxito burlando los candados!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla:", err.message);
  }
};
limpiarUsuarios(); */

const limpiarProductosUnaVez = async () => {
  try {
    // 1. Apagamos la revisión de llaves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // 2. Vaciamos la tabla de productos por completo
    await db.query("TRUNCATE TABLE productos");
    
    // 3. Volvemos a encender la revisión
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("🧹 ¡Tabla 'productos' vaciada automáticamente desde server.js!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla de productos:", err.message);
  }
};
// Descoméntala para que corra una sola vez y luego la vuelves a comentar
//limpiarProductosUnaVez();

const limpiarTransaccionesUnaVez = async () => {
  try {
    // 1. Apagamos la revisión de llaves foráneas para evitar bloqueos
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // 2. Vaciamos la tabla de transacciones por completo y reiniciamos el contador de IDs
    await db.query("TRUNCATE TABLE transacciones");
    
    // 3. Volvemos a encender la revisión de llaves foráneas de inmediato
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("🧹 ¡Tabla 'transacciones' vaciada automáticamente desde server.js!");
  } catch (err) {
    console.log("⚠️ Error al limpiar la tabla de transacciones:", err.message);
  }
};
// Descoméntala para que limpie la tabla al arrancar el servidor, y luego la vuelves a comentar
//limpiarTransaccionesUnaVez();