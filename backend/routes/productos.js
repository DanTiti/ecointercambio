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
    WHERE productos.usuario_id = ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tus productos' });
    res.json(results);
  });
});


module.exports = router;
