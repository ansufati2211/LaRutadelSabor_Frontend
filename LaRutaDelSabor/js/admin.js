// js/admin.js

// --- CONFIGURACIÓN ---
// IMPORTANTE: Si estás probando en local, cambia esto a 'http://localhost:8080/api'
const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';

// --- Funciones Auxiliares (Token y Auth) ---

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("Error al leer usuario:", e);
        return null;
    }
}

/**
 * Realiza peticiones Fetch inyectando el Token JWT automáticamente.
 * Maneja redirección si el token expiró (401/403).
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

        // Si el token no es válido o expiró, cerrar sesión forzosamente
        if (response.status === 401 || response.status === 403) {
            console.warn("Sesión expirada o sin permisos. Redirigiendo...");
            logout();
            throw new Error("Sesión expirada");
        }

        return response;
    } catch (error) {
        console.error('Error de red o autenticación:', error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// --- Lógica Principal del Panel de Admin ---

document.addEventListener('DOMContentLoaded', () => {
    // Variables de estado
    let categories = [];
    let products = [];
    let editingProductId = null;
    let editingCategoryId = null;

    // Elementos DOM
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
    const productStockInput = document.getElementById('foodStock');
    const productSubmitBtn = productForm?.querySelector('button[type="submit"]');
    const cancelProductBtn = document.getElementById('cancelBtn');
    
    // Elementos visuales (Loader/Error)
    const loaderElement = document.getElementById('admin-loader');
    const errorElement = document.getElementById('admin-error');

    // --- 1. VERIFICACIÓN DE SEGURIDAD AL INICIAR ---
    if (!checkAdminAccess()) return;

    // --- 2. FUNCIONES DE UI (Loader/Error) ---
    function showLoader(msg) {
        if (loaderElement) {
            loaderElement.textContent = msg;
            loaderElement.style.display = 'block';
        }
        if (errorElement) errorElement.style.display = 'none';
    }

    function hideLoader() {
        if (loaderElement) loaderElement.style.display = 'none';
    }

    function showError(msg) {
        if (errorElement) {
            errorElement.textContent = msg;
            errorElement.style.display = 'block';
            setTimeout(() => { errorElement.style.display = 'none'; }, 5000); // Ocultar tras 5s
        } else {
            alert(msg);
        }
    }

    // --- 3. VERIFICACIÓN DE ROL ---
    function checkAdminAccess() {
        const token = getToken();
        const user = getUser();
        
        if (!token || !user) {
            window.location.href = 'login.html';
            return false;
        }

        // Lógica para detectar el rol "ADMIN" en distintas estructuras de JSON
        let isAdmin = false;

        // Caso 1: Estructura simple { rol: "ADMIN" } o { rol: "ROLE_ADMIN" }
        if (typeof user.rol === 'string') {
            isAdmin = user.rol.includes('ADMIN');
        } 
        // Caso 2: Objeto anidado { rol: { name: "ROLE_ADMIN" } }
        else if (user.rol && user.rol.name) {
            isAdmin = user.rol.name.includes('ADMIN');
        }
        // Caso 3: Lista de autoridades Spring Security { authorities: [{ authority: "ROLE_ADMIN" }] }
        else if (Array.isArray(user.authorities)) {
            isAdmin = user.authorities.some(auth => auth.authority.includes('ADMIN'));
        }

        if (!isAdmin) {
            alert('Acceso Denegado: No tienes permisos de Administrador.');
            window.location.href = 'index.html'; // Mandar al home, no al login
            return false;
        }
        return true;
    }

    // --- 4. CARGA DE DATOS (Fetch) ---
    async function loadData() {
        showLoader("Cargando datos del sistema...");
        try {
            // Cargar categorías y productos en paralelo
            const [catResponse, prodResponse] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/categorias`),
                fetchWithAuth(`${API_BASE_URL}/productos/admin/all`) // Asegúrate que este endpoint exista en tu Backend
            ]);

            if (!catResponse.ok) throw new Error("Error cargando categorías");
            if (!prodResponse.ok) throw new Error("Error cargando productos");

            categories = await catResponse.json();
            products = await prodResponse.json();

            // Renderizar todo
            renderCategories();
            updateCategoryDropdown(); // Llenar el select antes de renderizar productos
            renderProducts();

        } catch (error) {
            console.error(error);
            showError("No se pudo conectar con el servidor. " + error.message);
        } finally {
            hideLoader();
        }
    }

    // --- 5. GESTIÓN DE CATEGORÍAS ---
    function renderCategories() {
        if (!categoryListUl) return;
        categoryListUl.innerHTML = '';

        categories.forEach(cat => {
            const li = document.createElement('li');
            // Si está anulada, ponerla gris
            const statusClass = cat.audAnulado ? 'bg-gray-200 text-gray-500' : '';
            
            li.className = `list-group-item d-flex justify-content-between align-items-center ${statusClass}`;
            li.innerHTML = `
                <span>${cat.icono || '📁'} ${cat.categoria} ${cat.audAnulado ? '(Inactivo)' : ''}</span>
                <div>
                    <button class="btn btn-sm btn-warning me-1 btn-edit-cat" data-id="${cat.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm ${cat.audAnulado ? 'btn-success' : 'btn-danger'} btn-toggle-cat" data-id="${cat.id}">
                        <i class="bi ${cat.audAnulado ? 'bi-check-lg' : 'bi-trash'}"></i>
                    </button>
                </div>
            `;
            categoryListUl.appendChild(li);
        });
    }

    async function handleCategorySubmit(e) {
        e.preventDefault();
        
        const payload = {
            categoria: categoryNameInput.value.trim(),
            icono: categoryIconInput.value.trim(),
            audAnulado: false
        };

        const method = editingCategoryId ? 'PUT' : 'POST';
        const url = editingCategoryId 
            ? `${API_BASE_URL}/categorias/admin/${editingCategoryId}`
            : `${API_BASE_URL}/categorias/admin`;

        // Si es PUT, necesitamos pasar el ID dentro del body a veces, o Spring lo toma de la URL
        if(editingCategoryId) payload.id = editingCategoryId;

        try {
            showLoader("Guardando categoría...");
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await loadData(); // Recargar todo para actualizar dropdowns
                resetCategoryForm();
                showError("Categoría guardada exitosamente (Info)"); // Usamos showError como notificacion temporal
            } else {
                const err = await res.json();
                showError(err.error || "Error al guardar categoría");
            }
        } catch (error) {
            showError("Error de red al guardar categoría");
        } finally {
            hideLoader();
        }
    }

    function populateCategoryForm(cat) {
        categoryNameInput.value = cat.categoria;
        categoryIconInput.value = cat.icono;
        editingCategoryId = cat.id;
        
        if (categorySubmitBtn) categorySubmitBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Actualizar';
        if (cancelCategoryBtn) cancelCategoryBtn.style.display = 'inline-block';
        categoryForm.scrollIntoView({ behavior: 'smooth' });
    }

    function resetCategoryForm() {
        categoryForm.reset();
        editingCategoryId = null;
        if (categorySubmitBtn) categorySubmitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar';
        if (cancelCategoryBtn) cancelCategoryBtn.style.display = 'none';
    }

    // --- 6. GESTIÓN DE PRODUCTOS ---
    function updateCategoryDropdown() {
        if (!productCategorySelect) return;
        productCategorySelect.innerHTML = '<option value="" selected disabled>Seleccione una categoría...</option>';
        
        categories.forEach(cat => {
            // Solo mostrar categorías activas en el selector para nuevos productos
            if (!cat.audAnulado) {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.categoria;
                productCategorySelect.appendChild(option);
            }
        });
    }

    function renderProducts() {
        if (!productTableBody) return;
        productTableBody.innerHTML = '';

        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(prod => {
            const tr = document.createElement('tr');
            if (prod.audAnulado) tr.classList.add('table-secondary', 'text-muted'); // Bootstrap clases para inactivos

            // Busca el nombre de la categoría (asumiendo que prod.categoria es un objeto con id o nombre)
            const catName = prod.categoria ? (prod.categoria.categoria || 'Sin Cat') : 'N/A';
            const precio = prod.precio ? parseFloat(prod.precio).toFixed(2) : '0.00';

            tr.innerHTML = `
                <td>${prod.producto}</td>
                <td class="small text-truncate" style="max-width: 150px;">${prod.descripcion || ''}</td>
                <td>S/ ${precio}</td>
                <td>${prod.stock}</td>
                <td><img src="${prod.imagen}" alt="img" style="width:40px; height:40px; object-fit:cover; border-radius:5px;"></td>
                <td>
                    <button class="btn btn-sm btn-warning me-1 btn-edit-prod" data-id="${prod.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm ${prod.audAnulado ? 'btn-success' : 'btn-danger'} btn-toggle-prod" data-id="${prod.id}">
                        <i class="bi ${prod.audAnulado ? 'bi-check-lg' : 'bi-trash'}"></i>
                    </button>
                </td>
            `;
            productTableBody.appendChild(tr);
        });
    }

    async function handleProductSubmit(e) {
        e.preventDefault();

        // Validación básica
        if (!productCategorySelect.value) {
            showError("Debes seleccionar una categoría");
            return;
        }

        const payload = {
            producto: productNameInput.value.trim(),
            descripcion: productDescInput.value.trim(),
            precio: parseFloat(productPriceInput.value),
            stock: parseInt(productStockInput.value),
            imagen: productImageInput.value.trim(),
            // Enviar objeto categoría con ID
            categoria: { id: parseInt(productCategorySelect.value) },
            audAnulado: false
        };

        const method = editingProductId ? 'PUT' : 'POST';
        const url = editingProductId 
            ? `${API_BASE_URL}/productos/admin/${editingProductId}`
            : `${API_BASE_URL}/productos/admin`;

        if (editingProductId) payload.id = editingProductId;

        try {
            showLoader("Guardando producto...");
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await loadData();
                resetProductForm();
                showError("Producto guardado exitosamente");
            } else {
                const err = await res.json();
                showError(err.error || "Error guardando producto");
            }
        } catch (error) {
            showError("Error de red guardando producto");
        } finally {
            hideLoader();
        }
    }

    function populateProductForm(prod) {
        productNameInput.value = prod.producto;
        productDescInput.value = prod.descripcion;
        productPriceInput.value = prod.precio;
        productStockInput.value = prod.stock;
        productImageInput.value = prod.imagen;
        
        // Seleccionar categoría si existe
        if (prod.categoria && prod.categoria.id) {
            productCategorySelect.value = prod.categoria.id;
        }

        editingProductId = prod.id;
        
        if (productSubmitBtn) productSubmitBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Actualizar Producto';
        if (cancelProductBtn) cancelProductBtn.style.display = 'inline-block';
        productForm.scrollIntoView({ behavior: 'smooth' });
    }

    function resetProductForm() {
        productForm.reset();
        editingProductId = null;
        if (productSubmitBtn) productSubmitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar Producto';
        if (cancelProductBtn) cancelProductBtn.style.display = 'none';
    }

    // --- 7. TOGGLE STATUS (Eliminado Lógico) ---
    async function toggleEntityStatus(type, id) {
        // type: 'categorias' o 'productos'
        // Buscar el objeto actual para saber si está anulado o no
        const list = type === 'categorias' ? categories : products;
        const item = list.find(x => x.id === id);
        if (!item) return;

        const isReactivating = item.audAnulado;
        const action = isReactivating ? 'reactivar' : 'eliminar';
        
        if (!confirm(`¿Estás seguro de ${action} este elemento?`)) return;

        try {
            showLoader("Procesando...");
            
            // Lógica: Si reactivamos -> PUT cambiando audAnulado. Si eliminamos -> DELETE.
            let url, method, body;

            if (isReactivating) {
                method = 'PUT';
                url = `${API_BASE_URL}/${type}/admin/${id}`;
                // Copiar el item y cambiar estado
                const updatedItem = { ...item, audAnulado: false };
                body = JSON.stringify(updatedItem);
            } else {
                method = 'DELETE';
                url = `${API_BASE_URL}/${type}/admin/${id}`;
            }

            const res = await fetchWithAuth(url, {
                method: method,
                body: body
            });

            if (res.ok) {
                await loadData();
            } else {
                showError("Error al cambiar estado del elemento");
            }

        } catch (e) {
            showError("Error de conexión");
        } finally {
            hideLoader();
        }
    }

    // --- 8. EVENT LISTENERS ---
    
    // Forms
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', resetCategoryForm);
    
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);
    if (cancelProductBtn) cancelProductBtn.addEventListener('click', resetProductForm);

    // Clicks en Tablas (Delegación de eventos)
    if (categoryListUl) {
        categoryListUl.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit-cat');
            const btnToggle = e.target.closest('.btn-toggle-cat');
            
            if (btnEdit) {
                const id = parseInt(btnEdit.dataset.id);
                const cat = categories.find(c => c.id === id);
                populateCategoryForm(cat);
            }
            if (btnToggle) {
                const id = parseInt(btnToggle.dataset.id);
                toggleEntityStatus('categorias', id);
            }
        });
    }

    if (productTableBody) {
        productTableBody.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit-prod');
            const btnToggle = e.target.closest('.btn-toggle-prod');

            if (btnEdit) {
                const id = parseInt(btnEdit.dataset.id);
                const prod = products.find(p => p.id === id);
                populateProductForm(prod);
            }
            if (btnToggle) {
                const id = parseInt(btnToggle.dataset.id);
                toggleEntityStatus('productos', id);
            }
        });
    }

    // Botón Logout (si existe en el HTML)
    const btnLogout = document.getElementById('btnLogout') || document.querySelector('.btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // --- 9. REGISTRO DE EMPLEADOS (Opcional si está en esta vista) ---
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // ... (Tu lógica existente de empleados, recuerda usar fetchWithAuth) ...
            // Si necesitas ayuda con esto, avísame, pero el código original parecía bien
            // solo asegúrate de usar fetchWithAuth para el registro de empleados también.
        });
    }

    // INICIALIZAR
    loadData();
});