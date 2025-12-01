// js/confirmacion.js

// --- Funciones Auxiliares de Autenticación y API ---
// (Incluidas para que este archivo sea autosuficiente)

// Definir la URL base de tu API backend
const API_BASE_URL = 'http://localhost:8080/api';
// Asegúrate que el puerto sea correcto

/**
 * Función auxiliar para obtener el token JWT de localStorage
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Función auxiliar para obtener los detalles del usuario de localStorage
 */
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.error("Error parsing user from localStorage", e);
        return null;
    }
}

/**
 * Función auxiliar para realizar llamadas fetch con token de autorización
 */
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });
        return response;
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        throw error;
    }
}

/**
 * Actualiza el contador de items en el ícono del carrito.
 */
function updateCartCounter() {
    const counterElement = document.getElementById('cart-item-count');
    if (!counterElement) {
        return;
    }

    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const totalItems = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    if (totalItems > 0) {
        counterElement.textContent = totalItems;
        counterElement.style.display = 'flex';
    } else {
        counterElement.textContent = '0';
        counterElement.style.display = 'none';
    }
}

/**
 * Renderiza botones de autenticación E INCLUYE el contador de carrito
 */
function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    if (!authButtons) return;

    const user = getUser();
    const token = getToken();
    authButtons.innerHTML = '';

    let userRole = null;
    if (user && user.roles && Array.isArray(user.roles)) {
        if (user.roles.includes("ROLE_ADMIN") || user.roles.some(role => role.authority === "ROLE_ADMIN")) {
            userRole = "ADMIN";
        } else if (user.roles.includes("ROLE_VENDEDOR") || user.roles.some(role => role.authority === "ROLE_VENDEDOR")) {
            userRole = "VENDEDOR";
        } else if (user.roles.includes("ROLE_DELIVERY") || user.roles.some(role => role.authority === "ROLE_DELIVERY")) {
            userRole = "DELIVERY";
        } else if (user.roles.includes("ROLE_USER") || user.roles.some(role => role.authority === "ROLE_USER")) {
            userRole = "CLIENTE";
        }
    }
    else if (token && user) {
        userRole = "CLIENTE";
    }

    const cartIconHtml = `
        <div class="carrito relative"> 
            <a href="carrito.html" title="Carrito de Compras" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                <img src="Icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
                <span id="cart-item-count" 
                      class="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" 
                      style="display: none;">0</span>
            </a>
        </div>
    `;

    if (token && userRole === "ADMIN") {
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
            ${cartIconHtml}
        `;
    } else if (token && userRole === "VENDEDOR") {
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
            ${cartIconHtml}
        `;
    } else if (token && userRole === "DELIVERY") {
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
            ${cartIconHtml}
        `;
    } else if (token && userRole === "CLIENTE") {
        const nombreUsuario = user.nombre || user.email || 'Usuario';
        authButtons.innerHTML = `
            <div class="registro flex items-center">
                <span class="text-yellow-400 text-sm font-medium mr-2">Hola, ${nombreUsuario}</span>
                <a href="#" onclick="logout()" title="Cerrar Sesión" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/cerrar-con-llave.png" alt="Cerrar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            ${cartIconHtml}
        `;
    } else {
        authButtons.innerHTML = `
            <div class="registro">
                <a href="login.html" title="Iniciar Sesión / Registrarse" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/iniciar_sesion.png" alt="Iniciar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            ${cartIconHtml}
        `;
    }

    updateCartCounter();
}

/**
 * Función de Logout
 */
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderAuthButtons(); 
    // Redirigir al inicio después de cerrar sesión en la pág. de confirmación
    window.location.href = 'index.html';
}


// --- Comienzo del script de la página de Confirmación ---
// (Tu código original)

document.addEventListener("DOMContentLoaded", () => {
    // Selecciona elementos del DOM
    const pedidoGrid = document.getElementById("pedido-grid");
    const mensajeEntrega = document.getElementById("mensaje-entrega");
    const clienteNombre = document.getElementById("cliente-nombre");
    const comprobanteElement = document.getElementById("comprobante");
    const subtotalElement = document.getElementById("subtotal");
    const deliveryCostElement = document.getElementById("delivery-cost");
    const totalElement = document.getElementById("total");
    const confirmacionHeader = document.getElementById("confirmacion-header");
    const loaderElement = document.getElementById("loader-confirmacion"); // Necesitas <div id="loader-confirmacion">...</div>
    const errorElement = document.getElementById("error-confirmacion"); // Necesitas <div id="error-confirmacion" style="display: none;"></div>

    // Verificar elementos
    if (!pedidoGrid || !mensajeEntrega || !clienteNombre || !comprobanteElement ||
        !subtotalElement || !deliveryCostElement || !totalElement || !confirmacionHeader || !loaderElement || !errorElement) {
        console.error("Error: Faltan elementos HTML en la página de confirmación.");
        if (errorElement) errorElement.textContent = "Error al cargar la página.";
        if (errorElement) errorElement.style.display = 'block';
        return;
    }

    /** Muestra loader */
    function showLoader(message = "Cargando confirmación...") {
        if (loaderElement) { loaderElement.innerHTML = `<div class="spinner-border text-warning" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">${message}</p>`; loaderElement.style.display = 'block'; }
        if (pedidoGrid) pedidoGrid.style.display = 'none'; // Ocultar grid
        if (errorElement) errorElement.style.display = 'none'; // Ocultar errores
        console.log(message);
    }

    /** Oculta loader */
    function hideLoader() {
        if (loaderElement) loaderElement.style.display = 'none';
        if (pedidoGrid) pedidoGrid.style.display = 'grid'; // O 'block' según tu CSS
    }

    /** Muestra mensaje de error */
    function showError(message) {
        hideLoader();
        if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; }
        else { alert(message); } // Fallback
        if (pedidoGrid) pedidoGrid.style.display = 'none'; // Ocultar grid si hay error fatal
        console.error(message);
        // Limpiar campos sensibles
        confirmacionHeader.textContent = "Error en Pedido";
        clienteNombre.textContent = "-";
        comprobanteElement.textContent = "-";
        subtotalElement.textContent = "0.00";
        deliveryCostElement.textContent = "0.00";
        totalElement.textContent = "0.00";
        mensajeEntrega.textContent = "No se pudo cargar la información.";
    }

    /**
     * Obtiene detalles del pedido desde /api/ordenes/{id} y muestra el resumen.
     */
    async function cargarYMostrarResumen() {
        showLoader();
        const pedidoId = sessionStorage.getItem("ultimoPedidoId");
        const token = getToken();

        // Recuperar info básica (fallback)
        const infoConfirmacion = JSON.parse(sessionStorage.getItem("infoConfirmacion")) || {};
        confirmacionHeader.textContent = `Confirmando pedido para ${infoConfirmacion.nombre || 'cliente'}...`;

        if (!pedidoId) {
            showError("Error: No se encontró ID del pedido. Por favor, realiza el pedido de nuevo.");
            return;
        }
        if (!token) {
            showError("Error: Sesión no válida. Por favor, inicia sesión.");
            // Opcional: Redirigir a login
            // setTimeout(() => window.location.href = 'login.html', 3000);
            return;
        }

        try {
            console.log(`Obteniendo detalles del pedido ID: ${pedidoId} desde /api/ordenes/${pedidoId}`);
            // --- LLAMADA AL NUEVO ENDPOINT SEGURO PARA CLIENTE ---
            const response = await fetchWithAuth(`${API_BASE_URL}/ordenes/${pedidoId}`);
            // --- FIN LLAMADA ---

            if (response.ok) {
                const pedido = await response.json();
                console.log("Pedido recibido:", pedido);
                mostrarResumen(pedido);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error || `Error ${response.status}: ${response.statusText}`;
                if (response.status === 404) {
                    showError(`Error: No se encontró tu pedido (ID ${pedidoId}). ${errorMsg}`);
                } else if (response.status === 403) {
                    showError(`Error: No tienes permiso para ver este pedido. ${errorMsg}`);
                } else {
                    showError(`Error al cargar el pedido: ${errorMsg}`);
                }
                // Limpiar ID inválido de sessionStorage?
                // sessionStorage.removeItem("ultimoPedidoId");
            }
        } catch (error) {
            console.error("Error de red al obtener detalles:", error);
            showError(`Error de conexión (${error.message}). Intenta recargar.`);
        } finally {
            hideLoader();
            // No limpiar sessionStorage aquí necesariamente, el usuario podría querer recargar
        }
    }

    /**
     * Muestra el resumen usando datos del objeto 'pedido' del backend.
     */
    function mostrarResumen(pedido) {
        if (!pedido || !pedido.id || !pedido.cliente || !pedido.detalles) {
            showError("Los datos del pedido recibido son inválidos.");
            return;
        }

        // Encabezado
        confirmacionHeader.textContent = `¡Pedido Confirmado, ${pedido.cliente.nombre || ''} ${pedido.cliente.apellido || ''}!`;

        // Grid de Items
        pedidoGrid.innerHTML = ""; // Limpiar
        if (pedido.detalles.length === 0) {
            pedidoGrid.innerHTML = "<p>Esta orden no tiene productos.</p>";
        } else {
            pedido.detalles.forEach((item) => {
                if (!item || !item.producto) return; // Saltar item inválido
                const itemElement = document.createElement("div");
                itemElement.className = "columna-pedido margen-inferior-mediano"; // Tus clases CSS
                itemElement.innerHTML = `
                  <div class="tarjeta-pedido cuerpo-tarjeta sombra-pequena">
                    <img src="${item.producto.imagen || 'icon/logo.png'}" alt="${item.producto.producto || 'Producto'}"
                         class="card-img-top carrito-img"
                         onerror="this.onerror=null;this.src='icon/logo.png';">
                    <h5 class="titulo-tarjeta">${item.producto.producto || 'N/A'}</h5>
                    <p class="texto-tarjeta">Precio: S/ ${(item.producto.precio || 0).toFixed(2)}</p>
                    <p class="texto-tarjeta">Cantidad: ${item.cantidad || 'N/A'}</p>
                    <p class="texto-tarjeta fw-bold">Subtotal: S/ ${(item.subtotal || 0).toFixed(2)}</p>
                  </div>`;
                pedidoGrid.appendChild(itemElement);
            });
        }

        // Detalles Cliente y Costos
        clienteNombre.textContent = `${pedido.cliente.nombre || ''} ${pedido.cliente.apellido || ''}`;

        // Comprobante (mejorado para leer de entidad Comprobante si existe)
        let comprobanteTexto = "Boleta"; // Default
        if (pedido.comprobante && pedido.comprobante.tipo_Comprobante) {
            comprobanteTexto = pedido.comprobante.tipo_Comprobante;
            if (comprobanteTexto.toLowerCase() === 'factura' && pedido.comprobante.ruc) {
                comprobanteTexto += ` (RUC: ${pedido.comprobante.ruc})`;
            }
            // Asume que DNI está en Cliente si es boleta
            else if (comprobanteTexto.toLowerCase() === 'boleta' && pedido.cliente.dni) {
                comprobanteTexto += ` (DNI: ${pedido.cliente.dni})`; // Necesitas añadir DNI a Cliente si no está
            } else if (comprobanteTexto.toLowerCase() === 'boleta') {
                comprobanteTexto = "Boleta (DNI no especificado)";
            }
        } else {
            // Fallback si no hay entidad Comprobante (menos preciso)
            console.warn("Entidad Comprobante no encontrada o sin tipo para pedido:", pedido.id);
            comprobanteTexto = "Comprobante (Tipo no disponible)";
        }
        comprobanteElement.textContent = comprobanteTexto;


        // Totales desde el backend
        subtotalElement.textContent = (pedido.subtotal || 0).toFixed(2);
        deliveryCostElement.textContent = (pedido.monto_Agregado || 0).toFixed(2);
        totalElement.textContent = (pedido.total || 0).toFixed(2);

        // Mensaje de entrega (basado en entidad Entrega si existe)
        let mensajeEntregaTexto = "Recojo en local programado."; // Default si no hay info de entrega
        if (pedido.entrega && pedido.entrega.metodo_Entrega) {
            mensajeEntregaTexto = pedido.entrega.metodo_Entrega.toLowerCase() === "delivery"
                ? "Tu pedido llegará en aproximadamente 15-30 minutos." // Tiempo estimado debe venir del backend?
                : "Tu pedido estará listo para recojo en aproximadamente 15 minutos."; // Tiempo estimado debe venir del backend?
        } else {
            console.warn("Entidad Entrega no encontrada o sin método para pedido:", pedido.id);
        }
        mensajeEntrega.textContent = mensajeEntregaTexto;
    }

    // --- Inicialización ---
    renderAuthButtons(); // Asegurarse que esté disponible globalmente
    cargarYMostrarResumen();

}); // Fin DOMContentLoaded