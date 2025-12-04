// js/pago_detalles.js

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
    // Busca el span que creamos en renderAuthButtons
    const counterElement = document.getElementById('cart-item-count');
    if (!counterElement) {
        return;
    }

    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    // Suma las cantidades de todos los items
    const totalItems = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    if (totalItems > 0) {
        counterElement.textContent = totalItems;
        counterElement.style.display = 'flex'; // Usar flex para centrar
    } else {
        counterElement.textContent = '0';
        counterElement.style.display = 'none'; // Ocultar si es cero
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

    // HTML del icono del carrito (con el badge)
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

    // Actualizar el contador después de renderizar los botones
    updateCartCounter();
}

/**
 * Función de Logout
 */
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // En la página de pago, redirigir al index o login al cerrar sesión
    window.location.href = 'index.html'; 
}


// ==========================================
// GOOGLE PAY CONFIGURATION (Sin cambios funcionales)
// ==========================================
const merchantInfo = {
    merchantId: 'BCR2DN6T6W44S3MA', // ¡USA TU MERCHANT ID REAL DE GOOGLE PAY!
    merchantName: 'La Ruta del Sabor'
};
const baseGooglePayRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
            allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"] // Ajusta según tus necesidades
        },
        tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
                gateway: 'example', // ¡USA TU GATEWAY REAL (ej. 'stripe')!
                gatewayMerchantId: 'exampleGatewayMerchantId' // ¡USA TU MERCHANT ID DEL GATEWAY!
                // Para Stripe, necesitarías algo como:
                // gateway: 'stripe',
                // 'stripe:version': '2020-08-27', // Usa una versión de API de Stripe
                // 'stripe:publishableKey': 'pk_test_TU_STRIPE_PUBLISHABLE_KEY' // Tu clave publicable de Stripe (TEST o PROD)
            }
        }
    }],
    merchantInfo
};
Object.freeze(baseGooglePayRequest);
let paymentsClient = null;
let googlePayToken = null; // Guardará el token si se usa Google Pay

function getGooglePaymentsClient() {
    if (paymentsClient === null) {
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'TEST', // Cambiar a 'PRODUCTION' al desplegar
            merchantInfo: { // Asegúrate que la info aquí sea consistente
                merchantId: merchantInfo.merchantId, // Usa el ID definido arriba
                merchantName: merchantInfo.merchantName
            }
        });
    }
    return paymentsClient;
}
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

// Se llama cuando la API de Google Pay está cargada
window.onGooglePayLoaded = function() {
    const googlePayClient = getGooglePaymentsClient();
    const readyToPayRequest = deepCopy(baseGooglePayRequest);

    googlePayClient.isReadyToPay(readyToPayRequest)
        .then(function (response) {
            if (response.result) {
                console.log('Google Pay está disponible.');
                // El botón se renderizará dinámicamente si se selecciona tarjeta
            } else {
                console.log('Google Pay no está disponible.');
                const gpayOptionContainer = document.getElementById('gpay-option-container'); 
                if (gpayOptionContainer) gpayOptionContainer.style.display = 'none';
            }
        })
        .catch(function (err) {
            console.error('Error al verificar Google Pay:', err);
        });
}
// Renderiza el botón de Google Pay
function renderGooglePayButton(totalAmount) {
    if (!paymentsClient) { // Asegurarse que esté inicializado
        console.warn("Google Payments Client no inicializado al intentar renderizar botón.");
        return;
    }
    const container = document.getElementById('gpay-container');
    if (!container) return; // Salir si no existe
    container.innerHTML = ''; // Limpiar botón anterior

    const button = paymentsClient.createButton({
        onClick: () => onGooglePaymentButtonClicked(totalAmount),
        buttonColor: 'black', // O 'white'
        buttonType: 'pay',   // O 'buy', 'checkout', etc.
        buttonSizeMode: 'fill'
    });

    container.appendChild(button);
    container.style.display = 'block'; // Mostrar contenedor
    container.classList.add('active'); // Mantener tu lógica de clase si es necesaria
}

