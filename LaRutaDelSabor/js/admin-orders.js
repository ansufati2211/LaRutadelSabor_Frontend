// js/admin-orders.js

// --- CONFIGURACIÓN DE URL ---
// Verificamos si la variable ya existe para evitar error "Identifier has already been declared"
if (typeof API_BASE_URL === 'undefined') {
    // Si no existe, la definimos (usando var para que sea global y compatible)
    var API_BASE_URL = 'http://localhost:8080/api';
}

// --- Funciones Auxiliares (Token y Auth) ---
// Solo las definimos si no existen, para evitar conflictos con admin.js
if (typeof getToken === 'undefined') {
    function getToken() { return localStorage.getItem('token'); }
}

if (typeof getUser === 'undefined') {
    function getUser() {
        try { return JSON.parse(localStorage.getItem('user')); } 
        catch (e) { return null; }
    }
}

if (typeof fetchWithAuth === 'undefined') {
    async function fetchWithAuth(url, options = {}) {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                console.warn(`Error ${response.status} en fetch. Redirigiendo a login...`);
                // localStorage.removeItem('token'); // Opcional: forzar logout
                // window.location.href = 'login.html';
            }
            return response;
        } catch (error) {
            console.error('Error red/auth:', error);
            throw error;
        }
    }
}

// --- Lógica Principal ---

