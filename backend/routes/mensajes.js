const express = require('express');
const router = express.Router();
const db = require('../db');

// Enviar mensaje
router.post('/enviar', (req, res) => {
  const { de_usuario, para_usuario, mensaje } = req.body;
  const sql = "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)";
  db.query(sql, [de_usuario, para_usuario, mensaje], (err) => {
    if (err) return res.status(500).json({ error: 'Error al enviar mensaje' });
    res.status(200).json({ message: 'Mensaje enviado' });
  });
});

// Ver mensajes entre dos usuarios
router.get('/entre/:a/:b', (req, res) => {
  const { a, b } = req.params;
  const sql = `
    SELECT * FROM mensajes 
    WHERE (de_usuario = ? AND para_usuario = ?) 
      OR (de_usuario = ? AND para_usuario = ?) 
    ORDER BY creado_en ASC
  `;
  db.query(sql, [a, b, b, a], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener mensajes' });
    res.status(200).json(results);
  });
});

router.post('/marcar-leidos', (req, res) => {
  const { de_usuario, para_usuario } = req.body;
  const sql = `UPDATE mensajes SET leido = 1 WHERE de_usuario = ? AND para_usuario = ?`;
  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) return res.status(500).json({ error: 'Error al marcar leídos' });
    res.status(200).json({ message: 'Mensajes marcados como leídos' });
  });
});

router.get('/no-leidos/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  const sql = `
    SELECT de_usuario, COUNT(*) as cantidad 
    FROM mensajes 
    WHERE para_usuario = ? AND leido = 0 
    GROUP BY de_usuario
  `;
  db.query(sql, [usuarioId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al contar mensajes no leídos' });
    res.status(200).json(results);
  });
});

router.get('/recibidos/:id', (req, res) => {
  const sql = `
    SELECT mensajes.*, usuarios.nickname AS remitente
    FROM mensajes
    JOIN usuarios ON usuarios.id = mensajes.de_usuario
    WHERE mensajes.para_usuario = ?
    ORDER BY mensajes.creado_en DESC
  `;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error al obtener mensajes" });
    res.status(200).json(result);
  });
});

module.exports = router;
