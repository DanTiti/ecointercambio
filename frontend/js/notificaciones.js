function actualizarContadorNavbar() {
    const userId = localStorage.getItem('userId');
    const notifSpan = document.getElementById('notif');
    const contactoIdActual = localStorage.getItem('contactoId');

    if (!userId || !notifSpan) return;

    fetch(`https://ecointercambio-backend-0ts7.onrender.com/api/mensajes/no-leidos/${userId}`)
        .then(res => res.json())
        .then(data => {
            const chatsDeOtros = data.filter(item => item.de_usuario != contactoIdActual);
            const totalChatsNuevos = chatsDeOtros.length; 

            if (totalChatsNuevos > 0) {
                notifSpan.innerText = ` (${totalChatsNuevos})`;
                notifSpan.style.color = "red";
            } else {
                notifSpan.innerText = '';
            }
        })
        .catch(err => console.error("Error en notificaciones:", err));
}

document.addEventListener('DOMContentLoaded', actualizarContadorNavbar);