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

menuLinks.forEach(link => link.addEventListener('click', e => e.preventDefault()));

// ==========================================================
// PARTE 4: MODAL (NO SE ABRE AUTOMÁTICAMENTE EN MÓVIL)
// ==========================================================
function openModal() {
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

// Asegurar que el modal esté cerrado al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateContent('recepcion');

    // Solo aseguramos que no se abra automáticamente
    modal.style.display = 'none';
});

// Botón reservas
if (reservasBtn) {
    reservasBtn.addEventListener('click', e => {
        e.preventDefault();
        openModal();
    });
}

// Botón cerrar
if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
}

// Cerrar al click fuera del modal
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

// Selección de iconos sociales
const socialIcons = document.querySelectorAll('.social-icons img');

// ==========================================================
// FOOTER IZQUIERDO
// ==========================================================
let overlayFooterLeft = document.createElement('div');
overlayFooterLeft.classList.add('overlay-footer');
overlayFooterLeft.textContent = '©2025 chiskey | Base en Valencia Esp';
overlay.appendChild(overlayFooterLeft);

// ==========================================================
// FOOTER DERECHO (CON LINKS CLICKEABLES)
// ==========================================================
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
// PARTE 6: TOGGLE DEL MENÚ + CAMBIO DE LOGO + BLOQUEO ICONOS
// ==========================================================
menuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = overlay.classList.contains('open');

    overlay.classList.toggle('open');
    document.body.classList.toggle('overlay-open', !isOpen);
    menuToggle.textContent = isOpen ? 'MENU' : 'X';
    menuToggle.classList.toggle('active');
    logo.src = isOpen ? logoOriginal : logoBlanco;

    // Iconos sociales
    socialIcons.forEach(icon => icon.style.filter = !isOpen ? 'invert(0)' : 'invert(1)');
    socialIcons.forEach(icon => {
        icon.style.pointerEvents = overlay.classList.contains('open') ? 'none' : 'auto';
    });

    overlay.style.pointerEvents = overlay.classList.contains('open') ? 'auto' : 'none';
    toggleOverlayFooterRight(overlay.classList.contains('open'));
});

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

// ==========================================================
// PARTE 8: FORMULARIO SIN REDIRECCIÓN (FORMSPREE AJAX)
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
            } else {
                alert("Ocurrió un error al enviar. Intenta otra vez.");
            }
        } catch (err) {
            alert("Error al enviar. Revisa tu conexión.");
        }
    });
});

// ==========================================================
// PARTE 9: GALLETAS (hover/click)
// ==========================================================
document.querySelectorAll('.cookie-container').forEach(container => {
    const wholeCookie = container.querySelector('.cookie-img.entera');
    const brokenCookie = container.querySelector('.cookie-img.rota');
    
    const handleHover = (img) => {
        img.addEventListener('mouseenter', () => container.classList.add('hover'));
        img.addEventListener('mouseleave', () => container.classList.remove('hover'));
        
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            if(container.classList.contains('clicked')) return; 
            container.classList.add('clicked'); 

            const nombreLateral = container.closest('.bloque-miembro').querySelector('.nombre-lateral');
            if (nombreLateral) nombreLateral.classList.add('oculto');

            const soundEl = document.getElementById("cookieBreakSound");
            if (soundEl) {
                try { soundEl.currentTime = 0; } catch (err) {}
                soundEl.play().catch(()=>{});
            }
        });
    };

    if (wholeCookie) handleHover(wholeCookie);
});


// Seleccionamos todos los bloques de miembros
document.querySelectorAll('.bloque-miembro').forEach((bloque) => {
  const galleta = bloque.querySelector('.cookie-img');
  const nombre = bloque.querySelector('.nombre-lateral');

  galleta.addEventListener('click', () => {
    // Alternamos la clase clicked en la cookie-container
    bloque.querySelector('.cookie-container').classList.toggle('clicked');

    // Si la galleta rota está visible, ocultamos el nombre lateral
    if (galleta.classList.contains('rota') || bloque.querySelector('.cookie-container').classList.contains('clicked')) {
      nombre.classList.add('oculto'); // oculta el texto lateral
    } else {
      nombre.classList.remove('oculto'); // muestra el texto lateral
    }
  });
});
// Selecciona todos los botones de portafolio
const portfolioButtons = document.querySelectorAll('.btn-portfolio');

portfolioButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.url;
        if (url) {
            // Abrir en nueva pestaña sin que aparezca el mensaje
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    });
});