document.addEventListener('DOMContentLoaded', () => {
    // Variables de estado
    let orders = [];
    let products = [];
    let selectedStartDate = null;
    let selectedEndDate = null;
    let salesChart = null;
    let productDetailsChart = null;
    let topProductsChart = null;

    // Elementos DOM
    const ordersTableBody = document.getElementById('ordersTableBody');
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');
    const applyRangeBtn = document.getElementById('applyRangeFilter');
    const clearFilterBtn = document.getElementById('clearFilter');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const totalRevenueElement = document.getElementById('totalRevenue');
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsChartCanvas = document.getElementById('topProductsChart');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const orderDetailsModalLabel = document.getElementById('orderDetailsModalLabel');
    const orderDetailsTableBody = document.getElementById('orderDetailsTableBody');
    const orderDetailsTableFoot = document.getElementById('orderDetailsTableFoot');
    const productDetailsChartCanvas = document.getElementById('productDetailsChart');
    
    // Loader/Error
    const loaderElement = document.getElementById('orders-loader');
    const errorElement = document.getElementById('orders-error');

    // Validación elementos críticos
    if (!ordersTableBody) {
        console.warn("No se encontró la tabla de órdenes (ordersTableBody). ¿Estás en la página correcta?");
        return; 
    }

    // --- 1. VERIFICACIÓN DE SEGURIDAD ---
    const user = getUser();
    // Validamos rol de forma flexible (String o Objeto)
    let isAdmin = false;
    if (user) {
        if (user.rol && typeof user.rol === 'string' && user.rol.includes('ADMIN')) isAdmin = true;
        else if (user.rol && user.rol.name && user.rol.name.includes('ADMIN')) isAdmin = true;
        else if (Array.isArray(user.authorities) && user.authorities.some(a => a.authority.includes('ADMIN'))) isAdmin = true;
    }

    if (!getToken() || !isAdmin) {
        alert("Acceso Denegado: Se requieren permisos de Administrador.");
        window.location.href = 'login.html';
        return;
    }

    // --- 2. FUNCIONES UI ---
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
        } else alert(msg);
    }

    // --- 3. CARGA DE DATOS ---
    async function loadData() {
        showLoader("Cargando órdenes...");
        try {
            // CORRECCIÓN URL: Usamos rutas estándar RESTful
            const [ordersRes, productsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/pedidos`), // Antes /admin/pedidos -> Ahora estándar /pedidos (o ruta que configuraste)
                fetchWithAuth(`${API_BASE_URL}/productos`) // Antes /productos/admin/all -> Ahora estándar /productos
            ]);

            if (!ordersRes.ok) throw new Error(`Error órdenes (${ordersRes.status})`);
            if (!productsRes.ok) throw new Error(`Error productos (${productsRes.status})`);

            orders = await ordersRes.json();
            products = await productsRes.json();

            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();

        } catch (error) {
            console.error(error);
            showError("No se pudieron cargar los datos: " + error.message);
        } finally {
            hideLoader();
        }
    }

    // --- 4. RENDERIZADO TABLA ---
    function renderOrdersTable() {
        ordersTableBody.innerHTML = '';
        let filtered = filterOrders();

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No hay órdenes registradas.</td></tr>';
            return;
        }

        filtered.forEach(order => {
            const tr = document.createElement('tr');
            if (order.audAnulado) tr.classList.add('table-secondary', 'text-muted');

            // Cliente nombre seguro
            const clienteNombre = order.cliente ? `${order.cliente.nombre} ${order.cliente.apellido}` : 'Cliente Desconocido';
            const fecha = new Date(order.fecha_Pedido).toLocaleDateString('es-PE') + ' ' + new Date(order.fecha_Pedido).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'});
            
            // Selector de estado
            const estados = ['PENDIENTE', 'EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];
            let options = estados.map(est => 
                `<option value="${est}" ${order.estadoActual === est ? 'selected' : ''}>${est}</option>`
            ).join('');

            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${clienteNombre}</td>
                <td>${fecha}</td>
                <td>
                    <select class="form-select form-select-sm status-select" data-id="${order.id}" ${order.audAnulado ? 'disabled' : ''}>
                        ${options}
                    </select>
                </td>
                <td>S/ ${(order.total || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-view" data-id="${order.id}"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm ${order.audAnulado ? 'btn-success' : 'btn-danger'} btn-toggle" data-id="${order.id}">
                        <i class="bi ${order.audAnulado ? 'bi-check-lg' : 'bi-trash'}"></i>
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    }

    // --- 5. FILTROS ---
    function filterOrders() {
        let res = [...orders];
        if (selectedStartDate && selectedEndDate) {
            const start = new Date(selectedStartDate).setHours(0,0,0,0);
            const end = new Date(selectedEndDate).setHours(23,59,59,999);
            res = res.filter(o => {
                const d = new Date(o.fecha_Pedido).getTime();
                return d >= start && d <= end;
            });
        }
        return res;
    }

    if (applyRangeBtn) {
        applyRangeBtn.addEventListener('click', () => {
            selectedStartDate = startDateInput.value;
            selectedEndDate = endDateInput.value;
            renderOrdersTable();
            updateTotalRevenue();
        });
    }
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            selectedStartDate = null;
            selectedEndDate = null;
            renderOrdersTable();
            updateTotalRevenue();
        });
    }

    // --- 6. EVENTOS TABLA (Delegación) ---
    ordersTableBody.addEventListener('click', async (e) => {
        const btnView = e.target.closest('.btn-view');
        const btnToggle = e.target.closest('.btn-toggle');

        if (btnView) {
            const id = parseInt(btnView.dataset.id);
            const order = orders.find(o => o.id === id);
            showOrderDetails(order);
        }
        if (btnToggle) {
            const id = parseInt(btnToggle.dataset.id);
            await toggleOrderStatus(id);
        }
    });

    ordersTableBody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-select')) {
            const id = parseInt(e.target.dataset.id);
            const newStatus = e.target.value;
            await updateOrderStatus(id, newStatus);
        }
    });

    // --- 7. ACCIONES API ---
    async function updateOrderStatus(id, status) {
        try {
            showLoader("Actualizando estado...");
            // Ajustar endpoint según tu controlador. Usualmente PUT /pedidos/{id}
            const res = await fetchWithAuth(`${API_BASE_URL}/pedidos/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ estadoActual: status }) // O el body que espere tu backend
            });
            if (res.ok) {
                // Actualizar localmente sin recargar todo para UX rápida
                const order = orders.find(o => o.id === id);
                if(order) order.estadoActual = status;
                alert("Estado actualizado");
            } else throw new Error("Falló actualización");
        } catch (e) {
            showError("Error al actualizar estado");
            await loadData(); // Revertir cambios visuales recargando
        } finally { hideLoader(); }
    }

    async function toggleOrderStatus(id) {
        const order = orders.find(o => o.id === id);
        if (!order) return;
        const action = order.audAnulado ? 'reactivar' : 'anular';
        if(!confirm(`¿Deseas ${action} esta orden?`)) return;

        try {
            showLoader("Procesando...");
            // Asumimos DELETE para anular y PUT para reactivar
            const method = order.audAnulado ? 'PUT' : 'DELETE';
            const url = `${API_BASE_URL}/pedidos/${id}`;
            const body = order.audAnulado ? JSON.stringify({ audAnulado: false }) : null;

            const res = await fetchWithAuth(url, { method, body });
            
            if (res.ok) {
                await loadData();
            } else throw new Error("Error en servidor");
        } catch (e) {
            showError("No se pudo cambiar el estado de la orden");
        } finally { hideLoader(); }
    }

    // --- 8. DETALLES Y GRÁFICOS ---
    function showOrderDetails(order) {
        if (!orderDetailsModal) return;
        
        // Llenar tabla detalles
        orderDetailsTableBody.innerHTML = '';
        let total = 0;
        
        if (order.detalles) {
            order.detalles.forEach(d => {
                const sub = d.cantidad * d.precio_Unitario;
                total += sub;
                orderDetailsTableBody.innerHTML += `
                    <tr>
                        <td>${d.producto ? d.producto.producto : 'Producto ID '+d.producto_id}</td>
                        <td class="text-center">${d.cantidad}</td>
                        <td class="text-end">S/ ${d.precio_Unitario.toFixed(2)}</td>
                        <td class="text-end">S/ ${sub.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        // Llenar footer
        orderDetailsTableFoot.innerHTML = `
            <tr>
                <td colspan="3" class="text-end fw-bold">Total:</td>
                <td class="text-end fw-bold">S/ ${total.toFixed(2)}</td>
            </tr>
        `;

        // Mostrar modal
        const modal = new bootstrap.Modal(orderDetailsModal);
        modal.show();
    }

    function updateTotalRevenue() {
        if (!totalRevenueElement) return;
        const total = filterOrders().reduce((acc, o) => acc + (o.audAnulado ? 0 : o.total), 0);
        totalRevenueElement.textContent = `S/ ${total.toFixed(2)}`;
    }

    // Funciones placeholders para gráficos (Chart.js)
    function renderSalesChart() {
        if(!salesChartCanvas) return;
        // ... lógica de chart.js aquí (usar filterOrders() para datos dinámicos)
    }
    function renderTopProductsChart() {
        if(!topProductsChartCanvas) return;
        // ... lógica de chart.js aquí
    }

    // INICIALIZAR
    loadData();
});