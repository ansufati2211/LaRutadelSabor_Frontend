// js/admin.js

// --- 1. CONFIGURACIÓN DINÁMICA ---
// Detecta si estás en local o en producción automáticamente
const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocal 
    ? 'http://localhost:8080/api' 
    : 'https://larutadelsaborbackend-production.up.railway.app/api';

console.log(`[Admin] Conectado a: ${API_BASE_URL}`);

// --- 2. FUNCIONES AUXILIARES (Token y Auth) ---

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

        // Si el token no es válido o expiró
        if (response.status === 401 || response.status === 403) {
            console.warn("Sesión expirada o sin permisos. Redirigiendo...");
            logout();
            throw new Error("Sesión expirada o no autorizada");
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

// --- 3. LÓGICA PRINCIPAL DEL PANEL ---

document.addEventListener('DOMContentLoaded', () => {
    // Variables de estado
    let categories = [];
    let products = [];
    let editingProductId = null;
    let editingCategoryId = null;

    // Elementos DOM (Productos y Categorías)
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

    // --- VERIFICACIÓN DE SEGURIDAD AL INICIAR ---
    if (!checkAdminAccess()) return;

    // --- FUNCIONES DE UI ---
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

    // --- VERIFICACIÓN DE ROL ROBUSTA ---
    function checkAdminAccess() {
        const token = getToken();
        const user = getUser();
        
        if (!token || !user) {
            window.location.href = 'login.html';
            return false;
        }

        // Definimos quiénes pueden ver el panel.
        // Agregamos ROLE_VENDEDOR porque en el backend les dimos permisos.
        const allowedRoles = ['ROLE_ADMIN', 'ROLE_VENDEDOR', 'ADMIN', 'VENDEDOR'];
        let hasPermission = false;

        // 1. Chequeo en string directo
        if (typeof user.rol === 'string') {
            if (allowedRoles.some(r => user.rol.includes(r))) hasPermission = true;
        } 
        // 2. Chequeo en objeto { rol: { name: "..." } }
        else if (user.rol && user.rol.name) {
             if (allowedRoles.some(r => user.rol.name.includes(r))) hasPermission = true;
        }
        // 3. Chequeo en lista de authorities (Spring Security default)
        else if (Array.isArray(user.authorities)) {
            hasPermission = user.authorities.some(auth => 
                allowedRoles.includes(auth.authority)
            );
        }

        if (!hasPermission) {
            alert('Acceso Denegado: No tienes permisos suficientes.');
            window.location.href = 'index.html'; 
            return false;
        }
        return true;
    }

    // --- CARGA DE DATOS ---
    async function loadData() {
        showLoader("Cargando datos del sistema...");
        try {
            // Usamos las rutas que definimos como públicas o protegidas
            // Nota: Si el backend tiene "/api/productos" público, igual enviamos token por si acaso.
            const [catResponse, prodResponse] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/categorias`),
                fetchWithAuth(`${API_BASE_URL}/productos`) // O /productos/admin/all si tienes un endpoint específico de admin
            ]);

            if (!catResponse.ok) throw new Error("Error cargando categorías");
            if (!prodResponse.ok) throw new Error("Error cargando productos");

            categories = await catResponse.json();
            products = await prodResponse.json();

            renderCategories();
            updateCategoryDropdown();
            renderProducts();

        } catch (error) {
            console.error(error);
            showError("No se pudo conectar con el servidor. " + error.message);
        } finally {
            hideLoader();
        }
    }

    // --- GESTIÓN DE CATEGORÍAS ---
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
        // Ajuste de ruta para coincidir con SecurityConfig (/api/categorias/admin/**)
        const url = editingCategoryId 
            ? `${API_BASE_URL}/categorias/admin/${editingCategoryId}`
            : `${API_BASE_URL}/categorias/admin`;

        if(editingCategoryId) payload.id = editingCategoryId;

        try {
            showLoader("Guardando categoría...");
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await loadData();
                resetCategoryForm();
                showError("Categoría guardada correctamente (Info)");
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

    // --- GESTIÓN DE PRODUCTOS ---
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

            // Validación segura de imagen
            const imgUrl = (prod.imagen && prod.imagen.startsWith('http')) 
                ? prod.imagen 
                : 'https://via.placeholder.com/40?text=Sin+Img';

            const precio = prod.precio ? parseFloat(prod.precio).toFixed(2) : '0.00';

            tr.innerHTML = `
                <td>${prod.producto}</td>
                <td class="small text-truncate" style="max-width: 150px;">${prod.descripcion || ''}</td>
                <td>S/ ${precio}</td>
                <td>${prod.stock}</td>
                <td><img src="${imgUrl}" alt="img" style="width:40px; height:40px; object-fit:cover; border-radius:5px;"></td>
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
        // Ajuste de ruta para coincidir con SecurityConfig (/api/productos/admin/**)
        // Ojo: Si usas /api/productos normal para POST, cámbialo aquí.
        // Asumo que protegiste /api/productos con hasAuthority en POST/PUT
        const url = editingProductId 
            ? `${API_BASE_URL}/productos/admin/${editingProductId}` // O simplemente /productos/${id} si así lo configuraste
            : `${API_BASE_URL}/productos/admin`; // O /productos

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

    // --- TOGGLE STATUS (Eliminado Lógico) ---
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

            if (isReactivating) {
                method = 'PUT';
                // Asegúrate que esta ruta exista en tu backend para reactivar
                url = `${API_BASE_URL}/${type}/admin/${id}`; 
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

    // --- EVENT LISTENERS ---
    
    // Forms
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', resetCategoryForm);
    
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);
    if (cancelProductBtn) cancelProductBtn.addEventListener('click', resetProductForm);

    // Tablas
    if (categoryListUl) {
        categoryListUl.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit-cat');
            const btnToggle = e.target.closest('.btn-toggle-cat');
            
            if (btnEdit) {
                const id = parseInt(btnEdit.dataset.id);
                populateCategoryForm(categories.find(c => c.id === id));
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
                populateProductForm(products.find(p => p.id === id));
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

    // --- 9. REGISTRO DE EMPLEADOS (Preservado) ---
    // Esta sección maneja el formulario de empleados usando fetchWithAuth
    const employeeForm = document.getElementById('employeeForm');
    
    if (employeeForm) {
        employeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Asumiendo que tienes inputs con estos IDs en tu HTML
            const nombre = document.getElementById('empNombre')?.value;
            const apellido = document.getElementById('empApellido')?.value;
            const correo = document.getElementById('empCorreo')?.value;
            const password = document.getElementById('empPass')?.value;
            const telefono = document.getElementById('empTel')?.value;
            // Rol puede venir de un select o hardcodeado
            const rolId = document.getElementById('empRol')?.value || 2; // Default a vendedor si no hay select

            if (!nombre || !correo || !password) {
                showError("Por favor completa los campos obligatorios del empleado.");
                return;
            }

            const payload = {
                nombre, apellido, correo, 
                contraseña: password, 
                telefono,
                rol: { id: parseInt(rolId) } // Ajustar según tu DTO de registro
            };

            try {
                showLoader("Registrando empleado...");
                // Ruta típica de registro (ajustar si es distinta)
                const res = await fetchWithAuth(`${API_BASE_URL}/auth/register-employee`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert("Empleado registrado con éxito");
                    employeeForm.reset();
                } else {
                    const err = await res.json();
                    showError(err.mensaje || "Error al registrar empleado");
                }
            } catch (error) {
                showError("Error de conexión al registrar empleado");
            } finally {
                hideLoader();
            }
        });
    }

    // INICIALIZAR
    loadData();
});