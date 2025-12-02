// js/carrito.js

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
 * NUEVO: Actualiza el contador de items en el ícono del carrito.
 * Asume que renderAuthButtons() ha creado un <span id="cart-item-count">.
 */
function updateCartCounter() {
    const counterElement = document.getElementById('cart-item-count');
    // Salir si el contador no existe en esta página (ej. en login.html)
    if (!counterElement) {
        // console.warn('Elemento #cart-item-count no encontrado para actualizar contador.');
        return;
    }

    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    // Suma las cantidades de todos los items
    const totalItems = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    if (totalItems > 0) {
        counterElement.textContent = totalItems;
        // Usar 'flex' para centrar el número si usas las clases de Tailwind
        counterElement.style.display = 'flex';
    } else {
        counterElement.textContent = '0';
        counterElement.style.display = 'none'; // Ocultar si es cero
    }
}

/**
 * MODIFICADO: Renderiza botones de autenticación E INCLUYE el contador de carrito
 */
function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    if (!authButtons) return; // Salir si el contenedor no existe

    const user = getUser();
    const token = getToken();
    authButtons.innerHTML = ''; // Limpiar botones existentes

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

    // HTML del icono del carrito (con el badge)
    // Se usa 'relative' en el div y 'absolute' en el span para posicionar el badge
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

    // Renderizar botones según el rol
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
        // Botones Usuario no logueado
        authButtons.innerHTML = `
            <div class="registro">
                <a href="login.html" title="Iniciar Sesión / Registrarse" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium">
                    <img src="Icon/iniciar_sesion.png" alt="Iniciar Sesión" class="h-5 w-5 inline">
                </a>
            </div>
            ${cartIconHtml}
        `;
    }

    // Importante: Actualizar el contador después de renderizar los botones
    updateCartCounter();
}

/**
 * MODIFICADO: Función de Logout que también limpia el contador
 */
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Opcional: Limpiar carrito?
    // localStorage.removeItem('carrito');
    renderAuthButtons(); // Actualizar botones (que a su vez llama a updateCartCounter)
    // No es necesario redirigir, solo actualizar la UI
}


// --- Comienzo del script de la página de Carrito ---
// (Tu código original)

