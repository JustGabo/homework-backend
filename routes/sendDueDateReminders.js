const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { sendNotificationEmail } = require('../utils/mailer');
const { generateDueDateReminderEmailHTML } = require('../templates/emails');

// Verifica si la fecha está entre hoy y 2 días adelante
function isDueSoon(fechaEntrega) {
  if (!fechaEntrega) return false;
  const ahora = new Date();
  const fecha = new Date(fechaEntrega);
  const diferenciaDias = (fecha - ahora) / (1000 * 60 * 60 * 24);
  return diferenciaDias >= 0 && diferenciaDias <= 2;
}

router.post('/', async (req, res) => {
  try {
    const { data: tareas, error } = await supabaseAdmin
      .from('tareas')
      .select('user_id, titulo, materia, fecha_entrega');

    if (error) throw error;

    const tareasPorUsuario = new Map();

    for (const tarea of tareas) {
      if (isDueSoon(tarea.fecha_entrega)) {
        if (!tareasPorUsuario.has(tarea.user_id)) {
          tareasPorUsuario.set(tarea.user_id, []);
        }
        tareasPorUsuario.get(tarea.user_id).push(tarea);
      }
    }

    for (const [user_id, tareasVencenPronto] of tareasPorUsuario.entries()) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', user_id)
        .single();

      if (!userError && userData && userData.email) {
        const html = generateDueDateReminderEmailHTML(tareasVencenPronto);
        const subject = '🔔 Recordatorio: Tareas próximas a vencer';

        try {
          await sendNotificationEmail(userData.email, subject, '', html);
          console.log(`✅ Recordatorio enviado a ${userData.email}`);
        } catch (emailErr) {
          console.error(`❌ Error enviando email a ${userData.email}:`, emailErr.message);
        }
      }
    }

    res.json({ success: true, message: 'Recordatorios enviados correctamente.' });
  } catch (err) {
    console.error('❌ Error general al enviar recordatorios:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
