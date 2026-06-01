require('dns').setDefaultResultOrder('ipv4first'); 

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); 
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

app.use(cors({
    origin: [
        'https://reutiles.onrender.com',
        'http://127.0.0.1:5500',         
        'http://localhost:5500'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'], 
    credentials: true
}));

app.options(/.*/, cors());

app.use(bodyParser.json());

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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
        'https://reutiles.onrender.com',
        'http://127.0.0.1:5500',         
        'http://localhost:5500'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ["ngrok-skip-browser-warning"],
    credentials: true
  }
});

app.set('io', io);
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
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('🚀 Servidor corriendo en puerto', PORT);
});

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

/* ==========================================================================
    🔥 FUNCIÓN MAESTRA: RESET OBLIGATORIO DE BASE DE DATOS PARA PRODUCCIÓN 🔥
   ========================================================================== */

const resetearBaseDeDatos = async () => {
  try {
    console.log("⏳ Iniciando el reseteo completo de la base de datos...");
    
    // 1. Apagamos los candados de seguridad (llaves foráneas) para poder vaciar tablas relacionadas
    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    // 2. Obtenemos el nombre de todas las tablas que existen en tu base de datos
    const [tablas] = await db.query("SHOW TABLES");

    if (tablas.length === 0) {
      console.log("⚠️ No se encontraron tablas en la base de datos.");
      return;
    }

    // 3. Recorremos cada tabla y la vaciamos por completo (TRUNCATE reinicia los IDs a 1)
    for (const fila of tablas) {
      const nombreTabla = Object.values(fila)[0]; // Extrae el nombre exacto de la tabla
      await db.query(`TRUNCATE TABLE ${nombreTabla}`);
      console.log(`🧹 Tabla vaciada con éxito: ${nombreTabla}`);
    }

    // 4. Volvemos a encender los candados de seguridad
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("🚀 ¡BASE DE DATOS COMO NUEVA! Todos los registros están en cero.");

  } catch (err) {
    console.error("❌ Error crítico al intentar limpiar la base de datos:", err.message);
    // Por si falla a la mitad, nos aseguramos de volver a encender los candados
    await db.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
  }
};

// ⚠️ INSTRUCCIONES DE USO:
// 1. Quítale las barras de comentario (//) a la línea de abajo y guarda el archivo.
// 2. Deja que el servidor se reinicie una vez para que ejecute la limpieza.
// 3. ¡VUELVE A PONERLE LAS BARRAS (//) INMEDIATAMENTE! Si no lo haces, la base se borrará cada vez que prendas el servidor.

// resetearBaseDeDatos();
