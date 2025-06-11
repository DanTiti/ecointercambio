const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configurar almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// POST /add - agregar producto con imagen
router.post('/add', upload.single('imagen'), async (req, res) => {
  try {
    console.log('Body:', req.body);
    console.log('Archivo:', req.file);

    const { busca, ofrece, usuario_id } = req.body;
    const imagen = req.file ? req.file.filename : null;

    const sql = `INSERT INTO productos (busca, ofrece, imagen, usuario_id) VALUES (?, ?, ?, ?)`;
    await db.query(sql, [busca, ofrece, imagen, usuario_id]);

    res.status(200).json({ message: "Producto publicado con éxito" });
  } catch (err) {
    console.error('Error al guardar producto:', err);
    res.status(500).json({ error: "Error al guardar producto" });
  }
});

// GET /todos/:id - obtener productos de otros usuarios
router.get('/todos/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT productos.*, usuarios.nickname AS nombreUsuario, usuarios.id AS usuario_id
    FROM productos
    JOIN usuarios ON productos.usuario_id = usuarios.id
    WHERE productos.usuario_id != ?
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
    WHERE productos.usuario_id = ? AND estado = 'activo'
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
  const userId = req.body.userId; // O tomarlo de la sesión si la tienes

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

module.exports = router;
