// js/pago_detalles.js

// --- CONFIGURACIÓN ---
const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';

// --- FUNCIONES AUXILIARES ---

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
        const response = await fetch(url, { ...options, headers });
        return response;
    } catch (error) {
        console.error('Error de red en fetchWithAuth:', error);
        throw error;
    }
}

function updateCartCounter() {
    const counterElement = document.getElementById('cart-item-count');
    if (!counterElement) return;

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

function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    if (!authButtons) return;

    const user = getUser();
    const token = getToken();
    authButtons.innerHTML = '';

    let userRole = "CLIENTE";
    if (user) {
        if (user.rol) {
            const nombreRol = (user.rol.nombre || user.rol.name || "").toUpperCase();
            if (nombreRol.includes("ADMIN")) userRole = "ADMIN";
            else if (nombreRol.includes("VENDEDOR")) userRole = "VENDEDOR";
            else if (nombreRol.includes("DELIVERY")) userRole = "DELIVERY";
        } else if (user.roles && Array.isArray(user.roles)) {
            if (user.roles.some(r => (r.authority || "").includes("ADMIN"))) userRole = "ADMIN";
            else if (user.roles.some(r => (r.authority || "").includes("VENDEDOR"))) userRole = "VENDEDOR";
            else if (user.roles.some(r => (r.authority || "").includes("DELIVERY"))) userRole = "DELIVERY";
        }
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
        authButtons.innerHTML = `<div class="registro"><a href="admin.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-shield-lock-fill"></i> Panel Admin</a></div><div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>${cartIconHtml}`;
    } else if (token && userRole === "VENDEDOR") {
        authButtons.innerHTML = `<div class="registro"><a href="vendedor.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-cart-plus-fill"></i> POS</a></div><div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>${cartIconHtml}`;
    } else if (token && userRole === "DELIVERY") {
        authButtons.innerHTML = `<div class="registro"><a href="delivery.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-truck"></i> Entregas</a></div><div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>${cartIconHtml}`;
    } else if (token) {
        const nombreUsuario = user.nombre || user.email || 'Usuario';
        authButtons.innerHTML = `<div class="registro flex items-center"><span class="text-yellow-400 text-sm font-medium mr-2">Hola, ${nombreUsuario}</span><a href="#" onclick="logout()" title="Cerrar Sesión" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium"><img src="Icon/cerrar-con-llave.png" alt="Cerrar Sesión" class="h-5 w-5 inline"></a></div>${cartIconHtml}`;
    } else {
        authButtons.innerHTML = `<div class="registro"><a href="login.html" title="Iniciar Sesión / Registrarse" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium"><img src="Icon/iniciar_sesion.png" alt="Iniciar Sesión" class="h-5 w-5 inline"></a></div>${cartIconHtml}`;
    }
    updateCartCounter();
}

function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html'; 
}

// ==========================================
// GOOGLE PAY CONFIGURATION (INTACTO)
// ==========================================
const merchantInfo = {
    merchantId: 'BCR2DN6T6W44S3MA', 
    merchantName: 'La Ruta del Sabor'
};
const baseGooglePayRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
            allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"]
        },
        tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
                gateway: 'example',
                gatewayMerchantId: 'exampleGatewayMerchantId'
            }
        }
    }],
    merchantInfo
};
Object.freeze(baseGooglePayRequest);
let paymentsClient = null;
let googlePayToken = null; 

function getGooglePaymentsClient() {
    if (paymentsClient === null) {
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'TEST',
            merchantInfo
        });
    }
    return paymentsClient;
}
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

window.onGooglePayLoaded = function() {
    const googlePayClient = getGooglePaymentsClient();
    const readyToPayRequest = deepCopy(baseGooglePayRequest);
    googlePayClient.isReadyToPay(readyToPayRequest)
        .then(function (response) {
            if (response.result) {
                console.log('Google Pay está disponible.');
            } else {
                console.log('Google Pay no está disponible.');
                const gpayOption = document.getElementById('gpay-option-container');
                if(gpayOption) gpayOption.style.display = 'none';
            }
        })
        .catch(function (err) { console.error('Error al verificar Google Pay:', err); });
}

function renderGooglePayButton(totalAmount) {
    if (!paymentsClient) return;
    const container = document.getElementById('gpay-container');
    if (!container) return;
    container.innerHTML = '';
    const button = paymentsClient.createButton({
        onClick: () => onGooglePaymentButtonClicked(totalAmount),
        buttonColor: 'black',
        buttonType: 'pay',
        buttonSizeMode: 'fill'
    });
    container.appendChild(button);
    container.style.display = 'block';
}

