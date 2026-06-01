const express = require('express');
const router = express.Router();
const db = require('../db');

// 🚩 RUTA PARA REPORTAR UNA PUBLICACIÓN (POST /api/reportes)
router.post('/', async (req, res) => {
  const { producto_id, usuario_reporta_id, motivo, detalles } = req.body;

  // Validaciones básicas de seguridad
  if (!producto_id || !usuario_reporta_id || !motivo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para procesar el reporte.' });
  }

  try {
    // Insertar el reporte en la base de datos
    const sql = `
      INSERT INTO reportes (producto_id, usuario_reporta_id, motivo, detalles)
      VALUES (?, ?, ?, ?)
    `;
    await db.query(sql, [producto_id, usuario_reporta_id, motivo, detalles || null]);

    return res.status(201).json({ message: '¡Gracias por tu reporte! Lo revisaremos para mantener segura la comunidad.' });
  } catch (err) {
    console.error('❌ Error al guardar el reporte:', err);
    return res.status(500).json({ error: 'Error interno del servidor al procesar el reporte.' });
  }
});

module.exports = router;