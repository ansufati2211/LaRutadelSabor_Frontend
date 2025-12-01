// js/admin.js

// --- Funciones Auxiliares de Autenticación y API ---
// (Incluidas para que este archivo sea autosuficiente)

// Definir la URL base de tu API backend
const API_BASE_URL = 'http://localhost:8080/api';
// Asegúrate que el puerto sea correcto

/**
 * Función auxiliar para obtener el token JWT de localStorage
 * @returns {string | null} El token JWT o null si no existe
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Función auxiliar para obtener los detalles del usuario de localStorage
 * @returns {object | null} El objeto de usuario parseado o null
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
 * @param {string} url - La URL completa del endpoint
 * @param {object} options - Opciones de Fetch (method, body, etc.)
 * @returns {Promise<Response>} La respuesta de fetch
 */
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Permite sobrescribir o añadir cabeceras
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });
        return response; // Devuelve la respuesta completa para manejarla después
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        throw error; // Propaga el error
    }
}

/**
 * Función global de Logout para el panel de admin
 */
function logout() {
    console.log("Cerrando sesión de admin...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // alert("Sesión cerrada."); // Opcional
    window.location.href = 'login.html'; // Redirigir a login
}

// --- Comienzo del script de la página de Admin (Tu código) ---

document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let categories = [];
    let products = [];
    let editingProductId = null;
    let editingCategoryId = null;

    // Elementos del DOM
    const categoryListUl = document.getElementById('category-list-ul');
    const categoryForm = document.getElementById('categoryForm');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryIconInput = document.getElementById('categoryIcon');
    const categorySubmitBtn = categoryForm?.querySelector('button[type="submit"]');
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');

    const productTableBody = document.getElementById('foodTableBody');
    const productForm = document.getElementById('foodForm');
    const productNameInput = document.getElementById('foodName');
    const productDescInput = document.getElementById('foodDesc');
    const productPriceInput = document.getElementById('foodPrice');
    const productImageInput = document.getElementById('foodImage');
    const productCategorySelect = document.getElementById('foodCategory');
    const productStockInput = document.getElementById('foodStock'); // **Asegúrate que exista en admin.html**
    const productSubmitBtn = productForm?.querySelector('button[type="submit"]');
    const cancelProductBtn = document.getElementById('cancelBtn');

    // Loader/Error elements (opcional, añade divs con estos IDs a tu HTML)
    const loaderElement = document.getElementById('admin-loader');
    const errorElement = document.getElementById('admin-error');

    // Validar elementos esenciales
    if (!categoryListUl || !categoryForm || !productTableBody || !productForm || !productCategorySelect) {
        showAdminError("Error crítico: Faltan elementos HTML esenciales para el panel de administración.");
        return;
    }

    // --- Validación de Acceso (MODIFICADO: Basado en Roles) ---
    const token = getToken();
    const user = getUser();
    let userRole = null;

    // Extraer rol (ajusta según cómo lo guardes en localStorage desde login.js)
    if (user && user.rol && user.rol.name) { // Si el objeto Rol viene anidado
        userRole = user.rol.name.replace("ROLE_", "");
    } else if (user && user.roles) { // Si viene como array de strings o de objetos authority
        if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority === "ROLE_ADMIN")) {
            userRole = "ADMIN";
        }
        // Podrías añadir lógica para otros roles si tuvieran acceso parcial
    }

    if (!token || userRole !== 'ADMIN') {
        alert('Acceso denegado. Solo usuarios administradores pueden acceder.');
        localStorage.removeItem('token'); // Limpiar credenciales inválidas
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    console.log("Acceso de Administrador verificado.");

    // --- Funciones Loader/Error (Implementa la parte visual) ---
    function showAdminLoader(message = "Procesando...") {
        if (loaderElement) {
            loaderElement.textContent = message;
            loaderElement.style.display = 'block';
        }
        if (errorElement) errorElement.style.display = 'none'; // Ocultar errores previos
        console.log(message);
    }
    function hideAdminLoader() {
        if (loaderElement) loaderElement.style.display = 'none';
    }
    function showAdminError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        console.error(message);
        // Considera si usar alert es adecuado o mejor mostrar en 'errorElement'
        // alert(message);
    }
    function clearAdminError() {
        if (errorElement) errorElement.style.display = 'none';
    }

    // --- Funciones de Carga Inicial ---
    /**
     * MODIFICADO: Carga categorías y productos desde endpoints de admin del backend Spring Boot.
     */
    async function fetchData() {
        showAdminLoader("Cargando categorías y productos...");
        clearAdminError(); // Limpiar errores previos

        try {
            const [catRes, prodRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/categorias/admin/all`), // Usa fetchWithAuth
                fetchWithAuth(`${API_BASE_URL}/productos/admin/all`)  // Usa fetchWithAuth
            ]);

            // Función auxiliar para manejar errores de respuesta
            async function handleResponseError(response, entityName) {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` }));
                    throw new Error(`Error al cargar ${entityName}: ${errorData.error || response.statusText}`);
                }
                return response.json();
            }

            // Procesar respuestas
            categories = await handleResponseError(catRes, "categorías");
            products = await handleResponseError(prodRes, "productos");

            console.log("Categorías cargadas:", categories);
            console.log("Productos cargados:", products);

            renderAll(); // Renderizar UI

        } catch (error) {
            console.error('Error fetching admin data:', error);
            showAdminError(`No se pudieron cargar los datos: ${error.message}`);
        } finally {
            hideAdminLoader();
        }
    }

    /** Renderiza todas las secciones */
    function renderAll() {
        renderCategoryList();
        renderProductTable();
        updateCategoryDropdown();
    }

    // --- Gestión de Productos ---
    /**
     * MODIFICADO: Renderiza tabla de productos, usa 'id' y campos Java, marca anulados.
     */
    function renderProductTable() {
        if (!productTableBody) return;
        productTableBody.innerHTML = '';

        if (!products || products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No hay productos registrados.</td></tr>'; // Colspan 6
            return;
        }

        products.forEach(product => {
            const tr = document.createElement('tr');
            if (product.audAnulado) {
                tr.classList.add('opacity-50', 'bg-gray-100', 'anulado'); // Clase 'anulado' para CSS
                tr.title = "Este producto está anulado (no visible para clientes)";
            }

            // Usar nombres de campo de la entidad Java (`producto`, `descripcion`, `precio`, `stock`, `imagen`, `id`)
            tr.innerHTML = `
                <td>${product.producto || 'N/A'}</td>
                <td class="text-sm text-gray-600">${product.descripcion || '-'}</td>
                <td>S/ ${(product.precio || 0).toFixed(2)}</td>
                <td>${product.stock !== undefined ? product.stock : 'N/A'}</td>
                <td><img src="${product.imagen || 'icon/logo.png'}" alt="${product.producto || ''}" class="admin-img-preview" onerror="this.src='icon/logo.png';"></td>
                <td>
                    <button class="btn btn-sm btn-warning me-1 action-edit-product" data-id="${product.id}" title="Editar ${product.producto}">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn btn-sm ${product.audAnulado ? 'btn-success' : 'btn-danger'} action-toggle-product" data-id="${product.id}" title="${product.audAnulado ? 'Reactivar' : 'Eliminar'} ${product.producto}">
                        <i class="bi ${product.audAnulado ? 'bi-check-circle' : 'bi-trash'}"></i> ${product.audAnulado ? 'Activar' : 'Eliminar'}
                    </button>
                </td>
            `;
            productTableBody.appendChild(tr);
        });
    }

    /**
     * MODIFICADO: Maneja submit del form de productos (POST/PUT a endpoints admin).
     */
    async function handleProductFormSubmit(e) {
        e.preventDefault();
        showAdminLoader("Guardando producto...");
        clearAdminError();

        const categoryId = productCategorySelect.value;
        const productData = {
            producto: productNameInput.value.trim(),
            descripcion: productDescInput.value.trim(),
            precio: parseFloat(productPriceInput.value),
            stock: parseInt(productStockInput.value, 10),
            imagen: productImageInput.value.trim(),
            categoria: categoryId ? { id: parseInt(categoryId, 10) } : null,
            audAnulado: false // Siempre activo al guardar/actualizar desde el form
        };

        // Validación
        if (!productData.producto || isNaN(productData.precio) || productData.precio < 0 || !productData.categoria || isNaN(productData.stock) || productData.stock < 0) {
            hideAdminLoader();
            showAdminError('Nombre, Precio válido (>=0), Stock válido (>=0) y Categoría son obligatorios.');
            return;
        }

        const method = editingProductId ? 'PUT' : 'POST';
        const url = editingProductId
            ? `${API_BASE_URL}/productos/admin/${editingProductId}`
            : `${API_BASE_URL}/productos/admin`;

        try {
            const response = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(productData)
            });
            const result = await response.json();

            if (response.ok) {
                await fetchData();
                resetProductForm();
                alert(`Producto ${editingProductId ? 'actualizado' : 'creado'} correctamente.`);
            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error(`Error en ${method} producto:`, error);
            showAdminError(`Error al guardar el producto: ${error.message}`);
        } finally {
            hideAdminLoader();
        }
    }

    /**
     * MODIFICADO: Borrado lógico (DELETE) o reactivación (PUT) de un producto.
     */
    async function toggleProductStatus(id, currentStatus) {
        const action = currentStatus ? "reactivar" : "eliminar (lógicamente)";
        const confirmMessage = currentStatus
            ? `¿Seguro que deseas ${action} este producto?`
            : `¿Seguro que deseas ${action} este producto? No será visible.`;

        if (confirm(confirmMessage)) {
            showAdminLoader(`${currentStatus ? "Reactivando" : "Eliminando"} producto...`);
            clearAdminError();
            try {
                let response;
                if (currentStatus) { // Reactivar -> PUT con audAnulado=false
                    // Busca el producto localmente para obtener todos sus datos
                    const productToReactivate = products.find(p => p.id === id);
                    if (!productToReactivate) throw new Error("Producto no encontrado para reactivar.");
                    productToReactivate.audAnulado = false; // Cambia el estado
                    // Necesitamos enviar el objeto Categoria como {id: ...}
                    const categoryPayload = productToReactivate.categoria ? { id: productToReactivate.categoria.id } : null;

                    response = await fetchWithAuth(`${API_BASE_URL}/productos/admin/${id}`, {
                        method: 'PUT',
                        // Enviar solo los campos necesarios o el objeto completo adaptado
                        body: JSON.stringify({
                            ...productToReactivate, // Incluye todos los campos
                            categoria: categoryPayload // Asegura formato correcto de categoría
                        })
                    });
                } else { // Anular -> DELETE (backend hace borrado lógico)
                    response = await fetchWithAuth(`${API_BASE_URL}/productos/admin/${id}`, {
                        method: 'DELETE'
                    });
                }

                if (response.ok || response.status === 204) { // DELETE puede devolver 204
                    await fetchData(); // Recargar datos
                    alert(`Producto ${action} correctamente.`);
                } else {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
                    throw new Error(errorData.error || `Error del servidor al ${action}.`);
                }
            } catch (error) {
                console.error(`Error al ${action} producto:`, error);
                showAdminError(`Error al ${action} el producto: ${error.message}`);
            } finally {
                hideAdminLoader();
            }
        }
    }

    /**
     * MODIFICADO: Rellena form de producto usando 'id' y campos Java.
     */
    function populateProductForm(product) {
        if (!product) return;
        productNameInput.value = product.producto || '';
        productDescInput.value = product.descripcion || '';
        productPriceInput.value = product.precio || 0;
        productImageInput.value = product.imagen || '';
        productStockInput.value = product.stock !== undefined ? product.stock : 0;
        const categoryId = product.categoria ? product.categoria.id : null;
        productCategorySelect.value = categoryId || '';

        editingProductId = product.id; // Usar 'id'
        if (productSubmitBtn) productSubmitBtn.textContent = 'Actualizar Producto';
        if (cancelProductBtn) cancelProductBtn.style.display = 'inline-block';
        productForm.scrollIntoView({ behavior: 'smooth' });
    }

    /** Restablece form de producto */
    function resetProductForm() {
        if (productForm) productForm.reset();
        editingProductId = null;
        if (productSubmitBtn) productSubmitBtn.textContent = 'Agregar Producto';
        if (cancelProductBtn) cancelProductBtn.style.display = 'none';
        productCategorySelect.value = "";
    }

    // --- Gestión de Categorías ---
    /**
     * MODIFICADO: Renderiza lista de categorías, usa 'id' y campos Java, marca anuladas.
     */
    function renderCategoryList() {
        if (!categoryListUl) return;
        categoryListUl.innerHTML = '';

        if (!categories || categories.length === 0) {
            categoryListUl.innerHTML = '<li class="list-group-item text-center text-gray-500 py-3">No hay categorías.</li>';
            return;
        }

        categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center ${cat.audAnulado ? 'opacity-50 bg-light anulado' : ''}`;
            if (cat.audAnulado) li.title = "Categoría anulada";

            // Usar campos de entidad Java ('id', 'categoria', 'icono')
            li.innerHTML = `
                <span>${cat.icono || '📁'} ${cat.categoria || 'N/A'}</span>
                <div>
                    <button class="btn btn-sm btn-warning me-1 action-edit-category" data-id="${cat.id}" title="Editar ${cat.categoria}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm ${cat.audAnulado ? 'btn-success' : 'btn-danger'} action-toggle-category" data-id="${cat.id}" title="${cat.audAnulado ? 'Reactivar' : 'Eliminar'} ${cat.categoria}">
                        <i class="bi ${cat.audAnulado ? 'bi-check-circle' : 'bi-trash'}"></i>
                    </button>
                </div>`;
            categoryListUl.appendChild(li);
        });
    }

    /**
     * MODIFICADO: Maneja submit del form de categorías (POST/PUT a endpoints admin).
     */
    async function handleCategoryFormSubmit(e) {
        e.preventDefault();
        showAdminLoader("Guardando categoría...");
        clearAdminError();

        const categoryData = {
            // Usar nombres entidad Java ('categoria', 'icono')
            categoria: categoryNameInput.value.trim(),
            icono: categoryIconInput.value.trim(),
            audAnulado: false
        };

        if (!categoryData.categoria || !categoryData.icono) {
            hideAdminLoader();
            return showAdminError('Nombre e ícono son obligatorios.');
        }

        const method = editingCategoryId ? 'PUT' : 'POST';
        const url = editingCategoryId
            ? `${API_BASE_URL}/categorias/admin/${editingCategoryId}`
            : `${API_BASE_URL}/categorias/admin`;

        try {
            const response = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(categoryData)
            });
            const result = await response.json();

            if (response.ok) {
                await fetchData();
                resetCategoryForm();
                alert(`Categoría ${editingCategoryId ? 'actualizada' : 'creada'} correctamente.`);
            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error(`Error en ${method} categoría:`, error);
            // Manejar error de nombre duplicado
            if (error.message && error.message.toLowerCase().includes('constraint')) {
                showAdminError(`Error: Ya existe una categoría con el nombre "${categoryData.categoria}".`);
            } else {
                showAdminError(`Error al guardar la categoría: ${error.message}`);
            }
        } finally {
            hideAdminLoader();
        }
    }

    /**
     * MODIFICADO: Borrado lógico (DELETE) o reactivación (PUT) de categoría.
     */
    async function toggleCategoryStatus(id, currentStatus) {
        const action = currentStatus ? "reactivar" : "eliminar (lógicamente)";
        const confirmMessage = currentStatus
            ? `¿Seguro que deseas ${action} esta categoría?`
            : `¿Seguro que deseas ${action} esta categoría? Los productos asociados podrían necesitar reasignación.`;

        if (confirm(confirmMessage)) {
            showAdminLoader(`${currentStatus ? "Reactivando" : "Eliminando"} categoría...`);
            clearAdminError();
            try {
                let response;
                if (currentStatus) { // Reactivar -> PUT
                    const categoryToReactivate = categories.find(c => c.id === id);
                    if (!categoryToReactivate) throw new Error("Categoría no encontrada.");
                    categoryToReactivate.audAnulado = false;
                    response = await fetchWithAuth(`${API_BASE_URL}/categorias/admin/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(categoryToReactivate)
                    });
                } else { // Anular -> DELETE
                    response = await fetchWithAuth(`${API_BASE_URL}/categorias/admin/${id}`, {
                        method: 'DELETE'
                    });
                }

                if (response.ok || response.status === 204) {
                    await fetchData();
                    alert(`Categoría ${action} correctamente.`);
                } else {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
                    // Manejar error si está en uso (ej. 409 Conflict)
                    if (response.status === 409) {
                        throw new Error(errorData.error || "No se puede eliminar, la categoría está en uso.");
                    }
                    throw new Error(errorData.error || `Error del servidor al ${action}.`);
                }
            } catch (error) {
                console.error(`Error al ${action} categoría:`, error);
                showAdminError(`Error al ${action} la categoría: ${error.message}`);
            } finally {
                hideAdminLoader();
            }
        }
    }

    /**
     * MODIFICADO: Rellena form de categoría usando 'id' y campos Java.
     */
    function populateCategoryForm(category) {
        if (!category) return;
        categoryNameInput.value = category.categoria || ''; // Campo 'categoria'
        categoryIconInput.value = category.icono || '';
        editingCategoryId = category.id; // Usar 'id'

        if (categorySubmitBtn) categorySubmitBtn.innerHTML = '<i class="bi bi-pencil-fill me-1"></i>Actualizar Categoría';
        if (cancelCategoryBtn) cancelCategoryBtn.style.display = 'inline-block';
        categoryForm.scrollIntoView({ behavior: 'smooth' });
    }

    /** Restablece form de categoría */
    function resetCategoryForm() {
        if (categoryForm) categoryForm.reset();
        editingCategoryId = null;
        if (categorySubmitBtn) categorySubmitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Agregar Categoría';
        if (cancelCategoryBtn) cancelCategoryBtn.style.display = 'none';
    }

    /**
     * MODIFICADO: Actualiza dropdown de categorías mostrando solo activas.
     */
    function updateCategoryDropdown() {
        if (!productCategorySelect) return;
        const currentSelectedValue = productCategorySelect.value;
        productCategorySelect.innerHTML = '<option value="" disabled>Seleccionar categoría...</option>';
        categories.forEach(cat => {
            if (!cat.audAnulado) { // Solo activas
                const option = document.createElement('option');
                option.value = cat.id; // Usar 'id'
                option.textContent = cat.categoria || 'N/A'; // Usar 'categoria'
                productCategorySelect.appendChild(option);
            }
        });
        // Restaurar selección si es posible
        if (currentSelectedValue && categories.some(c => !c.audAnulado && c.id == currentSelectedValue)) {
            productCategorySelect.value = currentSelectedValue;
        } else {
            productCategorySelect.value = "";
        }
    }

    // --- Inicialización y Event Listeners ---
    if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
    if (cancelProductBtn) cancelProductBtn.addEventListener('click', resetProductForm);
    if (categoryForm) categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', resetCategoryForm);

    // Event delegation para botones editar/eliminar/activar
    if (productTableBody) {
        productTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.action-edit-product[data-id]');
            const toggleBtn = e.target.closest('.action-toggle-product[data-id]');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id, 10);
                const item = products.find(p => p.id === id);
                if (item) populateProductForm(item);
            } else if (toggleBtn) {
                const id = parseInt(toggleBtn.dataset.id, 10);
                const item = products.find(p => p.id === id);
                if (item) toggleProductStatus(id, item.audAnulado);
            }
        });
    }
    if (categoryListUl) {
        categoryListUl.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.action-edit-category[data-id]');
            const toggleBtn = e.target.closest('.action-toggle-category[data-id]');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id, 10);
                const item = categories.find(c => c.id === id);
                if (item) populateCategoryForm(item);
            } else if (toggleBtn) {
                const id = parseInt(toggleBtn.dataset.id, 10);
                const item = categories.find(c => c.id === id);
                if (item) toggleCategoryStatus(id, item.audAnulado);
            }
        });
    }

    // Carga inicial de datos
    fetchData();

    // Listener para logout (asegúrate que el botón tenga el ID correcto)
    const logoutButton = document.getElementById('admin-logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("¿Seguro que deseas cerrar sesión de administrador?")) {
                logout(); // Llama a la función global definida al inicio
            }
        });
    }

});