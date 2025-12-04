// js/admin-orders.js

// --- Funciones Auxiliares de Autenticación y API ---
// (Incluidas para que este archivo sea autosuficiente)

// Definir la URL base de tu API backend
//const API_BASE_URL = 'https://larutadelsaborbackend-production.up.railway.app/api';
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

// ASUNCIÓN: Chart.js está cargado globalmente en tu HTML.
// ASUNCIÓN: Funciones como logout() están definidas globalmente si se usan en el nav/header.

// --- Comienzo del script de la página de Admin Órdenes ---

document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let orders = [];        // Almacenará los pedidos del backend
    let products = [];      // Almacenará los productos del backend (para lookup de nombres)
    let selectedStartDate = null;
    let selectedEndDate = null;
    let salesChart = null;
    let productDetailsChart = null;
    let topProductsChart = null;

    // Elementos del DOM
    const ordersTableBody = document.getElementById('ordersTableBody');
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');
    const applyRangeBtn = document.getElementById('applyRangeFilter');
    const clearFilterBtn = document.getElementById('clearFilter');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const totalRevenueElement = document.getElementById('totalRevenue');
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsChartCanvas = document.getElementById('topProductsChart');
    const orderDetailsModal = document.getElementById('orderDetailsModal'); // Modal completo
    const orderDetailsModalLabel = document.getElementById('orderDetailsModalLabel');
    const orderDetailsTableBody = document.getElementById('orderDetailsTableBody');
    const orderDetailsTableFoot = document.getElementById('orderDetailsTableFoot'); // Para mostrar delivery
    const productDetailsChartCanvas = document.getElementById('productDetailsChart');

    // Loader/Error elements (añade divs con estos IDs a tu HTML)
    const loaderElement = document.getElementById('orders-loader');
    const errorElement = document.getElementById('orders-error');

    // Validar elementos esenciales
    if (!ordersTableBody || !startDateInput || !endDateInput || !applyRangeBtn || !clearFilterBtn || !generateReportBtn || !totalRevenueElement || !salesChartCanvas || !topProductsChartCanvas || !orderDetailsModal) {
        showAdminError("Error crítico: Faltan elementos HTML esenciales para el panel de órdenes.");
        return;
    }

    // --- Validación de Acceso (Admin) ---
    const token = getToken();
    const user = getUser();
    let userRole = null;
    if (user?.rol?.name) { // Usar optional chaining
        userRole = user.rol.name.replace("ROLE_", "");
    } else if (user?.roles) {
        // Manejar el formato de Spring Security (array de {authority: "ROLE_..."})
        if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority === "ROLE_ADMIN")) {
            userRole = "ADMIN";
        }
    }

    if (!token || userRole !== 'ADMIN') {
        alert('Acceso denegado. Solo administradores.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    console.log("Acceso de Administrador verificado para Órdenes.");

    // --- Funciones Loader/Error (Implementa la parte visual) ---
    function showAdminLoader(message = "Procesando...") {
        if (loaderElement) {
            loaderElement.textContent = message;
            loaderElement.style.display = 'block';
        }
        if (errorElement) errorElement.style.display = 'none';
        console.log(message);
    }
    function hideAdminLoader() {
        if (loaderElement) loaderElement.style.display = 'none';
    }
    function showAdminError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else { // Fallback si no hay div de error
            alert(message);
        }
        console.error(message);
    }
    function clearAdminError() {
        if (errorElement) errorElement.style.display = 'none';
    }

    // ============================================
    // MAPEO DE ESTADOS (Backend -> UI y UI -> Backend)
    // ============================================
    // MODIFICADO: Mapea estados del backend a texto legible y a valor para el select
    const estadoBackendMap = {
        'RECIBIDO': 'Recibido',
        'EN_PREPARACION': 'En Preparación',
        'EN_RUTA': 'En Ruta',
        'ENTREGADO': 'Entregado',
        'CANCELADO': 'Cancelado'
        // Añade más si tu backend los usa
    };
    const estadoSelectMap = {
        'Recibido': 'RECIBIDO',
        'En Preparación': 'EN_PREPARACION',
        'En Ruta': 'EN_RUTA',
        'Entregado': 'ENTREGADO',
        'Cancelado': 'CANCELADO'
    };

    function getEstadoDisplay(estadoBackend) {
        return estadoBackendMap[estadoBackend] || estadoBackend || 'Desconocido'; // Devuelve el mapeado o el original
    }
    function getEstadoBackendValue(estadoDisplay) {
        return estadoSelectMap[estadoDisplay] || 'RECIBIDO'; // Devuelve valor para backend o default
    }


    /**
     * MODIFICADO: Carga órdenes y productos desde el backend Spring Boot.
     */
    async function fetchOrdersAndProducts() {
        showAdminLoader("Cargando órdenes y productos...");
        clearAdminError();

        try {
            // Ya no cargamos usuarios.json
            console.log("Cargando órdenes y productos desde API...");
            const [ordersRes, productsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/admin/pedidos`), // Endpoint admin para pedidos
                fetchWithAuth(`${API_BASE_URL}/productos/admin/all`) // Endpoint admin para productos
            ]);

            async function handleResponseError(response, entityName) {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` }));
                    throw new Error(`Error al cargar ${entityName}: ${errorData.error || response.statusText}`);
                }
                return response.json();
            }

            // Procesar respuestas
            orders = await handleResponseError(ordersRes, "órdenes");
            products = await handleResponseError(productsRes, "productos");

            console.log(`✅ Órdenes cargadas: ${orders.length}`);
            console.log(`✅ Productos cargados: ${products.length}`);

            // Log de estados recibidos
            const estadosCounts = orders.reduce((acc, order) => {
                const estado = order.estadoActual || 'DESCONOCIDO';
                acc[estado] = (acc[estado] || 0) + 1;
                return acc;
            }, {});
            console.log('📊 Conteo de estados recibidos:', estadosCounts);


            // Inicializar UI si hay órdenes
            if (orders) { // Verificar si orders no es null/undefined
                setupDateFilters();
                renderOrdersTable(); // Render inicial sin filtro
                updateTotalRevenue();
                renderSalesChart();
                renderTopProductsChart();
            } else {
                showAdminError('No se recibieron órdenes del servidor.');
            }

        } catch (error) {
            console.error('❌ Error general al cargar datos:', error);
            showAdminError(`Error general al cargar datos: ${error.message}`);
            // Limpiar UI en caso de error grave
            if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-4">Error al cargar órdenes</td></tr>';
            if (totalRevenueElement) totalRevenueElement.textContent = 'S/ 0.00';
            // Podrías limpiar los gráficos también
        } finally {
            hideAdminLoader();
        }
    }

    /** Configura filtros de fecha */
    function setupDateFilters() {
        applyRangeBtn.addEventListener('click', () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            // Validaciones (vacío, rango) como antes...
            if (!startDate || !endDate) {
                return alert('Selecciona ambas fechas.');
            }
            if (new Date(startDate) > new Date(endDate)) {
                return alert('La fecha de inicio no puede ser posterior a la de fin.');
            }
            selectedStartDate = startDate;
            selectedEndDate = endDate;
            // Re-renderizar todo con el filtro aplicado
            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();
        });

        clearFilterBtn.addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            selectedStartDate = null;
            selectedEndDate = null;
            // Re-renderizar todo sin filtro
            renderOrdersTable();
            updateTotalRevenue();
            renderSalesChart();
            renderTopProductsChart();
        });

        generateReportBtn.addEventListener('click', generateReport);
    }

    /**
     * MODIFICADO: Filtra órdenes usando `fecha_Pedido`.
     */
    function getFilteredOrders() {
        // Empezar con todas las órdenes cargadas
        let filtered = orders || [];

        // Filtrar por anulados (opcional, por defecto mostrar todos a admin)
        // filtered = filtered.filter(order => !order.audAnulado);

        // Filtrar por fecha si hay rango seleccionado
        if (selectedStartDate && selectedEndDate) {
            try {
                // Convertir límites a objetos Date (solo parte fecha)
                const start = new Date(selectedStartDate + 'T00:00:00');
                const end = new Date(selectedEndDate + 'T23:59:59'); // Incluir todo el día final

                if (isNaN(start) || isNaN(end)) {
                    console.error("Fechas de filtro inválidas");
                    return filtered; // Devuelve sin filtrar por fecha si son inválidas
                }


                filtered = filtered.filter(order => {
                    // Convertir fecha del pedido a objeto Date
                    const orderDate = new Date(order.fecha_Pedido); // Usar fecha_Pedido
                    return !isNaN(orderDate) && orderDate >= start && orderDate <= end;
                });
            } catch (e) {
                console.error("Error al filtrar fechas:", e);
                // Devolver sin filtrar por fecha si hay error
            }
        }
        return filtered;
    }


    /**
     * MODIFICADO: Actualiza el estado de una orden llamando al backend.
     */
    async function updateOrderStatus(orderId, newStatusDisplay) {
        clearAdminError(); // Limpiar errores
        const order = orders.find(o => o.id === orderId); // Buscar por 'id'
        if (!order) {
            console.error(`Orden ${orderId} no encontrada localmente para actualizar estado.`);
            return;
        }
        const oldStatusDisplay = getEstadoDisplay(order.estadoActual); // Guardar estado anterior

        // Convertir UI display a valor del backend
        const newStatusBackend = getEstadoBackendValue(newStatusDisplay);
        if (!newStatusBackend) {
            console.error(`Valor de estado inválido seleccionado: ${newStatusDisplay}`);
            // Revertir select visualmente
            const selectElement = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
            if (selectElement) selectElement.value = oldStatusDisplay;
            return;
        }


        console.log(`📤 Admin cambiando estado de orden ${orderId} de ${order.estadoActual} a "${newStatusBackend}"`);
        showAdminLoader("Actualizando estado...");

        try {
            // Llamar al endpoint PUT de admin para cambiar estado
            const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${orderId}/estado`, {
                method: 'PUT',
                body: JSON.stringify({
                    nuevoEstado: newStatusBackend,
                    notas: `Actualizado por admin ${user?.correo || ''} vía panel.` // Nota opcional
                })
            });

            const result = await response.json(); // Espera el Pedido actualizado o ErrorResponseDTO

            if (response.ok) {
                console.log(`✅ Estado de orden ${orderId} actualizado a "${result.estadoActual}"`);
                // Actualizar estado en el array local 'orders'
                order.estadoActual = result.estadoActual; // Usar el estado confirmado por el backend
                order.historialEstados = result.historialEstados; // Actualizar historial si lo devuelve
                // No es necesario re-renderizar toda la tabla, el select ya cambió
                // renderOrdersTable(); // Podría causar pérdida de foco si se re-renderiza todo
                alert(`Estado de la orden ${orderId} actualizado a ${getEstadoDisplay(result.estadoActual)}.`);
            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error al actualizar estado de orden ${orderId}:`, error);
            showAdminError(`Error al actualizar estado: ${error.message}`);
            // Revertir el select al estado anterior en caso de error
            const selectElement = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
            if (selectElement) {
                selectElement.value = oldStatusDisplay;
            }
        } finally {
            hideAdminLoader();
        }
    }


    /**
     * MODIFICADO: Renderiza la tabla de órdenes usando datos del backend.
     */
    function renderOrdersTable() {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = ''; // Limpiar

        const filteredOrders = getFilteredOrders();

        if (filteredOrders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No hay órdenes que coincidan con los filtros.</td></tr>';
            return;
        }

        filteredOrders.forEach(order => {
            // Validar datos básicos de la orden
            if (!order || order.id === undefined || !order.cliente || order.total === undefined || order.fecha_Pedido === undefined) {
                console.warn("Orden inválida encontrada:", order);
                return; // Saltar orden inválida
            }

            // Obtener nombre del cliente desde el objeto anidado
            const clienteNombreCompleto = `${order.cliente.nombre || ''} ${order.cliente.apellido || 'Desconocido'}`.trim();

            const tr = document.createElement('tr');
            // Marcar visualmente si está anulado
            if (order.audAnulado) {
                tr.classList.add('opacity-50', 'bg-gray-100', 'anulado');
                tr.title = "Esta orden está anulada";
            }

            // Formatear fecha
            const formattedDate = new Date(order.fecha_Pedido).toLocaleString('es-PE', { // Usar fecha_Pedido
                dateStyle: 'short', timeStyle: 'short'
            });

            // Obtener estado actual y su display
            const estadoActualBackend = order.estadoActual || 'DESCONOCIDO';
            const estadoActualDisplay = getEstadoDisplay(estadoActualBackend);

            tr.innerHTML = `
                <td>${order.id}</td>
                <td>${clienteNombreCompleto}</td>
                <td>${formattedDate}</td>
                <td>
                    <select class="status-select form-select form-select-sm" data-order-id="${order.id}" ${order.audAnulado ? 'disabled' : ''}>
                        ${Object.entries(estadoBackendMap).map(([backendValue, displayValue]) =>
                            `<option value="${displayValue}" ${estadoActualBackend === backendValue ? 'selected' : ''}>${displayValue}</option>`
                        ).join('')}
                    </select>
                </td>
                <td>S/ ${(order.total || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-naranja view-details-btn" data-order-id="${order.id}">
                        <i class="bi bi-eye"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm ${order.audAnulado ? 'btn-success' : 'btn-danger'} action-toggle-order ms-1" data-id="${order.id}" title="${order.audAnulado ? 'Reactivar' : 'Anular'} Orden">
                        <i class="bi ${order.audAnulado ? 'bi-check-circle' : 'bi-trash'}"></i>
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });

        // Añadir listeners después de renderizar (usando event delegation)
        setupTableListeners();
    }

    // NUEVO: Configura listeners para la tabla de órdenes (event delegation)
    function setupTableListeners() {
        if (!ordersTableBody._listenersAttached) { // Evitar añadir listeners múltiples veces
            ordersTableBody.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-details-btn[data-order-id]');
                const toggleBtn = e.target.closest('.action-toggle-order[data-id]');

                if (viewBtn) {
                    const orderId = parseInt(viewBtn.dataset.orderId, 10);
                    const order = orders.find(o => o.id === orderId);
                    if (order) showOrderDetails(order);
                } else if (toggleBtn) {
                    const orderId = parseInt(toggleBtn.dataset.id, 10);
                    const order = orders.find(o => o.id === orderId);
                    if (order) toggleOrderStatusAnulado(orderId, order.audAnulado); // Llama a nueva función
                }
            });

            ordersTableBody.addEventListener('change', (e) => {
                const selectStatus = e.target.closest('.status-select[data-order-id]');
                if (selectStatus) {
                    const orderId = parseInt(selectStatus.dataset.orderId, 10);
                    const newStatusDisplay = selectStatus.value;
                    updateOrderStatus(orderId, newStatusDisplay); // Llama a la función de actualización
                }
            });
            ordersTableBody._listenersAttached = true; // Marcar como añadidos
        }
    }

    // NUEVO: Función para anular/reactivar orden (similar a productos/categorías)
    async function toggleOrderStatusAnulado(id, currentStatus) {
        const action = currentStatus ? "reactivar" : "anular";
        const confirmMessage = `¿Seguro que deseas ${action} esta orden?`;

        if (confirm(confirmMessage)) {
            showAdminLoader(`${currentStatus ? "Reactivando" : "Anulando"} orden...`);
            clearAdminError();
            try {
                let response;
                if (currentStatus) { // Reactivar -> PUT con audAnulado=false
                    const orderToReactivate = orders.find(o => o.id === id);
                    if (!orderToReactivate) throw new Error("Orden no encontrada localmente.");
                    // ¡CUIDADO! Necesitas enviar un DTO que el backend acepte para actualizar solo audAnulado,
                    // o enviar el objeto completo asegurándote que los datos sean correctos.
                    // Por simplicidad, asumiremos que el PUT general permite cambiar audAnulado.
                    orderToReactivate.audAnulado = false; // Cambiar estado
                    // Adaptar el payload según lo que espere tu PUT /api/admin/pedidos/{id}
                    const updatePayload = { ...orderToReactivate, cliente: { id: orderToReactivate.cliente.id } /* , etc. */ };
                    // Eliminar campos que no se deben enviar o que causan problemas (ej. listas anidadas si no se manejan bien)
                    delete updatePayload.historialEstados; delete updatePayload.detalles; /* ...otros */

                    response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${id}`, { // Asume PUT general
                        method: 'PUT',
                        body: JSON.stringify(updatePayload)
                    });
                } else { // Anular -> DELETE lógico
                    response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${id}`, {
                        method: 'DELETE'
                    });
                }

                if (response.ok || response.status === 204) {
                    // *** CORRECCIÓN ***
                    await fetchOrdersAndProducts(); // Recargar datos (en lugar de fetchData())
                    alert(`Orden ${action} correctamente.`);
                } else {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
                    throw new Error(errorData.error || `Error del servidor al ${action}.`);
                }
            } catch (error) {
                console.error(`Error al ${action} orden:`, error);
                showAdminError(`Error al ${action} la orden: ${error.message}`);
            } finally {
                hideAdminLoader();
            }
        }
    }


    /**
     * MODIFICADO: Agrega datos de ventas por día usando `fecha_Pedido`.
     */
    function aggregateDailySales() {
        const filteredOrders = getFilteredOrders();
        const dailySales = {};

        filteredOrders.forEach(order => {
            // Solo contar órdenes no anuladas para ventas
            if (order.audAnulado) return;

            try {
                // Usar fecha_Pedido
                const date = new Date(order.fecha_Pedido);
                // Formato 'YYYY-MM-DD' para ordenar correctamente como string
                const dayKey = date.toISOString().split('T')[0];
                dailySales[dayKey] = (dailySales[dayKey] || 0) + (order.total || 0);
            } catch (e) {
                console.warn("Fecha inválida en orden:", order.id, order.fecha_Pedido);
            }
        });

        // Ordenar por fecha (YYYY-MM-DD se ordena alfabéticamente)
        const sortedDates = Object.keys(dailySales).sort();

        // Formatear etiquetas a dd/mm/yyyy para mostrar en gráfico
        const formattedLabels = sortedDates.map(dateStr => {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        });


        return {
            labels: formattedLabels, // Etiquetas formateadas
            data: sortedDates.map(date => dailySales[date]) // Datos correspondientes
        };
    }

    /**
     * MODIFICADO: Agrega datos de productos más vendidos usando `detalles`.
     */
    function aggregateTopProducts() {
        const filteredOrders = getFilteredOrders();
        const productQuantities = {};

        filteredOrders.forEach(order => {
            // Solo contar items de órdenes no anuladas
            if (order.audAnulado || !order.detalles) return;

            order.detalles.forEach(item => {
                // Obtener nombre del producto desde el objeto anidado
                const productName = item.producto?.producto || `ID:${item.producto?.id || '?'}`; // Nombre o ID
                productQuantities[productName] = (productQuantities[productName] || 0) + (item.cantidad || 0);
            });
        });

        const sortedProducts = Object.entries(productQuantities)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10); // Top 10

        return {
            labels: sortedProducts.map(p => p.name),
            data: sortedProducts.map(p => p.quantity)
        };
    }

    // --- Renderizado de Gráficos (Sin cambios funcionales, solo validación de canvas) ---
    function renderSalesChart() {
        if (!salesChartCanvas) return; // Salir si no existe
        const ctx = salesChartCanvas.getContext('2d');
        const { labels, data } = aggregateDailySales();
        if (salesChart) salesChart.destroy(); // Destruir gráfico anterior

        const chartTitle = selectedStartDate && selectedEndDate
            ? `Ventas ${new Date(selectedStartDate + 'T00:00:00').toLocaleDateString('es-PE')} - ${new Date(selectedEndDate + 'T00:00:00').toLocaleDateString('es-PE')}`
            : 'Ventas por Día (S/)';

        salesChart = new Chart(ctx, {
            type: 'bar', data: { labels: labels, datasets: [{ label: chartTitle, data: data, backgroundColor: 'rgba(255, 102, 0, 0.6)', borderColor: 'rgba(255, 102, 0, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Ventas (S/)' } }, x: { title: { display: true, text: 'Fecha' } } }, plugins: { legend: { display: true, position: 'top' } } }
        });
    }
    function renderTopProductsChart() {
        if (!topProductsChartCanvas) return; // Salir si no existe
        const ctx = topProductsChartCanvas.getContext('2d');
        const { labels, data } = aggregateTopProducts();
        if (topProductsChart) topProductsChart.destroy();

        topProductsChart = new Chart(ctx, {
            type: 'pie', data: { labels: labels, datasets: [{ label: 'Unidades Vendidas', data: data, backgroundColor: ['rgba(255, 102, 0, 0.8)', 'rgba(255, 147, 51, 0.8)', 'rgba(255, 204, 153, 0.8)', 'rgba(204, 102, 0, 0.8)', 'rgba(255, 153, 102, 0.8)', 'rgba(255, 51, 0, 0.8)', 'rgba(255, 178, 102, 0.8)', 'rgba(255, 128, 0, 0.8)', 'rgba(230, 92, 0, 0.8)', 'rgba(255, 165, 0, 0.8)'], borderColor: '#fff', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 20 } }, tooltip: { callbacks: { label: (c) => `${c.label || ''}: ${c.raw || 0} unidades` } } } }
        });
    }


    /**
     * MODIFICADO: Muestra detalles de una orden usando datos del backend.
     */
    function showOrderDetails(order) {
        // Validar elementos del modal
        if (!orderDetailsModal || !orderDetailsModalLabel || !orderDetailsTableBody || !orderDetailsTableFoot || !productDetailsChartCanvas) {
            console.error("Faltan elementos HTML en el modal de detalles.");
            return;
        }

        orderDetailsModalLabel.textContent = `Detalles de la Orden #${order.id}`;
        orderDetailsTableBody.innerHTML = '';
        orderDetailsTableFoot.innerHTML = ''; // Limpiar pie de tabla

        let calculatedSubtotal = 0;

        if (!order.detalles || order.detalles.length === 0) {
            orderDetailsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Esta orden no tiene productos detallados.</td></tr>';
        } else {
            order.detalles.forEach(item => {
                // Validar item y producto
                if (!item || !item.producto || item.cantidad === undefined || item.subtotal === undefined) {
                    console.warn("Item de detalle inválido en modal:", item);
                    return;
                }
                calculatedSubtotal += item.subtotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.producto.producto || 'N/A'}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-end">S/ ${(item.producto.precio || 0).toFixed(2)}</td>
                    <td class="text-end">S/ ${(item.subtotal || 0).toFixed(2)}</td>
                `;
                orderDetailsTableBody.appendChild(tr);
            });
        }

        // Mostrar Subtotal calculado de los items
        const subtotalRow = document.createElement('tr');
        subtotalRow.innerHTML = `<td colspan="3" class="text-end"><strong>Subtotal Productos:</strong></td><td class="text-end"><strong>S/ ${calculatedSubtotal.toFixed(2)}</strong></td>`;
        orderDetailsTableFoot.appendChild(subtotalRow);


        // Mostrar costo de envío si existe
        if (order.monto_Agregado !== undefined && order.monto_Agregado > 0) {
            const deliveryRow = document.createElement('tr');
            deliveryRow.innerHTML = `
                <td colspan="3" class="text-end">Costo de Envío:</td>
                <td class="text-end">S/ ${order.monto_Agregado.toFixed(2)}</td>
            `;
            orderDetailsTableFoot.appendChild(deliveryRow);
        }

        // Mostrar Total del pedido
        const totalRow = document.createElement('tr');
        totalRow.innerHTML = `<td colspan="3" class="text-end"><strong>Total Orden:</strong></td><td class="text-end"><strong>S/ ${(order.total || 0).toFixed(2)}</strong></td>`;
        orderDetailsTableFoot.appendChild(totalRow);


        // Renderizar gráfico de detalles (adaptado)
        renderProductDetailsChartInModal(order);

        // Mostrar modal usando Bootstrap 5 API
        const modal = bootstrap.Modal.getOrCreateInstance(orderDetailsModal);
        modal.show();
    }

    /**
     * MODIFICADO: Renderiza gráfico de detalles DENTRO del modal.
     */
    function renderProductDetailsChartInModal(order) {
        if (!productDetailsChartCanvas) return;
        const ctx = productDetailsChartCanvas.getContext('2d');
        const labels = (order.detalles || []).map(item => item.producto?.producto || 'N/A');
        const data = (order.detalles || []).map(item => item.subtotal || 0);

        if (productDetailsChart) productDetailsChart.destroy();

        productDetailsChart = new Chart(ctx, {
            type: 'bar', data: { labels: labels, datasets: [{ label: 'Subtotal por Producto (S/)', data: data, backgroundColor: 'rgba(255, 102, 0, 0.6)', borderColor: 'rgba(255, 102, 0, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { title: { display: true, text: 'Subtotal (S/)' } } }, plugins: { legend: { display: false } } } // indexAxis:'y' y sin leyenda para modal?
        });
    }

    /** Calcula y actualiza el total de ingresos */
    function updateTotalRevenue() {
        if (!totalRevenueElement) return;
        const filteredOrders = getFilteredOrders();
        // Sumar solo si no está anulado
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.audAnulado ? 0 : (order.total || 0)), 0);
        totalRevenueElement.textContent = `S/ ${totalRevenue.toFixed(2)}`;
    }

    /** Genera reporte HTML (sin cambios funcionales, adaptado a datos backend) */
    function generateReport() {
        const filteredOrders = getFilteredOrders().filter(o => !o.audAnulado); // Excluir anuladas del reporte

        if (filteredOrders.length === 0) {
            alert('No hay órdenes activas para generar el reporte en el rango seleccionado.');
            return;
        }

        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = filteredOrders.length;
        const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const { labels: productNames, data: productQuantities } = aggregateTopProducts(); // Reusa función de agregación
        const { labels: salesDates, data: salesTotals } = aggregateDailySales(); // Reusa función de agregación

        const reportWindow = window.open('', '_blank');
        const dateRange = selectedStartDate && selectedEndDate
            ? `Del ${new Date(selectedStartDate + 'T00:00:00').toLocaleDateString('es-PE')} al ${new Date(selectedEndDate + 'T00:00:00').toLocaleDateString('es-PE')}`
            : 'Todas las fechas';

        let productsList = productNames.map((name, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${name}</td>
                <td style="text-align: center;">${productQuantities[index]}</td>
            </tr>`).join('');
        if (!productsList) productsList = '<tr><td colspan="3" class="text-center">No hay datos de productos.</td></tr>';


        let salesList = salesDates.map((date, index) => `
            <tr>
                <td>${date}</td>
                <td style="text-align: right;">S/ ${(salesTotals[index] || 0).toFixed(2)}</td>
            </tr>`).join('');
        if (!salesList) salesList = '<tr><td colspan="2" class="text-center">No hay datos de ventas diarias.</td></tr>';


        // Usar plantilla HTML como antes, inyectando las variables
        reportWindow.document.write(`
         <!DOCTYPE html>
         <html> <head> <title>Reporte de Ventas - ${dateRange}</title> <style>
         body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #f9f9f9; color: #333; }
         .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff6600; padding-bottom: 10px; }
         .header h1 { color: #ff6600; margin: 0; } .header p { margin: 2px 0; font-size: 1.1em; }
         .stats { display: flex; justify-content: space-around; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
         .stat-card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); flex: 1; min-width: 180px; }
         .stat-card h3 { margin-top: 0; color: #555; } .stat-card p { font-size: 1.8em; font-weight: bold; color: #ff6600; margin: 0; }
         .section { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
         .section h2 { color: #ff6600; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; }
         table { width: 100%; border-collapse: collapse; margin-top: 15px; }
         th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
         th { background-color: #f4f4f4; color: #333; }
         tbody tr:nth-child(odd) { background-color: #fcfcfc; }
         .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
         .no-print { text-align: right; margin-bottom: 15px; }
         .print-btn { background-color: #ff6600; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-size: 1em; }
         .print-btn:hover { background-color: #e65c00; }
         @media print {
           body { background-color: #fff; padding: 0; }
           .no-print { display: none; }
           .stat-card, .section { box-shadow: none; border: 1px solid #ccc; }
           .header { border-bottom: 2px solid #ff6600; }
         }
         </style> </head>
         <body>
           <div class="no-print"><button class="print-btn" onclick="window.print()">🖨️ Imprimir</button></div>
           <div class="header"><h1>🍔 La Ruta del Sabor</h1><p>Reporte de Ventas</p><p><strong>${dateRange}</strong></p><p>Generado: ${new Date().toLocaleString('es-PE')}</p></div>
           <div class="stats">
             <div class="stat-card"><h3>Total Ingresos</h3><p>S/ ${totalRevenue.toFixed(2)}</p></div>
             <div class="stat-card"><h3>Órdenes Activas</h3><p>${totalOrders}</p></div>
             <div class="stat-card"><h3>Promedio x Orden</h3><p>S/ ${averageOrder.toFixed(2)}</p></div>
           </div>
           <div class="section"><h2>📊 Ventas por Día</h2><table><thead><tr><th>Fecha</th><th style="text-align: right;">Total</th></tr></thead><tbody>${salesList}</tbody></table></div>
           <div class="section"><h2>🏆 Top ${productNames.length} Productos Vendidos</h2><table><thead><tr><th>#</th><th>Producto</th><th style="text-align: center;">Unidades</th></tr></thead><tbody>${productsList}</tbody></table></div>
           <div class="footer"><p>© ${new Date().getFullYear()} La Ruta del Sabor</p></div>
         </body> </html>`);
        reportWindow.document.close();
    }

    // --- Inicialización ---
    console.log('--- Panel de Admin - Órdenes Iniciado ---');
    fetchOrdersAndProducts(); // Cargar datos al inicio

}); // Fin DOMContentLoaded