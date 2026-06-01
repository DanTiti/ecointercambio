const nodemailer = require('nodemailer');
const path = require('path'); // <-- AGREGAMOS ESTO
const dotenv = require('dotenv');

// 🔥 CORREGIDO: Esto sube dos niveles desde backend/helpers/ para llegar al .env en la raíz de ecointercambio
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuración del transporte de Nodemailer usando Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Aquí van las 16 letras amarillas de tu .env
  }
});

// Función para enviar el correo de verificación
const sendVerificationEmail = async (email, nickname, token) => {
  // Enlace local (luego lo cambiaremos para que use Render en producción)
  const urlVerificacion = `http://localhost:25244/api/auth/verify?token=${token}`;

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
  // Enlace que llevará al usuario a tu pantalla HTML de cambiar contraseña
  // Usamos la FRONTEND_URL de tu Live Server (ej: http://127.0.0.1:5500)
  const urlReset = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;

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