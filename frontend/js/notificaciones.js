// notificaciones.js - Versión Final y Global

// 0. Seguro: Cargar SweetAlert2 si no existe
if (typeof Swal === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(script);
}

// CONFIGURACIÓN GLOBAL: Usamos 'window.backendURL' para que no haya conflictos de redeclaración
window.backendURL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:25244' 
    : 'https://ecointercambio-backend-0ts7.onrender.com';

// 1. Contador de mensajes en la Navbar
function actualizarContadorNavbar() {
    const userId = localStorage.getItem('userId');
    const notifSpan = document.getElementById('notif');
    const contactoIdActual = localStorage.getItem('contactoId');

    if (!userId || !notifSpan) return;

    fetch(`${window.backendURL}/api/mensajes/no-leidos/${userId}`)
        .then(res => res.json())
        .then(data => {
            const chatsDeOtros = data.filter(item => item.de_usuario != contactoIdActual);
            const totalChatsNuevos = chatsDeOtros.length; 

            if (totalChatsNuevos > 0) {
                notifSpan.innerText = ` (${totalChatsNuevos})`;
                notifSpan.style.color = "#1e88e5";
            } else {
                notifSpan.innerText = '';
            }
        })
        .catch(err => console.error("Error en contador:", err));
}

// 2. Notificaciones de propuestas
async function verificarNotificacionesPendientes() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const res = await fetch(`${window.backendURL}/api/transacciones/pendientes/${userId}`);
        const data = await res.json();

        if (data) {
            let titulo = "";
            let mensaje = "";
            
            if (data.estado === 'propuesta_pendiente') {
                titulo = "¡Nueva propuesta!";
                mensaje = `${data.otro_usuario_nickname} quiere intercambiar contigo: ${data.producto_nombre}`;
            } else if (data.estado === 'aceptado') {
                titulo = "¡Intercambio Aceptado!";
                mensaje = `${data.otro_usuario_nickname} aceptó tu propuesta. ¡Ya pueden chatear!`;
            } else {
                return;
            }

            Swal.fire({
                title: titulo,
                text: mensaje,
                icon: 'info',
                confirmButtonText: 'Ir al chat',
                showCancelButton: true,
                cancelButtonText: 'Luego'
            }).then((result) => {
                if (result.isConfirmed) {
                    const contactoId = (data.usuario_busca_id == userId) ? data.usuario_ofrece_id : data.usuario_busca_id;
                    localStorage.setItem('contactoId', contactoId);
                    localStorage.setItem('contactoNombre', data.otro_usuario_nickname);
                    localStorage.setItem('currentProductId', data.producto_id);
                    location.href = 'chat.html';
                }
            });
        }
    } catch (err) {
        console.error("Error al verificar propuestas:", err);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarContadorNavbar();
    verificarNotificacionesPendientes();
});