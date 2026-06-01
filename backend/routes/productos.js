// routes/productos.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecointercambio',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

const upload = multer({ storage });

// 1. Agregar producto (Asegura que el estado inicial sea 'activo')
router.post('/add', upload.single('imagen'), async (req, res) => {
  try {
    console.log('Body:', req.body);
    console.log('Archivo:', req.file);

    const { busca, ofrece, usuario_id } = req.body;
    const imagen = req.file ? req.file.path : null;

    // Agregamos explícitamente 'estado' con el valor 'activo' en el INSERT
    const sql = `INSERT INTO productos (busca, ofrece, imagen, usuario_id, estado) VALUES (?, ?, ?, ?, 'activo')`;
    await db.query(sql, [busca, ofrece, imagen, usuario_id]);

    res.status(200).json({ message: "Producto publicado con éxito" });
  } catch (err) {
    console.error('Error al guardar producto:', err);
    res.status(500).json({ error: "Error al guardar producto" });
  }
});

// 2. Tienda Global (FILTRADO: Solo muestra productos de otros que sigan 'activos')
router.get('/todos/:id', async (req, res) => {
  const userId = req.params.id;
  
  // 🔥 SOLUCIÓN AQUÍ: Añadimos AND productos.estado = 'activo' 
  // para que los productos ya intercambiados no aparezcan en el inicio
  const sql = `
    SELECT productos.*, usuarios.nickname AS nombreUsuario, usuarios.id AS usuario_id
    FROM productos
    JOIN usuarios ON productos.usuario_id = usuarios.id
    WHERE productos.usuario_id != ? AND productos.estado = 'activo'
  `;
  try {
    const [results] = await db.query(sql, [userId]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /mios/:id - obtener productos activos propios
router.get('/mios/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT productos.*, usuarios.nickname AS nombreUsuario
    FROM productos
    JOIN usuarios ON productos.usuario_id = usuarios.id
    WHERE productos.usuario_id = ? AND productos.estado = 'activo'
  `;
  try {
    const [results] = await db.query(sql, [userId]);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener tus productos:', err);
    res.status(500).json({ error: 'Error al obtener tus productos' });
  }
});

// GET /intercambiados/:id - productos marcados como intercambiados
router.get('/intercambiados/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT productos.*, usuarios.nickname as nombreUsuario
    FROM productos 
    JOIN usuarios ON productos.usuario_id = usuarios.id 
    WHERE productos.usuario_id = ? AND productos.estado = 'intercambiado'
  `;
  try {
    const [result] = await db.query(sql, [userId]);
    res.json(result);
  } catch (err) {
    console.error('Error al obtener productos completados:', err);
    res.status(500).json({ error: 'Error al obtener productos completados' });
  }
});

// PUT /marcar-intercambiado/:id - marcar producto como intercambiado
router.put('/marcar-intercambiado/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "UPDATE productos SET estado = 'intercambiado' WHERE id = ?";
  try {
    await db.query(sql, [id]);
    res.json({ message: 'Producto marcado como intercambiado' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /:id - eliminar producto (requiere userId en body)
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const userId = req.body.userId; 

  const sql = "DELETE FROM productos WHERE id = ? AND usuario_id = ?";
  try {
    const [result] = await db.query(sql, [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado o no te pertenece' });
    }
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// GET /usuario/:usuario_id - obtener productos activos (para el selector de enviar-mensaje)
router.get('/usuario/:usuario_id', async (req, res) => {
  const userId = req.params.usuario_id;
  try {
    // 🔥 MEJORA: Añadimos 'AND estado = "activo"' para que en el selector de trueque
    // nunca aparezcan productos que ya fueron intercambiados.
    const [productos] = await db.query(
      "SELECT id, ofrece, estado FROM productos WHERE usuario_id = ? AND estado = 'activo'", 
      [userId]
    );
    res.json(productos);
  } catch (err) {
    console.error('Error al obtener productos del usuario:', err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /sugerencias/:userId
router.get('/sugerencias/:userId', async (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT p.*, u.nickname as nombreUsuario, u.id as usuario_id,
    (SELECT AVG(calificacion_a_ofrece + calificacion_a_busca) / 2 
     FROM transacciones 
     WHERE (usuario_ofrece_id = u.id OR usuario_busca_id = u.id) 
     AND estado = 'completado') as rating
    FROM productos p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.usuario_id != ? AND p.estado = 'activo'
    ORDER BY rating DESC LIMIT 10
  `;
  try {
    const [results] = await db.query(sql, [userId]);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;