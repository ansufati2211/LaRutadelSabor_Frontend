// js/confirmacion.js

// --- Funciones Auxiliares de Autenticación y API ---
// (Incluidas para que este archivo sea autosuficiente)

// Definir la URL base de tu API backend
const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';
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
                <img src="icon/carrito-de-compras.png" alt="Carrito" class="h-5 w-5 inline">
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
                    <img src="icon/cerrar-con-llave.png" alt="Cerrar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            ${cartIconHtml}
        `;
    } else {
        authButtons.innerHTML = `
            <div class="registro">
                <a href="login.html" title="Iniciar Sesión / Registrarse" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="icon/iniciar_sesion.png" alt="Iniciar Sesión" class="h-5 w-5 inline">
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
    const loaderElement = document.getElementById("loader-confirmacion"); 
    const errorElement = document.getElementById("error-confirmacion"); 

    // Verificar elementos (igual que antes)
    if (!pedidoGrid || !mensajeEntrega || !clienteNombre || !comprobanteElement ||
        !subtotalElement || !deliveryCostElement || !totalElement || !confirmacionHeader) {
        console.error("Faltan elementos HTML críticos en confirmacion.html");
        return;
    }

    // Funciones de Loader (igual que antes)
    function showLoader() { if (loaderElement) loaderElement.style.display = 'block'; }
    function hideLoader() { if (loaderElement) loaderElement.style.display = 'none'; }

    /**
     * ESTRATEGIA HÍBRIDA:
     * 1. Carga inmediata desde sessionStorage (Backup) para evitar que salga S/ 0.00
     * 2. Carga asíncrona desde Backend para confirmar detalles y productos
     */
    async function cargarYMostrarResumen() {
        showLoader();
        
        const pedidoId = sessionStorage.getItem("ultimoPedidoId");
        const backupJson = sessionStorage.getItem("backupPedido"); // LEER BACKUP
        const backupData = backupJson ? JSON.parse(backupJson) : null;

        // PASO 1: Mostrar datos de backup INMEDIATAMENTE (si existen)
        if (backupData) {
            console.log("Cargando datos desde Backup (sessionStorage)...");
            mostrarDatosDeBackup(backupData);
        }

        // Si no hay ID de pedido, nos quedamos con el backup y terminamos
        if (!pedidoId) {
            hideLoader();
            if(!backupData) console.error("No hay ID de pedido ni Backup.");
            return;
        }

        // PASO 2: Intentar obtener la data oficial del backend
        const token = getToken();
        if (token) {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/ordenes/${pedidoId}`);
                if (response.ok) {
                    const pedidoBackend = await response.json();
                    console.log("Datos del backend recibidos:", pedidoBackend);
                    // Sobreescribir con la data oficial (que incluye productos)
                    mostrarResumenBackend(pedidoBackend);
                } else {
                    console.warn("Backend no respondió 200 OK. Manteniendo datos de backup.");
                }
            } catch (error) {
                console.error("Error conectando al backend:", error);
                // No mostramos error al usuario porque ya está viendo los datos del backup
            } finally {
                hideLoader();
            }
        } else {
            hideLoader();
        }
    }

    /**
     * Función 1: Muestra los datos guardados antes de salir de la página de pago.
     * Esto asegura que los montos SIEMPRE se vean correctos.
     */
    function mostrarDatosDeBackup(data) {
        confirmacionHeader.textContent = `¡Pedido Confirmado!`;
        if(clienteNombre) clienteNombre.textContent = data.cliente || "";
        
        // Aquí asignamos los valores que guardamos en pago_detalles.js
        if(subtotalElement) subtotalElement.textContent = data.subtotal; // Ya viene formateado
        if(deliveryCostElement) deliveryCostElement.textContent = data.delivery;
        if(totalElement) totalElement.textContent = data.total;
        
        if(comprobanteElement) comprobanteElement.textContent = data.comprobante;
        
        // Mensaje temporal mientras carga el backend
        pedidoGrid.innerHTML = `
            <div class="alert alert-success text-center">
                <i class="bi bi-check-circle"></i> Tu pedido ha sido registrado correctamente.
            </div>`;
    }

    /**
     * Función 2: Muestra los datos oficiales del Backend y la lista de productos.
     */
    function mostrarResumenBackend(pedido) {
        // Mapeo seguro de propiedades (Backend Java a veces usa camelCase)
        const subtotal = pedido.subtotal || 0;
        // IMPORTANTE: Aquí corregimos el posible error de nombre (montoAgregado vs monto_Agregado)
        const costoDelivery = pedido.monto_Agregado !== undefined ? pedido.monto_Agregado : (pedido.montoAgregado || 0);
        const total = pedido.total || 0;

        // Actualizar montos (por si el backend calculó algo diferente)
        subtotalElement.textContent = subtotal.toFixed(2);
        deliveryCostElement.textContent = costoDelivery.toFixed(2);
        totalElement.textContent = total.toFixed(2);

        // Actualizar cliente si viene del backend
        if (pedido.cliente) {
            clienteNombre.textContent = `${pedido.cliente.nombre || ''} ${pedido.cliente.apellido || ''}`;
        }

        // Renderizar la lista de productos (Grid)
        pedidoGrid.innerHTML = "";
        if (pedido.detalles && pedido.detalles.length > 0) {
            pedido.detalles.forEach((item) => {
                const prod = item.producto || {};
                const itemElement = document.createElement("div");
                // Asegúrate que estas clases coincidan con tu CSS
                itemElement.className = "columna-pedido margen-inferior-mediano"; 
                itemElement.innerHTML = `
                  <div class="tarjeta-pedido cuerpo-tarjeta sombra-pequena" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
                    <img src="${prod.imagen || 'icon/logo.png'}" 
                         class="card-img-top carrito-img" 
                         style="max-height: 100px; object-fit: contain;"
                         onerror="this.src='icon/logo.png'">
                    <h5 class="titulo-tarjeta mt-2">${prod.producto || 'Producto'}</h5>
                    <p class="texto-tarjeta mb-1">Cant: ${item.cantidad}</p>
                    <p class="texto-tarjeta fw-bold">S/ ${(item.subtotal || 0).toFixed(2)}</p>
                  </div>`;
                pedidoGrid.appendChild(itemElement);
            });
        }
    }

    // --- Inicialización ---
    renderAuthButtons(); 
    cargarYMostrarResumen();

});