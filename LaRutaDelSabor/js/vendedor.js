// js/vendedor.js

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
 * Función global de Logout para el panel de vendedor/POS
 */
function logout() {
    console.log("Cerrando sesión de vendedor...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html'; // Redirigir a login
}

// --- Funciones Loader/Error (Implementa la parte visual si es necesario) ---
function showAdminLoader(message = "Procesando...") {
    const loaderElement = document.getElementById('pos-loader'); // Asume un ID 'pos-loader'
    if (loaderElement) {
        loaderElement.textContent = message;
        loaderElement.style.display = 'block';
    }
    console.log(message);
    // Ocultar errores previos
    const errorElement = document.getElementById('pos-error'); // Asume un ID 'pos-error'
    if(errorElement) errorElement.style.display = 'none';
}
function hideAdminLoader() {
    const loaderElement = document.getElementById('pos-loader');
    if (loaderElement) loaderElement.style.display = 'none';
}
function showAdminError(message) {
    const errorElement = document.getElementById('pos-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(message); // Fallback
    }
    console.error(message);
}
function clearAdminError() {
    const errorElement = document.getElementById('pos-error');
    if (errorElement) errorElement.style.display = 'none';
}


// ASUNCIÓN: Chart y bootstrap están cargados globalmente.

// ==========================================
// GOOGLE PAY CONFIGURATION (Igual que en pago_detalles.js - ¡Reemplaza placeholders!)
// ==========================================
const merchantInfo = { merchantId: 'BCR2DN6T6W44S3MA', /*¡USA TU ID!*/ merchantName: 'La Ruta del Sabor' };
const baseGooglePayRequest = { apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: [{ type: 'CARD', parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"] }, tokenizationSpecification: { type: 'PAYMENT_GATEWAY', parameters: { gateway: 'example', /*¡TU GATEWAY!*/ gatewayMerchantId: 'exampleGatewayMerchantId' /*¡TU ID GATEWAY!*/ } } }], merchantInfo };
Object.freeze(baseGooglePayRequest);
let paymentsClient = null;
let googlePayToken = null;
// Funciones getGooglePaymentsClient, deepCopy, onGooglePayLoaded, renderGooglePayButton, onGooglePaymentButtonClicked
// (Son idénticas a las de pago_detalles.js, puedes moverlas a utils.js si prefieres)
function getGooglePaymentsClient() { /* ... (código igual que en pago_detalles.js) ... */
    if (paymentsClient === null) { paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST', merchantInfo: { merchantId: merchantInfo.merchantId, merchantName: merchantInfo.merchantName } }); } return paymentsClient;
}
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
function onGooglePayLoaded() { /* ... (código igual que en pago_detalles.js) ... */
    const googlePayClient = getGooglePaymentsClient(); const readyToPayRequest = deepCopy(baseGooglePayRequest); googlePayClient.isReadyToPay(readyToPayRequest).then(function (response) { if (response.result) { console.log('Google Pay disponible en POS.'); } else { console.log('Google Pay no disponible en POS.'); const gpayOption = document.getElementById('gpay-option-container'); if (gpayOption) gpayOption.style.display = 'none'; } }).catch(function (err) { console.error('Error Google Pay check:', err); });
}
function renderGooglePayButton(totalAmount) { /* ... (código igual que en pago_detalles.js) ... */
    if (!paymentsClient) return; const container = document.getElementById('gpay-container'); if (!container) return; container.innerHTML = ''; const button = paymentsClient.createButton({ onClick: () => onGooglePaymentButtonClicked(totalAmount), buttonColor: 'black', buttonType: 'pay', buttonSizeMode: 'fill' }); container.appendChild(button); container.style.display = 'block'; container.classList.add('active');
}
function onGooglePaymentButtonClicked(totalAmount) { /* ... (código igual que en pago_detalles.js, excepto auto-confirmar) ... */
    if (!paymentsClient) { alert("Error Google Pay."); return; }
    // Validar si hay items en la orden
    if (ordenActual.length === 0) { alert("Añade productos a la orden."); return; }

    const transactionInfo = { countryCode: 'PE', currencyCode: 'PEN', totalPriceStatus: 'FINAL', totalPrice: totalAmount.toFixed(2), };
    const paymentDataRequest = { ...deepCopy(baseGooglePayRequest), transactionInfo: transactionInfo };
    console.log('Solicitud Google Pay (POS):', paymentDataRequest);
    paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
        console.log('Respuesta Google Pay (POS):', paymentData); const paymentToken = paymentData.paymentMethodData.tokenizationData.token; googlePayToken = paymentToken; console.log('Token Google Pay (POS) obtenido:', googlePayToken);
        const pagoExitosoDiv = document.getElementById('pagoExitoso'); const gpayContainer = document.getElementById('gpay-container'); const btnConfirmar = document.getElementById('btnConfirmarVenta');
        if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'block'; if (gpayContainer) gpayContainer.style.display = 'none'; if (btnConfirmar) btnConfirmar.disabled = false; // Habilitar confirmar
        alert("Pago Google Pay autorizado. Confirma la venta."); // No auto-confirmar en POS
        // setTimeout(() => { confirmarPago(); }, 1000); // Quitar auto-confirmar
    }).catch(function (err) { console.error('Error Google Pay (POS):', err); if (err.statusCode !== 'CANCELED') { alert('Error al procesar Google Pay.'); } googlePayToken = null; });
}

// ==========================================
// VENDEDOR.JS - Sistema POS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let categories = []; // Categorías ACTIVAS
    let products = [];   // Productos ACTIVOS
    let ordenActual = []; // Items en la orden actual [{id, nombre, precio, cantidad, stock}]
    let ordenSeleccionada = null; // Para ver detalle de órdenes pasadas
    let ordenesDelDia = []; // Órdenes cargadas para la sección "Mis Órdenes" y Arqueo

    // Elementos DOM (cachear)
    const vendedorNombreEl = document.getElementById('vendedorNombre');
    const fechaActualEl = document.getElementById('fechaActual');
    const horaActualEl = document.getElementById('horaActual');
    const categoriasFiltroEl = document.getElementById('categorias-filtro');
    const productosGridEl = document.getElementById('productosGrid');
    const buscarProductoInput = document.getElementById('buscarProducto');
    const ordenItemsContainerEl = document.getElementById('ordenItems');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const modalPagoEl = document.getElementById('modalPago');
    const metodoPagoSelect = document.getElementById('metodoPago');
    const pagoEfectivoDiv = document.getElementById('pagoEfectivo');
    const pagoTarjetaDiv = document.getElementById('pagoTarjeta');
    const pagoYapeDiv = document.getElementById('pagoYape');
    const montoRecibidoInput = document.getElementById('montoRecibido');
    const cambioMontoEl = document.getElementById('cambioMonto');
    const nombreClienteInput = document.getElementById('nombreCliente'); // Input nombre en modal pago
    const btnConfirmarVenta = document.getElementById('btnConfirmarVenta');
    const ordenesTableBodyEl = document.getElementById('ordenesTableBody');
    const totalOrdenesEl = document.getElementById('totalOrdenes');
    const ventasHoyEl = document.getElementById('ventasHoy');
    const arqueVendedorEl = document.getElementById('arqueVendedor');
    const arqueFechaEl = document.getElementById('arqueFecha');
    const arqueNumOrdenesEl = document.getElementById('arqueNumOrdenes');
    const arqueEfectivoEl = document.getElementById('arqueEfectivo');
    const arqueTarjetaEl = document.getElementById('arqueTarjeta');
    const arqueYapeEl = document.getElementById('arqueYape');
    const arqueTotalCajaEl = document.getElementById('arqueTotalCaja');
    const modalDetalleOrdenEl = document.getElementById('modalDetalleOrden'); // Elemento modal detalle
    const detalleOrdenBodyEl = document.getElementById('detalleOrdenBody');

    // Instancias Modales Bootstrap
    const modalPago = modalPagoEl ? new bootstrap.Modal(modalPagoEl) : null;
    const modalDetalleOrden = modalDetalleOrdenEl ? new bootstrap.Modal(modalDetalleOrdenEl) : null;

    // Verificar elementos esenciales POS
    if (!vendedorNombreEl || !productosGridEl || !ordenItemsContainerEl || !totalEl || !modalPagoEl || !ordenesTableBodyEl || !arqueTotalCajaEl || !modalDetalleOrdenEl) {
        console.error("Error crítico: Faltan elementos HTML esenciales para el POS.");
        alert("Error al cargar la interfaz del POS.");
        return;
    }

    // --- Validación de Acceso (MODIFICADO: Rol VENDEDOR) ---
    const token = getToken();
    const user = getUser();
    let userRole = null;
    if (user?.rol?.name) { userRole = user.rol.name.replace("ROLE_", ""); }
    else if (user?.roles) { /* ... (lógica fallback como en admin.js) ... */
        if (user.roles.includes("ROLE_VENDEDOR") || user.roles.some(r => r.authority === "ROLE_VENDEDOR")) userRole = "VENDEDOR";
        else if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority === "ROLE_ADMIN")) userRole = "ADMIN"; // Permitir admin también?
    }

    // Permitir VENDEDOR o ADMIN
    if (!token || !user || (userRole !== 'VENDEDOR' && userRole !== 'ADMIN')) {
        alert('Acceso denegado. Solo vendedores o administradores pueden acceder al POS.');
        logout(); // Limpiar y redirigir
        return;
    }
    console.log(`Acceso POS verificado para rol: ${userRole}`);

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    async function init() {
        mostrarNombreVendedor();
        actualizarFechaHora();
        setInterval(actualizarFechaHora, 60000); // Actualizar hora cada minuto es suficiente
        await cargarDatos();
        inicializarNavegacion(); // Configura tabs
        configurarModalPago();
        setupEventListenersGenerales(); // Añadir listeners globales (buscar, limpiar orden, etc.)
        // Inicializar Google Pay (si el script se cargó)
        if (typeof google !== 'undefined' && google.payments?.api) {
            onGooglePayLoaded();
        } else {
            console.warn("Google Pay API script no cargado o inicializado.");
        }
    }

    function mostrarNombreVendedor() {
        // Usar Nombre y Apellido si existen
        const nombreMostrar = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.correo || 'Vendedor';
        if (vendedorNombreEl) vendedorNombreEl.textContent = nombreMostrar;
        if (arqueVendedorEl) arqueVendedorEl.textContent = nombreMostrar;
    }

    function actualizarFechaHora() {
        const ahora = new Date();
        const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric' };
        if (fechaActualEl) fechaActualEl.textContent = ahora.toLocaleDateString('es-ES', opcionesFecha);
        if (horaActualEl) horaActualEl.textContent = ahora.toLocaleTimeString('es-ES');
        if (arqueFechaEl) arqueFechaEl.textContent = ahora.toLocaleDateString('es-ES');
    }

    // ==========================================
    // CARGA DE DATOS (MODIFICADO: usa /api/menu y /api/admin/pedidos)
    // ==========================================
    async function cargarDatos() {
        showAdminLoader("Cargando datos iniciales..."); // Reutilizar loader
        clearAdminError();
        try {
            // Cargar Menú (categorías y productos activos) y Órdenes (todas para admin/vendedor)
            const [menuRes, ordersRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/menu`),       // Endpoint público con activos
                fetchWithAuth(`${API_BASE_URL}/admin/pedidos`) // Endpoint admin con todos (pedidos en lugar de pedido)
            ]);

            async function handleResponseError(response, entityName) { /* ... (igual que en admin.js) ... */
                 if (!response.ok) { const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` })); throw new Error(`Error al cargar ${entityName}: ${errorData.error || response.statusText}`); } return response.json();
             }

            // Procesar Menú
            const menuData = await handleResponseError(menuRes, "menú");
            categories = menuData.filter(cat => !cat.audAnulado); // Filtrar categorías anuladas si vienen
            products = menuData.reduce((acc, cat) => {
                if (!cat.audAnulado && cat.productos) {
                    // Filtrar productos anulados y añadir referencia a categoría
                    cat.productos.forEach(p => {
                        if (!p.audAnulado) {
                            p.categoria = { id: cat.id, nombre: cat.nombre }; // Añadir ref a categoría
                            acc.push(p);
                        }
                    });
                }
                return acc;
            }, []);
            console.log(`✅ Categorías activas cargadas: ${categories.length}`);
            console.log(`✅ Productos activos cargados: ${products.length}`);

            // Procesar Órdenes
            ordenesDelDia = await handleResponseError(ordersRes, "órdenes"); // Guardar todas para arqueo
            console.log(`✅ Todas las órdenes cargadas: ${ordenesDelDia.length}`);


            // Renderizar UI inicial
            renderizarCategorias();
            // Mostrar todos los productos activos al inicio
            const allActiveProducts = products; // 'products' ya contiene solo activos
            renderizarProductos(allActiveProducts);
            // Cargar órdenes de hoy en la tabla "Mis Órdenes"
            cargarOrdenesDelDiaUI(ordenesDelDia); // Nueva función UI
            // Calcular y mostrar arqueo inicial
            calcularYMostrarArqueo(ordenesDelDia); // Nueva función UI

        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            showAdminError(`Error al cargar datos: ${error.message}`);
        } finally {
            hideAdminLoader();
        }
    }

    // ==========================================
    // NUEVA VENTA - PRODUCTOS (MODIFICADO: usa 'id' y campos Java)
    // ==========================================
    function renderizarCategorias() {
        if (!categoriasFiltroEl) return;
        categoriasFiltroEl.innerHTML = ''; // Limpiar

        // Botón "Todo"
        const btnTodo = document.createElement('button');
        btnTodo.className = 'btn-categoria active'; // Activo por defecto
        btnTodo.dataset.categoria = 'todo';
        btnTodo.innerHTML = `🍽️ Todo`;
        btnTodo.onclick = () => filtrarPorCategoria('todo');
        categoriasFiltroEl.appendChild(btnTodo);


        categories.forEach(cat => { // 'categories' ya está filtrado (activos)
            const btn = document.createElement('button');
            btn.className = 'btn-categoria';
            btn.dataset.categoria = cat.id; // Usar ID numérico
            btn.innerHTML = `${cat.icono || '📁'} ${cat.nombre || 'N/A'}`; // Usar 'nombre'
            btn.onclick = () => filtrarPorCategoria(cat.id);
            categoriasFiltroEl.appendChild(btn);
        });
    }

    function filtrarPorCategoria(categoriaId) {
        const botones = document.querySelectorAll('.btn-categoria');
        botones.forEach(btn => btn.classList.remove('active'));

        let productosFiltrados;
        if (categoriaId === 'todo') {
            document.querySelector('[data-categoria="todo"]').classList.add('active');
            productosFiltrados = products; // 'products' ya contiene solo activos
        } else {
            const btnSelected = document.querySelector(`[data-categoria="${categoriaId}"]`);
            if (btnSelected) btnSelected.classList.add('active');
            // Filtrar productos por el ID de categoría anidado
            productosFiltrados = products.filter(p => p.categoria?.id === categoriaId);
        }
        renderizarProductos(productosFiltrados);
    }

    function renderizarProductos(productosArray = products) {
        if (!productosGridEl) return;
        productosGridEl.innerHTML = '';

        if (!productosArray || productosArray.length === 0) {
            productosGridEl.innerHTML = '<p class="text-muted text-center col-span-full py-4">No hay productos que coincidan.</p>';
            return;
        }

        productosArray.forEach(producto => {
            // Renderizar solo si no está anulado (doble check) y tiene stock > 0
            if (producto.audAnulado || producto.stock <= 0) return;

            const card = document.createElement('div');
            card.className = 'producto-card cursor-pointer hover:shadow-lg transition-shadow duration-200'; // Clases ejemplo
            card.innerHTML = `
                <img src="${producto.imagen || 'icon/logo.png'}" alt="${producto.nombre || ''}" class="w-full h-32 object-cover" onerror="this.src='icon/logo.png';">
                <div class="p-2">
                    <h4 class="text-sm font-semibold truncate">${producto.nombre || 'N/A'}</h4>
                    <p class="precio text-base font-bold text-orange-600">S/ ${(producto.precio || 0).toFixed(2)}</p>
                    </div>
            `;
            card.onclick = () => agregarAOrden(producto);
            productosGridEl.appendChild(card);
        });
    }

    // Listener para búsqueda (sin cambios funcionales)
    if (buscarProductoInput) {
        buscarProductoInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase().trim();
            const productosFiltrados = products.filter(p =>
                !p.audAnulado && // Solo buscar en activos
                p.producto.toLowerCase().includes(termino) // Usar 'producto' (nombre Java)
            );
            renderizarProductos(productosFiltrados);
            // Desmarcar categoría si se está buscando
            document.querySelectorAll('.btn-categoria').forEach(btn => btn.classList.remove('active'));
        });
    }


    // ==========================================
    // CARRITO - ORDEN ACTUAL (MODIFICADO: usa 'id', campos Java, valida stock)
    // ==========================================
    function agregarAOrden(producto) {
        if (!producto || producto.stock === undefined || producto.stock <= 0) {
            alert(`${producto?.nombre || 'El producto'} está agotado o no disponible.`);
            return;
        }

        // Buscar por 'id'
        const existenteIndex = ordenActual.findIndex(item => item.id === producto.id);

        if (existenteIndex > -1) {
            const itemActual = ordenActual[existenteIndex];
            // Validar stock antes de incrementar
            if (itemActual.cantidad >= producto.stock) {
                alert(`No puedes agregar más ${producto.nombre}. Stock máximo (${producto.stock}) alcanzado en el carrito.`);
                return;
            }
            itemActual.cantidad++;
        } else {
            // Usar 'id' y campos Java ('producto', 'precio', 'imagen', 'stock')
            ordenActual.push({
                id: producto.id,
                nombre: producto.producto, // Campo 'producto' de la entidad
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad: 1,
                stock: producto.stock // Guardar stock para validaciones
            });
        }
        renderizarOrden();
    }

    function renderizarOrden() {
        if (!ordenItemsContainerEl || !subtotalEl || !totalEl) return;

        if (ordenActual.length === 0) {
            ordenItemsContainerEl.innerHTML = '<p class="text-muted text-center py-4">Orden vacía</p>';
            actualizarTotales(); // Asegura que totales sean 0.00
            return;
        }

        ordenItemsContainerEl.innerHTML = '';
        ordenActual.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'orden-item flex justify-between items-center py-2 border-b'; // Clases ejemplo
            div.innerHTML = `
                <div class="item-info flex-grow mr-2">
                    <h5 class="text-sm font-semibold truncate">${item.nombre}</h5>
                    <span class="item-precio text-xs text-gray-600">S/ ${item.precio.toFixed(2)} c/u</span>
                    <div class="item-cantidad flex items-center mt-1">
                        <button class="btn-qty bg-gray-200 px-2 rounded-l ${item.cantidad <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}" data-index="${index}" data-action="decrease" ${item.cantidad <= 1 ? 'disabled' : ''}>-</button>
                        <span class="px-3 border-t border-b">${item.cantidad}</span>
                        <button class="btn-qty bg-gray-200 px-2 rounded-r ${item.cantidad >= item.stock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}" data-index="${index}" data-action="increase" ${item.cantidad >= item.stock ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold">S/ ${(item.precio * item.cantidad).toFixed(2)}</p>
                    <button class="btn-remove text-red-500 hover:text-red-700 mt-1" data-index="${index}" data-action="remove" title="Eliminar ${item.nombre}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            ordenItemsContainerEl.appendChild(div);
        });

        actualizarTotales();
    }

    // NUEVO: Listener centralizado para acciones en la orden actual
    if (ordenItemsContainerEl) {
        ordenItemsContainerEl.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-index]');
            if (!button) return;

            const index = parseInt(button.dataset.index, 10);
            const action = button.dataset.action;

            if (isNaN(index) || index < 0 || index >= ordenActual.length) {
                console.error("Índice inválido en acción de orden:", index);
                return;
            }

            if (action === 'increase') {
                cambiarCantidad(index, 1);
            } else if (action === 'decrease') {
                cambiarCantidad(index, -1);
            } else if (action === 'remove') {
                eliminarItem(index);
            }
        });
    }


    function cambiarCantidad(index, cambio) {
        const item = ordenActual[index];
        const nuevaCantidad = item.cantidad + cambio;

        if (nuevaCantidad <= 0) {
            eliminarItem(index); // Eliminar si la cantidad llega a 0 o menos
        } else if (nuevaCantidad > item.stock) {
            alert(`No puedes agregar más ${item.nombre}. Stock máximo (${item.stock}) alcanzado.`);
        } else {
            item.cantidad = nuevaCantidad;
            renderizarOrden(); // Re-renderizar para actualizar subtotal y botones
        }
    }

    function eliminarItem(index) {
        if (confirm(`¿Quitar ${ordenActual[index]?.nombre || 'este item'} de la orden?`)) {
            ordenActual.splice(index, 1);
            renderizarOrden();
        }
    }

    function actualizarTotales() {
        const subtotal = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        if (subtotalEl) subtotalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `S/ ${subtotal.toFixed(2)}`; // POS no tiene costo de envío
    }

    // Listener para botón Limpiar Orden y otros
    function setupEventListenersGenerales() {
        const btnLimpiar = document.getElementById('btnLimpiarOrden'); // Asegúrate que el botón tenga este ID
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                if (ordenActual.length > 0 && confirm('¿Deseas limpiar la orden actual?')) {
                    ordenActual = [];
                    renderizarOrden();
                }
            });
        }
        const btnAbrirPago = document.getElementById('btnAbrirModalPago'); // Asegúrate que el botón tenga este ID
        if (btnAbrirPago) {
            btnAbrirPago.addEventListener('click', abrirModalPago);
        }
        // Listener para imprimir arqueo
        const btnImprimirArqueo = document.getElementById('btnImprimirArqueo'); // Asegúrate que el botón tenga este ID
        if (btnImprimirArqueo) {
            btnImprimirArqueo.addEventListener('click', imprimirArqueo);
        }
        // Listener para logout
        const btnLogout = document.getElementById('pos-logout-button'); // Asigna ID al botón logout del POS
        if (btnLogout) {
             btnLogout.addEventListener('click', (e) => {
                 e.preventDefault();
                 if (confirm("¿Seguro que deseas cerrar sesión?")) {
                     logout(); // Llama a la función global
                 }
             });
        }
    }


    // ==========================================
    // MODAL DE PAGO (MODIFICADO: Simplificado para POS, usa /api/ordenes)
    // ==========================================
    function configurarModalPago() {
        if (!metodoPagoSelect) return; // Salir si no hay modal de pago

        metodoPagoSelect.addEventListener('change', (e) => {
            // Ocultar secciones
            if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'none';
            if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'none';
            if (pagoYapeDiv) pagoYapeDiv.style.display = 'none';
            const pagoExitosoDiv = document.getElementById('pagoExitoso'); if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'none';
            const gpayContainer = document.getElementById('gpay-container'); if (gpayContainer) gpayContainer.style.display = 'none'; // Ocultar GPay por defecto
            googlePayToken = null;

            const metodo = e.target.value;
            const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

            if (btnConfirmarVenta) btnConfirmarVenta.disabled = false; // Habilitado por defecto

            if (metodo === 'efectivo') {
                if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'block';
                if (montoRecibidoInput) montoRecibidoInput.focus(); // Enfocar monto recibido
            } else if (metodo === 'tarjeta') {
                if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'block';
                const montoTarjetaEl = document.getElementById('montoTarjeta');
                if (montoTarjetaEl) montoTarjetaEl.textContent = `S/ ${total.toFixed(2)}`;
                if (btnConfirmarVenta) btnConfirmarVenta.disabled = true; // Deshabilitar hasta que GPay complete

                // Renderizar botón Google Pay (si está disponible)
                if (paymentsClient) {
                     // Retraso leve para asegurar que el div esté visible
                    setTimeout(() => { renderGooglePayButton(total); }, 100);
                } else {
                    console.warn("Google Pay no está listo, opción tarjeta no disponible vía GPay.");
                    // Podrías habilitar campos manuales aquí si tuvieras un POS físico
                }

            } else if (metodo === 'yape') { // Asumiendo Yape/Plin
                if (pagoYapeDiv) pagoYapeDiv.style.display = 'block';
                const montoYapeEl = document.getElementById('montoYape');
                if (montoYapeEl) montoYapeEl.textContent = `S/ ${total.toFixed(2)}`;
                // Aquí podrías mostrar el QR o número para Yape/Plin
            }
        });

        // Calcular cambio en efectivo
        if (montoRecibidoInput) {
            montoRecibidoInput.addEventListener('input', (e) => {
                const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                const recibido = parseFloat(e.target.value) || 0;
                const cambio = recibido - total;
                if (cambioMontoEl) cambioMontoEl.textContent = `S/ ${cambio >= 0 ? cambio.toFixed(2) : '0.00'}`;
            });
        }

        // Listener para confirmar venta
        if (btnConfirmarVenta) {
            btnConfirmarVenta.addEventListener('click', confirmarPago);
        }
    }

    function abrirModalPago() {
        if (ordenActual.length === 0) {
            alert('Agrega productos a la orden primero.');
            return;
        }
        if (!modalPago) {
            console.error("Modal de pago no encontrado.");
            return;
        }


        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        // Resetear modal
        const pagoTotalEl = document.getElementById('pagoTotal'); if (pagoTotalEl) pagoTotalEl.textContent = `S/ ${total.toFixed(2)}`;
        if (metodoPagoSelect) metodoPagoSelect.value = 'efectivo'; // Default a efectivo
        if (nombreClienteInput) nombreClienteInput.value = ''; // Limpiar nombre cliente
        if (montoRecibidoInput) montoRecibidoInput.value = '';
        if (cambioMontoEl) cambioMontoEl.textContent = 'S/ 0.00';
        if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'block'; // Mostrar efectivo por defecto
        if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'none';
        if (pagoYapeDiv) pagoYapeDiv.style.display = 'none';
        const pagoExitosoDiv = document.getElementById('pagoExitoso'); if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'none';
        const gpayContainer = document.getElementById('gpay-container'); if (gpayContainer) gpayContainer.style.display = 'none';
        if (btnConfirmarVenta) btnConfirmarVenta.disabled = false;
        googlePayToken = null;

        modalPago.show();
    };

    /**
     * MODIFICADO: Confirma el pago y envía la orden al backend /api/ordenes.
     */
    async function confirmarPago() {
        const metodoPago = metodoPagoSelect.value;
        // Nombre es opcional, si no se pone, usar "Cliente General"
        const nombreClienteInputVal = nombreClienteInput ? nombreClienteInput.value.trim() : '';
        const nombreClienteFinal = nombreClienteInputVal || 'Cliente General';
        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        // Validaciones
        if (metodoPago === 'efectivo') {
            const montoRecibido = parseFloat(montoRecibidoInput.value);
            if (isNaN(montoRecibido) || montoRecibido < total) {
                alert('El monto recibido en efectivo debe ser mayor o igual al total.');
                return;
            }
        } else if (metodoPago === 'tarjeta' && !googlePayToken) {
            // Si no es GPay, ¿hay POS físico? Si no, no se puede confirmar.
            // alert('Pago con tarjeta requiere Google Pay o POS físico.'); // Descomentar si no hay POS físico
            alert('Completa el pago con Google Pay o selecciona otro método.'); // Asumiendo solo GPay por ahora
            return;
        }

        if (btnConfirmarVenta) {
            btnConfirmarVenta.disabled = true;
            btnConfirmarVenta.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmando...';
        }
        clearAdminError(); // Limpiar errores

        // --- Construir payload para OrdenRequestDTO ---
        // Nota: En POS, no tenemos todos los datos de cliente/entrega como en la web.
        // El backend debe poder manejar una versión simplificada o asignar defaults.
        const ordenData = {
            items: ordenActual.map(item => ({
                productoId: item.id, // ID del backend
                cantidad: item.cantidad
            })),
            // Enviar datos mínimos de cliente para POS
            nombreCliente: nombreClienteFinal,
            apellidoCliente: "", // Asumir vacío o extraer de nombreClienteFinal si es posible
            correoCliente: null, // No lo pedimos en POS
            telefonoCliente: null, // No lo pedimos en POS
            tipoComprobante: "Boleta", // Default a Boleta para POS (o añadir opción)
            dniCliente: null,

            // Datos de entrega (asumir Recojo en Local para POS)
            tipoEntrega: "Recojo en Local",
            direccionEntrega: null,
            referenciaEntrega: null,

            // Datos de Pago
            metodoPago: metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1), // Capitalizar: "Efectivo", "Tarjeta", "Yape"
            ...(metodoPago === 'tarjeta' && googlePayToken && {
                googlePayToken: googlePayToken
            }),
            ...(metodoPago === 'yape' && {
                // numeroYape: '999888777' // ¿Necesita el backend el número Yape para POS?
            })
            // No enviar datos de tarjeta manuales desde POS (a menos que tengas integración segura)
        };

        console.log('Enviando orden POS al backend:', JSON.stringify(ordenData, null, 2));

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/ordenes`, { // Llama al endpoint estándar de crear orden
                method: 'POST',
                body: JSON.stringify(ordenData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('¡Venta realizada con éxito! Orden ID: ' + result.pedidoId);
                ordenActual = []; // Limpiar orden actual
                googlePayToken = null;
                renderizarOrden(); // Actualizar UI carrito
                
                // Recargar órdenes y recalcular arqueo
                const updatedOrders = await fetchOrdenesActualizadas();
                ordenesDelDia = updatedOrders; // Actualizar la variable global
                cargarOrdenesDelDiaUI(updatedOrders); 
                calcularYMostrarArqueo(updatedOrders); 

                modalPago.hide(); // Ocultar modal

            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error('Error al confirmar venta POS:', error);
            showAdminError('Error al procesar la venta: ' + error.message);
        } finally {
            if (btnConfirmarVenta) { // Habilitar botón de nuevo
                btnConfirmarVenta.disabled = false;
                btnConfirmarVenta.textContent = 'Confirmar Venta';
            }
        }
    };

    // ==========================================
    // MIS ÓRDENES (MODIFICADO: usa datos backend)
    // ==========================================
    // NUEVO: Función para recargar órdenes desde el backend
    async function fetchOrdenesActualizadas() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos`);
            if (!response.ok) throw new Error("No se pudieron recargar las órdenes");
            return await response.json();
        } catch (error) {
            console.error("Error recargando órdenes:", error);
            return ordenesDelDia; // Devuelve las órdenes antiguas si falla
        }
    }


    // MODIFICADO: Renderiza órdenes de HOY desde el array global 'ordenesDelDia'
    function cargarOrdenesDelDiaUI(todasLasOrdenes) {
        if (!ordenesTableBodyEl) return;

        const hoyStr = new Date().toISOString().split('T')[0];
        const ordenesFiltradasHoy = (todasLasOrdenes || []).filter(orden => {
            try {
                // Usar fecha_Pedido y comparar solo la fecha
                return orden.fecha_Pedido && new Date(orden.fecha_Pedido).toISOString().split('T')[0] === hoyStr;
            } catch (e) {
                console.warn("Fecha inválida en orden al filtrar:", orden.id, orden.fecha_Pedido);
                return false;
            }
        });

        console.log(`Órdenes de hoy para UI: ${ordenesFiltradasHoy.length}`);
        renderizarOrdenesTabla(ordenesFiltradasHoy); // Llama a la función de renderizado
        actualizarEstadisticas(ordenesFiltradasHoy); // Actualiza contadores
    }

    // MODIFICADO: Renderiza la tabla con datos del backend
    function renderizarOrdenesTabla(ordenes) {
        if (!ordenesTableBodyEl) return;
        ordenesTableBodyEl.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            ordenesTableBodyEl.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No hay órdenes registradas hoy.</td></tr>';
            return;
        }

        ordenes.forEach(orden => {
            const fechaOrden = new Date(orden.fecha_Pedido);
            const hora = fechaOrden.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            // Nombre del cliente anidado
            const nombreCliente = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || 'General'}`.trim();
            // Estado actual
            const estadoDisplay = getEstadoDisplay(orden.estadoActual);

            const tr = document.createElement('tr');
            // Marcar anuladas si aplica
            if (orden.audAnulado) {
                tr.classList.add('opacity-50', 'bg-gray-100', 'anulado');
                tr.title = "Orden Anulada";
            }

            tr.innerHTML = `
                <td>#${orden.id}</td>
                <td>${hora}</td>
                <td>${nombreCliente}</td>
                <td>S/ ${(orden.total || 0).toFixed(2)}</td>
                <td><span class="badge ${getBadgeClass(orden.estadoActual)}">${estadoDisplay}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary action-view-order" data-order-id="${orden.id}" title="Ver Detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    </td>
            `;
            ordenesTableBodyEl.appendChild(tr);
        });

        // Añadir listener para ver detalles (delegation)
        setupMisOrdenesListeners();
    }

    // NUEVO: Asignar clase de badge según estado
    function getBadgeClass(estadoBackend) {
        switch (estadoBackend) {
            case 'RECIBIDO': return 'bg-secondary text-white'; // O bg-warning
            case 'EN_PREPARACION': return 'bg-info text-dark';
            case 'EN_RUTA': return 'bg-primary text-white';
            case 'ENTREGADO': return 'bg-success text-white';
            case 'CANCELADO': return 'bg-danger text-white';
            default: return 'bg-light text-dark';
        }
    }

    // NUEVO: Listeners para tabla "Mis Órdenes"
    function setupMisOrdenesListeners() {
        if (!ordenesTableBodyEl._listenersAttached) {
            ordenesTableBodyEl.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.action-view-order[data-order-id]');
                // const toggleBtn = e.target.closest('.action-toggle-order[data-id]'); // Si añades anular/reactivar

                if (viewBtn) {
                    const orderId = parseInt(viewBtn.dataset.orderId, 10);
                    verDetalleOrden(orderId); // Llama a la función para mostrar modal
                }
                // else if (toggleBtn) { ... } // Lógica para anular/reactivar
            });
            ordenesTableBodyEl._listenersAttached = true;
        }
    }


    // MODIFICADO: Actualiza contadores
    function actualizarEstadisticas(ordenes) {
        // Contar solo órdenes NO anuladas para estadísticas de venta
        const ordenesActivas = ordenes.filter(o => !o.audAnulado);
        const totalOrdenesHoy = ordenesActivas.length;
        const ventasHoy = ordenesActivas.reduce((sum, orden) => sum + (orden.total || 0), 0);

        if (totalOrdenesEl) totalOrdenesEl.textContent = totalOrdenesHoy;
        if (ventasHoyEl) ventasHoyEl.textContent = `S/ ${ventasHoy.toFixed(2)}`;
    }

    /**
     * MODIFICADO: Busca la orden por ID (localmente primero, luego backend si es necesario) y muestra el modal.
     */
    async function verDetalleOrden(ordenId) {
        console.log(`Buscando detalles para orden ID: ${ordenId}`);
        if (!modalDetalleOrden) return;

        // Buscar en las órdenes ya cargadas
        ordenSeleccionada = ordenesDelDia.find(o => o.id === ordenId);

        if (ordenSeleccionada) {
            console.log("Mostrando detalles desde datos locales:", ordenSeleccionada);
            mostrarDetalleOrden(ordenSeleccionada);
        } else {
            // Si no está en la lista local (poco probable), intentar buscarla en el backend
            console.warn(`Orden ${ordenId} no encontrada localmente, buscando en backend...`);
            showAdminLoader("Cargando detalle...");
            try {
                // Usar endpoint de admin para ver cualquier orden (asume permisos)
                const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${ordenId}`);
                if (!response.ok) throw new Error("Orden no encontrada en el servidor.");
                ordenSeleccionada = await response.json();
                mostrarDetalleOrden(ordenSeleccionada);
            } catch (error) {
                console.error('Error al buscar detalle de orden en backend:', error);
                showAdminError('No se pudo cargar el detalle de la orden.');
            } finally {
                hideAdminLoader();
            }
        }
    };
    // Hacer global para onclick
    window.verDetalleOrden = verDetalleOrden;


    /**
     * MODIFICADO: Muestra los detalles de la orden en el modal, usando datos del backend.
     */
    function mostrarDetalleOrden(orden) {
        if (!detalleOrdenBodyEl || !orden) return;

        const items = orden.detalles || []; // Usar 'detalles'
        const nombreCliente = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || 'General'}`.trim();
        const fechaOrden = new Date(orden.fecha_Pedido || orden.createdAt); // Usar fecha_Pedido
        const metodoPagoTexto = orden.pago?.metodo_Pago || orden.metodoPago || 'No especificado'; // Intentar obtener de entidad Pago
        const estadoDisplay = getEstadoDisplay(orden.estadoActual);

        console.log('Mostrando detalle para orden:', orden);
        console.log('Items:', items);

        // Rellenar modal
        detalleOrdenBodyEl.innerHTML = `
            <div class="orden-detalle p-3">
              <h5>Orden #${orden.id} ${orden.audAnulado ? '<span class="badge bg-danger ms-2">ANULADA</span>' : ''}</h5>
              <p><strong>Cliente:</strong> ${nombreCliente}</p>
              <p><strong>Fecha:</strong> ${!isNaN(fechaOrden) ? fechaOrden.toLocaleString('es-ES') : 'N/A'}</p>
              <p><strong>Método Pago:</strong> ${metodoPagoTexto}</p>
              <p><strong>Estado:</strong> ${estadoDisplay}</p>
              <hr>
              <h6>Productos:</h6>
              <table class="table table-sm">
                <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  ${items.length > 0 ? items.map(item => {
            // Validar item y producto anidado
            if (!item || !item.producto || item.cantidad === undefined || item.subtotal === undefined) {
                return '<tr><td colspan="4">Error en item</td></tr>';
            }
            const nombreProducto = item.producto.producto || 'Producto';
            const precioUnitario = item.producto.precio || 0; // Precio unitario del producto
            // Subtotal ya viene calculado en el item
            return `
                    <tr>
                      <td>${nombreProducto}</td>
                      <td class="text-center">${item.cantidad}</td>
                      <td class="text-end">S/ ${precioUnitario.toFixed(2)}</td>
                      <td class="text-end">S/ ${item.subtotal.toFixed(2)}</td>
                    </tr>`;
        }).join('') : '<tr><td colspan="4" class="text-center">No hay productos</td></tr>'}
                </tbody>
                <tfoot>
                  ${orden.monto_Agregado > 0 ? `<tr><td colspan="3" class="text-end">Envío:</td><td class="text-end">S/ ${orden.monto_Agregado.toFixed(2)}</td></tr>` : ''}
                  <tr class="fw-bold table-group-divider">
                    <td colspan="3" class="text-end">TOTAL:</td>
                    <td class="text-end">S/ ${(orden.total || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              ${orden.historialEstados && orden.historialEstados.length > 0 ? `
                <hr><h6>Historial de Estados:</h6>
                <ul class="list-unstyled small">
                  ${orden.historialEstados.map(h => `<li>${new Date(h.fechaHoraCambio).toLocaleString('es-ES')} - ${getEstadoDisplay(h.tipo_Estado)} ${h.notas ? `(${h.notas})` : ''}</li>`).join('')}
                </ul>
              ` : ''}

            </div>`;

        modalDetalleOrden.show(); // Mostrar modal Bootstrap
    }

    // ==========================================
    // ARQUEO DE CAJA (MODIFICADO: usa datos backend)
    // ==========================================
    // MODIFICADO: Llama a calcularYMostrarArqueo con las órdenes ya cargadas
    async function cargarArqueoCaja() {
        // Ya no necesita fetch aquí, usa ordenesDelDia cargadas en init()
        console.log("Calculando arqueo con órdenes ya cargadas...");
        calcularYMostrarArqueo(ordenesDelDia);
    }

    // MODIFICADO: Calcula arqueo desde la lista de órdenes del backend
    function calcularYMostrarArqueo(todasLasOrdenes) {
        if (!arqueNumOrdenesEl) return; // Salir si no está la sección de arqueo

        const hoyStr = new Date().toISOString().split('T')[0];
        // Filtrar órdenes de hoy y que NO estén anuladas
        const ordenesHoyActivas = (todasLasOrdenes || []).filter(orden => {
            if (orden.audAnulado) return false;
            try {
                return orden.fecha_Pedido && new Date(orden.fecha_Pedido).toISOString().split('T')[0] === hoyStr;
            } catch (e) { return false; }
        });

        console.log(`Órdenes del día activas para arqueo: ${ordenesHoyActivas.length}`);

        const numOrdenes = ordenesHoyActivas.length;
        let efectivo = 0, tarjeta = 0, yape = 0;

        ordenesHoyActivas.forEach(orden => {
            const total = orden.total || 0;
            // Determinar método de pago (puede estar en Pedido o en entidad Pago anidada)
            let metodo = (orden.pago?.metodo_Pago || orden.metodoPago || 'Efectivo').toLowerCase(); // Intentar leer de .pago primero

            // Simplificar mapeo
            if (metodo.includes('tarjeta')) metodo = 'tarjeta';
            else if (metodo.includes('yape') || metodo.includes('plin')) metodo = 'yape';
            else metodo = 'efectivo'; // Default

            console.log(`Orden Arqueo: ${orden.id}, Total: ${total}, Método: ${metodo}`);

            switch (metodo) {
                case 'efectivo': efectivo += total; break;
                case 'tarjeta': tarjeta += total; break;
                case 'yape': yape += total; break;
                default: efectivo += total; // Asignar a efectivo si no se reconoce
            }
        });

        const totalCaja = efectivo + tarjeta + yape;
        console.log('Arqueo calculado:', { numOrdenes, efectivo, tarjeta, yape, totalCaja });

        // Actualizar UI
        arqueNumOrdenesEl.textContent = numOrdenes;
        arqueEfectivoEl.textContent = `S/ ${efectivo.toFixed(2)}`;
        arqueTarjetaEl.textContent = `S/ ${tarjeta.toFixed(2)}`;
        arqueYapeEl.textContent = `S/ ${yape.toFixed(2)}`;
        arqueTotalCajaEl.textContent = `S/ ${totalCaja.toFixed(2)}`;
    }

    // ==========================================
    // IMPRIMIR ARQUEO (Sin cambios funcionales)
    // ==========================================
    function imprimirArqueo() { // Hacer global si se llama desde HTML
        const vendedor = arqueVendedorEl.textContent;
        const fecha = arqueFechaEl.textContent;
        const numOrdenes = arqueNumOrdenesEl.textContent;
        const efectivo = arqueEfectivoEl.textContent;
        const tarjeta = arqueTarjetaEl.textContent;
        const yape = arqueYapeEl.textContent;
        const totalCaja = arqueTotalCajaEl.textContent;
        const horaImpresion = new Date().toLocaleTimeString('es-ES');

        const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
        ventanaImpresion.document.write(`
          <!DOCTYPE html> <html lang="es"> <head> <meta charset="UTF-8"> <title>Arqueo - ${fecha}</title> <style>
          body { font-family: sans-serif; margin: 20px; } .reporte-container { border: 1px solid #ccc; padding: 20px; max-width: 600px; margin: auto; } .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; } .header h1 { margin: 0; font-size: 1.5em; } .header h2 { margin: 5px 0 0; font-size: 1.2em; color: #555; } .info-section { margin-bottom: 20px; } .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dotted #eee; } .info-label { font-weight: bold; color: #444; } .info-value { text-align: right; } .resumen-metodos { border-top: 1px solid #ccc; padding-top: 15px; margin-top: 20px; } .resumen-metodos h3 { text-align: center; margin-bottom: 15px; color: #333; } .metodo-pago { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 1.1em; } .metodo-pago span:first-child { } .metodo-pago span:last-child { font-weight: bold; } .destacado { border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-size: 1.3em !important; font-weight: bold; color: #000; } .footer { text-align: center; margin-top: 30px; font-size: 0.8em; color: #777; } .nota { font-style: italic; } @media print { body { margin: 0; } .reporte-container { border: none; box-shadow: none; max-width: 100%; } }
          </style> </head>
          <body> <div class="reporte-container"> <div class="header"> <h1>🍔 LA RUTA DEL SABOR</h1> <h2>ARQUEO DE CAJA</h2> </div>
          <div class="info-section">
          <div class="info-row"><span class="info-label">👤 Responsable:</span><span class="info-value">${vendedor}</span></div>
          <div class="info-row"><span class="info-label">📅 Fecha:</span><span class="info-value">${fecha}</span></div>
          <div class="info-row"><span class="info-label">🕐 Hora Cierre:</span><span class="info-value">${horaImpresion}</span></div>
          <div class="info-row"><span class="info-label">📋 Órdenes:</span><span class="info-value">${numOrdenes}</span></div>
          </div>
          <div class="resumen-metodos"> <h3>💰 DESGLOSE POR MÉTODO</h3>
          <div class="metodo-pago"><span><strong>💵 Efectivo:</strong></span><span style="font-weight: bold; color: #28a745;">${efectivo}</span></div>
          <div class="metodo-pago"><span><strong>💳 Tarjeta/GPay:</strong></span><span style="font-weight: bold; color: #007bff;">${tarjeta}</span></div>
          <div class="metodo-pago"><span><strong>📱 Yape/Plin:</strong></span><span style="font-weight: bold; color: #9c27b0;">${yape}</span></div>
          <div class="metodo-pago destacado"><span>💎 TOTAL CAJA:</span><span>${totalCaja}</span></div>
          </div>
          <div class="footer"> <p class="nota"> Documento generado el ${new Date().toLocaleString('es-ES')} </p> </div>
          </div> <script>window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); }; }</script> </body> </html>`); // Añadido autocierre
        ventanaImpresion.document.close();
    };
    // Hacer global si se llama desde HTML
    window.imprimirArqueo = imprimirArqueo;


    // ==========================================
    // NAVEGACIÓN (Sin cambios funcionales)
    // ==========================================
    function inicializarNavegacion() { /* ... (código igual que antes) ... */
        const menuItems = document.querySelectorAll('.menu-item'); const sections = document.querySelectorAll('.pos-section'); const sidebar = document.getElementById('posSidebar'); const toggleBtn = document.getElementById('sidebarToggle'); if (!menuItems.length || !sections.length || !sidebar || !toggleBtn) return; menuItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); const target = item.getAttribute('data-target'); menuItems.forEach(mi => mi.classList.remove('active')); sections.forEach(sec => sec.classList.remove('active')); item.classList.add('active'); const targetSection = document.getElementById(`section-${target}`); if (targetSection) targetSection.classList.add('active'); if (window.innerWidth <= 768) { sidebar.classList.remove('active'); } }); }); toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('active'); }); document.addEventListener('click', (e) => { if (window.innerWidth <= 768) { const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target); if (!isClickInside && sidebar.classList.contains('active')) { sidebar.classList.remove('active'); } } });
    }

    // ==========================================
    // INICIAR APLICACIÓN
    // ==========================================
    init();

});