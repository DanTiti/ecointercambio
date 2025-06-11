const express = require('express');
const router = express.Router();
const db = require('../db');

// Enviar mensaje
router.post('/enviar', async (req, res) => {
  const { de_usuario, para_usuario, mensaje } = req.body;
  const sql = "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)";
  try {
    await db.query(sql, [de_usuario, para_usuario, mensaje]);
    res.status(200).json({ message: 'Mensaje enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Ver mensajes entre dos usuarios
router.get('/entre/:a/:b', async (req, res) => {
  const { a, b } = req.params;
  const sql = `
    SELECT 
      mensajes.*, 
      u.nickname AS nombre_otro_usuario
    FROM mensajes
    JOIN usuarios u 
      ON u.id = CASE 
        WHEN mensajes.de_usuario = ? THEN mensajes.para_usuario
        ELSE mensajes.de_usuario
      END
    WHERE 
      (mensajes.de_usuario = ? AND mensajes.para_usuario = ?) OR
      (mensajes.de_usuario = ? AND mensajes.para_usuario = ?)
    ORDER BY mensajes.creado_en ASC
  `;
  try {
    const [resultados] = await db.query(sql, [a, a, b, b, a]);
    res.json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Marcar mensajes como leídos
router.post('/marcar-leidos', async (req, res) => {
  const { de_usuario, para_usuario } = req.body;
  const sql = `UPDATE mensajes SET leido = 1 WHERE de_usuario = ? AND para_usuario = ?`;
  try {
    await db.query(sql, [de_usuario, para_usuario]);
    res.status(200).json({ message: 'Mensajes marcados como leídos' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al marcar leídos' });
  }
});

// Contar mensajes no leídos
router.get('/no-leidos/:usuarioId', async (req, res) => {
  const usuarioId = req.params.usuarioId;
  const sql = `
    SELECT de_usuario, COUNT(*) as cantidad 
    FROM mensajes 
    WHERE para_usuario = ? AND leido = 0 
    GROUP BY de_usuario
  `;
  try {
    const [results] = await db.query(sql, [usuarioId]);
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al contar mensajes no leídos' });
  }
});

// Obtener lista de chats
router.get('/chats/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT
      CASE
        WHEN m.de_usuario = ? THEN m.para_usuario
        ELSE m.de_usuario
      END AS otro_usuario_id,
      u.nickname AS otro_usuario_nickname,
      m.mensaje,
      m.creado_en
    FROM mensajes m
    JOIN usuarios u ON u.id = 
      CASE
        WHEN m.de_usuario = ? THEN m.para_usuario
        ELSE m.de_usuario
      END
    WHERE m.de_usuario = ? OR m.para_usuario = ?
    ORDER BY m.creado_en DESC
  `;

  try {
    const [results] = await db.query(sql, [userId, userId, userId, userId]);

    const chatsMap = new Map();

    for (const row of results) {
      if (!chatsMap.has(row.otro_usuario_id)) {
        chatsMap.set(row.otro_usuario_id, {
          userId: row.otro_usuario_id,
          nickname: row.otro_usuario_nickname,
          lastMessage: row.mensaje,
          lastDate: row.creado_en
        });
      }
    }

    const chats = Array.from(chatsMap.values());
    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la consulta' });
  }
});

module.exports = router;
