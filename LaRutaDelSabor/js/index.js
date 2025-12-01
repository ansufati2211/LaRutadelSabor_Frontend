// js/index.js

// NUEVO: Definir la URL base de tu API backend
const API_BASE_URL = 'http://localhost:8080/api';
// Asegúrate que el puerto sea correcto

document.addEventListener('DOMContentLoaded', () => {
    renderAuthButtons(); // Renderiza botones al cargar
    initializeCarousel(); // Inicializa carrusel de banners
    initializeReviewCarousel(); // NUEVO: Llama a la función específica para reseñas
    mostrarVentanaBienvenida();
    inicializarFooterAcordeon(); // Asegúrate que esta llamada esté aquí o al final si depende de otros elementos
    initializeSocialLinksEffect(); // NUEVO: Llamada para efecto en redes sociales
});

// --- Funciones Auxiliares ---

// NUEVO: Función auxiliar para obtener el token JWT de localStorage
function getToken() {
    return localStorage.getItem('token');
}

// NUEVO: Función auxiliar para obtener los detalles del usuario de localStorage
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.error("Error parsing user from localStorage", e);
        return null;
    }
}

// NUEVO: Función auxiliar para realizar llamadas fetch con token de autorización
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Permite sobrescribir o añadir cabeceras
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });
        return response; // Devuelve la respuesta completa para manejarla después
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        throw error; // Propaga el error
    }
}

// --- Carrusel de Reseñas ---
const carruselResenas = document.getElementById('carruselResenas');
let tarjetasResenas = [];
let posicionResena = 0;
let autoSlideResenas; // Variable para el intervalo

// MODIFICADO: Función para inicializar todo lo relacionado al carrusel de reseñas
async function initializeReviewCarousel() {
    if (!carruselResenas) {
        console.warn("Elemento 'carruselResenas' no encontrado.");
        return; // Salir si el carrusel no existe en esta página
    }
    await cargarReviews(); // Carga inicial desde el backend
    // Añadir listeners a los botones de control si existen
    const btnAnterior = document.getElementById('btnAnteriorResena'); // Asigna IDs a tus botones
    const btnSiguiente = document.getElementById('btnSiguienteResena');
    if (btnAnterior) btnAnterior.addEventListener('click', anteriorResena);
    if (btnSiguiente) btnSiguiente.addEventListener('click', siguienteResena);

    // Configurar botones/formularios de comentarios si existen
    const btnAbrirModal = document.getElementById('btnAbrirModalComentario'); // Asigna ID a tu botón "Dejar Reseña"
    const btnCerrarModal = document.getElementById('btnCerrarModalComentario'); // Asigna ID al botón de cerrar modal
    const formComentario = document.getElementById('formComentario'); // Asigna ID al formulario

    if (btnAbrirModal) btnAbrirModal.addEventListener('click', abrirFormularioComentario);
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarFormularioComentario);
    if (formComentario) formComentario.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevenir envío tradicional
        agregarComentario();
    });

}

function mostrarResena(pos) {
    if (!carruselResenas || tarjetasResenas.length === 0) return;
    // Asegurarse que la posición sea válida
    pos = Math.max(0, Math.min(pos, tarjetasResenas.length - 1));
    const desplazamiento = tarjetasResenas[pos]?.offsetLeft || 0; // Usar optional chaining
    carruselResenas.scrollTo({ left: desplazamiento, behavior: 'smooth' });
}

function siguienteResena() {
    if (tarjetasResenas.length === 0) return;
    posicionResena = (posicionResena + 1) % tarjetasResenas.length;
    mostrarResena(posicionResena);
    reiniciarAutoSlideResenas();
}

function anteriorResena() {
    if (tarjetasResenas.length === 0) return;
    posicionResena = (posicionResena - 1 + tarjetasResenas.length) % tarjetasResenas.length;
    mostrarResena(posicionResena);
    reiniciarAutoSlideResenas();
}

function iniciarAutoSlideResenas() {
    clearInterval(autoSlideResenas); // Limpiar intervalo anterior si existe
    autoSlideResenas = setInterval(siguienteResena, 5000);
}

function reiniciarAutoSlideResenas() {
    iniciarAutoSlideResenas(); // Simplemente reinicia el intervalo
}

