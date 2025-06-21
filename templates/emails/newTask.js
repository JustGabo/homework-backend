    /**
     * Genera un HTML bonito para el correo de nueva tarea.
     * @param {object} tarea - La tarea nueva.
     * @returns {string} HTML
     */
    function generateNewTaskEmailHTML(tarea) {
        return `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #4CAF50;">📌 Nueva Tarea Agregada</h2>
            <p><strong>Título:</strong> ${tarea.titulo}</p>
            <p><strong>Materia:</strong> ${tarea.materia}</p>
            <p><strong>Profesor:</strong> ${tarea.profesor}</p>
            <p><strong>Fecha de entrega:</strong> ${tarea.fecha_entrega || 'No especificada'}</p>
            <p><strong>Estado:</strong> ${tarea.estado}</p>
            <p><strong>Tipo:</strong> ${tarea.tipo}</p>
            <p><strong>Descripción:</strong> ${tarea.descripcion || 'Sin descripción'}</p>
            <hr />
            <p style="font-size: 0.9em; color: #777;">Este correo fue generado automáticamente por el sistema de notificaciones de tareas.</p>
        </div>
        `;
    }
    
    module.exports = { generateNewTaskEmailHTML };
    