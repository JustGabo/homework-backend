const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendNotificationEmail(to, subject, text, html) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER, // debe ser el usuario SMTP
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendNotificationEmail };
