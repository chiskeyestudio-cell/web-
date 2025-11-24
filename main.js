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
const title1Element = document.getElementById('main-title1');
const title2Element = document.getElementById('main-title2');
const infoElement = document.getElementById('main-info');
const imageElement = document.getElementById('main-image');
const logo = document.querySelector('.logo img');

const menuLinks = document.querySelectorAll('.menu a:not(#menu-toggle)');

const modal = document.getElementById('myModal');
const closeBtn = document.querySelector('.close-btn');
const reservasBtn = document.querySelector('.reservas-btn');

const logoOriginal = 'https://res.cloudinary.com/dxsip0hvb/image/upload/v1763595831/LOGO_BLANCO_CHISKEY_uvl5an.png';
const logoBlanco = 'https://res.cloudinary.com/dxsip0hvb/image/upload/v1763596790/LOGO_AZUL_CHISKEY_yu3mqz.png';

// ==========================================================
// PARTE 3: FUNCIÓN PARA ACTUALIZAR CONTENIDO
// ==========================================================
function updateContent(section) {
    const data = pageContent[section];
    if (!data) return;

    title1Element.textContent = data.title1;
    title2Element.textContent = data.title2;
    infoElement.textContent = data.info;
    imageElement.src = data.imgUrl;

    if (data.position) {
        imageElement.style.top = data.position.top;
        imageElement.style.right = data.position.right;
    }
}

menuLinks.forEach(link => {
    link.addEventListener('click', e => e.preventDefault());
});

// ==========================================================
// PARTE 4: MODAL
// ==========================================================
if (reservasBtn) {
    reservasBtn.addEventListener('click', e => {
        e.preventDefault();
        modal.style.display = 'flex';
    });
}

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', () => updateContent('recepcion'));

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
    text1.href = 'servicios.html';
    text1.innerHTML = '<span>Servicios</span>';

    const text2 = document.createElement('a');
    text2.href = 'proyectos.html';
    text2.innerHTML = '<span>Proyectos</span>';

    const text3 = document.createElement('a');
    text3.href = 'sobreck.html';
    text3.innerHTML = '<span>Sobre ck</span>';

    const text4 = document.createElement('a');
    text4.href = 'equipo.html';
    text4.innerHTML = '<span>Equipo</span>';

    overlayContent.append(text1, text2, text3, text4);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
}

// ============================
// Seleccionamos los iconos de redes
const socialIcons = document.querySelectorAll('.social-icons img');

// ==========================================================
// PARTE 6: TOGGLE DEL MENÚ + CAMBIO DE LOGO
// ==========================================================
// TOGGLE DEL MENÚ + CAMBIO DE LOGO + ICONOS
menuToggle.addEventListener('click', (e) => {
    e.preventDefault();

    const isOpen = overlay.classList.contains('open');

    // Toggle overlay
    overlay.classList.toggle('open');

    // Toggle clase global
    document.body.classList.toggle('overlay-open', !isOpen);

    // Cambiar texto del botón
    menuToggle.textContent = isOpen ? 'MENU' : 'X';
    menuToggle.classList.toggle('active');

    // Cambiar logo
    logo.src = isOpen ? logoOriginal : logoBlanco;

    // Cambiar iconos usando la clase del body
    socialIcons.forEach(icon => {
        icon.style.filter = !isOpen ? 'invert(0)' : 'invert(1)'; // negro si abierto, blanco si cerrado
    });
});


// Footer en overlay
let overlayFooter = document.createElement('div');
overlayFooter.classList.add('overlay-footer');
overlayFooter.textContent = '©2025 chiskey | Base en Valencia Esp';
overlay.appendChild(overlayFooter);

// ==========================================================
// PARTE 7: LINKS DEL OVERLAY
// ==========================================================
const overlayLinks = overlay.querySelectorAll('.overlay-content a');

overlayLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = link.href;
    });
});

// ============================
// 🔥 NUEVO: sincronización de iconos con overlay en tiempo real
// ============================
function syncIconColors() {
    const overlayRect = overlay.getBoundingClientRect();
    socialIcons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        if (overlayRect.top <= iconRect.bottom && overlayRect.bottom >= iconRect.top) {
            icon.style.filter = 'invert(0)'; // negro cuando overlay los cubre
        } else {
            icon.style.filter = 'invert(1)'; // blanco cuando overlay no los cubre
        }
    });
    requestAnimationFrame(syncIconColors);
}

requestAnimationFrame(syncIconColors);
