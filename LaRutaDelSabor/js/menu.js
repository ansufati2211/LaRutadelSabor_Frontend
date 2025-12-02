// js/menu.js

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
    renderAuthButtons(); 
}

/**
 * NUEVO: Función del Acordeón del Footer (copiada de index.js)
 */
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
                titulo.addEventListener('click', function () {
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


// --- Comienzo del script de la página de Menú ---
// (Tu código original, con funciones auxiliares eliminadas)

document.addEventListener('DOMContentLoaded', async () => {
    // Contenedores principales del DOM
    const categoriasList = document.getElementById("categorias-list");
    const productosContainer = document.getElementById("productos-container");

    // Validar que los contenedores existan antes de continuar
    if (!categoriasList || !productosContainer) {
        console.error("Error: No se encontraron los contenedores 'categorias-list' o 'productos-container'.");
        return;
    }

    let menuData = []; // MODIFICADO: Almacenará la estructura completa [CategoriaConProductos]

    // ============================================
    // FUNCIONES AUXILIARES (Ahora están definidas globalmente arriba)
    // ============================================
    // (getToken, getUser, fetchWithAuth han sido movidas arriba)

    // ============================================
    // SISTEMA DE CACHÉ CON EXPIRACIÓN (Sin cambios)
    // ============================================
    const CACHE_KEY = 'menu_data_full'; // MODIFICADO: Usar una sola clave para todo el menú
    const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutos

    function getCachedData(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CACHE_EXPIRATION) {
                localStorage.removeItem(key);
                return null;
            }
            return data;
        } catch (error) { console.error('Error al leer caché:', error); return null; }
    }

    function setCachedData(key, data) {
        try {
            const cacheObject = { data: data, timestamp: Date.now() };
            localStorage.setItem(key, JSON.stringify(cacheObject));
        } catch (error) { console.error('Error al guardar caché:', error); }
    }

    // ============================================
    // LOADER VISUAL (Sin cambios)
    // ============================================
    function showLoader(container, message = "Cargando...") {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; width: 100%; grid-column: 1/-1;">
                <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #ff7f00; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                <h4 style="margin-top: 1rem; color: #333;">${message}</h4>
            </div>`;
    }

    // ============================================
    // CARGA DE DATOS DEL MENÚ
    // ============================================
    // MODIFICADO: Carga toda la estructura del menú desde /api/menu
    async function initMenu() {
        try {
            showLoader(productosContainer, "Cargando menú...");
            showLoader(categoriasList, ""); // Mostrar loader también en sidebar

            const cachedMenu = getCachedData(CACHE_KEY);

            if (cachedMenu) {
                console.log("Cargando menú desde caché...");
                menuData = cachedMenu;
                renderCategoriasSidebar();
                renderProductosFromData(getAllProducts(menuData)); // Mostrar todos inicialmente
                inicializarMenuResponsive();
                updateDataInBackground(); // Actualizar en segundo plano
                return;
            }

            console.log("Cargando menú desde API...");
            // Llamada única al nuevo endpoint
            const response = await fetch(`${API_BASE_URL}/menu`); // Llama a tu backend
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            // La respuesta ya es la lista de CategoriaMenuDTO
            menuData = data;
            console.log("Menú recibido:", menuData);

            // Guardar en caché
            setCachedData(CACHE_KEY, menuData);

            // Renderizar
            renderCategoriasSidebar();
            renderProductosFromData(getAllProducts(menuData)); // Mostrar todos inicialmente
            inicializarMenuResponsive();

        } catch (error) {
            console.error("Error al cargar el menú:", error);
            productosContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #d32f2f; grid-column: 1/-1;">
                    <h4>⚠️ Error al cargar el menú</h4>
                    <p>Por favor, inténtalo de nuevo más tarde.</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff7f00; color: white; border: none; border-radius: 5px; cursor: pointer;">Recargar</button>
                </div>`;
            categoriasList.innerHTML = '<li>Error</li>'; // Indicar error en sidebar
        }
    }

    // MODIFICADO: Actualiza en segundo plano llamando a /api/menu
    async function updateDataInBackground() {
        console.log("Actualizando menú en segundo plano...");
        try {
            const response = await fetch(`${API_BASE_URL}/menu`);
            if (!response.ok) throw new Error("Fallo al actualizar");
            const data = await response.json();
            setCachedData(CACHE_KEY, data); // Actualizar caché silenciosamente
            menuData = data; // Actualizar datos en memoria
            console.log("Menú actualizado en segundo plano.");
        } catch (error) {
            console.warn('Error al actualizar menú en segundo plano:', error);
        }
    }

    // NUEVO: Función para obtener todos los productos de la estructura del menú
    function getAllProducts(data) {
        return data.reduce((acc, categoria) => acc.concat(categoria.productos || []), []);
    }

    // ============================================
    // RENDERIZADO DE PRODUCTOS Y CATEGORÍAS
    // ============================================
    // MODIFICADO: Renderiza productos desde la data ya cargada
    function renderProductosFromData(productsToShow) {
        productosContainer.innerHTML = ""; // Limpiar contenedor

        if (!productsToShow || productsToShow.length === 0) {
            productosContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; grid-column: 1/-1;">
                    <p>No hay productos en esta categoría.</p>
                </div>`;
            return;
        }

        productsToShow.forEach(producto => {
            if (!producto) return; // Saltar si hay algún producto nulo

            const card = document.createElement("div");
            card.className = "producto galeria-item"; // Tus clases CSS
            // Usar los nombres de campo del DTO del backend (id, nombre, descripcion, precio, imagen)
            card.innerHTML = `
                <img src="${producto.imagen || 'icon/logo.png'}" alt="${producto.nombre || 'Producto'}" loading="lazy" onerror="this.onerror=null;this.src='icon/logo.png';">
                <h3>${producto.nombre || producto.producto ||'Nombre no disponible'}</h3>
                <p>${producto.descripcion || 'Sin descripción.'}</p>
                <p class="precio">S/ ${(producto.precio || 0).toFixed(2)}</p>
                `;
            // Añadir listener para abrir modal
            card.addEventListener("click", () => showProductModal(producto));
            productosContainer.appendChild(card);
        });
    }

    // MODIFICADO: Filtra y renderiza productos según la categoría seleccionada
    function renderProductosPorCategoria(categoryId, btn) {
        // Marcar botón activo
        const allBtns = categoriasList.querySelectorAll("button");
        allBtns.forEach(b => b.classList.remove("active"));
        if (btn) btn.classList.add("active");

        let productsToShow = [];
        if (categoryId === 'todo') {
            productsToShow = getAllProducts(menuData); // Obtener todos los productos
        } else {
            // Encontrar la categoría seleccionada en menuData
            const categoriaSeleccionada = menuData.find(cat => cat.id == categoryId); // Comparar con ID numérico
            productsToShow = categoriaSeleccionada ? (categoriaSeleccionada.productos || []) : [];
        }

        console.log(`Renderizando ${productsToShow.length} productos para categoría ID: ${categoryId}`);
        renderProductosFromData(productsToShow); // Renderizar productos filtrados
        cerrarMenuMovil(); // Cerrar sidebar en móvil si está abierta
    }

    // MODIFICADO: Renderiza las categorías en la sidebar
    function renderCategoriasSidebar() {
        categoriasList.innerHTML = ""; // Limpiar lista

        // Botón "Ver Todo"
        const liTodo = document.createElement("li");
        const btnTodo = document.createElement('button');
        btnTodo.className = "active"; // Activo por defecto
        btnTodo.innerHTML = "🍽️ Ver Todo";
        btnTodo.onclick = (e) => renderProductosPorCategoria("todo", e.currentTarget);
        liTodo.appendChild(btnTodo);
        categoriasList.appendChild(liTodo);

        // Botones para cada categoría
        menuData.forEach(categoria => {
            if (!categoria || categoria.audAnulado) return; // Saltar nulas o anuladas si aplica

            const li = document.createElement("li");
            const btnCat = document.createElement('button');
            // Usar los nombres de campo del DTO (id, nombre, icono)
            btnCat.innerHTML = `${categoria.icono || '📁'} ${categoria.nombre || 'Categoría'}`;
            btnCat.dataset.categoryId = categoria.id; // Guardar ID numérico
            btnCat.onclick = (e) => renderProductosPorCategoria(categoria.id, e.currentTarget);
            li.appendChild(btnCat);
            categoriasList.appendChild(li);
        });
    }

    // ============================================
    // MODAL DE PRODUCTO Y CARRITO
    // ============================================
    // MODIFICADO: Muestra el modal con datos del DTO
    function showProductModal(producto) {
        if (!producto) return;

        // Usar los nombres de campo del DTO
        document.getElementById("modalNombre").textContent = producto.nombre || 'Producto';
        document.getElementById("modalDesc").textContent = producto.descripcion || 'Sin descripción.';
        document.getElementById("modalPrecio").textContent = (producto.precio || 0).toFixed(2);
        document.getElementById("modalImg").src = producto.imagen || 'icon/logo.png';
        document.getElementById("modalImg").onerror = () => { document.getElementById("modalImg").src = 'icon/logo.png'; }; // Fallback si imagen falla

        // Opcional: Mostrar stock
        const stockElement = document.getElementById("modalStock"); // Añade este elemento a tu HTML modal
        if (stockElement) {
            if (producto.stock !== undefined && producto.stock > 0) {
                stockElement.textContent = `Disponibles: ${producto.stock}`;
                stockElement.classList.remove('text-red-500');
                stockElement.classList.add('text-green-500');
            } else {
                stockElement.textContent = 'Agotado';
                stockElement.classList.remove('text-green-500');
                stockElement.classList.add('text-red-500');
            }
        }


        const modal = document.getElementById("modalProducto");
        if (!modal) return;
        modal.classList.add("show"); // Muestra el modal

        // Asignar evento al botón "Agregar"
        const btnAgregar = document.getElementById("btnAgregar");
        if (btnAgregar) {
            // Verificar stock antes de permitir agregar
            if (producto.stock !== undefined && producto.stock <= 0) {
                btnAgregar.disabled = true;
                btnAgregar.textContent = "Agotado";
                btnAgregar.onclick = null; // Remover listener anterior
            } else {
                btnAgregar.disabled = false;
                btnAgregar.textContent = "Agregar al Carrito";
                // Remover listener anterior antes de añadir uno nuevo para evitar duplicados
                btnAgregar.replaceWith(btnAgregar.cloneNode(true)); // Clonar para remover listeners
                document.getElementById("btnAgregar").onclick = () => addToCart(producto); // Añadir nuevo listener
            }
        }

        // Asignar evento al botón "Salir"
        const btnSalir = document.getElementById("btnSalir");
        if (btnSalir) {
            // Usar replaceWith para asegurar que solo haya un listener
            btnSalir.replaceWith(btnSalir.cloneNode(true));
            document.getElementById("btnSalir").onclick = () => modal.classList.remove("show");
        }

        // Cerrar modal haciendo clic fuera (opcional)
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.classList.remove("show");
            }
        });
    }

    // MODIFICADO: Agrega producto al carrito usando 'id' y verifica rol desde localStorage
    function addToCart(producto) {
        if (!producto || !producto.id) {
            console.error("Datos de producto inválidos para añadir al carrito:", producto);
            alert("Error al añadir el producto.");
            return;
        }

        // Verificar roles usando la lógica de renderAuthButtons (simplificada)
        const user = getUser();
        const token = getToken();
        let userRole = null;
        if (user && user.roles) {
            if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority == "ROLE_ADMIN")) userRole = "ADMIN";
            // Añadir otros roles si necesitas bloquearlos también
        }

        if (token && userRole === 'ADMIN') { // Bloquear si es admin
            alert('Modo administrador: No puedes agregar productos al carrito.');
            return;
        }

        // Verificar stock de nuevo por si acaso
        if (producto.stock !== undefined && producto.stock <= 0) {
            alert(`${producto.nombre} está agotado.`);
            return;
        }


        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        // Usar 'id' del backend
        const existenteIndex = carrito.findIndex(p => p.id === producto.id);

        if (existenteIndex > -1) {
            // Verificar si la cantidad a añadir excede el stock
            if (producto.stock !== undefined && carrito[existenteIndex].cantidad >= producto.stock) {
                alert(`No puedes añadir más ${producto.nombre}. Stock máximo alcanzado (${producto.stock}).`);
                return; // No añadir más
            }
            carrito[existenteIndex].cantidad += 1;
        } else {
            // Usar 'id' y los campos correctos del DTO
            const nuevoProducto = {
                id: producto.id, // ID del backend
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen,
                stock: producto.stock, // Guardar stock para referencia en carrito.js
                cantidad: 1
            };
            carrito.push(nuevoProducto);
        }
        localStorage.setItem("carrito", JSON.stringify(carrito));
        alert(`${producto.nombre} ha sido agregado al carrito!`);
        document.getElementById("modalProducto").classList.remove("show"); // Ocultar modal

        // Actualizar contador del carrito en el header
        updateCartCounter(); // Llama a la función global
    }

    // (La función local updateCartCounter fue eliminada para usar la global)


    // ============================================
    // FUNCIONALIDAD RESPONSIVE MENÚ MÓVIL (Sin cambios funcionales, solo validaciones)
    // ============================================
    function inicializarMenuResponsive() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('categorias-sidebar');

        if (menuToggle && sidebar) {
            // Remover listeners previos para evitar duplicados si se llama varias veces
            menuToggle.replaceWith(menuToggle.cloneNode(true));
            document.getElementById('menu-toggle').addEventListener('click', function (e) {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                this.classList.toggle('active'); // Usar 'this' aquí
            });

            // Listener para cerrar al hacer clic fuera (mejorado)
            document.removeEventListener('click', closeMenuOnClickOutside); // Remover listener anterior
            document.addEventListener('click', closeMenuOnClickOutside);

        } else {
            console.warn("No se encontraron 'menu-toggle' o 'categorias-sidebar' para el menú responsive.");
        }
    }
    // NUEVO: Handler separado para cerrar menú al hacer clic fuera
    function closeMenuOnClickOutside(event) {
        const sidebar = document.getElementById('categorias-sidebar');
        const menuToggle = document.getElementById('menu-toggle');
        if (!sidebar || !menuToggle) return;

        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);
            if (!isClickInsideSidebar && !isClickOnToggle) {
                cerrarMenuMovil();
            }
        }
    }


    function cerrarMenuMovil() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            if (sidebar) sidebar.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        }
    }

    // Listener de redimensionamiento (parece correcto)
    let resizeMenuTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeMenuTimer);
        resizeMenuTimer = setTimeout(function () {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            if (window.innerWidth > 768) {
                if (sidebar) sidebar.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
            // Re-inicializar acordeón del footer en resize
            inicializarFooterAcordeon(); // Esta función ahora existe globalmente
        }, 250);
    });

    // ============================================
    // LOGOUT (Función global ya definida arriba)
    // ============================================
    // (logout() ya está definida en el bloque auxiliar)

    // ============================================
    // INICIALIZACIÓN PRINCIPAL
    // ============================================
    renderAuthButtons(); // Renderizar botones de auth (definida globalmente)
    // updateCartCounter(); // ELIMINADO: Esta llamada es redundante, renderAuthButtons() ya la incluye
    await initMenu(); // Cargar y renderizar menú
    
    // NUEVO: Inicializar el footer en la carga de la página
    inicializarFooterAcordeon(); 

}); // Fin DOMContentLoaded