function abrirFormularioComentario() {
    // NUEVO: Verificar si el usuario está logueado antes de abrir
    const token = getToken();
    if (!token) {
        alert("Debes iniciar sesión para dejar un comentario.");
        // Opcional: Redirigir a login.html
        // window.location.href = 'login.html';
        return;
    }
    const modal = document.getElementById('modalComentario');
    if (modal) modal.classList.remove('hidden');
}

function cerrarFormularioComentario() {
    const modal = document.getElementById('modalComentario');
    if (modal) modal.classList.add('hidden');
    // Limpiar campos al cerrar
    const form = document.getElementById('formComentario');
    if (form) form.reset();
}

// MODIFICADO: Para usar datos del backend (Cliente asociado)
function agregarResenaAlCarrusel(nombreCliente, apellidoCliente, medio, texto, puntuacion, fecha) {
    if (!carruselResenas) return;

    const fechaObj = new Date(fecha);
    // Verificar si la fecha es válida
    const fechaFormateada = !isNaN(fechaObj) ? fechaObj.toLocaleDateString('es-ES', { // Usar español
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }) : 'Fecha inválida';

    const nombreCompleto = `${nombreCliente || 'Usuario'} ${apellidoCliente || ''}`.trim();

    const nuevaTarjeta = document.createElement('div');
    // Ajusta las clases según tu diseño Tailwind/CSS
    nuevaTarjeta.className = "carta-reseña flex-none w-64 md:w-80 bg-white rounded-lg shadow-md p-4 border border-gray-200 text-black mr-4";
    nuevaTarjeta.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <div>
            <p class="font-semibold text-sm">${nombreCompleto}</p>
            <p class="text-xs text-gray-500">${medio || 'Web'}</p>
          </div>
          <span class="text-yellow-500 text-sm font-bold flex items-center">★ ${puntuacion || '?'}</span>
        </div>
        <p class="text-sm text-gray-700 mb-4 break-words">${texto || 'Sin comentario'}</p>
        <div class="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
          <div class="flex items-center gap-1">
            <span>${fechaFormateada}</span>
          </div>
          </div>
      `;

    carruselResenas.appendChild(nuevaTarjeta);
}

// MODIFICADO: Cargar reviews desde el backend
async function cargarReviews() {
    if (!carruselResenas) return; // No hacer nada si el carrusel no está en la página

    // Limpiar carrusel existente
    carruselResenas.innerHTML = '';
    tarjetasResenas = [];
    posicionResena = 0;
    clearInterval(autoSlideResenas); // Detener slide actual

    try {
        // Llamar al endpoint público del backend
        const response = await fetch(`${API_BASE_URL}/comentarios?limite=10`); // Pide los últimos 10
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        const comentarios = await response.json();

        if (comentarios && comentarios.length > 0) {
            comentarios.forEach(review => {
                // Asume que el backend devuelve el objeto Cliente anidado
                const cliente = review.cliente || {};
                agregarResenaAlCarrusel(
                    cliente.nombre || 'Anónimo', // Nombre del cliente desde el backend
                    cliente.apellido || '',    // Apellido del cliente
                    review.medio,              // Medio desde el comentario
                    review.texto,
                    review.puntuacion,
                    review.fecha_Comentario || review.createdAt // Usar fecha específica o de creación
                );
            });

            // Actualizar la lista de tarjetas y reiniciar carrusel
            tarjetasResenas = carruselResenas.querySelectorAll('.carta-reseña');
            if (tarjetasResenas.length > 0) {
                posicionResena = 0;
                mostrarResena(posicionResena);
                iniciarAutoSlideResenas(); // Iniciar autoslide solo si hay comentarios
            }

        } else {
            carruselResenas.innerHTML = '<p class="text-center text-gray-500">Aún no hay reseñas.</p>'; // Mensaje si no hay comentarios
        }

    } catch (error) {
        console.error('Error al cargar comentarios desde el backend:', error);
        if (carruselResenas) {
            carruselResenas.innerHTML = '<p class="text-center text-red-500">No se pudieron cargar las reseñas.</p>'; // Mensaje de error
        }
    }
}

// MODIFICADO: Enviar comentario al backend
async function agregarComentario() {
    const texto = document.getElementById('textoComentario')?.value.trim();
    const puntuacionInput = document.getElementById('puntuacion'); // Select element
    const puntuacion = puntuacionInput ? parseInt(puntuacionInput.value, 10) : null;
    const medio = "Web"; // O puedes tener un input para esto

    // Validar puntuación
    if (!texto || puntuacion === null || isNaN(puntuacion) || puntuacion < 1 || puntuacion > 5) {
        alert("Por favor, escribe un comentario y selecciona una puntuación válida (1-5 estrellas).");
        return;
    }

    const token = getToken();
    if (!token) {
        alert("Debes iniciar sesión para enviar un comentario.");
        cerrarFormularioComentario(); // Cerrar modal si no está logueado
        return;
    }

    const comentarioData = {
        texto: texto,
        puntuacion: puntuacion,
        medio: medio
    };

    try {
        // Usar fetchWithAuth para enviar el token
        const response = await fetchWithAuth(`${API_BASE_URL}/comentarios`, {
            method: 'POST',
            body: JSON.stringify(comentarioData),
            // 'Content-Type': 'application/json' ya está incluido en fetchWithAuth
        });

        if (response.ok) {
            const nuevoComentarioGuardado = await response.json(); // El backend devuelve el comentario guardado
            console.log("Comentario guardado:", nuevoComentarioGuardado);
            alert("¡Gracias por tu comentario!");

            // Opcional: Añadir dinámicamente al carrusel (puede desordenar si no se recarga)
            // O mejor, recargar todos los comentarios para mostrar el más reciente
            cerrarFormularioComentario();
            await cargarReviews(); // Recargar comentarios para mostrar el nuevo

        } else {
            // Manejar errores del backend
            const errorData = await response.json();
            console.error('Error del backend:', errorData);
            alert(`Error al guardar comentario: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Error al enviar comentario:', error);
        alert("Ocurrió un error al enviar tu comentario. Inténtalo de nuevo.");
    } finally {
        // Limpiar formulario independientemente del resultado (opcional)
        // const form = document.getElementById('formComentario');
        // if (form) form.reset();
    }
}

