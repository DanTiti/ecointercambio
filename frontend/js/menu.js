function inyectarModalGlobal() {
    if (document.getElementById('modalConfirm')) return;

    const modalHTML = `
        <div id="modalConfirm" class="modal-confirmacion" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 9999;">
            <div class="modal-confirm-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <i id="modalIcon" class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <h3 id="modalTitle" style="margin-top: 0;"></h3>
                <p id="modalText" style="color: #666;"></p>
                <div class="modal-confirm-btns" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="cerrarModal()" style="background: #e5e7eb; color: #374151; flex: 1; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Cancelar</button>
                    <button id="btnConfirmarAccion" style="color: white; flex: 1; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

let accionPendiente = null;

function abrirModal(titulo, texto, colorBtn, icono) {
    inyectarModalGlobal();
    document.getElementById('modalTitle').innerText = titulo;
    document.getElementById('modalText').innerText = texto;
    const iconEl = document.getElementById('modalIcon');
    iconEl.className = `fas ${icono}`;
    iconEl.style.color = colorBtn;
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    btnConfirmar.style.backgroundColor = colorBtn;
    document.getElementById('modalConfirm').style.display = 'flex';
    
    btnConfirmar.onclick = () => {
        if (accionPendiente) accionPendiente();
    };
}

function cerrarModal() {
    const modal = document.getElementById('modalConfirm');
    if (modal) modal.style.display = 'none';
    accionPendiente = null;
}

function confirmarCerrarSesion() {
    abrirModal(
        "¿Cerrar sesión?", 
        "Tendrás que ingresar tus credenciales nuevamente para entrar.", 
        "#d32f2f", 
        "fa-door-open"
    );
    accionPendiente = () => {
        localStorage.clear();
        window.location.href = 'login.html';
    };
}

document.addEventListener("DOMContentLoaded", function() {
    const menuBtn = document.getElementById("menuBtn");
    const dropdown = document.getElementById("myDropdown");

    if (menuBtn && dropdown) {
        menuBtn.onclick = (e) => { 
            e.stopPropagation(); 
            dropdown.classList.toggle("show"); 
        };

        window.onclick = () => { 
            if(dropdown.classList.contains('show')) {
                dropdown.classList.remove('show'); 
            }
        };
    }
});