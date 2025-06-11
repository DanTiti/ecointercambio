const express = require('express');
const router = express.Router();
const db = require('../db'); // ← debe ser con promesas
const bcrypt = require('bcrypt');

// Registro de usuario
router.post('/register', async (req, res) => {
  const { nickname, email, password } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO usuarios (nickname, email, password) VALUES (?, ?, ?)";
    
    await db.query(sql, [nickname, email, hashedPassword]);

    res.status(200).json({ message: 'Usuario registrado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    const [results] = await db.query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.status(200).json({ message: 'Login exitoso', userId: user.id, nickname: user.nickname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