// --- Carrusel de Banners ---
// (Tu función initializeCarousel parece correcta, la dejamos como está)
function initializeCarousel() {
    const carousel = document.querySelector('.carrusel-personalizado');
    if (!carousel) return; // Salir si no existe en la página
    const items = carousel.querySelectorAll('.carrusel-item');
    const indicatorsContainer = carousel.querySelector('.carrusel-indicators');
    const prevBtn = carousel.querySelector('.carrusel-control.prev');
    const nextBtn = carousel.querySelector('.carrusel-control.next');

    // Verificar que todos los elementos necesarios existan
    if (!items.length || !indicatorsContainer || !prevBtn || !nextBtn) {
        console.warn('Faltan elementos para inicializar el carrusel de banners.');
        return;
    }

    let currentIndex = 0;
    let interval;

    // Limpiar indicadores existentes antes de crear nuevos
    indicatorsContainer.innerHTML = '';
    items.forEach((_, index) => {
        const button = document.createElement('button');
        button.setAttribute('aria-label', `Ir al slide ${index + 1}`); // Accesibilidad
        button.dataset.index = index;
        if (index === 0) button.classList.add('active');
        indicatorsContainer.appendChild(button);
    });
    const indicators = indicatorsContainer.querySelectorAll('button'); // Obtenerlos después de crearlos


    function showSlide(index) {
        items.forEach((item, i) => {
            // item.classList.remove('active', 'enter-right', 'exit-left'); // Clases antiguas?
            item.classList.toggle('active', i === index); // Usar active para mostrar/ocultar
            item.style.opacity = (i === index) ? 1 : 0; // Transición de opacidad
        });
        updateIndicators(index);
    }

    function updateIndicators(index) {
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % items.length;
        showSlide(currentIndex);
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        showSlide(currentIndex);
    }

    function startAutoplay() {
        stopAutoplay(); // Limpiar anterior
        interval = setInterval(nextSlide, 5000);
    }

    function stopAutoplay() {
        clearInterval(interval);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        stopAutoplay();
        prevSlide();
        startAutoplay();
    });

    nextBtn.addEventListener('click', () => {
        stopAutoplay();
        nextSlide();
        startAutoplay();
    });

    indicatorsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.index) { // Verificar que sea un botón indicador
            stopAutoplay();
            currentIndex = parseInt(button.dataset.index, 10); // Base 10
            showSlide(currentIndex);
            startAutoplay();
        }
    });

    // Iniciar
    showSlide(currentIndex); // Mostrar el primer slide
    startAutoplay(); // Empezar autoplay
}


