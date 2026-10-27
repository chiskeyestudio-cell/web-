// ==========================================================
// PARTE 1: CONTENIDO DE LAS SECCIONES
// ==========================================================
const pageContent = {
    recepcion: {
        title1: 'No, no es cheesecake.',
        title2: 'Es chiskey:',
        info: 'La cocina digital donde creamos imágenes con propósito. Diseñamos y cuidamos cada detalle: desde el píxel más pequeño hasta el visual más complejo.',
        imgUrl: 'https://res.cloudinary.com/dxsip0hvb/image/upload/c_fill,w_1000,h_700,f_auto,q_auto:good,fl_progressive/v1763471467/tarta1nuevo_tama%C3%B1o_ojsuy2.png',
        position: { top: '-30px', right: '-10px' },
        cta: { text: 'Ver todos nuestros servicios', url: '#servicios' }
    }
};

// ==========================================================
// PARTE 2: CAPTURA DE ELEMENTOS
// ==========================================================
// Los elementos de texto (main-title, etc) se capturan dentro de updateContent para evitar errores si no existen
const imageElement = document.getElementById('main-image');
const logo = document.querySelector('.logo img');

const menuLinks = document.querySelectorAll('.menu a:not(#menu-toggle)');
const modal = document.getElementById('myModal');
const closeBtn = document.querySelector('.close-btn');
const reservasBtn = document.querySelector('.reservas-btn');

const logoOriginal = 'https://res.cloudinary.com/dxsip0hvb/image/upload/v1763595831/LOGO_BLANCO_CHISKEY_uvl5an.png';
const logoBlanco = 'https://res.cloudinary.com/dxsip0hvb/image/upload/v1763596790/LOGO_AZUL_CHISKEY_yu3mqz.png';

// ==========================================================
// PARTE 3: FUNCIÓN PARA ACTUALIZAR CONTENIDO (CORREGIDA)
// ==========================================================
function updateContent(section) {
    const data = pageContent[section];
    if (!data) return;

    // Capturamos elementos solo si existen en el HTML actual para evitar el error "null"
    const title1Element = document.getElementById('main-title1');
    const title2Element = document.getElementById('main-title2');
    const infoElement = document.getElementById('main-info');

    if (title1Element) title1Element.textContent = data.title1;
    if (title2Element) title2Element.textContent = data.title2;
    if (infoElement) infoElement.textContent = data.info;

    // Actualización de imagen (si existe el contenedor)
    if (imageElement) {
        const img = imageElement.querySelector('img');
        if (img) img.src = data.imgUrl;

        if (data.position) {
            imageElement.style.top = data.position.top;
            imageElement.style.right = data.position.right;
        }
    }
}

menuLinks.forEach(link => link.addEventListener('click', e => e.preventDefault()));

// ==========================================================
// PARTE 4: MODAL (CONTROL DE APERTURA)
// ==========================================================
function openModal() {
    if (modal) modal.style.display = 'flex';
     iniciarPasos();   // ← añade esta línea
}

function closeModal() {
    if (modal) modal.style.display = 'none';
}

// Inicialización segura al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Solo actualiza si detecta la estructura de la página de inicio antigua
    if (document.getElementById('main-title1')) {
        updateContent('recepcion');
    }

    // ASEGURAR QUE EL MODAL ESTÉ CERRADO AL CARGAR
    if (modal) {
        modal.style.display = 'none';
    }
});

