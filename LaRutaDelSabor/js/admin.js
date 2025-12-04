// js/admin.js

// --- CONFIGURACIÓN ---
// URL de Producción (Railway) ACTIVA según tu solicitud:
const API_BASE_URL = 'http://localhost:8080/api';
// const API_BASE_URL = 'http://localhost:8080/api'; // Descomenta esta si necesitas probar en local

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

        // Manejo de errores de autenticación
        if (response.status === 401 || response.status === 403) {
            console.warn(`Error de permisos (${response.status}). Verifique si el backend actualizado está desplegado.`);
            
            // Si es 403, el usuario está logueado pero su ROL no coincide con lo que pide el Backend.
            // Si es 401, el token venció o es inválido.
            if (response.status === 401) {
                 logout();
                 throw new Error("Sesión expirada.");
            }
            // En caso de 403, a veces es mejor avisar antes de sacar al usuario, 
            // pero por seguridad cerramos sesión si intenta algo crítico.
            // Para lectura (GET) el backend debería permitirlo (permitAll), así que 403 aquí es raro en loadData.
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
    localStorage.removeItem('rol');
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
            setTimeout(() => { errorElement.style.display = 'none'; }, 5000);
        } else {
            alert(msg);
        }
    }

    // --- 3. VERIFICACIÓN DE ROL ---
    function checkAdminAccess() {
        const token = getToken();
        const user = getUser();
        const rolGuardado = localStorage.getItem('rol'); 
        
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }

        let isAdmin = false;

        // Comprobación compatible con Spring Security y tu código anterior
        if (rolGuardado && (rolGuardado.includes('ADMIN') || rolGuardado.includes('VENDEDOR'))) {
            isAdmin = true;
        }
        else if (user) {
            if (user.rol && typeof user.rol === 'string' && user.rol.includes('ADMIN')) isAdmin = true;
            else if (user.rol && user.rol.name && user.rol.name.includes('ADMIN')) isAdmin = true;
            else if (Array.isArray(user.authorities) && user.authorities.some(a => a.authority.includes('ADMIN') || a.authority.includes('VENDEDOR'))) isAdmin = true;
        }

        if (!isAdmin) {
            alert('Acceso Denegado: No tienes permisos de Administrador.');
            window.location.href = 'index.html'; 
            return false;
        }
        return true;
    }

    // --- 4. CARGA DE DATOS (Fetch) ---
    async function loadData() {
        showLoader("Cargando datos...");
        try {
            // CORRECCIÓN: Usamos /productos (GET público) en lugar de /productos/admin/all
            // Esto evita el 403 al cargar la lista.
            const [catResponse, prodResponse] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/categorias`),
                fetchWithAuth(`${API_BASE_URL}/productos`) 
            ]);

            if (!catResponse.ok) throw new Error(`Error categorías (${catResponse.status})`);
            if (!prodResponse.ok) throw new Error(`Error productos (${prodResponse.status})`);

            categories = await catResponse.json();
            products = await prodResponse.json();

            renderCategories();
            updateCategoryDropdown(); 
            renderProducts();

        } catch (error) {
            console.error(error);
            showError("No se pudo cargar la información. " + error.message);
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
        // Usamos ruta estándar RESTful. Asegúrate que tu backend soporte esto.
        const url = editingCategoryId 
             ? `${API_BASE_URL}/categorias/${editingCategoryId}`
             : `${API_BASE_URL}/categorias`;

        if(editingCategoryId) payload.id = editingCategoryId;

        try {
            showLoader("Guardando...");
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await loadData(); 
                resetCategoryForm();
                showError("Categoría guardada exitosamente"); 
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
            if (prod.audAnulado) tr.classList.add('table-secondary', 'text-muted'); 

            // Manejo seguro del objeto categoria
            const catName = prod.categoria ? (prod.categoria.categoria || 'Sin Cat') : 'N/A';
            const precio = prod.precio ? parseFloat(prod.precio).toFixed(2) : '0.00';

            tr.innerHTML = `
                <td>${prod.producto}</td>
                <td class="small text-truncate" style="max-width: 150px;">${prod.descripcion || ''}</td>
                <td>S/ ${precio}</td>
                <td>${prod.stock}</td>
                <td><img src="${prod.imagen || 'img/placeholder.png'}" alt="img" style="width:40px; height:40px; object-fit:cover; border-radius:5px;"></td>
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
            categoria: { id: parseInt(productCategorySelect.value) },
            audAnulado: false
        };

        const method = editingProductId ? 'PUT' : 'POST';
        
        // CORRECCIÓN URL: Endpoints estándar (/api/productos)
        const url = editingProductId 
            ? `${API_BASE_URL}/productos/${editingProductId}`
            : `${API_BASE_URL}/productos`;

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
                let errMsg = "Error desconocido";
                try {
                    const err = await res.json();
                    errMsg = err.error || err.message || JSON.stringify(err);
                } catch(e) {
                    errMsg = await res.text();
                }
                showError("Error: " + errMsg);
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

    // --- 7. TOGGLE STATUS (Eliminado Lógico / Reactivación) ---
    async function toggleEntityStatus(type, id) {
        const list = type === 'categorias' ? categories : products;
        const item = list.find(x => x.id === id);
        if (!item) return;

        const isReactivating = item.audAnulado;
        const action = isReactivating ? 'reactivar' : 'eliminar';
        
        if (!confirm(`¿Estás seguro de ${action} este elemento?`)) return;

        try {
            showLoader("Procesando...");
            
            let url, method, body;

            // Lógica de eliminado lógico mediante PUT o DELETE
            if (isReactivating) {
                method = 'PUT';
                url = `${API_BASE_URL}/${type}/${id}`;
                const updatedItem = { ...item, audAnulado: false };
                body = JSON.stringify(updatedItem);
            } else {
                method = 'DELETE';
                url = `${API_BASE_URL}/${type}/${id}`;
            }

            const res = await fetchWithAuth(url, {
                method: method,
                body: body
            });

            if (res.ok) {
                await loadData();
            } else {
                showError(`Error al ${action} el elemento.`);
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

    // Botón Logout
    const btnLogout = document.getElementById('btnLogout') || document.querySelector('.btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // INICIALIZAR
    loadData();
});