// --- Autenticación y Renderizado de Botones ---

// MODIFICADO: Usa roles del backend (si están guardados en localStorage)
function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    if (!authButtons) return; // Salir si el contenedor no existe

    const user = getUser(); // Obtiene el usuario parseado (o null)
    const token = getToken();
    authButtons.innerHTML = ''; // Limpiar botones existentes

    // Determinar rol (¡Necesitas guardar roles en localStorage desde login.js!)
    let userRole = null;
    if (user && user.roles && Array.isArray(user.roles)) {
        // Asume que los roles vienen como un array de strings (ej: ["ROLE_ADMIN", "ROLE_USER"])
        // O un array de objetos (ej: [{authority: "ROLE_ADMIN"}])
        if (user.roles.includes("ROLE_ADMIN") || user.roles.some(role => role.authority === "ROLE_ADMIN")) {
            userRole = "ADMIN";
        } else if (user.roles.includes("ROLE_VENDEDOR") || user.roles.some(role => role.authority === "ROLE_VENDEDOR")) { // Asume rol VENDEDOR
            userRole = "VENDEDOR";
        } else if (user.roles.includes("ROLE_DELIVERY") || user.roles.some(role => role.authority === "ROLE_DELIVERY")) { // Asume rol DELIVERY
            userRole = "DELIVERY";
        } else if (user.roles.includes("ROLE_USER") || user.roles.some(role => role.authority === "ROLE_USER")) { // Asume rol USER para cliente normal
            userRole = "CLIENTE";
        }
        // Añadir más roles si es necesario
    }
    // Fallback simple si no hay roles (solo verifica si está logueado)
    else if (token && user) {
        userRole = "CLIENTE"; // Asume rol cliente si está logueado pero sin roles definidos
    }


    console.log("Token:", token ? "Presente" : "Ausente");
    console.log("User:", user);
    console.log("User Role:", userRole);


    // Renderizar botones según el rol
    if (token && userRole === "ADMIN") {
        // Botones de Admin
        authButtons.innerHTML = `
            <div class="registro">
                <a href="admin.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-shield-lock-fill"></i> Panel Admin
                </a>
            </div>
            <div class="registro">
                <a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-box-arrow-right"></i> Salir
                </a>
            </div>
            <div class="carrito">
                <a href="carrito.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                </a>
            </div>
        `;
    } else if (token && userRole === "VENDEDOR") {
        // Botones de Vendedor
        authButtons.innerHTML = `
            <div class="registro">
                <a href="vendedor.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-cart-plus-fill"></i> POS
                </a>
            </div>
            <div class="registro">
                <a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-box-arrow-right"></i> Salir
                </a>
            </div>
            <div class="carrito">
                <a href="carrito.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                </a>
            </div>
        `;
    } else if (token && userRole === "DELIVERY") {
        // Botones de Delivery
        authButtons.innerHTML = `
            <div class="registro">
                <a href="delivery.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-truck"></i> Entregas
                </a>
            </div>
            <div class="registro">
                <a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                    <i class="bi bi-box-arrow-right"></i> Salir
                </a>
            </div>
            <div class="carrito">
                <a href="carrito.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                </a>
            </div>
        `;
    } else if (token && userRole === "CLIENTE") {
        // Botones Cliente logueado
        // Mostrar nombre si está disponible
        const nombreUsuario = user.nombre || user.email || 'Usuario'; // Intenta obtener nombre o email
        authButtons.innerHTML = `
            <div class="registro flex items-center">
                <span class="text-yellow-400 text-sm font-medium mr-2">Hola, ${nombreUsuario}</span>
                <a href="#" onclick="logout()" title="Cerrar Sesión" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/cerrar-con-llave.png" alt="Cerrar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            <div class="carrito">
                <a href="carrito.html" title="Carrito de Compras" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                </a>
            </div>
        `;
    } else {
        // Botones Usuario no logueado
        authButtons.innerHTML = `
            <div class="registro">
                <a href="login.html" title="Iniciar Sesión / Registrarse" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/iniciar_sesion.png" alt="Iniciar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            <div class="carrito">
                <a href="carrito.html" title="Carrito de Compras" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                </a>
            </div>
        `;
    }
}


