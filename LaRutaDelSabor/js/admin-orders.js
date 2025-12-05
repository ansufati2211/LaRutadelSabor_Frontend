// js/admin-orders.js

// NOTA: Este archivo depende de que 'admin.js' se haya cargado antes en el HTML.
// Reutiliza API_BASE_URL, fetchWithAuth, etc. de admin.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- Panel de Admin - Órdenes Iniciado ---');

    // Variables globales locales para este script
    let orders = [];
    let products = [];
    let selectedStartDate = null;
    let selectedEndDate = null;
    
    // Variables para gráficos (Chart.js)
    let salesChart = null;
    let topProductsChart = null;
    let productDetailsChart = null; // Definir variable faltante

    // Elementos del DOM específicos de Órdenes
    const ordersTableBody = document.getElementById('ordersTableBody');
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');
    const applyRangeBtn = document.getElementById('applyRangeFilter');
    const clearFilterBtn = document.getElementById('clearFilter');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const totalRevenueElement = document.getElementById('totalRevenue');
    
    // Elementos de Modales y Gráficos
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsChartCanvas = document.getElementById('topProductsChart');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const orderDetailsModalLabel = document.getElementById('orderDetailsModalLabel');
    const orderDetailsTableBody = document.getElementById('orderDetailsTableBody');
    const orderDetailsTableFoot = document.getElementById('orderDetailsTableFoot');
    const productDetailsChartCanvas = document.getElementById('productDetailsChart');

    // Validación básica de existencia de elementos antes de continuar
    if (!ordersTableBody) {
        console.warn("No se encontraron elementos de la tabla de órdenes. ¿Estás en la pestaña correcta?");
        return;
    }

    // --- Funciones de Utilidad para Loader (Reutilizando estilos de admin.js si existen) ---
    function showOrderLoader(msg) {
        // Intenta usar el loader global o imprime en consola
        const loader = document.getElementById('admin-loader');
        if (loader) {
            loader.textContent = msg;
            loader.style.display = 'block';
        } else {
            console.log("Cargando: " + msg);
        }
    }

    function hideOrderLoader() {
        const loader = document.getElementById('admin-loader');
        if (loader) loader.style.display = 'none';
    }

    // ============================================
    // LÓGICA DE NEGOCIO
    // ============================================

    // Mapeo de Estados (Backend -> UI)
    const estadoBackendMap = {
        'RECIBIDO': 'Recibido',
        'EN_PREPARACION': 'En Preparación',
        'EN_RUTA': 'En Ruta',
        'ENTREGADO': 'Entregado',
        'CANCELADO': 'Cancelado'
    };

    const estadoSelectMap = {
        'Recibido': 'RECIBIDO',
        'En Preparación': 'EN_PREPARACION',
        'En Ruta': 'EN_RUTA',
        'Entregado': 'ENTREGADO',
        'Cancelado': 'CANCELADO'
    };

    function getEstadoDisplay(estadoBackend) {
        return estadoBackendMap[estadoBackend] || estadoBackend || 'Desconocido';
    }

    function getEstadoBackendValue(estadoDisplay) {
        return estadoSelectMap[estadoDisplay] || 'RECIBIDO';
    }

    // Cargar datos iniciales
    async function fetchOrdersAndProducts() {
        showOrderLoader("Actualizando órdenes...");
        try {
            // Usamos fetchWithAuth definido en admin.js
            const [ordersRes, productsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/admin/pedidos`),
                fetchWithAuth(`${API_BASE_URL}/productos/admin/all`) // O la ruta pública /productos si prefieres
            ]);

            if (!ordersRes.ok) throw new Error("Error cargando pedidos");
            if (!productsRes.ok) throw new Error("Error cargando productos");

            orders = await ordersRes.json();
            products = await productsRes.json();

            // Renderizar inicial
            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();

        } catch (error) {
            console.error("Error en órdenes:", error);
            // Mostrar error visualmente si es posible
            if(ordersTableBody) ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${error.message}</td></tr>`;
        } finally {
            hideOrderLoader();
        }
    }

    // Filtrado de Datos
    function getFilteredOrders() {
        let filtered = orders || [];

        // Filtro por fecha (CORREGIDO: usa fechaPedido)
        if (selectedStartDate && selectedEndDate) {
            const start = new Date(selectedStartDate + 'T00:00:00');
            const end = new Date(selectedEndDate + 'T23:59:59');

            filtered = filtered.filter(order => {
                // CORRECCIÓN CLAVE: Backend envía 'fechaPedido' (camelCase)
                const fechaStr = order.fechaPedido || order.fecha_Pedido; // Soporte híbrido por si acaso
                const orderDate = new Date(fechaStr);
                return !isNaN(orderDate) && orderDate >= start && orderDate <= end;
            });
        }
        return filtered;
    }

    // Renderizado de Tabla
    function renderOrdersTable() {
        ordersTableBody.innerHTML = '';
        const filteredOrders = getFilteredOrders();

        if (filteredOrders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay órdenes registradas.</td></tr>';
            return;
        }

        filteredOrders.forEach(order => {
            const tr = document.createElement('tr');
            if (order.audAnulado) tr.classList.add('table-secondary', 'text-muted');

            // Formatear fecha
            const fechaStr = order.fechaPedido || order.fecha_Pedido;
            const formattedDate = new Date(fechaStr).toLocaleString('es-PE', {
                dateStyle: 'short', timeStyle: 'short'
            });

            const clienteNombre = order.cliente ? `${order.cliente.nombre} ${order.cliente.apellido}` : 'Cliente Eliminado';
            const estadoActual = order.estadoActual || 'DESCONOCIDO';

            // Selector de estado
            let statusOptions = '';
            for (const [key, val] of Object.entries(estadoBackendMap)) {
                const selected = key === estadoActual ? 'selected' : '';
                statusOptions += `<option value="${val}" ${selected}>${val}</option>`;
            }

            tr.innerHTML = `
                <td>${order.id}</td>
                <td>${clienteNombre}</td>
                <td>${formattedDate}</td>
                <td>
                    <select class="form-select form-select-sm status-select" data-id="${order.id}" ${order.audAnulado ? 'disabled' : ''}>
                        ${statusOptions}
                    </select>
                </td>
                <td>S/ ${(order.total || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-naranja view-details-btn" data-id="${order.id}"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm ${order.audAnulado ? 'btn-success' : 'btn-danger'} toggle-order-btn" data-id="${order.id}">
                        <i class="bi ${order.audAnulado ? 'bi-check-lg' : 'bi-trash'}"></i>
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    }

    // Eventos de la Tabla (Delegación)
    ordersTableBody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-details-btn');
        const toggleBtn = e.target.closest('.toggle-order-btn');

        if (viewBtn) {
            const id = parseInt(viewBtn.dataset.id);
            const order = orders.find(o => o.id === id);
            if(order) showOrderDetails(order);
        }
        
        if (toggleBtn) {
            const id = parseInt(toggleBtn.dataset.id);
            const order = orders.find(o => o.id === id);
            if(order) toggleOrderStatus(id, order.audAnulado);
        }
    });

    ordersTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const id = parseInt(e.target.dataset.id);
            const newStatusDisplay = e.target.value;
            const newStatusBackend = getEstadoBackendValue(newStatusDisplay);
            updateOrderState(id, newStatusBackend);
        }
    });

    // Actualizar Estado
    async function updateOrderState(id, nuevoEstado) {
        try {
            showOrderLoader("Actualizando estado...");
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${id}/estado`, {
                method: 'PUT',
                body: JSON.stringify({ nuevoEstado: nuevoEstado, notas: "Cambio desde Admin Panel" })
            });
            if(res.ok) {
                // Actualizar localmente sin recargar todo para mejor UX
                const order = orders.find(o => o.id === id);
                if(order) order.estadoActual = nuevoEstado;
                alert("Estado actualizado correctamente.");
            } else {
                throw new Error("Fallo al actualizar");
            }
        } catch(e) {
            alert(e.message);
            fetchOrdersAndProducts(); // Recargar para revertir cambios visuales
        } finally {
            hideOrderLoader();
        }
    }

    // Anular/Reactivar Orden
    async function toggleOrderStatus(id, isAnulado) {
        if(!confirm(isAnulado ? "¿Reactivar orden?" : "¿Anular orden?")) return;
        
        // Asumiendo que tu backend soporta DELETE lógico en esta ruta o un PUT específico
        // Si no tienes endpoint de anular, esto fallará. Ajustar según tu API.
        const method = isAnulado ? 'PUT' : 'DELETE'; 
        const url = `${API_BASE_URL}/admin/pedidos/${id}`; 
        
        try {
            const res = await fetchWithAuth(url, { 
                method: method,
                // Si es PUT para reactivar, a veces se necesita body. Ajustar según backend.
                body: isAnulado ? JSON.stringify({audAnulado: false}) : null 
            });
            
            if(res.ok || res.status === 204) {
                fetchOrdersAndProducts();
            } else {
                alert("No se pudo cambiar el estado de anulación.");
            }
        } catch(e) {
            console.error(e);
        }
    }

    // Detalles del Modal
    function showOrderDetails(order) {
        if(!orderDetailsModal) return;
        
        orderDetailsModalLabel.textContent = `Orden #${order.id}`;
        orderDetailsTableBody.innerHTML = '';
        orderDetailsTableFoot.innerHTML = '';

        let subtotalCalc = 0;
        
        if(order.detalles) {
            order.detalles.forEach(det => {
                const prodName = det.producto ? det.producto.producto : 'Producto eliminado';
                const precio = det.producto ? det.producto.precio : 0;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${prodName}</td>
                    <td class="text-center">${det.cantidad}</td>
                    <td class="text-end">S/ ${precio.toFixed(2)}</td>
                    <td class="text-end">S/ ${det.subtotal.toFixed(2)}</td>
                `;
                orderDetailsTableBody.appendChild(tr);
                subtotalCalc += det.subtotal;
            });
        }

        // Footer con totales
        // CORRECCIÓN CLAVE: Backend envía 'montoAgregado' (camelCase)
        const deliveryCost = order.montoAgregado || order.monto_Agregado || 0;
        
        orderDetailsTableFoot.innerHTML = `
            <tr>
                <td colspan="3" class="text-end fw-bold">Subtotal:</td>
                <td class="text-end">S/ ${subtotalCalc.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="3" class="text-end">Delivery:</td>
                <td class="text-end">S/ ${parseFloat(deliveryCost).toFixed(2)}</td>
            </tr>
            <tr class="table-active">
                <td colspan="3" class="text-end fw-bold">TOTAL:</td>
                <td class="text-end fw-bold">S/ ${order.total.toFixed(2)}</td>
            </tr>
        `;

        // Renderizar mini gráfico en modal
        renderProductDetailsChartInModal(order);

        // Abrir modal (Bootstrap 5)
        const modal = new bootstrap.Modal(orderDetailsModal);
        modal.show();
    }

    // Gráficos y Estadísticas
    function updateTotalRevenue() {
        if(!totalRevenueElement) return;
        const total = getFilteredOrders()
            .filter(o => !o.audAnulado)
            .reduce((sum, o) => sum + (o.total || 0), 0);
        totalRevenueElement.textContent = `S/ ${total.toFixed(2)}`;
    }

    function renderSalesChart() {
        if(!salesChartCanvas) return;
        
        const dataMap = {};
        getFilteredOrders().forEach(o => {
            if(o.audAnulado) return;
            const fecha = (o.fechaPedido || o.fecha_Pedido || '').split('T')[0];
            dataMap[fecha] = (dataMap[fecha] || 0) + o.total;
        });

        const labels = Object.keys(dataMap).sort();
        const data = labels.map(k => dataMap[k]);

        if(salesChart) salesChart.destroy();
        
        salesChart = new Chart(salesChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas (S/)',
                    data: data,
                    backgroundColor: 'rgba(255, 102, 0, 0.7)'
                }]
            }
        });
    }

    function renderTopProductsChart() {
        if(!topProductsChartCanvas) return;
        // Lógica simplificada para top productos
        const prodCount = {};
        getFilteredOrders().forEach(o => {
            if(o.audAnulado || !o.detalles) return;
            o.detalles.forEach(d => {
                const name = d.producto ? d.producto.producto : 'Otros';
                prodCount[name] = (prodCount[name] || 0) + d.cantidad;
            });
        });

        // Top 5
        const sorted = Object.entries(prodCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
        
        if(topProductsChart) topProductsChart.destroy();

        topProductsChart = new Chart(topProductsChartCanvas, {
            type: 'doughnut',
            data: {
                labels: sorted.map(x => x[0]),
                datasets: [{
                    data: sorted.map(x => x[1]),
                    backgroundColor: ['#FF6600', '#FF9933', '#FFCC66', '#CC5200', '#993D00']
                }]
            }
        });
    }

    function renderProductDetailsChartInModal(order) {
        if (!productDetailsChartCanvas) return;
        
        const labels = (order.detalles || []).map(d => d.producto ? d.producto.producto : 'N/A');
        const data = (order.detalles || []).map(d => d.subtotal);

        if (productDetailsChart) productDetailsChart.destroy();

        productDetailsChart = new Chart(productDetailsChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Subtotal por Item',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }]
            },
            options: { indexAxis: 'y' }
        });
    }

    // Filtros
    if(applyRangeBtn) {
        applyRangeBtn.addEventListener('click', () => {
            selectedStartDate = startDateInput.value;
            selectedEndDate = endDateInput.value;
            if(!selectedStartDate || !selectedEndDate) {
                alert("Seleccione ambas fechas");
                return;
            }
            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();
        });
    }

    if(clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            selectedStartDate = null;
            selectedEndDate = null;
            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();
        });
    }

    // Inicializar
    fetchOrdersAndProducts();
});