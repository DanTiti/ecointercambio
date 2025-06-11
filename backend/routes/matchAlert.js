const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate de tener tu conexión a la BD aquí

// Obtener coincidencias nuevas desde la última revisión
router.get('/nuevas/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Primero obtenemos la última fecha de revisión
    const [revision] = await db.query(
      'SELECT ultima_revision_match FROM usuarios WHERE id = ?',
      [userId]
    );

    const ultimaRevision = revision[0]?.ultima_revision_match || '2000-01-01';

    // Aquí va tu lógica para obtener matches perfectos desde esa fecha
    const [matches] = await db.query(
      `
        SELECT p1.usuario_id AS usuario,
              u.nickname AS nombreUsuario,
              p1.ofrece AS ofreceEl,
              p2.ofrece AS buscaEl,
              p1.imagen AS imagen
        FROM productos p1
        JOIN productos p2 ON p1.usuario_id != p2.usuario_id
                          AND p1.ofrece = p2.busca
                          AND p2.ofrece = p1.busca
        JOIN usuarios u ON u.id = p1.usuario_id
        WHERE p1.estado = 'activo'
          AND p2.estado = 'activo'
          AND p2.usuario_id = ?
          AND p1.created_at > ?
        LIMIT 1
      `,
      [userId, ultimaRevision]
    );

    res.json(matches);
  } catch (error) {
    console.error('Error buscando nuevas coincidencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar la fecha de revisión a NOW()
router.put('/revisado/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    await db.query(
      'UPDATE usuarios SET ultima_revision_match = NOW() WHERE id = ?',
      [userId]
    );
    res.json({ mensaje: 'Revisión actualizada' });
  } catch (error) {
    console.error('Error actualizando revisión:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

module.exports = router;