// Se llama al hacer clic en el botón de Google Pay
function onGooglePaymentButtonClicked(totalAmount) {
    if (!paymentsClient) {
        alert("Error al inicializar Google Pay. Intenta de nuevo.");
        return;
    }

    // Validar paso 1 y 2 antes de mostrar Google Pay
    if (!validateStep(1) || !validateStep(2)) {
        alert("Por favor, completa los detalles del cliente y la entrega antes de pagar.");
        // Opcional: Navegar al paso inválido
        // showStep(1); // Necesitarías una función showStep(stepNum)
        return;
    }


    const transactionInfo = {
        countryCode: 'PE', // Código de país
        currencyCode: 'PEN', // Código de moneda
        totalPriceStatus: 'FINAL',
        totalPrice: totalAmount.toFixed(2), // Precio total formateado
        // Opcional: Desglose de precios
        // displayItems: [
        //   { label: "Subtotal", price: subtotalCalculado.toFixed(2), type: "SUBTOTAL" },
        //   { label: "Envío", price: costoDeliveryCalculado.toFixed(2), type: "SHIPPING" }
        // ]
    };

    const paymentDataRequest = {
        ...deepCopy(baseGooglePayRequest),
        transactionInfo: transactionInfo
    };

    console.log('Solicitud Google Pay:', paymentDataRequest);

    paymentsClient.loadPaymentData(paymentDataRequest)
        .then(function (paymentData) {
            console.log('Respuesta Google Pay:', paymentData);
            // Extraer el token de pago
            const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
            googlePayToken = paymentToken; // Guardar token para enviarlo al backend
            console.log('Token Google Pay obtenido:', googlePayToken);

            // Actualizar UI para mostrar éxito y ocultar/deshabilitar campos manuales
            const pagoExitosoDiv = document.getElementById('pago-exitoso');
            const gpayContainer = document.getElementById('gpay-container');
            const camposTarjeta = document.getElementById('campos-tarjeta-manual'); // Contenedor de los campos manuales

            if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'block'; // Mostrar mensaje éxito GPay
            if (gpayContainer) gpayContainer.style.display = 'none'; // Ocultar botón GPay
            if (camposTarjeta) camposTarjeta.style.display = 'none'; // Ocultar campos manuales

            // Marcar campos manuales como no requeridos ya que se usó GPay
            document.getElementById('numero-tarjeta').required = false;
            document.getElementById('fecha-vencimiento').required = false;
            document.getElementById('cvv').required = false;
            document.getElementById('titular').required = false;

            // Opcional: Habilitar botón "Procesar Pago" si estaba deshabilitado
            // const btnProcesar = document.getElementById("btn-procesar");
            // if(btnProcesar) btnProcesar.disabled = false;

            alert("Pago con Google Pay autorizado. Haz clic en 'Procesar Pago' para confirmar tu orden.");


        })
        .catch(function (err) {
            console.error('Error en Google Pay:', err);
            // Manejar errores comunes (ej. usuario canceló)
            if (err.statusCode !== 'CANCELED') {
                alert('Error al procesar el pago con Google Pay. Verifica los detalles o ingresa los datos manualmente.');
            }
            googlePayToken = null; // Limpiar token si falla
        });
}

// ==========================================
// SISTEMA DE PAGO - PAGO_DETALLES.JS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // --- Selección de elementos del DOM (igual que antes) ---
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
    const referenciaContainer = document.getElementById("referencia-container");
    const localInfo = document.getElementById("local-info");
    const tarjetaRadio = document.getElementById("tarjeta");
    const yapeRadio = document.getElementById("yape");
    const tarjetaSection = document.getElementById("tarjeta-section");
    const yapeNumeroContainer = document.getElementById("yape-numero-container");
    const yapeCodigoContainer = document.getElementById("yape-codigo-container"); // Asumo que existe para código Yape
    const progressBar = document.getElementById("progress-bar");
    const dniInput = document.getElementById("dni");
    const rucInput = document.getElementById("ruc");
    const numeroTarjetaInput = document.getElementById("numero-tarjeta");
    const fechaVencimientoInput = document.getElementById("fecha-vencimiento");
    const cvvInput = document.getElementById("cvv"); // Añadido
    const titularInput = document.getElementById("titular"); // Añadido
    const telefonoInput = document.getElementById("telefono");
    const yapeNumeroInput = document.getElementById("yape-numero"); // Añadido
    const yapeCodigoInput = document.getElementById("yape-codigo"); // Añadido

    // Verificar si todos los elementos existen
    if (!subtotalElement || !deliveryCostElement || !totalElement || !btnProcesar ||
        !boletaRadio || !facturaRadio || !dniContainer || !rucContainer ||
        !deliveryRadio || !recogerRadio || !direccionContainer || !referenciaContainer || !localInfo ||
        !tarjetaRadio || !yapeRadio || !tarjetaSection || !yapeNumeroContainer || !yapeCodigoContainer ||
        !progressBar || !dniInput || !rucInput || !numeroTarjetaInput || !fechaVencimientoInput || !cvvInput || !titularInput || !telefonoInput ||
        !yapeNumeroInput || !yapeCodigoInput) {
        console.error("Error: Faltan uno o más elementos del formulario de pago en el DOM.");
        alert("Error al cargar la página de pago. Por favor, recarga.");
        return;
    }


    // --- Variables de estado ---
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let currentStep = 1;
    // MODIFICADO: Leer costo de delivery desde config o usar default
    const deliveryCost = parseFloat(document.body.dataset.deliveryCost || "5.0"); // Lee de <body data-delivery-cost="5.0"> o usa 5.0

    // --- Funciones ---

    /**
     * MODIFICADO: Precarga datos del usuario desde backend (/api/clientes/me)
     */
   async function fetchUserData() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/clientes/me`);
        if (response.ok) {
            const userData = await response.json();
            
            // Llenar campos con protección contra nulos
            const inputs = {
                nombre: document.getElementById("nombre"),
                apellido: document.getElementById("apellido"),
                correo: document.getElementById("correo"),
                telefono: document.getElementById("telefono")
            };

            if(inputs.nombre) inputs.nombre.value = userData.nombre || "";
            if(inputs.apellido) inputs.apellido.value = userData.apellido || "";
            if(inputs.correo) inputs.correo.value = userData.correo || "";
            
            // Manejo especial para teléfono (puede venir como número o texto)
            if(inputs.telefono && userData.telefono) {
                 inputs.telefono.value = userData.telefono;
            }
        } else {
            console.warn("No se pudieron cargar datos del usuario (Posible error de permisos o token vencido).");
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
    }
}

    /**
     * MODIFICADO: Actualiza subtotal, costo de envío y total. Prepara GPay si aplica.
     */
    function updateTotal() {
        carrito = JSON.parse(localStorage.getItem("carrito")) || []; // Recargar carrito por si acaso
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio || 0) * (item.cantidad || 0), 0);
        const currentDeliveryCost = deliveryRadio.checked ? deliveryCost : 0.0;
        const total = subtotal + currentDeliveryCost;

        subtotalElement.textContent = subtotal.toFixed(2);
        deliveryCostElement.textContent = currentDeliveryCost.toFixed(2);
        totalElement.textContent = total.toFixed(2);

        // Actualizar monto para Google Pay si el contenedor existe
        const montoGpayEl = document.getElementById('monto-gpay');
        if (montoGpayEl) montoGpayEl.textContent = total.toFixed(2);

        // Renderizar/Actualizar botón Google Pay si método es tarjeta y GPay está disponible
        if (tarjetaRadio.checked && paymentsClient) { // Verifica si GPay client está listo
            renderGooglePayButton(total);
        } else {
            // Ocultar GPay si no es tarjeta o no está disponible
            const gpayContainer = document.getElementById('gpay-container');
            if (gpayContainer) gpayContainer.style.display = 'none';
        }
    }

    // --- Funciones toggleFields (Sin cambios funcionales, solo validaciones de elementos) ---
    function toggleComprobanteFields() {
        if (!dniContainer || !rucContainer || !dniInput || !rucInput) return;
        if (boletaRadio.checked) {
            dniContainer.classList.remove("d-none");
            rucContainer.classList.add("d-none");
            dniInput.required = true;
            rucInput.required = false;
            rucInput.value = ''; // Limpiar campo no requerido
        } else {
            dniContainer.classList.add("d-none");
            rucContainer.classList.remove("d-none");
            dniInput.required = false;
            rucInput.required = true;
            dniInput.value = ''; // Limpiar campo no requerido
        }
    }
    function toggleEntregaFields() {
        if (!direccionContainer || !referenciaContainer || !localInfo || !document.getElementById("direccion") || !document.getElementById("referencia")) return;
        if (deliveryRadio.checked) {
            direccionContainer.classList.remove("d-none");
            referenciaContainer.classList.remove("d-none");
            localInfo.classList.remove("active"); // Asume que 'active' lo muestra
            document.getElementById("direccion").required = true;
            // Referencia es opcional generalmente
            document.getElementById("referencia").required = false;
        } else {
            direccionContainer.classList.add("d-none");
            referenciaContainer.classList.add("d-none");
            localInfo.classList.add("active");
            document.getElementById("direccion").required = false;
            document.getElementById("referencia").required = false;
            // Limpiar campos no requeridos
            document.getElementById("direccion").value = '';
            document.getElementById("referencia").value = '';
        }
        updateTotal(); // Recalcular total al cambiar entrega
    }
    function togglePagoFields() {
        if (!tarjetaSection || !yapeNumeroContainer || !yapeCodigoContainer || !yapeNumeroInput || !yapeCodigoInput || !numeroTarjetaInput || !fechaVencimientoInput || !cvvInput || !titularInput) return;

        const gpayContainer = document.getElementById('gpay-container');
        const pagoExitosoDiv = document.getElementById('pago-exitoso');
        const camposTarjetaManual = document.getElementById('campos-tarjeta-manual');

        if (tarjetaRadio.checked) {
            // --- MODO TARJETA ---
                tarjetaSection.classList.remove("d-none");
                yapeNumeroContainer.classList.add("d-none", "oculto");
                yapeCodigoContainer.classList.add("d-none", "oculto");
                
                // Desactivar validación de Yape
                yapeNumeroInput.required = false;
                yapeCodigoInput.required = false; 
                yapeNumeroInput.value = '';
                yapeCodigoInput.value = '';


            // Habilitar campos de tarjeta manual SOLO si NO se usó GPay
            if (!googlePayToken) {
                if (camposTarjetaManual) camposTarjetaManual.style.display = 'block';
                numeroTarjetaInput.required = true;
                fechaVencimientoInput.required = true;
                cvvInput.required = true;
                titularInput.required = true;
            } else {
                // Si ya se usó GPay, mantener ocultos los campos manuales
                if (camposTarjetaManual) camposTarjetaManual.style.display = 'none';
                numeroTarjetaInput.required = false;
                fechaVencimientoInput.required = false;
                cvvInput.required = false;
                titularInput.required = false;
            }


            // Renderizar/Actualizar botón Google Pay (updateTotal lo hará)
            updateTotal();


        } else { // Si es Yape
            tarjetaSection.classList.add("d-none");
            
            // MOSTRAR sección de Yape (Corrección aquí)
            yapeNumeroContainer.classList.remove("d-none", "oculto"); // <--- AGREGA "oculto"
            yapeCodigoContainer.classList.remove("d-none", "oculto"); // <--- AGREGA "oculto"
            
            yapeNumeroInput.required = true;
            yapeCodigoInput.required = true;

            // LDesactivar validación de Tarjeta ---
            numeroTarjetaInput.required = false;
            fechaVencimientoInput.required = false;
            cvvInput.required = false;
            titularInput.required = false;
            // Limpiar campos Tarjeta
            numeroTarjetaInput.value = '';
            fechaVencimientoInput.value = '';
            cvvInput.value = '';
            titularInput.value = '';

            // Ocultar Google Pay y mensaje de éxito GPay
            if (gpayContainer) gpayContainer.style.display = 'none';
            if (pagoExitosoDiv) pagoExitosoDiv.style.display = 'none';

            // Resetear token GPay por si cambian de opinión
            googlePayToken = null;
        }
    }

    // --- Validación y Navegación Multi-paso (Sin cambios funcionales, solo mejoras leves) ---
    function validateStep(step) {
        const stepElement = document.getElementById(`step-${step}`);
        if (!stepElement) return false;
        const inputs = stepElement.querySelectorAll('input[required], select[required]'); // Incluir selects si los usas
        let isValid = true;
        let firstInvalidInput = null;

        inputs.forEach(input => {
            if (input.offsetParent === null) {
            return; // Saltar este input
        }
            // Resetear validación personalizada
            input.setCustomValidity("");
            input.classList.remove("is-invalid");
            
            let inputValid = true;
            if (!input.value.trim()) {
                inputValid = false;
                input.setCustomValidity("Este campo es obligatorio.");
            } else {
                // Validaciones específicas
                if (input.id === "dni" && !/^\d{8}$/.test(input.value.trim())) {
                    inputValid = false; input.setCustomValidity("DNI debe tener 8 dígitos.");
                } else if (input.id === "ruc" && !/^\d{11}$/.test(input.value.trim())) {
                    inputValid = false; input.setCustomValidity("RUC debe tener 11 dígitos.");
                } else if (input.id === "telefono" && !/^\d{9}$/.test(input.value.trim())) {
                    inputValid = false; input.setCustomValidity("Teléfono debe tener 9 dígitos.");
                } else if (input.id === "numero-tarjeta" && !/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(input.value.trim())) {
                    inputValid = false; input.setCustomValidity("Formato: 1234-5678-9012-3456");
                } else if (input.id === "fecha-vencimiento") {
                    const match = input.value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
                    if (!match) {
                        inputValid = false; input.setCustomValidity("Formato MM/YY, ej. 07/25");
                    } else {
                        const year = parseInt(`20${match[2]}`, 10);
                        const month = parseInt(match[1], 10);
                        const lastDayOfMonth = new Date(year, month, 0); // Último día del mes de expiración
                        if (lastDayOfMonth < new Date()) { // Comparar con el último día del mes
                            inputValid = false; input.setCustomValidity("La tarjeta ha expirado.");
                        }
                    }
                } else if (input.id === "cvv" && !/^\d{3,4}$/.test(input.value.trim())) { // CVV 3 o 4 dígitos
                    inputValid = false; input.setCustomValidity("CVV debe tener 3 o 4 dígitos.");
                } else if (input.id === "yape-numero" && !/^\d{9}$/.test(input.value.trim())) { // Yape usualmente 9 dígitos
                    inputValid = false; input.setCustomValidity("Número Yape debe tener 9 dígitos.");
                }
                // Añadir más validaciones si es necesario
            }

            if (!inputValid) {
                input.classList.add("is-invalid");
                isValid = false;
                if (!firstInvalidInput) firstInvalidInput = input; // Guardar el primer campo inválido
            }
        });

        // Si hay un error, enfocar el primer campo inválido
        if (!isValid && firstInvalidInput) {
            firstInvalidInput.focus();
            // Opcional: Mostrar un mensaje general cerca del botón
        }

        return isValid;
    }

    function showStep(stepToShow) {
        document.querySelectorAll('.paso').forEach((stepEl, index) => { 
        if (index + 1 === stepToShow) {
            stepEl.classList.remove("d-none", "oculto");
            stepEl.classList.add("active");
        } else {
            stepEl.classList.remove("active");
            stepEl.classList.add("d-none");
        }
    });
    
    currentStep = stepToShow;
        const progressPercentage = Math.max(0, (currentStep - 1) / 3 * 100); // Ajustar progreso inicial
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage); // Accesibilidad
        progressBar.textContent = `Paso ${currentStep} de 3`;
    }


    window.nextStep = function (step) { // Hacer global
        if (validateStep(step)) {
            showStep(step + 1);
        } else {
            // Opcional: Mostrar mensaje de error más específico
            alert("Por favor, revisa los campos marcados en rojo.");
        }
    };
    window.prevStep = function (step) { // Hacer global
        showStep(step - 1);
    };

    /**
     * MODIFICADO: Procesa el pago enviando datos al backend /api/ordenes
     */
    async function procesarPago() {
        // Validar el último paso (pago) si no se usó Google Pay
        if (!validateStep(3) && !googlePayToken) {
            alert("Por favor, completa correctamente los datos de pago o usa Google Pay.");
            return; // No continuar si el último paso es inválido y no se usó GPay
        }

        const token = getToken();
        if (!token) {
            alert("Necesitas iniciar sesión para confirmar tu pedido.");
            sessionStorage.setItem('redirectAfterLogin', 'pago_detalles.html');
            window.location.href = "login.html";
            return;
        }

        carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (carrito.length === 0) {
            alert("Tu carrito está vacío.");
            window.location.href = "menu.html"; // Redirigir al menú
            return;
        }

        // Deshabilitar botón para evitar doble envío
        btnProcesar.disabled = true;
        btnProcesar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...'; // Añadir loader visual

        // --- Recolección de datos para el DTO OrdenRequestDTO ---
        const ordenData = {
            items: carrito.map(item => ({
                productoId: item.id, // ID del backend
                cantidad: item.cantidad
            })),
            // Datos Cliente
            nombreCliente: document.getElementById("nombre").value,
            apellidoCliente: document.getElementById("apellido").value,
            correoCliente: document.getElementById("correo").value,
            dniCliente: boletaRadio.checked ? dniInput.value : null, // Enviar null si no aplica
            // telefonoCliente: parseInt(telefonoInput.value), // El backend espera Integer? Convertir
            telefonoCliente: telefonoInput.value.trim() || null, // Convertir a Integer o enviar null
            tipoComprobante: boletaRadio.checked ? "Boleta" : "Factura", // Enviar texto

            // Datos Entrega
            tipoEntrega: deliveryRadio.checked ? "Delivery" : "Recojo en Local",
            direccionEntrega: deliveryRadio.checked ? document.getElementById("direccion").value : null,
            referenciaEntrega: deliveryRadio.checked ? document.getElementById("referencia").value : null,

            // Datos Pago (Simplificado - ¡NO ENVÍES DATOS SENSIBLES ASÍ A MENOS QUE TU BACKEND ESTÉ PREPARADO Y CUMPLA PCI DSS!)
            metodoPago: tarjetaRadio.checked ? "Tarjeta" : "Yape",
            // Solo enviar info relevante y NO SENSIBLE o el token de GPay
            ...(tarjetaRadio.checked && !googlePayToken && { // Si es tarjeta manual
                // numeroTarjeta: numeroTarjetaInput.value.replace(/-/g, ""), // Enviar sin guiones? NO RECOMENDADO
                // fechaVencimiento: fechaVencimientoInput.value, // NO RECOMENDADO
                // cvv: cvvInput.value, // ¡NUNCA ENVIAR CVV!
                titularTarjeta: titularInput.value
            }),
            ...(tarjetaRadio.checked && googlePayToken && { // Si se usó Google Pay
                googlePayToken: googlePayToken // Enviar el token de GPay
                // El backend debería procesar este token con el gateway de pago
            }),
            ...(yapeRadio.checked && { // Si es Yape
                numeroYape: yapeNumeroInput.value // Solo el número, el código es validación visual?
                // yapeCodigo: yapeCodigoInput.value // Enviar código si el backend lo necesita/valida
            })
        };

        console.log("Enviando orden al backend:", JSON.stringify(ordenData, null, 2)); // Log detallado

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/ordenes`, {
                method: "POST",
                body: JSON.stringify(ordenData),
                // Content-Type ya está en fetchWithAuth
            });

            const data = await response.json();

           if (response.ok) { // Éxito (2xx status code)
               console.log("Respuesta exitosa del backend:", data);

                // 1. Guardar el ID oficial para consultar al backend
                sessionStorage.setItem("ultimoPedidoId", data.pedidoId); 

                // 2. GUARDAR COPIA DE SEGURIDAD (Esto arregla el error de S/ 0.00)
                // Guardamos lo que el usuario ve en pantalla ahora mismo
                const backupData = {
                    cliente: document.getElementById("nombre").value + " " + document.getElementById("apellido").value,
                    subtotal: document.getElementById("subtotal").textContent,
                    delivery: document.getElementById("delivery-cost").textContent,
                    total: document.getElementById("total").textContent,
                    comprobante: document.getElementById("boleta").checked ? "Boleta" : "Factura",
                    // Si tienes la dirección en pantalla, guárdala también
                    direccion: document.getElementById("direccion") ? document.getElementById("direccion").value : ""
                };
                sessionStorage.setItem("backupPedido", JSON.stringify(backupData));

                // Limpiezas
                localStorage.removeItem("carrito"); 
                googlePayToken = null; 
                updateCartCounter(); 

                // Redirigir
                window.location.href = "confirmacion.html";

            } else { // Error del backend (4xx, 5xx)
                console.error("Error del backend al procesar pedido:", data);
                alert(`Error al procesar el pedido: ${data.error || response.statusText}. Por favor, revisa los datos o intenta más tarde.`);
                // Habilitar botón de nuevo
                btnProcesar.disabled = false;
                btnProcesar.textContent = "Procesar Pago";
            }
        } catch (error) {
            console.error("Error de red al procesar pago:", error);
            alert("Hubo un error de conexión al procesar tu pedido. Por favor, verifica tu conexión e intenta de nuevo.");
            // Habilitar botón de nuevo
            btnProcesar.disabled = false;
            btnProcesar.textContent = "Procesar Pago";
        }
    }

    // --- Validaciones en tiempo real (Como antes, pero asegurando existencia de inputs) ---
    function setupInputValidation(inputId, regex, message) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener("input", () => {
                input.setCustomValidity(""); // Limpiar validación previa
                if (input.value && !regex.test(input.value.trim())) {
                    input.classList.add("is-invalid");
                    input.setCustomValidity(message);
                } else {
                    input.classList.remove("is-invalid");
                    input.setCustomValidity("");
                }
                // Forzar reporte de validación (muestra mensaje si es inválido)
                // input.reportValidity(); // Puede ser molesto mientras escribe
            });
            // Validar también al perder foco
            input.addEventListener("blur", () => {
                if (input.value && !regex.test(input.value.trim())) {
                    input.reportValidity(); // Mostrar mensaje de error si es inválido al salir
                }
            });
        }
    }
    setupInputValidation("dni", /^\d{8}$/, "DNI debe tener 8 dígitos.");
    setupInputValidation("ruc", /^\d{11}$/, "RUC debe tener 11 dígitos.");
    setupInputValidation("telefono", /^\d{9}$/, "Teléfono debe tener 9 dígitos.");
    setupInputValidation("yape-numero", /^\d{9}$/, "Número Yape debe tener 9 dígitos."); // Validar Yape
    setupInputValidation("cvv", /^\d{3,4}$/, "CVV debe tener 3 o 4 dígitos."); // Validar CVV

    // Validación/Formateo Tarjeta
    if (numeroTarjetaInput) {
        numeroTarjetaInput.addEventListener("input", () => {
            let value = numeroTarjetaInput.value.replace(/\D/g, ""); // Permitir solo números
            let formattedValue = "";
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formattedValue += "-";
                formattedValue += value[i];
            }
            numeroTarjetaInput.value = formattedValue.slice(0, 19); // Limitar a 16 dígitos + 3 guiones

            // Validar longitud final
            numeroTarjetaInput.setCustomValidity("");
            numeroTarjetaInput.classList.remove("is-invalid");
            if (numeroTarjetaInput.value && numeroTarjetaInput.value.replace(/-/g, "").length !== 16) {
                numeroTarjetaInput.classList.add("is-invalid");
                numeroTarjetaInput.setCustomValidity("Número debe tener 16 dígitos.");
            }
        });
        numeroTarjetaInput.addEventListener("blur", () => { numeroTarjetaInput.reportValidity(); });
    }

    // Validación/Formateo Fecha Vencimiento
    if (fechaVencimientoInput) {
        fechaVencimientoInput.addEventListener("input", () => {
            let value = fechaVencimientoInput.value.replace(/\D/g, "").slice(0, 4); // MMYY
            let formattedValue = value;
            if (value.length > 2) {
                formattedValue = `${value.slice(0, 2)}/${value.slice(2)}`;
            }
            fechaVencimientoInput.value = formattedValue;

            // Validación
            fechaVencimientoInput.setCustomValidity("");
            fechaVencimientoInput.classList.remove("is-invalid");
            const match = formattedValue.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
            if (formattedValue && !match) {
                fechaVencimientoInput.classList.add("is-invalid");
                fechaVencimientoInput.setCustomValidity("Formato MM/YY");
            } else if (match) {
                const year = parseInt(`20${match[2]}`, 10);
                const month = parseInt(match[1], 10);
                const lastDayOfMonth = new Date(year, month, 0);
                if (lastDayOfMonth < new Date()) {
                    fechaVencimientoInput.classList.add("is-invalid");
                    fechaVencimientoInput.setCustomValidity("La tarjeta ha expirado.");
                }
            }
        });
        fechaVencimientoInput.addEventListener("blur", () => { fechaVencimientoInput.reportValidity(); });
    }

    // --- Event Listeners Iniciales ---
    boletaRadio.addEventListener("change", toggleComprobanteFields);
    facturaRadio.addEventListener("change", toggleComprobanteFields);
    deliveryRadio.addEventListener("change", toggleEntregaFields);
    recogerRadio.addEventListener("change", toggleEntregaFields);
    tarjetaRadio.addEventListener("change", togglePagoFields);
    yapeRadio.addEventListener("change", togglePagoFields);
    btnProcesar.addEventListener("click", procesarPago);

    // --- Inicialización ---
    async function initializePage() {
        renderAuthButtons(); // Mostrar botones login/logout PRIMERO
        updateCartCounter(); // Actualizar contador carrito (inicialmente 0 si viene de login)
        await fetchUserData(); // Esperar a que se intenten cargar los datos del usuario
        updateTotal(); // Calcular total inicial basado en carrito y entrega
        toggleComprobanteFields(); // Mostrar/ocultar DNI/RUC inicial
        toggleEntregaFields(); // Mostrar/ocultar Dirección inicial
        togglePagoFields(); // Mostrar/ocultar campos de pago iniciales
        showStep(1); // Asegurarse de mostrar el primer paso
        // Inicializar Google Pay (si el script se cargó)
        if (typeof google !== 'undefined' && google.payments && google.payments.api) {
            window.onGooglePayLoaded();
        } else {
            console.warn("Google Pay API script no cargado o inicializado.");
            // Ocultar opción GPay si la API no carga
            const gpayOption = document.getElementById('gpay-option-container');
            if (gpayOption) gpayOption.style.display = 'none';
        }
    }

    initializePage(); // Llamar a la función de inicialización
});