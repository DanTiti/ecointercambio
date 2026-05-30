const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

const REGEX_PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

router.post('/register', async (req, res) => {
  const { nickname, email, password } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!REGEX_PASSWORD.test(String(password))) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una minúscula y un número.' 
    });
  }

  try {
    const checkEmailSql = "SELECT id FROM usuarios WHERE email = ?";
    const [existingUser] = await db.query(checkEmailSql, [email]);

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO usuarios (nickname, email, password) VALUES (?, ?, ?)";
    
    await db.query(sql, [nickname, email, hashedPassword]);

    return res.status(200).json({ message: 'Usuario registrado con éxito' });

  } catch (err) {
    console.error("--- ERROR CRÍTICO EN REGISTRO ---");
    console.error(err);
    
    return res.status(500).json({ 
      error: 'Error en el servidor', 
      detalle: err.message 
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    const [results] = await db.query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o datos incorrectos' });
    }

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.status(200).json({ 
      message: 'Login exitoso', 
      userId: user.id, 
      nickname: user.nickname 
    });
  } catch (err) {
    console.error("Error en Login:", err);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

module.exports = router;