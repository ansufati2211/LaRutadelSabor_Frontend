// js/login.js

/**
 * ============================================================================
 * CONFIGURACIÓN Y UTILIDADES
 * ============================================================================
 */

// URL del Backend en Railway (Asegúrate de que no tenga doble slash al final)
const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';

/** Obtiene el token JWT del almacenamiento local */
function getToken() {
    return localStorage.getItem('token');
}

/** Obtiene el objeto usuario del almacenamiento local */
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        return null;
    }
}

/** * Realiza peticiones fetch autenticadas automáticamente 
 * Incluye el token Bearer en los headers si existe.
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
        const response = await fetch(url, { ...options, headers });
        return response;
    } catch (error) {
        console.error('Error de red en fetchWithAuth:', error);
        throw error;
    }
}

/** Actualiza el número rojo en el icono del carrito */
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

/**
 * Renderiza los botones del menú superior (Navbar) según el estado del usuario.
 * Muestra "Panel Admin", "Hola Juan" o "Iniciar Sesión".
 */
function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    if (!authButtons) return;

    const user = getUser();
    const token = getToken();
    authButtons.innerHTML = '';

    // Detección de Rol Robusta (Compatible con varios formatos de respuesta del backend)
    let userRole = "CLIENTE";
    if (user) {
        // Caso 1: Objeto rol anidado (backend actual)
        if (user.rol) {
            const nombreRol = (user.rol.nombre || user.rol.name || "").toUpperCase();
            if (nombreRol.includes("ADMIN")) userRole = "ADMIN";
            else if (nombreRol.includes("VENDEDOR")) userRole = "VENDEDOR";
            else if (nombreRol.includes("DELIVERY")) userRole = "DELIVERY";
        } 
        // Caso 2: Lista de authorities (Spring Security estándar)
        else if (user.roles && Array.isArray(user.roles)) {
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

    // Generar HTML según el rol
    if (token && userRole === "ADMIN") {
        authButtons.innerHTML = `
            <div class="registro"><a href="admin.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-shield-lock-fill"></i> Panel Admin</a></div>
            <div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>
            ${cartIconHtml}
        `;
    } else if (token && userRole === "VENDEDOR") {
        authButtons.innerHTML = `
            <div class="registro"><a href="vendedor.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-cart-plus-fill"></i> POS</a></div>
            <div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>
            ${cartIconHtml}
        `;
    } else if (token && userRole === "DELIVERY") {
        authButtons.innerHTML = `
            <div class="registro"><a href="delivery.html" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-truck"></i> Entregas</a></div>
            <div class="registro"><a href="#" onclick="logout()" class="text-white hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><i class="bi bi-box-arrow-right"></i> Salir</a></div>
            ${cartIconHtml}
        `;
    } else if (token) { // Cliente normal
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
    } else { // No logueado
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

/** Cierra sesión y limpia datos */
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('usuario_ruta_sabor'); // Importante: Limpiar datos del chatbot
    window.location.href = "index.html";
}

/**
 * ============================================================================
 * LÓGICA DE LA PÁGINA DE LOGIN/REGISTRO
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // Si no estamos en la página de login, solo renderizamos el menú y salimos
    const loginPage = document.querySelector(".login-page");
    if (!loginPage) {
        renderAuthButtons();
        return; 
    }

    renderAuthButtons(); // Renderizar header también en login.html

    // --- MANEJO DE VISTAS (LOGIN VS REGISTRO) ---
    
    function mostrarVista(templateId) {
        const template = document.getElementById(templateId);
        if (template && loginPage) {
            loginPage.innerHTML = "";
            loginPage.appendChild(template.content.cloneNode(true));
            attachFormListeners(); // Re-conectar eventos a los nuevos elementos
        }
    }

    function mostrarError(formId, mensaje) {
        const form = document.getElementById(formId);
        if (!form) return;
        let errorDiv = form.querySelector(".error-message");
        if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.className = "error-message text-red-600 mt-2 font-bold text-sm text-center";
            // Insertar antes del botón de submit
            const submitButton = form.querySelector('button[type="submit"]');
            form.insertBefore(errorDiv, submitButton || form.lastElementChild);
        }
        errorDiv.textContent = mensaje;
    }

    function limpiarError(formId) {
        const form = document.getElementById(formId);
        const errorDiv = form ? form.querySelector(".error-message") : null;
        if (errorDiv) errorDiv.textContent = "";
    }

    // --- PROCESO DE LOGIN ---

    async function validarInicioSesion(event) {
        event.preventDefault();
        limpiarError("formulario-login");

        const emailInput = document.getElementById("usuario");
        const passwordInput = document.getElementById("contrasena");
        const submitButton = event.target.querySelector('button[type="submit"]');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) return mostrarError("formulario-login", "Por favor completa todos los campos.");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Verificando...";
        }

        try {
            // 1. Obtener Token
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo: email, contraseña: password }), // Ajustado a DTO Java (contraseña)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Credenciales incorrectas");

            // 2. Guardar Token
            localStorage.setItem("token", data.token);

            // 3. Obtener Datos Completos del Usuario (/me)
            const userResponse = await fetchWithAuth(`${API_BASE_URL}/clientes/me`);
            if (!userResponse.ok) throw new Error("Error al obtener perfil de usuario");
            
            const userData = await userResponse.json();
            
            // 4. Guardar Usuario para la App
            localStorage.setItem("user", JSON.stringify(userData));

            // 5. [CRÍTICO] Guardar Usuario para el CHATBOT (Veronica)
            // Este objeto específico es el que lee chatbot-integration.js
            localStorage.setItem('usuario_ruta_sabor', JSON.stringify({
                nombre: userData.nombre,
                apellido: userData.apellido,
                correo: userData.correo,
                telefono: userData.telefono
            }));

            // 6. Redirección Inteligente
            let userRole = "USER";
            // Lógica para extraer rol del objeto devuelto por Spring Boot
            if (userData.rol && userData.rol.name) {
                userRole = userData.rol.name.toUpperCase().replace("ROLE_", "");
            } else if (userData.roles && userData.roles.length > 0) {
                if (userData.roles.some(r => r.authority.includes("ADMIN"))) userRole = "ADMIN";
                else if (userData.roles.some(r => r.authority.includes("VENDEDOR"))) userRole = "VENDEDOR";
                else if (userData.roles.some(r => r.authority.includes("DELIVERY"))) userRole = "DELIVERY";
            }

            console.log("Login exitoso. Rol detectado:", userRole);

            if (userRole === 'ADMIN') window.location.href = "admin.html";
            else if (userRole === 'VENDEDOR') window.location.href = "vendedor.html";
            else if (userRole === 'DELIVERY') window.location.href = "delivery.html";
            else {
                // Cliente: Revisar si venía de un intento de compra
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl || "index.html";
            }

        } catch (error) {
            console.error("Login error:", error);
            mostrarError("formulario-login", error.message.includes("Credenciales") ? "Correo o contraseña incorrectos." : "Error de conexión.");
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Iniciar Sesión";
            }
        }
    }

    // --- PROCESO DE REGISTRO ---

    async function validarRegistro(event) {
        event.preventDefault();
        limpiarError("registroForm");

        const nombre = document.getElementById("nombreRegistro").value.trim();
        const apellidos = document.getElementById("apellidosRegistro").value.trim();
        const email = document.getElementById("emailRegistro").value.trim();
        const password = document.getElementById("passwordRegistro").value.trim();
        const telefono = document.getElementById("telefonoRegistro").value.trim();
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Validaciones Frontend
        if (!nombre || !apellidos || !email || !password || !telefono) {
            return mostrarError("registroForm", "Todos los campos son obligatorios.");
        }
        if (password.length < 6) return mostrarError("registroForm", "La contraseña debe tener al menos 6 caracteres.");
        if (!/^\d{9}$/.test(telefono)) return mostrarError("registroForm", "El teléfono debe tener 9 dígitos.");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Registrando...";
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Ajustado a los nombres exactos de tu RegisterRequest DTO en Java
                body: JSON.stringify({ 
                    nombre: nombre, 
                    apellido: apellidos, 
                    correo: email, 
                    contraseña: password, 
                    telefono: telefono 
                }),
            });

            const responseText = await response.text(); // Leer como texto por si no es JSON puro
            
            if (!response.ok) {
                let errorMsg = "Error en el registro.";
                try {
                    const jsonError = JSON.parse(responseText);
                    errorMsg = jsonError.error || jsonError.message || responseText;
                } catch(e) {
                    errorMsg = responseText;
                }
                throw new Error(errorMsg);
            }

            alert("¡Registro exitoso! Por favor inicia sesión.");
            mostrarVista("login-template");

        } catch (error) {
            console.error("Error registro:", error);
            mostrarError("registroForm", error.message.includes('duplicada') ? "Este correo ya está registrado." : error.message);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Crear Cuenta";
            }
        }
    }

    // --- EVENT LISTENERS ---

    function attachFormListeners() {
        const loginForm = document.getElementById("formulario-login");
        if (loginForm) loginForm.addEventListener("submit", validarInicioSesion);

        const registroForm = document.getElementById("registroForm");
        if (registroForm) registroForm.addEventListener("submit", validarRegistro);

        // Botones para alternar vistas
        const btnsRegistro = document.querySelectorAll("#mostrar-registro, #btn-mostrar-registro");
        btnsRegistro.forEach(btn => btn.addEventListener("click", (e) => { 
            e.preventDefault(); 
            mostrarVista("registro-template"); 
        }));

        const btnLogin = document.getElementById("mostrar-login");
        if (btnLogin) btnLogin.addEventListener("click", (e) => { 
            e.preventDefault(); 
            mostrarVista("login-template"); 
        });
    }

    // Iniciar con la vista de Login
    mostrarVista("login-template");
});