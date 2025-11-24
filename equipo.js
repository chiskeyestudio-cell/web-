/*Luzamora*/
/*Luzamora*/
document.addEventListener('DOMContentLoaded', () => {
    // CAPTURA DE ELEMENTOS NECESARIOS PARA EL CLICK Y EL SONIDO
    const cookieLuzamora = document.getElementById('cookieLuzamora');
    const cookieXavi = document.getElementById('cookieXavi');
    const nombreXavi = document.getElementById('nombreXavi');
    const nombreLucia = document.getElementById('nombreLucia');
    const cookieBreakSound = document.getElementById('cookieBreakSound');

    // Función que maneja el click (romper/reparar la galleta y ocultar/mostrar el nombre)
    function handleClick(cookieContainer, nombreElement) {
        // 1. Romper/Reparar galleta (el CSS se encarga de mostrar la imagen rota)
        cookieContainer.classList.toggle('clicked');

        // 2. Ocultar/Mostrar el nombre lateral correspondiente (el CSS se encarga del efecto visual)
        if (nombreElement) {
            nombreElement.classList.toggle('oculto');
        }

        // 3. Sonido
        if (cookieBreakSound) {
            cookieBreakSound.currentTime = 0; 
            cookieBreakSound.play();
        }
    }

    // Evento de click para XAVI
    if (cookieXavi) {
        cookieXavi.addEventListener('click', () => {
            handleClick(cookieXavi, nombreXavi);
        });
    }

    // Evento de click para LUCÍA
    if (cookieLuzamora) {
        cookieLuzamora.addEventListener('click', () => {
            handleClick(cookieLuzamora, nombreLucia);
        });
    }

    // Lógica del botón "Ver Portfolio"
    document.querySelectorAll('.btn-portfolio').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); 
            alert('¡Abriendo portfolio!'); 
        });
    });
});