const nodemailer = require('nodemailer');
const path = require('path'); 
const dotenv = require('dotenv');
const dns = require('dns'); // <--- 1. IMPORTAMOS EL MÓDULO DNS DE NODE

// 🔥 2. PARCHE CRÍTICO PARA RENDER (Soluciona ENETUNREACH)
// Fuerza a Node.js a priorizar IPv4 sobre IPv6 para que no intente usar la red bloqueada de Render
dns.setDefaultResultOrder('ipv4first');

// Configuración de dotenv para desarrollo local
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuración robusta por puerto 587
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // false porque el puerto 587 usa STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Tus 16 letras amarillas sin espacios
  },
  tls: {
    rejectUnauthorized: false // Evita bloqueos de certificados en el contenedor
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000
});

// Función para enviar el correo de verificación
const sendVerificationEmail = async (email, nickname, token) => {
  const backendURL = process.env.BACKEND_URL || 'https://ecointercambio-backend-0ts7.onrender.com';
  const urlVerificacion = `${backendURL}/api/auth/verify?token=${token}`;

  const mailOptions = {
    from: `"ReÚtiles" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '¡Bienvenido a ReÚtiles! Verifica tu cuenta',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a; text-align: center;">¡Hola, ${nickname}!</h2>
        <p>Gracias por registrarte en <strong>ReÚtiles</strong>, la plataforma escolar de ecointercambio.</p>
        <p>Para activar tu cuenta y empezar a intercambiar tus útiles escolares, por favor confirma tu correo haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlVerificacion}" style="background-color: #16a34a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar mi cuenta</a>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${urlVerificacion}</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Función para enviar el correo de recuperación de contraseña
const sendResetPasswordEmail = async (email, token) => {
  const frontendURL = process.env.FRONTEND_URL || 'https://reutiles.onrender.com';
  const urlReset = `${frontendURL}/reset-password.html?token=${token}`;

  const mailOptions = {
    from: `"ReÚtiles" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔒 Restablecer tu contraseña en ReÚtiles',
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Recuperación de Contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en ReÚtiles.</p>
        <p>Este enlace es temporal. Haz clic en el botón de abajo para elegir una nueva contraseña segura:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${urlReset}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail
};