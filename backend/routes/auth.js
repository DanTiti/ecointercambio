const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../helpers/emailHelper');

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
    const tokenVerificacion = crypto.randomBytes(32).toString('hex');

    const sql = "INSERT INTO usuarios (nickname, email, password, token_verificacion, verificado) VALUES (?, ?, ?, ?, 0)";
    await db.query(sql, [nickname, email, hashedPassword, tokenVerificacion]);

    try {
      await sendVerificationEmail(email, nickname, tokenVerificacion);
      return res.status(200).json({ 
        message: 'Usuario registrado con éxito. Por favor, revisa tu correo electrónico para verificar tu cuenta.' 
      });
    } catch (mailErr) {
      console.error("❌ Error al enviar el correo de verificación:", mailErr);
      return res.status(201).json({ 
        message: 'Usuario registrado, pero hubo un problema al enviar el correo de activación. Contacta al administrador.' 
      });
    }

  } catch (err) {
    console.error("--- ERROR CRÍTICO EN REGISTRO ---");
    console.error(err);
    return res.status(500).json({ error: 'Error en el servidor', detalle: err.message });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('<h1>Error</h1><p>Token de verificación no proporcionado.</p>');
  }

  try {
    const sqlBuscar = "SELECT id, email FROM usuarios WHERE token_verificacion = ?";
    const [rows] = await db.query(sqlBuscar, [token]);

    if (!rows || rows.length === 0) {
      return res.status(400).send('<h1>Enlace inválido</h1><p>El token es incorrecto o el correo ya fue verificado.</p>');
    }

    const usuario = rows[0];

    const sqlActualizar = "UPDATE usuarios SET verificado = 1, token_verificacion = NULL WHERE token_verificacion = ?";
    await db.query(sqlActualizar, [token]);

    const io = req.app.get('io');
    if (io) {
      io.emit(`verificado-${usuario.email}`, { verificado: true });
    }

    return res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
        <h1 style="color: #16a34a;">🌱 ¡Cuenta Verificada!</h1>
        <p>Tu correo ha sido confirmado. Si tienes la pestaña de la aplicación abierta, verás que ya avanzó automáticamente.</p>
        <p style="color: #666; font-size: 14px;">Ya puedes cerrar esta ventana.</p>
      </div>
    `);

  } catch (err) {
    console.error("❌ Error en la verificación de cuenta:", err);
    return res.status(500).send('<h1>Error en el servidor</h1><p>Hubo un problema al procesar la verificación.</p>');
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

    if (user.verificado === 0) {
      return res.status(403).json({ 
        error: 'Por favor, verifica tu correo electrónico antes de iniciar sesión.' 
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.status(200).json({ message: 'Login exitoso', userId: user.id, nickname: user.nickname });
  } catch (err) {
    console.error("Error en Login:", err);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
  }

  try {
    const sqlBuscar = "SELECT id FROM usuarios WHERE email = ?";
    const [rows] = await db.query(sqlBuscar, [email]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No existe ninguna cuenta registrada con este correo.' });
    }

    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');

    const sqlGuardarToken = "UPDATE usuarios SET token_recuperacion = ? WHERE email = ?";
    await db.query(sqlGuardarToken, [tokenRecuperacion, email]);

    try {
      await sendResetPasswordEmail(email, tokenRecuperacion);
      return res.status(200).json({ 
        message: 'Te hemos enviado un enlace a tu correo electrónico para restablecer tu contraseña.' 
      });
    } catch (mailErr) {
      console.error("❌ Error al enviar correo de recuperación:", mailErr);
      return res.status(500).json({ 
        error: 'Hubo un problema al enviar el correo. Inténtalo más tarde.',
        detalle: mailErr.message 
      });
    }

  } catch (err) {
    console.error("❌ Error en forgot-password:", err);
    return res.status(500).json({ error: 'Error en el servidor', detalle: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  if (!REGEX_PASSWORD.test(String(password))) {
    return res.status(400).json({ 
      error: 'La nueva contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una minúscula y un número.' 
    });
  }

  try {
    const sqlBuscarToken = "SELECT id FROM usuarios WHERE token_recuperacion = ?";
    const [rows] = await db.query(sqlBuscarToken, [token]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o ya ha expirado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sqlActualizar = "UPDATE usuarios SET password = ?, token_recuperacion = NULL WHERE token_recuperacion = ?";
    await db.query(sqlActualizar, [hashedPassword, token]);

    return res.status(200).json({ message: '¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión.' });

  } catch (err) {
    console.error("❌ Error en reset-password:", err);
    return res.status(500).json({ error: 'Error en el servidor', detalle: err.message });
  }
});

module.exports = router;