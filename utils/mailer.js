const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,           // tu cuenta gmail (ej. tareasnotifier@gmail.com)
    pass: process.env.EMAIL_APP_PASSWORD    // contraseña de aplicación
  }
});

/**
 * Envía un email de notificación.
 * @param {string} to - Email del destinatario.
 * @param {string} subject - Asunto del correo.
 * @param {string} text - Texto plano.
 * @param {string} html - HTML opcional.
 */
async function sendNotificationEmail(to, subject, text, html = '') {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendNotificationEmail };
