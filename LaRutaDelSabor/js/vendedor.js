// js/vendedor.js

// --- Funciones Auxiliares de Autenticación y API ---
const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.error("Error parsing user from localStorage", e);
        return null;
    }
}

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

function logout() {
    console.log("Cerrando sesión de vendedor...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// --- Funciones Loader/Error ---
function showAdminLoader(message = "Procesando...") {
    const loaderElement = document.getElementById('pos-loader');
    if (loaderElement) {
        loaderElement.textContent = message;
        loaderElement.style.display = 'block';
    }
    console.log(message);
    const errorElement = document.getElementById('pos-error');
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
        alert(message);
    }
    console.error(message);
}
function clearAdminError() {
    const errorElement = document.getElementById('pos-error');
    if (errorElement) errorElement.style.display = 'none';
}

// ==========================================
// GOOGLE PAY CONFIGURATION
// ==========================================
const merchantInfo = { merchantId: 'BCR2DN6T6W44S3MA', merchantName: 'La Ruta del Sabor' };
const baseGooglePayRequest = { apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: [{ type: 'CARD', parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"] }, tokenizationSpecification: { type: 'PAYMENT_GATEWAY', parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' } } }], merchantInfo };
Object.freeze(baseGooglePayRequest);
let paymentsClient = null;
let googlePayToken = null;

function getGooglePaymentsClient() {
    if (paymentsClient === null) { paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST', merchantInfo: { merchantId: merchantInfo.merchantId, merchantName: merchantInfo.merchantName } }); } return paymentsClient;
}
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
function onGooglePayLoaded() {
    const googlePayClient = getGooglePaymentsClient(); const readyToPayRequest = deepCopy(baseGooglePayRequest); googlePayClient.isReadyToPay(readyToPayRequest).then(function (response) { if (response.result) { console.log('Google Pay disponible en POS.'); } else { console.log('Google Pay no disponible en POS.'); const gpayOption = document.getElementById('gpay-option-container'); if (gpayOption) gpayOption.style.display = 'none'; } }).catch(function (err) { console.error('Error Google Pay check:', err); });
}
function renderGooglePayButton(totalAmount) {
    if (!paymentsClient) return; const container = document.getElementById('gpay-container'); if (!container) return; container.innerHTML = ''; const button = paymentsClient.createButton({ onClick: () => onGooglePaymentButtonClicked(totalAmount), buttonColor: 'black', buttonType: 'pay', buttonSizeMode: 'fill' }); container.appendChild(button); container.style.display = 'block'; container.classList.add('active');
}
function onGooglePaymentButtonClicked(totalAmount) {
    if (!paymentsClient) { alert("Error Google Pay."); return; }
    if (ordenActual.length === 0) { alert("Añade productos a la orden."); return; }

    const transactionInfo = { countryCode: 'PE', currencyCode: 'PEN', totalPriceStatus: 'FINAL', totalPrice: totalAmount.toFixed(2), };
    const paymentDataRequest = { ...deepCopy(baseGooglePayRequest), transactionInfo: transactionInfo };
    console.log('Solicitud Google Pay (POS):', paymentDataRequest);
    paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
        console.log('Respuesta Google Pay (POS):', paymentData); const paymentToken = paymentData.paymentMethodData.tokenizationData.token; googlePayToken = paymentToken; console.log('Token Google Pay (POS) obtenido:', googlePayToken);
        const pagoExitosoDiv = document.getElementById('pagoExitoso'); const gpayContainer = document.getElementById('gpay-container'); const btnConfirmar = document.getElementById('btnConfirmarVenta');
        if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'block'; if (gpayContainer) gpayContainer.style.display = 'none'; if (btnConfirmar) btnConfirmar.disabled = false;
        alert("Pago Google Pay autorizado. Confirma la venta.");
    }).catch(function (err) { console.error('Error Google Pay (POS):', err); if (err.statusCode !== 'CANCELED') { alert('Error al procesar Google Pay.'); } googlePayToken = null; });
}

// ==========================================
// VENDEDOR.JS - Sistema POS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let categories = [];
    let products = [];
    let ordenActual = [];
    let ordenSeleccionada = null;
    let ordenesDelDia = [];

    // Elementos DOM
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
    const nombreClienteInput = document.getElementById('nombreCliente');
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
    const modalDetalleOrdenEl = document.getElementById('modalDetalleOrden');
    const detalleOrdenBodyEl = document.getElementById('detalleOrdenBody');

    // Instancias Modales
    const modalPago = modalPagoEl ? new bootstrap.Modal(modalPagoEl) : null;
    const modalDetalleOrden = modalDetalleOrdenEl ? new bootstrap.Modal(modalDetalleOrdenEl) : null;

    if (!vendedorNombreEl || !productosGridEl || !ordenItemsContainerEl || !totalEl || !modalPagoEl || !ordenesTableBodyEl || !arqueTotalCajaEl || !modalDetalleOrdenEl) {
        console.error("Error crítico: Faltan elementos HTML esenciales para el POS.");
        alert("Error al cargar la interfaz del POS.");
        return;
    }

    // --- Validación de Acceso ---
    const token = getToken();
    const user = getUser();
    let userRole = null;
    if (user?.rol?.name) { userRole = user.rol.name.replace("ROLE_", ""); }
    else if (user?.roles) {
        if (user.roles.includes("ROLE_VENDEDOR") || user.roles.some(r => r.authority === "ROLE_VENDEDOR")) userRole = "VENDEDOR";
        else if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority === "ROLE_ADMIN")) userRole = "ADMIN";
    }

    if (!token || !user || (userRole !== 'VENDEDOR' && userRole !== 'ADMIN')) {
        alert('Acceso denegado. Solo vendedores o administradores pueden acceder al POS.');
        logout();
        return;
    }
    console.log(`Acceso POS verificado para rol: ${userRole}`);

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    async function init() {
        mostrarNombreVendedor();
        actualizarFechaHora();
        setInterval(actualizarFechaHora, 60000);
        await cargarDatos();
        inicializarNavegacion();
        configurarModalPago();
        setupEventListenersGenerales();
        if (typeof google !== 'undefined' && google.payments?.api) {
            onGooglePayLoaded();
        }
    }

    function mostrarNombreVendedor() {
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
    // CARGA DE DATOS
    // ==========================================
    async function cargarDatos() {
        showAdminLoader("Cargando datos iniciales...");
        clearAdminError();
        try {
            const [menuRes, ordersRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/menu`),
                fetchWithAuth(`${API_BASE_URL}/admin/pedidos`)
            ]);

            async function handleResponseError(response, entityName) {
                 if (!response.ok) { const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` })); throw new Error(`Error al cargar ${entityName}: ${errorData.error || response.statusText}`); } return response.json();
             }

            const menuData = await handleResponseError(menuRes, "menú");
            categories = menuData.filter(cat => !cat.audAnulado);
            products = menuData.reduce((acc, cat) => {
                if (!cat.audAnulado && cat.productos) {
                    cat.productos.forEach(p => {
                        if (!p.audAnulado) {
                            p.categoria = { id: cat.id, nombre: cat.nombre };
                            acc.push(p);
                        }
                    });
                }
                return acc;
            }, []);
            
            ordenesDelDia = await handleResponseError(ordersRes, "órdenes");

            renderizarCategorias();
            renderizarProductos(products);
            cargarOrdenesDelDiaUI(ordenesDelDia);
            calcularYMostrarArqueo(ordenesDelDia);

        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            showAdminError(`Error al cargar datos: ${error.message}`);
        } finally {
            hideAdminLoader();
        }
    }

    // ==========================================
    // NUEVA VENTA - PRODUCTOS
    // ==========================================
    function renderizarCategorias() {
        if (!categoriasFiltroEl) return;
        categoriasFiltroEl.innerHTML = '';

        const btnTodo = document.createElement('button');
        btnTodo.className = 'btn-categoria active';
        btnTodo.dataset.categoria = 'todo';
        btnTodo.innerHTML = `🍽️ Todo`;
        btnTodo.onclick = () => filtrarPorCategoria('todo');
        categoriasFiltroEl.appendChild(btnTodo);

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'btn-categoria';
            btn.dataset.categoria = cat.id;
            btn.innerHTML = `${cat.icono || '📁'} ${cat.nombre || 'N/A'}`;
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
            productosFiltrados = products;
        } else {
            const btnSelected = document.querySelector(`[data-categoria="${categoriaId}"]`);
            if (btnSelected) btnSelected.classList.add('active');
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
            // Permitir stock indefinido para pruebas (cambiar luego)
            const tieneStock = (producto.stock !== undefined && producto.stock > 0) || true;
            if (producto.audAnulado || !tieneStock) return;

            const card = document.createElement('div');
            card.className = 'producto-card cursor-pointer hover:shadow-lg transition-shadow duration-200';
            card.innerHTML = `
                <img src="${producto.imagen || 'icon/logo.png'}" alt="${producto.nombre || ''}" class="w-full h-32 object-cover" onerror="this.src='icon/logo.png';">
                <div class="p-2">
                    <h4 class="text-sm font-semibold truncate">${producto.nombre || 'N/A'}</h4>
                    <p class="precio text-base font-bold text-orange-600">S/ ${(producto.precio || 0).toFixed(2)}</p>
                    <small class="text-muted" style="font-size: 0.75rem">Stock: ${producto.stock !== undefined ? producto.stock : 'N/A'}</small>
                </div>
            `;
            card.onclick = () => agregarAOrden(producto);
            productosGridEl.appendChild(card);
        });
    }

    if (buscarProductoInput) {
        buscarProductoInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase().trim();
            const productosFiltrados = products.filter(p =>
                !p.audAnulado &&
                p.nombre.toLowerCase().includes(termino) // Usar nombre del DTO
            );
            renderizarProductos(productosFiltrados);
            document.querySelectorAll('.btn-categoria').forEach(btn => btn.classList.remove('active'));
        });
    }

    // ==========================================
    // CARRITO - ORDEN ACTUAL
    // ==========================================
    function agregarAOrden(producto) {
        // Validación de stock más flexible por si el backend no lo envía
        const stockDisponible = producto.stock !== undefined ? producto.stock : 999;
        
        if (!producto || stockDisponible <= 0) {
            alert(`${producto?.nombre || 'El producto'} está agotado.`);
            return;
        }

        const existenteIndex = ordenActual.findIndex(item => item.id === producto.id);

        if (existenteIndex > -1) {
            const itemActual = ordenActual[existenteIndex];
            if (itemActual.cantidad >= stockDisponible) {
                alert(`Stock máximo (${stockDisponible}) alcanzado para ${producto.nombre}.`);
                return;
            }
            itemActual.cantidad++;
        } else {
            ordenActual.push({
                id: producto.id,
                nombre: producto.nombre, // Usar nombre del DTO
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad: 1,
                stock: stockDisponible
            });
        }
        renderizarOrden();
    }

    function renderizarOrden() {
        if (!ordenItemsContainerEl || !subtotalEl || !totalEl) return;

        if (ordenActual.length === 0) {
            ordenItemsContainerEl.innerHTML = '<p class="text-muted text-center py-4">Orden vacía</p>';
            actualizarTotales();
            return;
        }

        ordenItemsContainerEl.innerHTML = '';
        ordenActual.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'orden-item flex justify-between items-center py-2 border-b';
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

    if (ordenItemsContainerEl) {
        ordenItemsContainerEl.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-index]');
            if (!button) return;

            const index = parseInt(button.dataset.index, 10);
            const action = button.dataset.action;

            if (isNaN(index) || index < 0 || index >= ordenActual.length) return;

            if (action === 'increase') cambiarCantidad(index, 1);
            else if (action === 'decrease') cambiarCantidad(index, -1);
            else if (action === 'remove') eliminarItem(index);
        });
    }

    function cambiarCantidad(index, cambio) {
        const item = ordenActual[index];
        const nuevaCantidad = item.cantidad + cambio;

        if (nuevaCantidad <= 0) {
            eliminarItem(index);
        } else if (nuevaCantidad > item.stock) {
            alert(`Stock máximo (${item.stock}) alcanzado.`);
        } else {
            item.cantidad = nuevaCantidad;
            renderizarOrden();
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
        if (totalEl) totalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    }

    function setupEventListenersGenerales() {
        const btnLimpiar = document.getElementById('btnLimpiarOrden');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                if (ordenActual.length > 0 && confirm('¿Deseas limpiar la orden actual?')) {
                    ordenActual = [];
                    renderizarOrden();
                }
            });
        }
        const btnAbrirPago = document.getElementById('btnAbrirModalPago');
        if (btnAbrirPago) {
            btnAbrirPago.addEventListener('click', abrirModalPago);
        }
        const btnImprimirArqueo = document.getElementById('btnImprimirArqueo');
        if (btnImprimirArqueo) {
            btnImprimirArqueo.addEventListener('click', imprimirArqueo);
        }
        const btnLogout = document.getElementById('pos-logout-button');
        if (btnLogout) {
             btnLogout.addEventListener('click', (e) => {
                 e.preventDefault();
                 if (confirm("¿Seguro que deseas cerrar sesión?")) {
                     logout();
                 }
             });
        }
    }

    // ==========================================
    // MODAL DE PAGO
    // ==========================================
    function configurarModalPago() {
        if (!metodoPagoSelect) return;

        metodoPagoSelect.addEventListener('change', (e) => {
            if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'none';
            if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'none';
            if (pagoYapeDiv) pagoYapeDiv.style.display = 'none';
            const pagoExitosoDiv = document.getElementById('pagoExitoso'); if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'none';
            const gpayContainer = document.getElementById('gpay-container'); if (gpayContainer) gpayContainer.style.display = 'none';
            googlePayToken = null;

            const metodo = e.target.value;
            const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

            if (btnConfirmarVenta) btnConfirmarVenta.disabled = false;

            if (metodo === 'efectivo') {
                if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'block';
                if (montoRecibidoInput) montoRecibidoInput.focus();
            } else if (metodo === 'tarjeta') {
                if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'block';
                const montoTarjetaEl = document.getElementById('montoTarjeta');
                if (montoTarjetaEl) montoTarjetaEl.textContent = `S/ ${total.toFixed(2)}`;
                if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;

                if (paymentsClient) {
                    setTimeout(() => { renderGooglePayButton(total); }, 100);
                } else {
                    console.warn("Google Pay no está listo.");
                }

            } else if (metodo === 'yape') {
                if (pagoYapeDiv) pagoYapeDiv.style.display = 'block';
                const montoYapeEl = document.getElementById('montoYape');
                if (montoYapeEl) montoYapeEl.textContent = `S/ ${total.toFixed(2)}`;
            }
        });

        if (montoRecibidoInput) {
            montoRecibidoInput.addEventListener('input', (e) => {
                const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                const recibido = parseFloat(e.target.value) || 0;
                const cambio = recibido - total;
                if (cambioMontoEl) cambioMontoEl.textContent = `S/ ${cambio >= 0 ? cambio.toFixed(2) : '0.00'}`;
            });
        }

        if (btnConfirmarVenta) {
            btnConfirmarVenta.addEventListener('click', confirmarPago);
        }
    }

    function abrirModalPago() {
        if (ordenActual.length === 0) {
            alert('Agrega productos a la orden primero.');
            return;
        }
        if (!modalPago) return;

        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        const pagoTotalEl = document.getElementById('pagoTotal'); if (pagoTotalEl) pagoTotalEl.textContent = `S/ ${total.toFixed(2)}`;
        if (metodoPagoSelect) metodoPagoSelect.value = 'efectivo';
        if (nombreClienteInput) nombreClienteInput.value = '';
        if (montoRecibidoInput) montoRecibidoInput.value = '';
        if (cambioMontoEl) cambioMontoEl.textContent = 'S/ 0.00';
        if (pagoEfectivoDiv) pagoEfectivoDiv.style.display = 'block';
        if (pagoTarjetaDiv) pagoTarjetaDiv.style.display = 'none';
        if (pagoYapeDiv) pagoYapeDiv.style.display = 'none';
        const pagoExitosoDiv = document.getElementById('pagoExitoso'); if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'none';
        const gpayContainer = document.getElementById('gpay-container'); if (gpayContainer) gpayContainer.style.display = 'none';
        if (btnConfirmarVenta) btnConfirmarVenta.disabled = false;
        googlePayToken = null;

        modalPago.show();
    };

    async function confirmarPago() {
        const metodoPago = metodoPagoSelect.value;
        const nombreClienteInputVal = nombreClienteInput ? nombreClienteInput.value.trim() : '';
        const nombreClienteFinal = nombreClienteInputVal || 'Cliente General';
        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        if (metodoPago === 'efectivo') {
            const montoRecibido = parseFloat(montoRecibidoInput.value);
            if (isNaN(montoRecibido) || montoRecibido < total) {
                alert('El monto recibido en efectivo debe ser mayor o igual al total.');
                return;
            }
        } else if (metodoPago === 'tarjeta' && !googlePayToken) {
            alert('Completa el pago con Google Pay o selecciona otro método.');
            return;
        }

        if (btnConfirmarVenta) {
            btnConfirmarVenta.disabled = true;
            btnConfirmarVenta.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmando...';
        }
        clearAdminError();

        const ordenData = {
            items: ordenActual.map(item => ({
                productoId: item.id,
                cantidad: item.cantidad
            })),
            nombreCliente: nombreClienteFinal,
            apellidoCliente: "",
            correoCliente: null,
            telefonoCliente: null,
            tipoComprobante: "Boleta",
            dniCliente: null,
            tipoEntrega: "Recojo en Local",
            direccionEntrega: null,
            referenciaEntrega: null,
            metodoPago: metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1),
            ...(metodoPago === 'tarjeta' && googlePayToken && {
                googlePayToken: googlePayToken
            })
        };

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/ordenes`, {
                method: 'POST',
                body: JSON.stringify(ordenData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('¡Venta realizada con éxito! Orden ID: ' + result.pedidoId);
                ordenActual = [];
                googlePayToken = null;
                renderizarOrden();
                
                // Actualizar inmediatamente la lista de órdenes
                const updatedOrders = await fetchOrdenesActualizadas();
                ordenesDelDia = updatedOrders;
                cargarOrdenesDelDiaUI(updatedOrders); 
                calcularYMostrarArqueo(updatedOrders); 

                modalPago.hide();

            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error('Error al confirmar venta POS:', error);
            showAdminError('Error al procesar la venta: ' + error.message);
        } finally {
            if (btnConfirmarVenta) {
                btnConfirmarVenta.disabled = false;
                btnConfirmarVenta.textContent = 'Confirmar Venta';
            }
        }
    };

    // ==========================================
    // MIS ÓRDENES (CORREGIDO)
    // ==========================================
    async function fetchOrdenesActualizadas() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos`);
            if (!response.ok) throw new Error("No se pudieron recargar las órdenes");
            return await response.json();
        } catch (error) {
            console.error("Error recargando órdenes:", error);
            return ordenesDelDia;
        }
    }

    function cargarOrdenesDelDiaUI(todasLasOrdenes) {
        if (!ordenesTableBodyEl) return;

        // Obtener fecha local en formato YYYY-MM-DD
        const hoy = new Date();
        const hoyStr = hoy.getFullYear() + '-' +
                       String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
                       String(hoy.getDate()).padStart(2, '0');

        console.log("Filtrando órdenes para la fecha local:", hoyStr);

        const ordenesFiltradasHoy = (todasLasOrdenes || []).filter(orden => {
            // INTENTO DE OBTENER LA FECHA: Soporta camelCase (Java default) o snake_case
            const fechaRaw = orden.fechaPedido || orden.fecha_Pedido || orden.createdAt;

            if (!fechaRaw) return false; // Si no hay fecha, ignorar

            try {
                const fechaOrden = new Date(fechaRaw);
                // Convertir fecha de orden a local YYYY-MM-DD para comparar
                const fechaOrdenStr = fechaOrden.getFullYear() + '-' +
                                      String(fechaOrden.getMonth() + 1).padStart(2, '0') + '-' +
                                      String(fechaOrden.getDate()).padStart(2, '0');

                return fechaOrdenStr === hoyStr;
            } catch (e) {
                console.warn("Fecha inválida en orden:", orden);
                return false;
            }
        });

        console.log(`Órdenes de hoy encontradas: ${ordenesFiltradasHoy.length}`);
        renderizarOrdenesTabla(ordenesFiltradasHoy);
        actualizarEstadisticas(ordenesFiltradasHoy);
    }

    function renderizarOrdenesTabla(ordenes) {
        if (!ordenesTableBodyEl) return;
        ordenesTableBodyEl.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            ordenesTableBodyEl.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No hay órdenes registradas hoy.</td></tr>';
            return;
        }

        // Ordenar las órdenes de más reciente a más antigua
        const ordenesOrdenadas = [...ordenes].sort((a, b) => {
             const fechaA = new Date(a.fechaPedido || a.fecha_Pedido || a.createdAt);
             const fechaB = new Date(b.fechaPedido || b.fecha_Pedido || b.createdAt);
             return fechaB - fechaA; 
        });

        ordenesOrdenadas.forEach(orden => {
            const fechaRaw = orden.fechaPedido || orden.fecha_Pedido || orden.createdAt;
            const fechaOrden = new Date(fechaRaw);
            const hora = fechaOrden.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const nombreCliente = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || 'General'}`.trim();
            const estadoDisplay = getEstadoDisplay(orden.estadoActual);

            const tr = document.createElement('tr');
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

        setupMisOrdenesListeners();
    }

    function getBadgeClass(estadoBackend) {
        switch (estadoBackend) {
            case 'RECIBIDO': return 'bg-secondary text-white';
            case 'EN_PREPARACION': return 'bg-info text-dark';
            case 'EN_RUTA': return 'bg-primary text-white';
            case 'ENTREGADO': return 'bg-success text-white';
            case 'CANCELADO': return 'bg-danger text-white';
            default: return 'bg-light text-dark';
        }
    }
    
    // Función auxiliar para mostrar estados legibles
    function getEstadoDisplay(estado) {
        if (!estado) return 'Desconocido';
        return estado.replace(/_/g, ' '); // Reemplaza guiones bajos por espacios
    }

    function setupMisOrdenesListeners() {
        if (!ordenesTableBodyEl._listenersAttached) {
            ordenesTableBodyEl.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.action-view-order[data-order-id]');
                if (viewBtn) {
                    const orderId = parseInt(viewBtn.dataset.orderId, 10);
                    verDetalleOrden(orderId);
                }
            });
            ordenesTableBodyEl._listenersAttached = true;
        }
    }

    function actualizarEstadisticas(ordenes) {
        const ordenesActivas = ordenes.filter(o => !o.audAnulado);
        const totalOrdenesHoy = ordenesActivas.length;
        const ventasHoy = ordenesActivas.reduce((sum, orden) => sum + (orden.total || 0), 0);

        if (totalOrdenesEl) totalOrdenesEl.textContent = totalOrdenesHoy;
        if (ventasHoyEl) ventasHoyEl.textContent = `S/ ${ventasHoy.toFixed(2)}`;
    }

    async function verDetalleOrden(ordenId) {
        if (!modalDetalleOrden) return;
        ordenSeleccionada = ordenesDelDia.find(o => o.id === ordenId);

        if (ordenSeleccionada) {
            mostrarDetalleOrden(ordenSeleccionada);
        } else {
            showAdminLoader("Cargando detalle...");
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/pedidos/${ordenId}`);
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
    window.verDetalleOrden = verDetalleOrden;

    function mostrarDetalleOrden(orden) {
        if (!detalleOrdenBodyEl || !orden) return;

        const items = orden.detalles || [];
        const nombreCliente = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || 'General'}`.trim();
        const fechaRaw = orden.fechaPedido || orden.fecha_Pedido || orden.createdAt;
        const fechaOrden = new Date(fechaRaw);
        
        const metodoPagoTexto = orden.pago?.metodo_Pago || orden.metodoPago || 'No especificado';
        const estadoDisplay = getEstadoDisplay(orden.estadoActual);

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
            if (!item || !item.producto || item.cantidad === undefined || item.subtotal === undefined) {
                return '<tr><td colspan="4">Error en item</td></tr>';
            }
            const nombreProducto = item.producto.producto || 'Producto';
            const precioUnitario = item.producto.precio || 0;
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

        modalDetalleOrden.show();
    }

    // ==========================================
    // ARQUEO DE CAJA (CORREGIDO)
    // ==========================================
    async function cargarArqueoCaja() {
        calcularYMostrarArqueo(ordenesDelDia);
    }

    function calcularYMostrarArqueo(todasLasOrdenes) {
        if (!arqueNumOrdenesEl) return;

        // Obtener fecha local en formato YYYY-MM-DD
        const hoy = new Date();
        const hoyStr = hoy.getFullYear() + '-' +
                       String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
                       String(hoy.getDate()).padStart(2, '0');

        const ordenesHoyActivas = (todasLasOrdenes || []).filter(orden => {
            if (orden.audAnulado) return false;
            
            // INTENTO DE OBTENER LA FECHA (Igual que en Mis Órdenes)
            const fechaRaw = orden.fechaPedido || orden.fecha_Pedido || orden.createdAt;
            if (!fechaRaw) return false;

            try {
                const fechaOrden = new Date(fechaRaw);
                const fechaOrdenStr = fechaOrden.getFullYear() + '-' +
                                      String(fechaOrden.getMonth() + 1).padStart(2, '0') + '-' +
                                      String(fechaOrden.getDate()).padStart(2, '0');
                
                return fechaOrdenStr === hoyStr;
            } catch (e) { return false; }
        });

        const numOrdenes = ordenesHoyActivas.length;
        let efectivo = 0, tarjeta = 0, yape = 0;

        ordenesHoyActivas.forEach(orden => {
            const total = orden.total || 0;
            // Verificar donde está el método de pago
            let metodo = (orden.pago?.metodo_Pago || orden.metodoPago || 'Efectivo').toLowerCase();

            if (metodo.includes('tarjeta')) metodo = 'tarjeta';
            else if (metodo.includes('yape') || metodo.includes('plin')) metodo = 'yape';
            else metodo = 'efectivo';

            switch (metodo) {
                case 'efectivo': efectivo += total; break;
                case 'tarjeta': tarjeta += total; break;
                case 'yape': yape += total; break;
                default: efectivo += total;
            }
        });

        const totalCaja = efectivo + tarjeta + yape;

        arqueNumOrdenesEl.textContent = numOrdenes;
        arqueEfectivoEl.textContent = `S/ ${efectivo.toFixed(2)}`;
        arqueTarjetaEl.textContent = `S/ ${tarjeta.toFixed(2)}`;
        arqueYapeEl.textContent = `S/ ${yape.toFixed(2)}`;
        arqueTotalCajaEl.textContent = `S/ ${totalCaja.toFixed(2)}`;
    }

    function imprimirArqueo() {
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
          </div> <script>window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); }; }</script> </body> </html>`);
        ventanaImpresion.document.close();
    };
    window.imprimirArqueo = imprimirArqueo;

    function inicializarNavegacion() {
        const menuItems = document.querySelectorAll('.menu-item'); const sections = document.querySelectorAll('.pos-section'); const sidebar = document.getElementById('posSidebar'); const toggleBtn = document.getElementById('sidebarToggle'); if (!menuItems.length || !sections.length || !sidebar || !toggleBtn) return; menuItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); const target = item.getAttribute('data-target'); menuItems.forEach(mi => mi.classList.remove('active')); sections.forEach(sec => sec.classList.remove('active')); item.classList.add('active'); const targetSection = document.getElementById(`section-${target}`); if (targetSection) targetSection.classList.add('active'); if (window.innerWidth <= 768) { sidebar.classList.remove('active'); } }); }); toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('active'); }); document.addEventListener('click', (e) => { if (window.innerWidth <= 768) { const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target); if (!isClickInside && sidebar.classList.contains('active')) { sidebar.classList.remove('active'); } } });
    }

    init();
});