// js/login.js

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

   let userRole = "CLIENTE";
    // 1. DETECCIÓN DE ROL CORREGIDA
    if (user) {
        // Opción A: El backend envía un objeto "rol" (Tu caso probable)
        if (user.rol) {
            const nombreRol = user.rol.nombre || user.rol.name || "";
            if (nombreRol.includes("ADMIN")) userRole = "ADMIN";
            else if (nombreRol.includes("VENDEDOR")) userRole = "VENDEDOR";
            else if (nombreRol.includes("DELIVERY")) userRole = "DELIVERY";
        }
        // Opción B: El backend envía una lista "roles" (Spring Security estándar)
        else if (user.roles && Array.isArray(user.roles)) {
            if (user.roles.some(r => (r.authority || r.nombre || "").includes("ADMIN"))) userRole = "ADMIN";
            else if (user.roles.some(r => (r.authority || r.nombre || "").includes("VENDEDOR"))) userRole = "VENDEDOR";
            else if (user.roles.some(r => (r.authority || r.nombre || "").includes("DELIVERY"))) userRole = "DELIVERY";
        }
    }

    console.log("Rol detectado final:", userRole); // Verificación en consola

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
    // En la página de login, no es necesario redirigir a ningún lado si ya estás ahí
    // Pero si se llama desde otra página, el renderAuthButtons es suficiente
}


// --- Comienzo del script de la página de Login ---
// (Tu código original)