// Eventos del modal
if (reservasBtn) {
    reservasBtn.addEventListener('click', e => {
        e.preventDefault();
        openModal();
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
}

window.addEventListener('click', e => {
    if (e.target === modal) closeModal();
});

// ==========================================================
// PARTE 5: OVERLAY DEL MENÚ
// ==========================================================
const menuToggle = document.getElementById('menu-toggle');
let overlay = document.querySelector('.overlay');

if (!overlay) {
    overlay = document.createElement('div');
    overlay.classList.add('overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('overlay-content');

    const text1 = document.createElement('a');
    text1.href = '/servicios/';
    text1.innerHTML = '<span>La carta</span>';

    const text2 = document.createElement('a');
    text2.href = '/proyectos/';
    text2.innerHTML = '<span>Proyectos</span>';

    const text3 = document.createElement('a');
    text3.href = '/sobreck/';
    text3.innerHTML = '<span>Sobre ck</span>';

    const text4 = document.createElement('a');
    text4.href = '/tupedido/';
    text4.innerHTML = '<span>Tu pedido</span>';

    overlayContent.append(text1, text2, text3, text4);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
}

const socialIcons = document.querySelectorAll('.social-icons img');

// Footers del overlay
let overlayFooterLeft = document.createElement('div');
overlayFooterLeft.classList.add('overlay-footer');
overlayFooterLeft.textContent = '©2025 chiskey | Base en Valencia Esp';
overlay.appendChild(overlayFooterLeft);

let overlayFooterRight = document.createElement('div');
overlayFooterRight.classList.add('overlay-footer-right');
overlayFooterRight.innerHTML = `
    <a href="https://drive.google.com/file/d/1kc8CvPUErHeAkZhF5ti5Hdf0QyjXlfL8/view?usp=sharing" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
    &nbsp;|&nbsp;
    <a href="https://drive.google.com/file/d/10bu6E6xhUzXzlpomT_fe0ZzQC2MNudRf/view?usp=sharing" target="_blank" rel="noopener noreferrer">Aviso legal</a>
`;
overlayFooterRight.style.pointerEvents = 'none';
overlayFooterRight.style.opacity = '0';
overlay.appendChild(overlayFooterRight);

function toggleOverlayFooterRight(isOpen) {
    overlayFooterRight.style.pointerEvents = isOpen ? 'auto' : 'none';
    overlayFooterRight.style.opacity = isOpen ? '1' : '0';
}

// ==========================================================
// PARTE 6: TOGGLE DEL MENÚ
// ==========================================================
if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = overlay.classList.contains('open');

        overlay.classList.toggle('open');
        document.body.classList.toggle('overlay-open', !isOpen);
        menuToggle.textContent = isOpen ? 'MENU' : 'X';
        menuToggle.classList.toggle('active');
        if (logo) logo.src = isOpen ? logoOriginal : logoBlanco;

        socialIcons.forEach(icon => {
            icon.style.filter = !isOpen ? 'invert(0)' : 'invert(1)';
            icon.style.pointerEvents = overlay.classList.contains('open') ? 'none' : 'auto';
        });

        overlay.style.pointerEvents = overlay.classList.contains('open') ? 'auto' : 'none';
        toggleOverlayFooterRight(overlay.classList.contains('open'));
    });
}

// Redirección de links del overlay
const overlayLinks = overlay.querySelectorAll('.overlay-content a');
overlayLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = link.href;
    });
});

// ==========================================================
// PARTE 7: FORMULARIO AJAX
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const formReserva = document.getElementById("reservaForm");
    const mensajeGracias = document.getElementById("mensajeGracias");
    const formContainer = document.getElementById("formContainer");

    if (!formReserva || !mensajeGracias || !formContainer) return;

    formReserva.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formReserva);

        try {
            const respuesta = await fetch(formReserva.action, {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });

            if (respuesta.ok) {
                formContainer.style.display = "none";
                mensajeGracias.style.display = "block";
                // aviso para quien escuche (la carta vacía "Tu comanda")
                document.dispatchEvent(new CustomEvent('comanda:enviada'));
            } else {
                alert("Ocurrió un error al enviar. Intenta otra vez.");
            }
        } catch (err) {
            alert("Error al enviar. Revisa tu conexión.");
        }
    });
});

// ==========================================================
// PARTE 8: GALLETAS Y PORTFOLIO
// ==========================================================
document.querySelectorAll('.cookie-container').forEach(container => {
    const wholeCookie = container.querySelector('.cookie-img.entera');
    
    if (wholeCookie) {
        wholeCookie.addEventListener('click', (e) => {
            e.stopPropagation();
            if(container.classList.contains('clicked')) return; 
            container.classList.add('clicked'); 

            const nombreLateral = container.closest('.bloque-miembro')?.querySelector('.nombre-lateral');
            if (nombreLateral) nombreLateral.classList.add('oculto');

            const soundEl = document.getElementById("cookieBreakSound");
            if (soundEl) {
                soundEl.currentTime = 0;
                soundEl.play().catch(()=>{});
            }
        });
    }
});

