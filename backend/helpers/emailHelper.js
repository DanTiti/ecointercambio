const nodemailer = require('nodemailer');
const path = require('path'); 
const dotenv = require('dotenv');
const dns = require('dns'); 

// 1. Candado global
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// 🔥 2. CREACIÓN DEL TRANSPORTE BINDADO (El que ya comprobamos que funciona)
const crearTransporterFresco = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', // ⚠️ IMPORTANTE: No usar service: 'gmail'
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS 
    },
    tls: {
      rejectUnauthorized: false 
    },
    // El candado definitivo: obligamos a Node a devolver un arreglo IPv4 puro
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
    connectionTimeout: 15000, 
    greetingTimeout: 15000,
    socketTimeout: 15000
  });
};

// MOTOR DE REINTENTOS AUTOMÁTICOS
const enviarCorreoConReintentos = async (mailOptions, intentosMaximos = 3) => {
  const transporter = crearTransporterFresco();

  for (let intento = 1; intento <= intentosMaximos; intento++) {
    try {
      console.log(`✉️ Intentando despachar correo (Intento ${intento} de ${intentosMaximos})...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ ¡Correo enviado con éxito en el intento número ${intento}!`);
      return info;
    } catch (error) {
      console.error(`⚠️ El intento ${intento} falló debido a: ${error.message}`);
      
      if (intento === intentosMaximos) {
        throw error;
      }
      
      console.log("Esperando 2 segundos para reintentar...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Función para enviar el correo de verificación (Para Ngrok / Laptop)
const sendVerificationEmail = async (email, nickname, token) => {
  // Ponemos Ngrok como respaldo por si acaso falla tu .env local
  const backendURL = process.env.BACKEND_URL || 'https://override-affluent-purgatory.ngrok-free.dev';
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
      </div>
    `
  };

  await enviarCorreoConReintentos(mailOptions);
};

// Función para enviar el correo de recuperación de contraseña (Para Render / Nube)
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
        </div>
    `
  };

  await enviarCorreoConReintentos(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail
};