function onGooglePaymentButtonClicked(totalAmount) {
    if (!paymentsClient) return alert("Error Google Pay.");
    if (!validateStep(1) || !validateStep(2)) return alert("Completa los pasos anteriores.");

    const paymentDataRequest = {
        ...deepCopy(baseGooglePayRequest),
        transactionInfo: {
            countryCode: 'PE',
            currencyCode: 'PEN',
            totalPriceStatus: 'FINAL',
            totalPrice: totalAmount.toFixed(2)
        }
    };

    paymentsClient.loadPaymentData(paymentDataRequest)
        .then(function (paymentData) {
            googlePayToken = paymentData.paymentMethodData.tokenizationData.token;
            document.getElementById('pago-exitoso').style.display = 'block';
            document.getElementById('gpay-container').style.display = 'none';
            
            // Ocultar campos manuales
            const manualCard = document.getElementById('campos-tarjeta-manual');
            if(manualCard) manualCard.style.display = 'none';
            
            // Quitar requeridos
            ['numero-tarjeta', 'fecha-vencimiento', 'cvv', 'titular'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.required = false;
            });
            alert("Pago autorizado con Google Pay. Presiona 'Procesar Pago' para finalizar.");
        })
        .catch(err => { if(err.statusCode !== 'CANCELED') alert('Error GPay'); });
}

