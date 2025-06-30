const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { sendNotificationEmail } = require('../utils/mailer');

router.post('/', async (req, res) => {
  try {
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;
    const users = usersData.users;

    const userEmailMap = new Map();
    users.forEach(user => {
      if (user.id && user.email) userEmailMap.set(user.id, user.email);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 2);
    endDate.setHours(23, 59, 59, 999);

    console.log(`📆 Buscando tareas entre ${today.toDateString()} y ${endDate.toDateString()}`);

    const { data: tareas, error } = await supabaseAdmin
      .from('tareas')
      .select('user_id, titulo, materia, fecha_entrega');
    if (error) throw error;

    if (!tareas || tareas.length === 0) {
      return res.json({ success: false, message: 'No hay tareas registradas.' });
    }

    const parseFechaEntrega = (text) => {
      const [mm, dd, yyyy] = text.split('-');
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    };

    const tareasFiltradas = tareas.filter(t => {
      if (!t.fecha_entrega) return false;
      const fecha = parseFechaEntrega(t.fecha_entrega);
      return fecha >= today && fecha <= endDate;
    });

    if (tareasFiltradas.length === 0) {
      return res.json({ success: true, message: 'No hay tareas con vencimiento hoy, mañana o pasado mañana.' });
    }

    const tareasPorUsuario = new Map();
    for (const tarea of tareasFiltradas) {
      if (!tareasPorUsuario.has(tarea.user_id)) tareasPorUsuario.set(tarea.user_id, []);
      tareasPorUsuario.get(tarea.user_id).push(tarea);
    }

    for (const [user_id, tareasUsuario] of tareasPorUsuario.entries()) {
      const email = userEmailMap.get(user_id);
      if (!email) {
        console.warn(`⚠️ No se encontró email para user_id: ${user_id}`);
        continue;
      }

      const subject = '📋 Tienes tareas próximas a vencer';
      const html = `
        <p>Hola,</p>
        <p>Tienes <strong>${tareasUsuario.length}</strong> tarea(s) que vencerán hoy, mañana o pasado mañana.</p>
        <ul>
          ${tareasUsuario.map(t => `<li><strong>${t.titulo}</strong> - Fecha de entrega: ${t.fecha_entrega}</li>`).join('')}
        </ul>
        <p>¡No olvides revisarlas!</p>
      `;

      try {
        await sendNotificationEmail(email, subject, '', html);
        console.log(`✅ Correo enviado a ${email}`);
      } catch (err) {
        console.error(`❌ Error enviando correo a ${email}:`, err.message);
      }
    }

    res.json({ success: true, message: 'Correos enviados para tareas que vencen hoy, mañana o pasado mañana.' });
  } catch (err) {
    console.error('❌ Error general:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const { supabaseAdmin } = require('../supabaseClient');
// const { sendNotificationEmail } = require('../utils/mailer');

// router.post('/', async (req, res) => {
//   try {
//     const { data, error } = await supabaseAdmin.auth.admin.listUsers();

//     if (error) throw error;

//     const users = data.users; // <---- aquí está el array correcto

//     console.log('Usuarios recuperados:');
//     users.forEach((u, i) => {
//       console.log(`${i + 1}. ${u.email}`);
//     });

//     const subject = '🔔 Prueba de envío de correo';
//     const html = '<p>Hola, esto es una prueba para confirmar que los correos se están enviando correctamente.</p>';

//     for (const user of users) {
//       if (user.email) {
//         try {
//           await sendNotificationEmail(user.email, subject, '', html);
//           console.log(`✅ Correo enviado a: ${user.email}`);
//         } catch (err) {
//           console.error(`❌ Error enviando a ${user.email}:`, err.message);
//         }
//       }
//     }

//     res.json({ success: true, message: 'Correos de prueba enviados' });
//   } catch (err) {
//     console.error('❌ Error:', err.message);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;
