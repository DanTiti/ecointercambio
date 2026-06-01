const nodemailer = require('nodemailer');
const path = require('path'); 
const dotenv = require('dotenv');
const dns = require('dns'); 

// 1. Mantenemos el parche de IPv4 para evitar el error de red anterior
dns.setDefaultResultOrder('ipv4first');

// Configuración de dotenv para desarrollo local
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// 2. CAMBIO CRÍTICO: Usamos el Puerto 465 con SSL Directo (Inmune a bloqueos de STARTTLS)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // AL USAR PUERTO 465, ESTO DEBE SER TRUE (SSL DIRECTO)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Tus 16 letras amarillas sin espacios
  },
  tls: {
    rejectUnauthorized: false // Evita problemas con las llaves de seguridad del contenedor de Render
  },
  connectionTimeout: 10000, // 10 segundos máximos para conectar
  greetingTimeout: 10000,
  socketTimeout: 10000
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