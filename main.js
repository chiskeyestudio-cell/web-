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
    text1.textContent = 'Servicios';

    const text2 = document.createElement('a');
    text2.href = 'proyectos.html';
    text2.textContent = 'Proyectos';

    const text3 = document.createElement('a');
    text3.href = 'sobreck.html';
    text3.textContent = 'Sobre ck';

    const text4 = document.createElement('a');
    text4.href = 'equipo.html';
    text4.textContent = 'Equipo';

    overlayContent.append(text1, text2, text3, text4);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
}

// ==========================================================
// PARTE 6: TOGGLE DEL MENÚ + CAMBIO DE LOGO
// ==========================================================
menuToggle.addEventListener('click', (e) => {
    e.preventDefault();

    const isOpen = overlay.classList.contains('open');

    if (!isOpen) {
        overlay.classList.add('open');
        menuToggle.textContent = 'X';
        menuToggle.classList.add('active');
        logo.src = logoBlanco;
    } else {
        overlay.classList.remove('open');
        menuToggle.textContent = 'MENU';
        menuToggle.classList.remove('active');
        logo.src = logoOriginal;
    }
});

// Footer en overlay
let overlayFooter = document.createElement('div');
overlayFooter.classList.add('overlay-footer');
overlayFooter.textContent = '©2025 chiskey | Base en Valencia Esp';
overlay.appendChild(overlayFooter);

// ==========================================================
// PARTE 7: LINKS DEL OVERLAY (CIERRAN Y NAVEGAN SIN FLASH DE INICIO)
// ==========================================================
// LINKS DEL OVERLAY (CIERRAN Y NAVEGAN CON TRANSICIÓN SUAVE)
// ==========================================================
const overlayLinks = overlay.querySelectorAll('.overlay-content a');

overlayLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = link.href; // Navega inmediatamente
    });
});
