// templates/emails.js
function generateNewTaskEmailHTML(tarea) {
    return `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>📘 Nueva tarea asignada</h2>
        <p><strong>Título:</strong> ${tarea.titulo}</p>
        <p><strong>Materia:</strong> ${tarea.materia}</p>
        <p><strong>Profesor:</strong> ${tarea.profesor || 'No especificado'}</p>
        <p><strong>Fecha de entrega:</strong> ${tarea.fecha_entrega || 'No especificada'}</p>
        <p><strong>Estado:</strong> ${tarea.estado}</p>
        <hr />
        <p style="font-size: 0.9em; color: #888;">Este es un aviso automático del sistema de tareas.</p>
      </div>
    `;
  }
  
  function generateReminderEmailHTML(tarea) {
    return `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>⏰ Recordatorio de tarea próxima a vencer</h2>
        <p><strong>Título:</strong> ${tarea.titulo}</p>
        <p><strong>Materia:</strong> ${tarea.materia}</p>
        <p><strong>Fecha de entrega:</strong> ${tarea.fecha_entrega}</p>
        <p style="color: #c00;">Te recomendamos entregarla a tiempo.</p>
        <hr />
        <p style="font-size: 0.9em; color: #888;">Este es un recordatorio automático del sistema de tareas.</p>
      </div>
    `;
  }
  
  module.exports = {
    generateNewTaskEmailHTML,
    generateReminderEmailHTML,
  };
  