document.addEventListener("DOMContentLoaded", () => {
    // Selecciona los elementos del DOM necesarios
    const carritoGrid = document.getElementById("carrito-grid");
    const subtotalElement = document.getElementById("subtotal");
    const btnComprar = document.getElementById("btn-comprar");
    const btnSeguir = document.getElementById("btn-seguir");

    // Validar que los elementos principales existan
    if (!carritoGrid || !subtotalElement || !btnComprar || !btnSeguir) {
        console.error("Error: Faltan elementos esenciales del carrito en el DOM (carrito-grid, subtotal, btn-comprar, btn-seguir).");
        return;
    }

    // --- CORRECCIÓN DE INICIALIZACIÓN ---
    // 1. Renderizar botones/header (esto CREA el #cart-item-count)
    renderAuthButtons();
    // 2. Renderizar el carrito (esto llama a updateCartCounter() para POBLAR el badge)
    actualizarCarrito();


    // --- Funciones del Carrito ---

    // Actualiza la visualización completa del carrito
    function actualizarCarrito() {
        // Obtener carrito de localStorage o inicializar como array vacío
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        carritoGrid.innerHTML = ""; // Limpiar vista anterior
        console.log("Carrito al actualizar:", carrito);

        if (carrito.length === 0) {
            carritoGrid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">El carrito está vacío.</p>`; // Mensaje mejorado
            // Deshabilitar botón comprar si está vacío
            btnComprar.disabled = true;
            btnComprar.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnComprar.disabled = false;
            btnComprar.classList.remove('opacity-50', 'cursor-not-allowed');

            carrito.forEach((item, index) => {
                // Verificar si el item tiene los datos mínimos
                if (!item || item.id === undefined || item.nombre === undefined || item.precio === undefined || item.cantidad === undefined) {
                    console.warn(`Item inválido en el carrito en índice ${index}:`, item);
                    // O mostrar un placeholder de error
                    item = { id: 'error', nombre: 'Producto Inválido', precio: 0, cantidad: 0, imagen: '', stock: 0 };
                }


                const itemElement = document.createElement("div");
                itemElement.classList.add("item", "flex", "items-center", "justify-between", "py-4", "border-b"); // Clases de ejemplo
                // Usar item.id del backend
                const itemIdInput = `cart-item-${item.id}-${index}`; // ID más específico para input

                itemElement.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <img src="${item.imagen || 'icon/logo.png'}" alt="${item.nombre}" class="w-16 h-16 object-cover rounded" onerror="this.onerror=null;this.src='icon/logo.png';">
                        <div class="item-info">
                            <h3 class="font-semibold">${item.nombre}</h3>
                            <p class="precio-unitario text-sm text-gray-600">S/ ${(item.precio || 0).toFixed(2)}</p>
                            <p class="text-xs text-gray-500">Stock: ${item.stock !== undefined ? item.stock : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="control qty quantity-control flex items-center border rounded">
                            <button class="qty-control qty-deduce px-2 py-1 bg-gray-200 hover:bg-gray-300 ${item.cantidad <= 1 ? 'disabled opacity-50 cursor-not-allowed' : ''}" data-role="qty-deduce" data-index="${index}" ${item.cantidad <= 1 ? 'disabled' : ''}>
                                <span>-</span>
                            </button>
                            <input id="${itemIdInput}"
                                   name="cart[${index}][qty]"
                                   value="${item.cantidad}"
                                   type="number"
                                   min="1"
                                   ${item.stock !== undefined ? `max="${item.stock}"` : ''} title="Cantidad"
                                   class="input-text qty w-12 text-center border-l border-r"
                                   data-index="${index}">
                            <button class="qty-control qty-add px-2 py-1 bg-gray-200 hover:bg-gray-300 ${item.stock !== undefined && item.cantidad >= item.stock ? 'disabled opacity-50 cursor-not-allowed' : ''}" data-role="qty-add" data-index="${index}" ${item.stock !== undefined && item.cantidad >= item.stock ? 'disabled' : ''}>
                                <span>+</span>
                            </button>
                        </div>
                        <button class="eliminar text-red-500 hover:text-red-700 p-1" data-index="${index}" title="Eliminar Producto">
                            <img src="Icon/tacho-eliminar.png" alt="Eliminar" class="w-5 h-5">
                        </button>
                    </div>
                `;
                carritoGrid.appendChild(itemElement);
            });
        }

        // Calcular y mostrar subtotal
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio || 0) * (item.cantidad || 0), 0);
        subtotalElement.textContent = subtotal.toFixed(2);

        // Actualizar contador global del carrito
        updateCartCounter(); // <--- Esta llamada ahora funciona
    }

    // Modifica la cantidad de un item en el carrito
    function modificarCantidad(index, nuevaCantidad) {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (!isNaN(index) && index >= 0 && index < carrito.length) {
            const item = carrito[index];
            const stock = item.stock;

            // Validar nueva cantidad
            if (nuevaCantidad < 1) {
                console.warn("Intento de establecer cantidad menor a 1:", nuevaCantidad, "para item:", item.nombre);
                nuevaCantidad = 1; // Mínimo 1
            }
            // Validar contra stock si existe
            if (stock !== undefined && nuevaCantidad > stock) {
                console.warn(`Intento de exceder stock (${stock}) para item:`, item.nombre, "Cantidad solicitada:", nuevaCantidad);
                alert(`Solo quedan ${stock} unidades de ${item.nombre}.`);
                nuevaCantidad = stock; // Limitar al stock
            }

            if (item.cantidad !== nuevaCantidad) {
                item.cantidad = nuevaCantidad;
                localStorage.setItem("carrito", JSON.stringify(carrito));
                actualizarCarrito(); // Actualizar la UI completa
            }
        } else {
            console.error("Índice inválido al modificar cantidad:", index);
        }
    }

    // Elimina un item del carrito
    function eliminarItem(index) {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (!isNaN(index) && index >= 0 && index < carrito.length) {
            const eliminado = carrito.splice(index, 1); // Elimina el item
            console.log("Producto eliminado:", eliminado[0]?.nombre);
            localStorage.setItem("carrito", JSON.stringify(carrito));
            actualizarCarrito(); // Actualiza la UI
        } else {
            console.warn("Índice inválido al eliminar:", index);
        }
    }

    // --- Manejadores de Eventos ---

    // Event Delegation para botones +/- y eliminar
    carritoGrid.addEventListener("click", (e) => {
        const target = e.target;

        // Botón Eliminar
        const btnEliminar = target.closest(".eliminar");
        if (btnEliminar) {
            const index = parseInt(btnEliminar.dataset.index);
            if (confirm("¿Seguro que quieres eliminar este producto del carrito?")) {
                eliminarItem(index);
            }
            return; // Detener propagación si es necesario
        }

        // Botones +/-
        const btnQty = target.closest(".qty-control[data-index]");
        if (btnQty) {
            const index = parseInt(btnQty.dataset.index);
            const role = btnQty.dataset.role;
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            if (!isNaN(index) && index >= 0 && index < carrito.length) {
                let currentQty = carrito[index].cantidad;
                if (role === "qty-add") {
                    modificarCantidad(index, currentQty + 1); // modificarCantidad ya valida stock
                } else if (role === "qty-deduce") {
                    modificarCantidad(index, currentQty - 1); // modificarCantidad valida < 1
                }
            }
            return; // Detener propagación
        }
    });

    // Event Delegation para input de cantidad (mejor usar 'input' para respuesta inmediata)
    carritoGrid.addEventListener("input", (e) => {
        const target = e.target;
        if (target.matches("input.input-text.qty[data-index]")) {
            const index = parseInt(target.dataset.index);
            let nuevaCantidad = parseInt(target.value);

            // Evitar cantidades no numéricas o cero durante la escritura
            if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
                // No actualices todavía, espera a que el usuario termine o cambie el foco (blur)
                return;
            }

            // Validar stock máximo mientras escribe
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            if (!isNaN(index) && index >= 0 && index < carrito.length) {
                const stock = carrito[index].stock;
                if (stock !== undefined && nuevaCantidad > stock) {
                    target.value = stock; // Corregir inmediatamente al máximo
                    nuevaCantidad = stock;
                    alert(`Solo quedan ${stock} unidades de ${carrito[index].nombre}.`);
                }
            }

            modificarCantidad(index, nuevaCantidad);
        }
    });
    // Evento 'blur' para corregir si el usuario deja un valor inválido (ej. vacío o 0)
    carritoGrid.addEventListener("blur", (e) => {
        const target = e.target;
        if (target.matches("input.input-text.qty[data-index]")) {
            const index = parseInt(target.dataset.index);
            let nuevaCantidad = parseInt(target.value);
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

            if (!isNaN(index) && index >= 0 && index < carrito.length) {
                if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
                    target.value = carrito[index].cantidad; // Revertir al valor anterior válido
                    console.warn("Cantidad inválida detectada en blur. Revertida a:", carrito[index].cantidad);
                }
            }
        }
    }, true); // Usar captura para que se ejecute antes que otros eventos blur

    // Evento botón "Ir a Pagar"
    btnComprar.addEventListener("click", () => {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (carrito.length === 0) {
            alert("El carrito está vacío. Añade productos antes de continuar.");
            return;
        }
        // NUEVO: Verificar si el usuario está logueado ANTES de ir a pagar
        const token = getToken();
        if (!token) {
            alert("Debes iniciar sesión para proceder al pago.");
            // Guardar el carrito actual y redirigir a login, luego volver aquí? (Más complejo)
            // Por ahora, solo redirigimos a login.
            sessionStorage.setItem('redirectAfterLogin', 'pago_detalles.html'); // Guardar destino
            window.location.href = "login.html"; // Ir a login
            return;
        }

        // Si está logueado y el carrito no está vacío, ir a detalles de pago
        window.location.href = "pago_detalles.html";
    });

    // Evento botón "Seguir Comprando"
    btnSeguir.addEventListener("click", () => {
        window.location.href = "menu.html";
    });

    // --- Inicialización al Cargar la Página ---
    // (Movidas al inicio del DOMContentLoaded)
    // actualizarCarrito(); 
    // renderAuthButtons(); 
});