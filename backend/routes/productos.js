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

// Ruta: agregar producto
router.post('/add', upload.single('imagen'), (req, res) => {
  const { nombre, descripcion, condicion, categoria, busca, ofrece, usuario_id } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const sql = `INSERT INTO productos (nombre, descripcion, condicion, categoria, imagen, busca, ofrece, usuario_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [nombre, descripcion, condicion, categoria, imagen, busca, ofrece, usuario_id], (err) => {
    if (err) return res.status(500).json({ error: "Error al guardar producto" });
    res.status(200).json({ message: "Producto publicado con éxito" });
  });
});

// Ruta: obtener todos los productos excepto los del usuario actual
router.get('/todos/:id', (req, res) => {
  const sql = "SELECT * FROM productos WHERE usuario_id != ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener productos" });
    res.status(200).json(results);
  });
});

// Ruta: obtener publicaciones propias
router.get('/mios/:id', (req, res) => {
  const sql = "SELECT * FROM productos WHERE usuario_id = ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener mis productos" });
    res.status(200).json(results);
  });
});

module.exports = router;