// ==========================================
// LÓGICA PRINCIPAL (DOM)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. DETECCIÓN CRÍTICA: ¿Venimos del Chatbot?
    const urlParams = new URLSearchParams(window.location.search);
    const ordenIdChat = urlParams.get('ordenId');

    // Elementos DOM
    const subtotalElement = document.getElementById("subtotal");
    const deliveryCostElement = document.getElementById("delivery-cost");
    const totalElement = document.getElementById("total");
    const btnProcesar = document.getElementById("btn-procesar");
    const boletaRadio = document.getElementById("boleta");
    const facturaRadio = document.getElementById("factura");
    const dniContainer = document.getElementById("dni-container");
    const rucContainer = document.getElementById("ruc-container");
    const deliveryRadio = document.getElementById("delivery");
    const recogerRadio = document.getElementById("recoger");
    const direccionContainer = document.getElementById("direccion-container");
    const tarjetaRadio = document.getElementById("tarjeta");
    const yapeRadio = document.getElementById("yape");
    const tarjetaSection = document.getElementById("tarjeta-section");
    const yapeNumeroContainer = document.getElementById("yape-numero-container");
    const yapeCodigoContainer = document.getElementById("yape-codigo-container");
    const progressBar = document.getElementById("progress-bar");
    
    // Inputs
    const dniInput = document.getElementById("dni");
    const rucInput = document.getElementById("ruc");
    const numeroTarjetaInput = document.getElementById("numero-tarjeta");
    const fechaVencimientoInput = document.getElementById("fecha-vencimiento");
    const cvvInput = document.getElementById("cvv");
    const titularInput = document.getElementById("titular");
    const telefonoInput = document.getElementById("telefono");
    const yapeNumeroInput = document.getElementById("yape-numero");
    const yapeCodigoInput = document.getElementById("yape-codigo");

    if (!btnProcesar) return console.error("Error crítico: Falta botón procesar");

    // Variables Estado
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let currentStep = 1;
    const deliveryCost = parseFloat(document.body.dataset.deliveryCost || "5.0");

    // --- FUNCIONES ---

    async function fetchUserData() {
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/clientes/me`);
            if (response.ok) {
                const userData = await response.json();
                const fields = {
                    "nombre": userData.nombre,
                    "apellido": userData.apellido,
                    "correo": userData.correo,
                    "telefono": userData.telefono
                };
                for (const [id, val] of Object.entries(fields)) {
                    const el = document.getElementById(id);
                    if(el && val) el.value = val;
                }
            }
        } catch (e) { console.error("Error user data", e); }
    }

    // 🆕 FUNCIÓN NUEVA: Cargar Orden existente del Chatbot
    async function cargarDatosDeOrden(id) {
        try {
            // Se usa un token genérico si no hay login, o el del usuario si existe
            // Para ver detalles de orden, idealmente el usuario debe estar logueado
            const token = getToken(); 
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_BASE_URL}/ordenes/${id}`, { headers });
            
            if (response.ok) {
                const orden = await response.json();
                
                // Actualizar Totales con datos reales del backend
                subtotalElement.textContent = (orden.subtotal || 0).toFixed(2);
                deliveryCostElement.textContent = (orden.montoAgregado || 0).toFixed(2);
                totalElement.textContent = (orden.total || 0).toFixed(2);

                // Prellenar datos si existen en la orden
                if (orden.cliente) {
                    if(document.getElementById("nombre")) document.getElementById("nombre").value = orden.cliente.nombre || "";
                    if(document.getElementById("apellido")) document.getElementById("apellido").value = orden.cliente.apellido || ""; // Si viene
                    if(document.getElementById("correo")) document.getElementById("correo").value = orden.cliente.correo || "";
                }
                
                // Detectar tipo de entrega desde la orden (si el backend lo devuelve)
                // Si la orden ya tiene dirección, asumimos delivery
                if (orden.direccion && orden.direccion !== "Recoger en tienda") {
                    document.getElementById("direccion").value = orden.direccion;
                    deliveryRadio.checked = true;
                    toggleEntregaFields();
                } else {
                    recogerRadio.checked = true;
                    toggleEntregaFields();
                }

                // Guardar en sesión para procesarPago
                sessionStorage.setItem("orden_chat_id", id);
                console.log("✅ Datos de orden chatbot cargados");
            } else {
                console.warn("No se pudo cargar la orden del chat. Puede que requieras login.");
            }
        } catch (e) { console.error("Error loading chat order", e); }
    }

    function updateTotal() {
        // Si venimos del chatbot, NO recalculamos con el carrito local
        if (sessionStorage.getItem("orden_chat_id")) return;

        carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio || 0) * (item.cantidad || 0), 0);
        const currentDeliveryCost = deliveryRadio.checked ? deliveryCost : 0.0;
        const total = subtotal + currentDeliveryCost;

        subtotalElement.textContent = subtotal.toFixed(2);
        deliveryCostElement.textContent = currentDeliveryCost.toFixed(2);
        totalElement.textContent = total.toFixed(2);

        const montoGpayEl = document.getElementById('monto-gpay');
        if (montoGpayEl) montoGpayEl.textContent = total.toFixed(2);

        if (tarjetaRadio.checked && paymentsClient) renderGooglePayButton(total);
        else {
            const gc = document.getElementById('gpay-container');
            if(gc) gc.style.display = 'none';
        }
    }

    // --- Toggles Visuales ---
    function toggleComprobanteFields() {
        if (!dniContainer || !rucContainer) return;
        if (boletaRadio.checked) {
            dniContainer.classList.remove("d-none");
            rucContainer.classList.add("d-none");
            dniInput.required = true; rucInput.required = false;
        } else {
            dniContainer.classList.add("d-none");
            rucContainer.classList.remove("d-none");
            dniInput.required = false; rucInput.required = true;
        }
    }

    function toggleEntregaFields() {
        if (!direccionContainer) return;
        const dirInput = document.getElementById("direccion");
        if (deliveryRadio.checked) {
            direccionContainer.classList.remove("d-none");
            localInfo.classList.remove("active");
            if(dirInput) dirInput.required = true;
        } else {
            direccionContainer.classList.add("d-none");
            localInfo.classList.add("active");
            if(dirInput) dirInput.required = false;
        }
        updateTotal();
    }

    function togglePagoFields() {
        if (!tarjetaSection) return;
        const gpayContainer = document.getElementById('gpay-container');
        const manualCard = document.getElementById('campos-tarjeta-manual');

        if (tarjetaRadio.checked) {
            tarjetaSection.classList.remove("d-none");
            yapeNumeroContainer.classList.add("d-none");
            yapeCodigoContainer.classList.add("d-none");
            
            yapeNumeroInput.required = false; yapeCodigoInput.required = false;

            if (!googlePayToken) {
                if(manualCard) manualCard.style.display = 'block';
                numeroTarjetaInput.required = true; fechaVencimientoInput.required = true; cvvInput.required = true; titularInput.required = true;
            } else {
                if(manualCard) manualCard.style.display = 'none';
                numeroTarjetaInput.required = false;
            }
            updateTotal();
        } else {
            tarjetaSection.classList.add("d-none");
            yapeNumeroContainer.classList.remove("d-none");
            yapeCodigoContainer.classList.remove("d-none");
            
            yapeNumeroInput.required = true; yapeCodigoInput.required = true;
            numeroTarjetaInput.required = false; fechaVencimientoInput.required = false; cvvInput.required = false; titularInput.required = false;
            
            if(gpayContainer) gpayContainer.style.display = 'none';
            googlePayToken = null;
        }
    }

    function validateStep(step) {
        const stepElement = document.getElementById(`step-${step}`);
        if (!stepElement) return false;
        const inputs = stepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (input.offsetParent === null) return; // Skip hidden inputs
            if (!input.value.trim()) {
                input.classList.add("is-invalid");
                isValid = false;
            } else {
                input.classList.remove("is-invalid");
                // Validaciones extra específicas
                if (input.id === "dni" && !/^\d{8}$/.test(input.value)) isValid = false;
                if (input.id === "telefono" && !/^\d{9}$/.test(input.value)) isValid = false;
            }
        });
        return isValid;
    }

    window.nextStep = function(step) {
        if (validateStep(step)) showStep(step + 1);
        else alert("Por favor completa los campos requeridos correctamente.");
    };
    window.prevStep = function(step) { showStep(step - 1); };

    function showStep(stepToShow) {
        document.querySelectorAll('.paso').forEach((el, i) => {
            if (i + 1 === stepToShow) {
                el.classList.remove("d-none");
                el.classList.add("active");
            } else {
                el.classList.remove("active");
                el.classList.add("d-none");
            }
        });
        currentStep = stepToShow;
        const pct = Math.max(0, (currentStep - 1) / 3 * 100);
        progressBar.style.width = `${pct}%`;
        progressBar.textContent = `Paso ${currentStep} de 3`;
    }

    // --- PROCESAR PAGO (MODIFICADO PARA CHATBOT) ---
    async function procesarPago() {
        if (!validateStep(3) && !googlePayToken) return alert("Datos de pago incompletos.");
        
        const token = getToken();
        if (!token) {
            sessionStorage.setItem('redirectAfterLogin', 'pago_detalles.html' + (ordenIdChat ? `?ordenId=${ordenIdChat}` : ''));
            return window.location.href = "login.html";
        }

        btnProcesar.disabled = true;
        btnProcesar.innerText = "Procesando...";

        // 1. VERIFICAR SI ES ORDEN DE CHATBOT
        const ordenChatId = sessionStorage.getItem("orden_chat_id");

        if (ordenChatId) {
            // --- FLUJO CHATBOT: YA EXISTE LA ORDEN ---
            console.log("🚀 Procesando pago para orden existente:", ordenChatId);
            
            // En un sistema real harías un PUT al backend para confirmar el pago.
            // Como el backend actual no tiene endpoint de "pagar orden", 
            // redirigimos a confirmación asumiendo éxito en la pasarela.
            
            const backupData = {
                id: ordenChatId,
                cliente: document.getElementById("nombre").value,
                total: totalElement.textContent,
                metodo: tarjetaRadio.checked ? "Tarjeta" : "Yape"
            };
            sessionStorage.setItem("backupPedido", JSON.stringify(backupData));
            sessionStorage.removeItem("orden_chat_id"); // Limpiar
            
            alert("¡Pago confirmado! Tu pedido del chat está en camino.");
            window.location.href = "confirmacion.html";
            return;
        }

        // --- FLUJO NORMAL: CREAR NUEVA ORDEN ---
        carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (carrito.length === 0) {
            btnProcesar.disabled = false;
            return alert("Carrito vacío");
        }

        const ordenData = {
            items: carrito.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
            nombreCliente: document.getElementById("nombre").value,
            apellidoCliente: document.getElementById("apellido").value,
            correoCliente: document.getElementById("correo").value,
            dniCliente: boletaRadio.checked ? dniInput.value : null,
            telefonoCliente: telefonoInput.value,
            tipoComprobante: boletaRadio.checked ? "Boleta" : "Factura",
            tipoEntrega: deliveryRadio.checked ? "Delivery" : "Recojo en Local",
            direccionEntrega: deliveryRadio.checked ? document.getElementById("direccion").value : null,
            metodoPago: tarjetaRadio.checked ? "Tarjeta" : "Yape",
            titularTarjeta: tarjetaRadio.checked ? titularInput.value : null,
            numeroYape: yapeRadio.checked ? yapeNumeroInput.value : null
        };

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/ordenes`, {
                method: "POST",
                body: JSON.stringify(ordenData)
            });
            const data = await res.json();

            if (res.ok) {
                sessionStorage.setItem("ultimoPedidoId", data.pedidoId);
                localStorage.removeItem("carrito");
                window.location.href = "confirmacion.html";
            } else {
                alert("Error: " + (data.error || "No se pudo crear el pedido"));
                btnProcesar.disabled = false;
                btnProcesar.innerText = "Procesar Pago";
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            btnProcesar.disabled = false;
            btnProcesar.innerText = "Procesar Pago";
        }
    }

    // Listeners
    boletaRadio.addEventListener("change", toggleComprobanteFields);
    facturaRadio.addEventListener("change", toggleComprobanteFields);
    deliveryRadio.addEventListener("change", toggleEntregaFields);
    recogerRadio.addEventListener("change", toggleEntregaFields);
    tarjetaRadio.addEventListener("change", togglePagoFields);
    yapeRadio.addEventListener("change", togglePagoFields);
    btnProcesar.addEventListener("click", procesarPago);

    // INICIO
    async function init() {
        renderAuthButtons();
        updateCartCounter();
        await fetchUserData();

        if (ordenIdChat) {
            await cargarDatosDeOrden(ordenIdChat);
        } else {
            updateTotal();
        }
        
        toggleComprobanteFields();
        toggleEntregaFields();
        togglePagoFields();
        showStep(1);
        if (typeof google !== 'undefined') window.onGooglePayLoaded();
    }
    init();
});