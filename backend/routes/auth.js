const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
  const { nickname, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO usuarios (nickname, email, password) VALUES (?, ?, ?)";
  db.query(sql, [nickname, hashedPassword], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    res.status(200).json({ message: 'Usuario registrado con éxito' });
  });
});

router.post('/login', (req, res) => {
  const { nickname, password } = req.body;
  const sql = "SELECT * FROM usuarios WHERE nickname = ?";
  
  db.query(sql, [nickname], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    res.status(200).json({ message: 'Login exitoso', userId: user.id });
  });
});

module.exports = router;
