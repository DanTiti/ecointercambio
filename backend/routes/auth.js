const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// EXPRESIÓN REGULAR: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número
const REGEX_PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

// --- RUTA DE REGISTRO ---
router.post('/register', async (req, res) => {
  const { nickname, email, password } = req.body;

  // 🕵️‍♂️ ESTE ES EL ESPÍA:
  console.log("🚀 ¡ENTRANDO AL REGISTRO LOCAL! Datos recibidos:", { nickname, email, password });

  // 1. Validar campos obligatorios
  if (!nickname || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // 2. Validar que la contraseña sea segura
  if (!REGEX_PASSWORD.test(password)) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una minúscula y un número.' 
    });
  }

  try {
    // 3. Validar si el correo ya existe en la base de datos
    const checkEmailSql = "SELECT id FROM usuarios WHERE email = ?";
    const [existingUser] = await db.query(checkEmailSql, [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // 4. Encriptar contraseña y registrar
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO usuarios (nickname, email, password) VALUES (?, ?, ?)";
    
    await db.query(sql, [nickname, email, hashedPassword]);

    res.status(200).json({ message: 'Usuario registrado con éxito' });
  } catch (err) {
    console.error("Error en Registro:", err);
    res.status(500).json({ error: 'Error en el servidor al registrar el usuario' });
  }
});

// --- RUTA DE LOGIN ---
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