// --- Otras Funcionalidades (Video, Footer, Redes, Bienvenida) ---

// Reproducción del Video (Parece correcto)
const videoContainer = document.querySelector('.video-btn-container');
if (videoContainer) {
    const video = videoContainer.querySelector('video');
    if (video) {
        videoContainer.addEventListener('mouseenter', () => video.play().catch(e => console.warn("Video play interrupted:", e))); // Manejar posible error si el usuario interactúa rápido
        videoContainer.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });

        // Redirigir botón "Ver menú completo"
        const verMasBtn = videoContainer.querySelector('.ver-mas-btn');
        if (verMasBtn) {
            verMasBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamiento por defecto si es un <a>
                window.location.href = 'menu.html';
            });
        }
    }
}

// NUEVO: Función Logout Global
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Opcional: Limpiar carrito? Depende de tu lógica
    // localStorage.removeItem('carrito');
    renderAuthButtons(); // Actualizar botones inmediatamente
    // Opcional: Redirigir a la página principal o de login
    // window.location.href = 'index.html';
}

// Footer Acordeón (Parece correcto)
function inicializarFooterAcordeon() {
    const footerSecciones = document.querySelectorAll('.footer-seccion');
    if (!footerSecciones.length) return;

    // Quitar listeners anteriores para evitar duplicados al redimensionar
    footerSecciones.forEach((seccion) => {
        const titulo = seccion.querySelector('h3');
        if (titulo && titulo.hasAttribute('data-listener-added')) {
            const nuevoTitulo = titulo.cloneNode(true); // Clonar para remover listener
            titulo.parentNode.replaceChild(nuevoTitulo, titulo);
        }
        seccion.classList.remove('active'); // Resetear estado active
    });


    if (window.innerWidth <= 768) {
        footerSecciones.forEach((seccion, index) => {
            const titulo = seccion.querySelector('h3');
            if (titulo) {
                // Añadir listener
                titulo.addEventListener('click', function() {
                    seccion.classList.toggle('active');
                });
                titulo.setAttribute('data-listener-added', 'true'); // Marcar que tiene listener

                // Abrir el primero por defecto en móvil
                if (index === 0) {
                    seccion.classList.add('active');
                }
            }
        });
    }
    // No hacer nada en pantallas grandes (se muestran todos por defecto)
}

// Listener para redimensionar (Parece correcto)
let resizeTimerFooter;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimerFooter);
    resizeTimerFooter = setTimeout(inicializarFooterAcordeon, 250);
});

// NUEVO: Función para inicializar efecto en links de redes sociales
function initializeSocialLinksEffect() {
    const socialLinks = document.querySelectorAll(".social-link");
    socialLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const icon = this.querySelector("img");
            if (icon) {
                icon.classList.add("social-explode");
                // Abrir link después de la animación
                setTimeout(() => {
                    window.open(this.href, "_blank");
                    icon.classList.remove("social-explode");
                }, 500); // Duración de la animación
            } else {
                window.open(this.href, "_blank"); // Abrir si no hay icono
            }
        });
    });
}

// Lógica de la ventana de Bienvenida (Parece correcto)
function mostrarVentanaBienvenida() {
    const ventana = document.getElementById('ventanaBienvenida');
    if (!ventana) return; // Salir si no existe

    const haVistoVentana = sessionStorage.getItem('haVistoVentanaBienvenida'); // Usar sessionStorage para mostrar una vez por sesión

    if (!haVistoVentana) {
        ventana.classList.remove('oculto');
    }

    const botonCerrar = ventana.querySelector('.boton-cerrar');
    if (botonCerrar) {
        botonCerrar.addEventListener('click', () => {
            ventana.classList.add('oculto');
            sessionStorage.setItem('haVistoVentanaBienvenida', 'true'); // Marcar como visto en esta sesión
        });
    }

    const botonCrearCuenta = ventana.querySelector('.boton-crear-cuenta');
    if (botonCrearCuenta) {
        botonCrearCuenta.addEventListener('click', () => {
            ventana.classList.add('oculto');
            sessionStorage.setItem('haVistoVentanaBienvenida', 'true'); // Marcar como visto
            window.location.href = 'login.html'; // Redirigir a login/registro
        });
    }
}