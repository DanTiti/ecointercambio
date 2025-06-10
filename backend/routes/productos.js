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

router.post('/add', upload.single('imagen'), (req, res) => {
  console.log('Body:', req.body);
  console.log('Archivo:', req.file);

  const { busca, ofrece, usuario_id } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const sql = `INSERT INTO productos (busca, ofrece, imagen, usuario_id)
                VALUES (?, ?, ?, ?)`;

  db.query(sql, [busca, ofrece, imagen, usuario_id], (err) => {
    if (err) {
      console.error('Error al guardar producto:', err);
      return res.status(500).json({ error: "Error al guardar producto" });
    }
    res.status(200).json({ message: "Producto publicado con éxito" });
  });
});

router.get('/todos/:id', (req, res) => {
  const sql = `
    SELECT productos.*, usuarios.nickname AS nombreUsuario, usuarios.id AS usuario_id
    FROM productos
    JOIN usuarios ON productos.usuario_id = usuarios.id
    WHERE productos.usuario_id != ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.status(200).json(results);
  });
});

router.get('/mios/:id', (req, res) => {
  const sql = `
    SELECT productos.*, usuarios.nickname AS nombreUsuario
    FROM productos
    JOIN usuarios ON productos.usuario_id = usuarios.id
    WHERE productos.usuario_id = ? AND estado = 'activo'
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tus productos' });
    res.json(results);
  });
});

router.get('/intercambiados/:id', (req, res) => {
  const sql = `
    SELECT productos.*, usuarios.nickname as nombreUsuario
    FROM productos 
    JOIN usuarios ON productos.usuario_id = usuarios.id 
    WHERE productos.usuario_id = ? AND productos.estado = 'intercambiado'
  `;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al obtener productos completados' });
    res.json(result);
  });
});

router.put('/marcar-intercambiado/:id', (req, res) => {
  const sql = "UPDATE productos SET estado = 'intercambiado' WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar producto' });
    res.json({ message: 'Producto marcado como intercambiado' });
  });
});

// DELETE /api/productos/:id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.body.userId;  // o desde sesión si ya lo tienes

  const sql = "DELETE FROM productos WHERE id = ? AND usuario_id = ?";
  db.query(sql, [id, userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar producto' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado o no te pertenece' });

    res.json({ mensaje: 'Producto eliminado correctamente' });
  });
});

module.exports = router;