const portfolioButtons = document.querySelectorAll('.btn-portfolio');
portfolioButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.url;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    });
});





// ==========================================================
// COMANDA: rotación de proyectos servidos
// ==========================================================
const comandaProyectos = [
    { num: 'COMANDA #003', plato: 'el hogar', desc: 'identidad de marca' },
    { num: 'COMANDA #002', plato: 'oliv.ia', desc: 'app con ia' },
    { num: 'COMANDA #001', plato: 'izate 360', desc: 'diseño y desarrollo web' }
];

let comandaIndex = 0;
const comandaEl = document.getElementById('comanda');

if (comandaEl) {
    const numEl = document.getElementById('comandaNum');
    const platoEl = document.getElementById('comandaPlato');
    const descEl = document.getElementById('comandaDesc');
    const papelEl = comandaEl.querySelector('.comanda__papel');

    setInterval(() => {
        comandaIndex = (comandaIndex + 1) % comandaProyectos.length;
        const p = comandaProyectos[comandaIndex];

        // re-imprime el ticket con el siguiente proyecto
        papelEl.style.animation = 'none';
        void papelEl.offsetWidth; // reinicia la animación
        numEl.textContent = p.num;
        platoEl.textContent = p.plato;
        descEl.textContent = p.desc;
        papelEl.style.animation = 'imprimir 0.9s cubic-bezier(0.22, 1, 0.36, 1) both';
    }, 7000);
}


// ==========================================================
// CURSOR FUEGO: rescoldo que se enciende sobre clicables
// ==========================================================
const cursorFuego = document.createElement('div');
cursorFuego.classList.add('cursor-fuego');
cursorFuego.innerHTML = `
    <div class="rescoldo"></div>
    <svg class="llama" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1 C13 8, 20 10, 20 19 C20 26, 16.5 31, 12 31 
                 C7.5 31, 4 26, 4 19 C4 13, 8 11, 8.5 6 
                 C10 9, 11.5 9.5, 12 1 Z" fill="#E91E63"/>
        <path d="M12 12 C12.5 16, 16 17.5, 16 22 C16 26.5, 14 29, 12 29 
                 C10 29, 8 26.5, 8 22 C8 18.5, 10.5 17, 11 14 
                 C11.3 15.5, 11.8 15.8, 12 12 Z" fill="#F8A07B"/>
    </svg>
`;
document.body.appendChild(cursorFuego);

window.addEventListener('mousemove', e => {
    cursorFuego.style.left = e.clientX + 'px';
    cursorFuego.style.top = e.clientY + 'px';
});

// Se enciende sobre cualquier cosa clicable
const clicables = 'a, button, .reservas-btn, #menu-toggle, input, textarea, .comanda';
document.addEventListener('mouseover', e => {
    if (e.target.closest(clicables)) cursorFuego.classList.add('encendido');
});
document.addEventListener('mouseout', e => {
    if (e.target.closest(clicables)) cursorFuego.classList.remove('encendido');
});







// ==========================================================
// PASOS ANIMADOS DEL MODAL COMANDA
// ==========================================================
// ==========================================================
// PASOS ANIMADOS DEL MODAL COMANDA
// ==========================================================
let pasoInterval = null;

function iniciarPasos() {
    const pasos = document.querySelectorAll('.comanda-pasos .paso');
    if (!pasos.length) return;

    // reinicia: apaga todos, enciende el primero
    pasos.forEach(p => p.classList.remove('activo'));
    let pasoActual = 0;
    pasos[0].classList.add('activo');

    // limpia cualquier ciclo anterior antes de arrancar uno nuevo
    if (pasoInterval) clearInterval(pasoInterval);
    pasoInterval = setInterval(() => {
        pasos[pasoActual].classList.remove('activo');
        pasoActual = (pasoActual + 1) % pasos.length;
        pasos[pasoActual].classList.add('activo');
    }, 2000);
}