document.addEventListener("DOMContentLoaded", () => {
    // ASUNCIÓN: (Tu comentario original estaba aquí, ahora las funciones están arriba)

    const loginPage = document.querySelector(".login-page");

    // Verificar si el contenedor principal existe
    if (!loginPage) {
        console.error("Error: Elemento '.login-page' no encontrado.");
        return;
    }

    // --- NUEVO: Renderizar el header/nav ---
    // (Asegúrate que tu login.html tenga el <nav> con id="botones-autenticacion")
    renderAuthButtons();


    /**
     * Muestra una vista (login o registro) cargando un template HTML.
     * @param {string} templateId - ID del <template> HTML a mostrar.
     */
    function mostrarVista(templateId) {
        const template = document.getElementById(templateId);
        if (template && loginPage) {
            loginPage.innerHTML = ""; // Limpiar vista anterior
            loginPage.appendChild(template.content.cloneNode(true));
            attachFormListeners(); // Volver a añadir listeners a los nuevos elementos del formulario
        } else {
            console.error(`Template con ID "${templateId}" no encontrado.`);
        }
    }

    /**
     * Muestra un mensaje de error dentro de un formulario específico.
     * @param {string} formId - ID del formulario donde mostrar el error.
     * @param {string} mensaje - Mensaje de error a mostrar.
     */
    function mostrarError(formId, mensaje) {
        const form = document.getElementById(formId);
        if (!form) return;

        let errorDiv = form.querySelector(".error-message");
        if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.className = "error-message text-red-600 mt-2 font-bold text-sm"; // Clases de ejemplo
            // Insertar el mensaje antes del botón de submit o al final
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                form.insertBefore(errorDiv, submitButton);
            } else {
                form.appendChild(errorDiv);
            }
        }
        errorDiv.textContent = mensaje;
    }

    /**
     * Limpia cualquier mensaje de error previo en un formulario.
     * @param {string} formId - ID del formulario a limpiar.
     */
    function limpiarError(formId) {
        const form = document.getElementById(formId);
        const errorDiv = form ? form.querySelector(".error-message") : null;
        if (errorDiv) {
            errorDiv.textContent = "";
        }
    }

    /**
     * MODIFICADO: Valida el inicio de sesión contra el backend Spring Boot.
     */
    async function validarInicioSesion(event) {
        event.preventDefault();
        limpiarError("formulario-login"); // Limpiar errores previos

        const emailInput = document.getElementById("usuario"); // Asume ID 'usuario' para email
        const passwordInput = document.getElementById("contrasena"); // Asume ID 'contrasena' para password
        const submitButton = event.target.querySelector('button[type="submit"]'); // Botón de submit

        if (!emailInput || !passwordInput) {
            console.error("No se encontraron los campos de email o contraseña.");
            mostrarError("formulario-login", "Error interno del formulario.");
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (email === "" || password === "") {
            return mostrarError("formulario-login", "Por favor, completa correo y contraseña.");
        }

        // Deshabilitar botón mientras se procesa
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Ingresando..."; // Feedback visual

        }
        console.log("Enviando al backend:", JSON.stringify({ correo: email, password: password }));

        try {
            // 1. Llamar al endpoint de login del backend
            const response = await fetch(`${API_BASE_URL}/auth/login`, { // Usa API_BASE_URL global
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Enviar 'correo' y 'contraseña' como espera el backend DTO
                body: JSON.stringify({ correo: email, password: password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Usar el mensaje de error del backend si existe, sino uno genérico
                throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
            }

            // 2. Guardar el token JWT en localStorage
            localStorage.setItem("token", data.token);
            console.log("Token JWT guardado.");

            // 3. Obtener los detalles completos del usuario (incluyendo roles)
            console.log("Obteniendo detalles del usuario...");
            const userResponse = await fetchWithAuth(`${API_BASE_URL}/clientes/me`); // Llama a /api/clientes/me con el token

            if (!userResponse.ok) {
                // Si falla obtener los datos del usuario, limpiar token y mostrar error
                localStorage.removeItem("token");
                const errorData = await userResponse.json().catch(() => ({}));
                throw new Error(`Error al obtener datos del usuario: ${errorData.error || userResponse.statusText}`);
            }

            const userData = await userResponse.json();
            console.log("Datos del usuario recibidos:", userData);

            // 4. Guardar TODO el objeto del usuario (incluyendo roles) en localStorage
            // Asegúrate que el backend en /api/clientes/me devuelva el objeto Cliente con su Rol asociado
            localStorage.setItem("user", JSON.stringify(userData));
            console.log("Datos del usuario (con roles) guardados en localStorage.");

            // 5. Redirección basada en ROLES (no en email)
            let userRole = null;
            // Verificar si la entidad Rol viene anidada y tiene un campo 'name'
            if (userData.rol && userData.rol.name) {
                // Asume que los nombres de rol son "ROLE_ADMIN", "ROLE_VENDEDOR", etc.
                // Quita el prefijo "ROLE_" si tu frontend no lo necesita
                userRole = userData.rol.name.replace("ROLE_", "");
            } 
            // NUEVO: Fallback para el formato de Spring Security { authority: "ROLE_..." }
            else if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
                 if (userData.roles.some(r => r.authority === "ROLE_ADMIN")) userRole = "ADMIN";
                 else if (userData.roles.some(r => r.authority === "ROLE_VENDEDOR")) userRole = "VENDEDOR";
                 else if (userData.roles.some(r => r.authority === "ROLE_DELIVERY")) userRole = "DELIVERY";
                 else if (userData.roles.some(r => r.authority === "ROLE_USER")) userRole = "USER";
            }
            else {
                // Fallback si no hay rol definido explícitamente, tratar como cliente
                console.warn("Rol de usuario no encontrado en la respuesta de /api/clientes/me. Asumiendo CLIENTE.");
                userRole = "USER"; // O "CLIENTE" si prefieres
            }


            console.log("Rol detectado:", userRole);

            // Redirigir según el rol
            if (userRole === 'ADMIN') {
                window.location.href = "admin.html";
            } else if (userRole === 'VENDEDOR') { // Ajusta si el nombre del rol es diferente
                window.location.href = "vendedor.html";
            } else if (userRole === 'DELIVERY') { // Ajusta si el nombre del rol es diferente
                window.location.href = "delivery.html";
            } else { // Asume que cualquier otro rol (o USER) es un cliente normal
                // Verificar si había una redirección pendiente (ej. desde carrito)
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                sessionStorage.removeItem('redirectAfterLogin'); // Limpiar
                window.location.href = redirectUrl || "index.html"; // Ir a destino o a index
            }

        } catch (error) {
            console.error("Error en el inicio de sesión:", error.message);
            mostrarError("formulario-login", "Correo o contraseña incorrectos."); // Mensaje más amigable
            // Habilitar botón de nuevo en caso de error
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Iniciar Sesión";
            }
        }
    }

    /**
     * MODIFICADO: Valida y envía el registro al backend Spring Boot.
     */
    async function validarRegistro(event) {
        event.preventDefault();
        limpiarError("registroForm"); // Limpiar errores previos

        // Obtener valores del formulario (asegúrate que los IDs coincidan con tu HTML)
        const nombreInput = document.getElementById("nombreRegistro");
        const apellidosInput = document.getElementById("apellidosRegistro"); // **NECESITAS ESTE CAMPO EN HTML**
        const emailInput = document.getElementById("emailRegistro");
        const passwordInput = document.getElementById("passwordRegistro");
        const telefonoInput = document.getElementById("telefonoRegistro"); // **NECESITAS ESTE CAMPO EN HTML**
        // const direccionInput = document.getElementById("direccionRegistro"); // Dirección es opcional en DTO?

        // Validar existencia de campos requeridos
        if (!nombreInput || !apellidosInput || !emailInput || !passwordInput || !telefonoInput) {
            console.error("Faltan campos requeridos en el formulario de registro HTML.");
            mostrarError("registroForm", "Error interno del formulario. Faltan campos.");
            return;
        }


        const nombre = nombreInput.value.trim();
        const apellidos = apellidosInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const telefono = telefonoInput.value.trim(); // Obtener teléfono
        // const direccion = direccionInput ? direccionInput.value.trim() : null; // Dirección opcional

        // Validación básica en frontend
        if (!nombre || !apellidos || !email || !password || !telefono) {
            return mostrarError("registroForm", "Completa Nombre, Apellidos, Correo, Contraseña y Teléfono.");
        }
        if (password.length < 6) {
            return mostrarError("registroForm", "La contraseña debe tener al menos 6 caracteres.");
        }
        if (!/^\d{9}$/.test(telefono)) { // Validar 9 dígitos para teléfono
            return mostrarError("registroForm", "El teléfono debe tener 9 dígitos numéricos.");
        }

        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Registrando...";
        }

        // Construir el cuerpo de la petición según el RegisterRequest DTO del backend
        const requestBody = {
            nombre: nombre,
            apellido: apellidos,
            correo: email,
            password: password, // El backend espera 'contraseña'
            telefono: telefono // El backend espera 'telefono' como Integer
            // direccion: direccion, // Añadir si el backend lo acepta
        };
        console.log("Enviando registro:", requestBody);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, { // Usa API_BASE_URL
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            // Intentar parsear como texto primero en caso de éxito sin JSON
            const responseText = await response.text();

            if (!response.ok) {
                // Intentar parsear como JSON si es un error estructurado
                let errorMsg = `Error ${response.status}: ${response.statusText}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMsg = errorData.error || errorData.message || responseText;
                } catch (e) {
                    // Si no es JSON, usar el texto de respuesta
                    errorMsg = responseText || errorMsg;
                }
                throw new Error(errorMsg);
            }

            console.log("Registro exitoso:", responseText); // Mostrar mensaje de éxito del backend
            alert(responseText || "Registro exitoso. Ya puedes iniciar sesión."); // Mostrar alerta
            mostrarVista("login-template"); // Volver a la vista de login

        } catch (error) {
            console.error("Error en el registro:", error.message);
            // Mensaje específico para correo duplicado
            if (error.message && (error.message.includes('duplicada') || error.message.includes('constraint'))) {
                 mostrarError("registroForm", "El correo electrónico ya está registrado.");
            } else {
                 mostrarError("registroForm", error.message || "Error al conectar con el servidor.");
            }
            
            // Habilitar botón de nuevo
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Crear Cuenta";
            }
        }
    }

    /**
     * Añade los event listeners a los formularios y botones de cambio de vista.
     */
    function attachFormListeners() {
        const loginForm = document.getElementById("formulario-login");
        if (loginForm) {
            loginForm.addEventListener("submit", validarInicioSesion);
            console.log("Listener añadido a formulario-login");
        } else {
            console.warn("Formulario 'formulario-login' no encontrado al añadir listener.");
        }


        const registroForm = document.getElementById("registroForm");
        if (registroForm) {
            registroForm.addEventListener("submit", validarRegistro);
            console.log("Listener añadido a registroForm");
        } else {
            console.warn("Formulario 'registroForm' no encontrado al añadir listener.");
        }


        // Botones para cambiar entre login y registro
        const btnsMostrarRegistro = document.querySelectorAll("#mostrar-registro, #btn-mostrar-registro"); // Seleccionar ambos
        btnsMostrarRegistro.forEach(btn => {
            if (btn) btn.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Mostrando vista de registro...");
                mostrarVista("registro-template");
            });
        });

        const mostrarLoginBtn = document.getElementById("mostrar-login");
        if (mostrarLoginBtn) {
            mostrarLoginBtn.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Mostrando vista de login...");
                mostrarVista("login-template");
            });
        }
    }

    // Mostrar la vista de login por defecto al cargar
    mostrarVista("login-template");

}); // Fin DOMContentLoaded