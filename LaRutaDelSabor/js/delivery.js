// js/delivery.js

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
 * Función global de Logout para el panel de delivery
 */
function logout() {
    console.log("Cerrando sesión de delivery...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html'; // Redirigir a login
}

// ASUNCIÓN: 'bootstrap' está cargado globalmente en el HTML.

// --- Comienzo del script de la página de Delivery ---
// (Tu código original)

document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let pedidos = []; // Almacenará TODOS los pedidos cargados inicialmente
    let pedidosFiltrados = { // Pedidos filtrados por estado para mostrar
        pendiente: [],
        enCamino: [],
        entregadoHoy: []
    };

    // Elementos del DOM
    const deliveryUserNameEl = document.getElementById('deliveryUserName');
    const listaPendientesEl = document.getElementById('listaPendientes');
    const listaEnCaminoEl = document.getElementById('listaEnCamino');
    const listaEntregadosEl = document.getElementById('listaEntregados');
    const badgePendientesEl = document.getElementById('badgePendientes');
    const badgeEnCaminoEl = document.getElementById('badgeEnCamino');
    const badgeEntregadosEl = document.getElementById('badgeEntregados');
    const totalEntregasHoyEl = document.getElementById('totalEntregasHoy');
    const detallesPedidoModalEl = document.getElementById('detallesPedidoModal'); // Modal completo
    const detallesPedidoBodyEl = document.getElementById('detallesPedidoBody');
    // Loader/Error (Añade divs si quieres feedback visual)
    const loaderElement = document.getElementById('delivery-loader');
    const errorElement = document.getElementById('delivery-error');

    // Instancia Modal Bootstrap
    const detallesPedidoModal = detallesPedidoModalEl ? new bootstrap.Modal(detallesPedidoModalEl) : null;

    // --- Validación de Acceso (MODIFICADO: Rol DELIVERY) ---
    const token = getToken();
    const user = getUser();
    let userRole = null;
    if (user?.rol?.name) { userRole = user.rol.name.replace("ROLE_", ""); }
    else if (user?.roles) { /* ... (lógica fallback como en admin.js) ... */
        if (user.roles.includes("ROLE_DELIVERY") || user.roles.some(r => r.authority === "ROLE_DELIVERY")) userRole = "DELIVERY";
        else if (user.roles.includes("ROLE_ADMIN") || user.roles.some(r => r.authority === "ROLE_ADMIN")) userRole = "ADMIN"; // Permitir admin?
    }

    // Permitir DELIVERY o ADMIN
    if (!token || !user || (userRole !== 'DELIVERY' && userRole !== 'ADMIN')) {
        alert('Acceso denegado. Solo personal de delivery o administradores.');
        logout(); // Limpiar y redirigir
        return;
    }
    console.log(`Acceso Delivery verificado para rol: ${userRole}`);

    // Mostrar nombre
    if (deliveryUserNameEl) {
        deliveryUserNameEl.textContent = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.correo || 'Repartidor';
    }

    // --- Funciones Loader/Error (Implementa visualmente) ---
    function showLoader(message = "Cargando...") { /* ... (igual que en admin-orders.js) ... */
        if (loaderElement) { loaderElement.textContent = message; loaderElement.style.display = 'block'; }
        if (errorElement) errorElement.style.display = 'none';
        console.log(message);
    }
    function hideLoader() { /* ... (igual que en admin-orders.js) ... */
        if (loaderElement) loaderElement.style.display = 'none';
    }
    function showError(message) { /* ... (igual que en admin-orders.js) ... */
        if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; }
        else { alert(message); } // Fallback
        console.error(message);
    }
    function clearError() { /* ... (igual que en admin-orders.js) ... */
        if (errorElement) errorElement.style.display = 'none';
    }

    // ============================================
    // MAPEO DE ESTADOS (Backend -> UI y UI -> Backend - Igual que admin-orders)
    // ============================================
    const estadoBackendMap = { 'RECIBIDO': 'Recibido', 'EN_PREPARACION': 'En Preparación', 'EN_RUTA': 'En Ruta', 'ENTREGADO': 'Entregado', 'CANCELADO': 'Cancelado' };
    const estadoSelectMap = { 'Recibido': 'RECIBIDO', 'En Preparación': 'EN_PREPARACION', 'En Ruta': 'EN_RUTA', 'Entregado': 'ENTREGADO', 'Cancelado': 'CANCELADO' };
    function getEstadoDisplay(estadoBackend) { return estadoBackendMap[estadoBackend] || estadoBackend || 'Desconocido'; }
    function getEstadoBackendValue(estadoDisplay) { /* ... (igual que admin-orders) ... */
        // Necesitamos mapeo inverso para enviar al backend
        for (const key in estadoBackendMap) {
            if (estadoBackendMap[key] === estadoDisplay) {
                return key;
            }
        }
        return 'RECIBIDO'; // Default
    }


    // ============================================
    // NAVEGACIÓN (Sin cambios funcionales)
    // ============================================
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.delivery-section');
    const sidebar = document.getElementById('deliverySidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    // ... (Código de inicialización de navegación igual que antes) ...
    if (menuItems.length && sections.length && sidebar && toggleBtn) {
        menuItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); const target = item.getAttribute('data-target'); menuItems.forEach(mi => mi.classList.remove('active')); sections.forEach(sec => sec.classList.remove('active')); item.classList.add('active'); const targetSection = document.getElementById(`section-${target}`); if (targetSection) targetSection.classList.add('active'); if (window.innerWidth <= 768) { sidebar.classList.remove('active'); } }); });
        toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (window.innerWidth <= 768) { const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target); if (!isClickInside && sidebar.classList.contains('active')) { sidebar.classList.remove('active'); } } });
    } else {
        console.warn("Faltan elementos para la navegación del sidebar.");
    }


    // ============================================
    // CARGAR PEDIDOS (MODIFICADO: usa backend, filtra para delivery)
    // ============================================
    async function cargarPedidos() {
        showLoader('🔄 Cargando pedidos...');
        clearError();
        try {
            // Llama al endpoint de admin para obtener todos los pedidos
            const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
            }

            pedidos = await response.json(); // Lista completa de Pedidos
            console.log(`✅ ${pedidos.length} pedidos totales cargados.`);

            // Filtrar y clasificar pedidos relevantes para delivery
            filtrarYRenderizarPedidos();

        } catch (error) {
            console.error('❌ Error al cargar pedidos:', error);
            showError(`Error de conexión al cargar pedidos: ${error.message}. Reintentando...`);
            // Limpiar listas en caso de error
            if (listaPendientesEl) listaPendientesEl.innerHTML = '<p class="text-danger">Error al cargar</p>';
            if (listaEnCaminoEl) listaEnCaminoEl.innerHTML = '<p class="text-danger">Error al cargar</p>';
            if (listaEntregadosEl) listaEntregadosEl.innerHTML = '<p class="text-danger">Error al cargar</p>';
        } finally {
            hideLoader();
        }
    }

    // ============================================
    // FILTRAR Y RENDERIZAR PEDIDOS (NUEVA LÓGICA)
    // ============================================
    function filtrarYRenderizarPedidos() {
        const hoyStr = new Date().toISOString().split('T')[0];

        // Filtrar pedidos relevantes y por estado actual del backend
        pedidosFiltrados.pendiente = pedidos.filter(p => !p.audAnulado && p.estadoActual === 'EN_PREPARACION'); // Mostrar los que están listos para recoger
        pedidosFiltrados.enCamino = pedidos.filter(p => !p.audAnulado && p.estadoActual === 'EN_RUTA');
        pedidosFiltrados.entregadoHoy = pedidos.filter(p => !p.audAnulado && p.estadoActual === 'ENTREGADO' &&
            p.fecha_Pedido && new Date(p.fecha_Pedido).toISOString().split('T')[0] === hoyStr); // Entregados hoy

        console.log(`📊 Pedidos filtrados para Delivery:
            - Listos (En Preparación): ${pedidosFiltrados.pendiente.length}
            - En Ruta: ${pedidosFiltrados.enCamino.length}
            - Entregados Hoy: ${pedidosFiltrados.entregadoHoy.length}
            `);

        // Renderizar cada sección
        renderizarSeccion('listaPendientes', pedidosFiltrados.pendiente, 'pendiente');
        renderizarSeccion('listaEnCamino', pedidosFiltrados.enCamino, 'en-camino');
        renderizarSeccion('listaEntregados', pedidosFiltrados.entregadoHoy, 'entregado');

        // Actualizar contadores
        actualizarContadores();
    }


    function renderizarSeccion(containerId, pedidosArray, tipoEstadoUI) {
        const container = document.getElementById(containerId);
        if (!container) return; // Salir si el contenedor no existe
        container.innerHTML = ''; // Limpiar

        if (!pedidosArray || pedidosArray.length === 0) {
            const mensajes = {
                'pendiente': 'No hay pedidos listos para recoger.',
                'en-camino': 'No tienes pedidos en ruta.',
                'entregado': 'No has entregado pedidos hoy.'
            };
            container.innerHTML = `
                <div class="mensaje-vacio text-center py-5 text-gray-500">
                    <i class="bi bi-inbox fs-1 mb-3"></i>
                    <p>${mensajes[tipoEstadoUI]}</p>
                </div>`;
            return;
        }

        // Ordenar por fecha (más recientes primero)
        pedidosArray.sort((a, b) => new Date(b.fecha_Pedido) - new Date(a.fecha_Pedido));

        pedidosArray.forEach(pedido => {
            const card = crearTarjetaPedido(pedido, tipoEstadoUI); // tipoEstadoUI ayuda a definir los botones
            container.appendChild(card);
        });
    }

    // ============================================
    // CREAR TARJETA DE PEDIDO (MODIFICADO: usa datos backend)
    // ============================================
    function crearTarjetaPedido(pedido, tipoEstadoUI) {
        const card = document.createElement('div');
        card.className = 'pedido-card bg-white shadow rounded-lg p-4 mb-4'; // Clases ejemplo
        card.setAttribute('data-pedido-id', pedido.id); // Usar 'id'

        const fecha = new Date(pedido.fecha_Pedido);
        const fechaFormateada = !isNaN(fecha) ? fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
        const horaFormateada = !isNaN(fecha) ? fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

        const items = pedido.detalles || [];
        const totalProductos = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);

        // Vista previa de productos
        const productosHTML = items.slice(0, 3).map(item => `
            <div class="producto-item text-xs text-gray-600">
              • ${item.cantidad || '?'}x ${item.producto?.producto || 'Producto'}
            </div>`).join('');
        const masProductos = items.length > 3 ? `<div class="producto-item text-xs text-gray-500 italic">+ ${items.length - 3} más</div>` : '';

        // Datos cliente y entrega (intentar obtener de varias fuentes)
        const cliente = pedido.cliente || {};
        const nombreCliente = `${cliente.nombre || ''} ${cliente.apellido || 'Cliente'}`.trim();
        // Dirección: Priorizar la del pedido, luego la de la entidad Entrega, luego la del Cliente
        const direccionCliente = pedido.direccion || pedido.entrega?.direccion || cliente.direccion || 'Recojo Local / No especificada';
        const referenciaEntrega = pedido.referencia || pedido.entrega?.referencia || ''; // Añadir referencia si existe
        const telefonoCliente = cliente.telefono || 'No disponible';

        // Botones según el estado ACTUAL del pedido (pedido.estadoActual)
        let botonesHTML = '';
        const estadoActualBackend = pedido.estadoActual;

        if (estadoActualBackend === 'EN_PREPARACION') { // Listo para recoger (Pendiente en UI de delivery)
            botonesHTML = `
                <button class="btn-action btn-tomar bg-blue-500 hover:bg-blue-600 text-white" onclick="cambiarEstadoPedido('${pedido.id}', 'EN_RUTA')">
                    <i class="bi bi-truck"></i> Tomar Pedido
                </button>
                <button class="btn-action btn-detalles bg-gray-300 hover:bg-gray-400 text-gray-800" onclick="verDetalles('${pedido.id}')">
                    <i class="bi bi-eye"></i> Ver Detalles
                </button>
            `;
        } else if (estadoActualBackend === 'EN_RUTA') { // En Camino en UI de delivery
            botonesHTML = `
                <button class="btn-action btn-entregar bg-green-500 hover:bg-green-600 text-white" onclick="cambiarEstadoPedido('${pedido.id}', 'ENTREGADO')">
                    <i class="bi bi-check-circle"></i> Marcar Entregado
                </button>
                <button class="btn-action btn-detalles bg-gray-300 hover:bg-gray-400 text-gray-800" onclick="verDetalles('${pedido.id}')">
                    <i class="bi bi-eye"></i> Ver Detalles
                </button>
                ${telefonoCliente !== 'No disponible' ? `<a href="tel:${telefonoCliente}" class="btn-action btn-llamar bg-yellow-500 hover:bg-yellow-600 text-white"><i class="bi bi-telephone"></i> Llamar</a>` : ''}
            `;
        } else { // Entregado u otro estado
            botonesHTML = `
                <button class="btn-action btn-detalles bg-gray-300 hover:bg-gray-400 text-gray-800" onclick="verDetalles('${pedido.id}')">
                    <i class="bi bi-eye"></i> Ver Detalles
                </button>
            `;
        }
        // Determinar badge/texto de estado para la cabecera
        const estadoDisplayInfo = estadoBackendMap[estadoActualBackend] ?
            { badge: getBadgeClass(estadoActualBackend), icon: getIconClass(estadoActualBackend), text: getEstadoDisplay(estadoActualBackend) }
            : { badge: 'bg-secondary', icon: 'question-circle', text: estadoActualBackend || 'Desconocido' };


        card.innerHTML = `
          <div class="pedido-header flex justify-between items-center mb-3 pb-2 border-b">
            <div class="pedido-id font-semibold text-blue-600">
              <i class="bi bi-receipt"></i> #${pedido.id}
            </div>
            <span class="pedido-estado badge ${estadoDisplayInfo.badge}">
              <i class="bi bi-${estadoDisplayInfo.icon} me-1"></i> ${estadoDisplayInfo.text}
            </span>
          </div>

          <div class="pedido-info grid grid-cols-1 gap-2 mb-3 text-sm">
            <div class="info-row flex items-center"><i class="bi bi-person-fill w-5 text-center text-gray-500 me-2"></i><strong>Cliente:</strong><span class="ms-1">${nombreCliente}</span></div>
            <div class="info-row flex items-start"><i class="bi bi-geo-alt-fill w-5 text-center text-gray-500 me-2"></i><strong>Dirección:</strong><span class="ms-1">${direccionCliente}${referenciaEntrega ? ` (${referenciaEntrega})` : ''}</span></div>
            <div class="info-row flex items-center"><i class="bi bi-telephone-fill w-5 text-center text-gray-500 me-2"></i><strong>Teléfono:</strong><span class="ms-1">${telefonoCliente}</span></div>
            <div class="info-row flex items-center"><i class="bi bi-clock-fill w-5 text-center text-gray-500 me-2"></i><strong>Fecha:</strong><span class="ms-1">${fechaFormateada} ${horaFormateada}</span></div>
            <div class="info-row flex items-center"><i class="bi bi-box-seam w-5 text-center text-gray-500 me-2"></i><strong>Productos:</strong><span class="ms-1">${totalProductos} item${totalProductos !== 1 ? 's' : ''}</span></div>
          </div>

          <div class="pedido-total text-lg font-bold text-end mb-3 border-t pt-2">
            💰 Total: S/ ${(pedido.total || 0).toFixed(2)}
          </div>

          <div class="pedido-actions flex flex-wrap gap-2 justify-end">
            ${botonesHTML}
          </div>
        `;

        return card;
    }
    // NUEVO: Funciones helper para iconos y clases de badge (igual que en admin-orders)
    function getBadgeClass(estadoBackend) { /* ... (código igual que admin-orders) ... */
        switch (estadoBackend) { case 'RECIBIDO': return 'bg-secondary text-white'; case 'EN_PREPARACION': return 'bg-info text-dark'; case 'EN_RUTA': return 'bg-primary text-white'; case 'ENTREGADO': return 'bg-success text-white'; case 'CANCELADO': return 'bg-danger text-white'; default: return 'bg-light text-dark'; }
    }
    function getIconClass(estadoBackend) {
        switch (estadoBackend) { case 'RECIBIDO': return 'hourglass-split'; case 'EN_PREPARACION': return 'tools'; case 'EN_RUTA': return 'truck'; case 'ENTREGADO': return 'check-circle-fill'; case 'CANCELADO': return 'x-circle-fill'; default: return 'question-circle'; }
    }


    // ============================================
    // ACTUALIZAR CONTADORES (MODIFICADO)
    // ============================================
    function actualizarContadores() {
        const hoyStr = new Date().toISOString().split('T')[0];
        // Usa los arrays filtrados que ya tenemos
        const pendientesCount = pedidosFiltrados.pendiente.length;
        const enCaminoCount = pedidosFiltrados.enCamino.length;
        const entregadosCount = pedidosFiltrados.entregadoHoy.length; // Ya filtrado por hoy

        if (badgePendientesEl) badgePendientesEl.textContent = pendientesCount;
        if (badgeEnCaminoEl) badgeEnCaminoEl.textContent = enCaminoCount;
        if (badgeEntregadosEl) badgeEntregadosEl.textContent = entregadosCount;
        if (totalEntregasHoyEl) totalEntregasHoyEl.textContent = entregadosCount;
    }

    // ============================================
    // CAMBIAR ESTADO DEL PEDIDO (NUEVA FUNCIÓN CENTRALIZDA)
    // ============================================
    window.cambiarEstadoPedido = async function (pedidoId, nuevoEstadoBackend) {
        const pedido = pedidos.find(p => p.id === pedidoId); // Buscar por 'id'
        if (!pedido) {
            console.error('❌ Pedido no encontrado para cambiar estado:', pedidoId);
            return;
        }

        // Validar transición (ejemplo simple)
        const estadoActual = pedido.estadoActual;
        if ((estadoActual === 'EN_PREPARACION' && nuevoEstadoBackend !== 'EN_RUTA') ||
            (estadoActual === 'EN_RUTA' && nuevoEstadoBackend !== 'ENTREGADO')) {
            alert(`No se puede cambiar el estado de "${getEstadoDisplay(estadoActual)}" a "${getEstadoDisplay(nuevoEstadoBackend)}" desde aquí.`);
            return;
        }
        // Podrías añadir más validaciones

        const accionTexto = nuevoEstadoBackend === 'EN_RUTA' ? 'tomar para entrega' : 'marcar como entregado';
        const confirmar = confirm(`¿Confirmas ${accionTexto} el pedido #${pedidoId}?`);
        if (!confirmar) return;

        showLoader(`Actualizando estado a ${getEstadoDisplay(nuevoEstadoBackend)}...`);
        clearError();
        try {
            console.log(`📤 Cambiando estado de orden ${pedidoId} a "${nuevoEstadoBackend}"`);
            const response = await fetchWithAuth(`${API_BASE_URL}/admin/pedidos/${pedidoId}/estado`, { // Llama al endpoint de admin
                method: 'PUT',
                body: JSON.stringify({
                    nuevoEstado: nuevoEstadoBackend,
                    notas: `Actualizado por delivery ${user?.correo || ''}`
                })
            });

            const result = await response.json(); // Espera Pedido actualizado o Error

            if (response.ok) {
                console.log(`✅ Pedido ${pedidoId} actualizado a "${result.estadoActual}"`);
                mostrarAlerta('success', `¡Pedido actualizado a ${getEstadoDisplay(result.estadoActual)}!`);

                // Actualizar localmente Y recargar/refiltrar
                // Encuentra el índice del pedido en el array 'pedidos' original
                const index = pedidos.findIndex(p => p.id === pedidoId);
                if (index > -1) {
                    pedidos[index].estadoActual = result.estadoActual; // Actualizar estado en la lista maestra
                    pedidos[index].historialEstados = result.historialEstados; // Actualizar historial
                }

                filtrarYRenderizarPedidos(); // Volver a filtrar y mostrar en las secciones correctas

                // Opcional: Cambiar a la sección correspondiente
                const targetSection = nuevoEstadoBackend === 'EN_RUTA' ? 'en-camino' : nuevoEstadoBackend === 'ENTREGADO' ? 'entregados' : 'pendientes';
                document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
                document.querySelectorAll('.delivery-section').forEach(sec => sec.classList.remove('active'));
                const menuItemTarget = document.querySelector(`[data-target="${targetSection}"]`);
                const sectionTarget = document.getElementById(`section-${targetSection}`);
                if (menuItemTarget) menuItemTarget.classList.add('active');
                if (sectionTarget) sectionTarget.classList.add('active');


            } else {
                throw new Error(result.error || `Error ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error al cambiar estado a ${nuevoEstadoBackend}:`, error);
            showError(`Error al actualizar estado: ${error.message}`);
            // No revertimos visualmente, la recarga o el próximo refresh lo corregirá
        } finally {
            hideLoader();
        }
    };
    // Exponer la función globalmente si se llama desde HTML (onclick)
    window.cambiarEstadoPedido = cambiarEstadoPedido;


    // --- ELIMINAR funciones antiguas tomarPedido y marcarEntregado ---
    // window.tomarPedido = ... (Eliminar)
    // window.marcarEntregado = ... (Eliminar)

    // ============================================
    // VER DETALLES DEL PEDIDO (MODAL - MODIFICADO: usa datos backend)
    // ============================================
    window.verDetalles = function (pedidoId) { // Hacer global si se llama desde HTML
        const pedido = pedidos.find(p => p.id === pedidoId); // Buscar por 'id'
        if (!pedido) {
            console.error('❌ Pedido no encontrado localmente para ver detalles:', pedidoId);
            alert("No se encontró el pedido.");
            return;
        }
        if (!detallesPedidoModal) {
            console.error("Modal de detalles no encontrado.");
            return;
        }


        console.log("Mostrando detalles para:", pedido);

        const fecha = new Date(pedido.fecha_Pedido); // Usar fecha_Pedido
        const fechaFormateada = !isNaN(fecha) ? fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
        const items = pedido.detalles || [];
        const productosDetalleHTML = items.length > 0 ? items.map(item => `
            <tr>
              <td>${item.producto?.producto || 'Producto N/A'}</td>
              <td class="text-center">${item.cantidad || '?'}</td>
              <td class="text-end">S/ ${(item.producto?.precio || 0).toFixed(2)}</td>
              <td class="text-end fw-bold">S/ ${(item.subtotal || 0).toFixed(2)}</td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center">No hay productos.</td></tr>';

        const estadoActualBackend = pedido.estadoActual;
        const estadoInfo = estadoBackendMap[estadoActualBackend] ?
            { badge: getBadgeClass(estadoActualBackend), icon: getIconClass(estadoActualBackend), text: getEstadoDisplay(estadoActualBackend) }
            : { badge: 'bg-secondary', icon: 'question-circle', text: estadoActualBackend || 'Desconocido' };

        const cliente = pedido.cliente || {};
        const nombreCliente = `${cliente.nombre || ''} ${cliente.apellido || 'Cliente'}`.trim();
        const emailCliente = cliente.correo || 'No disponible';
        const telefonoCliente = cliente.telefono || 'No disponible';
        const direccionCliente = pedido.direccion || pedido.entrega?.direccion || cliente.direccion || 'Recojo Local / No especificada';
        const referenciaEntrega = pedido.referencia || pedido.entrega?.referencia || '';


        // Rellenar modal
        if (detallesPedidoBodyEl) detallesPedidoBodyEl.innerHTML = `
            <div class="row mb-4">
              <div class="col-md-6 mb-3 mb-md-0">
                <h6 class="text-primary mb-3"><i class="bi bi-person-circle me-2"></i>Cliente</h6>
                <p class="mb-1"><strong>👤 Nombre:</strong> ${nombreCliente}</p>
                <p class="mb-1"><strong>📧 Email:</strong> ${emailCliente}</p>
                <p class="mb-1"><strong>📞 Teléfono:</strong> ${telefonoCliente}</p>
                <p class="mb-1"><strong>📍 Dirección:</strong> ${direccionCliente}${referenciaEntrega ? ` (${referenciaEntrega})` : ''}</p>
              </div>
              <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-receipt me-2"></i>Pedido</h6>
                <p class="mb-1"><strong>🔖 ID:</strong> #${pedido.id}</p>
                <p class="mb-1"><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                <p class="mb-1"><strong>📊 Estado:</strong> <span class="badge ${estadoInfo.badge}"><i class="bi bi-${estadoInfo.icon} me-1"></i> ${estadoInfo.text}</span></p>
                <p class="mb-1"><strong>💰 Total:</strong> <span class="text-primary fw-bold fs-5">S/ ${(pedido.total || 0).toFixed(2)}</span></p>
                <p class="mb-1"><strong>💳 Pago:</strong> ${pedido.pago?.metodo_Pago || pedido.metodoPago || 'No especificado'}</p>
              </div>
            </div>
            <h6 class="text-primary mb-3"><i class="bi bi-bag-check me-2"></i>Productos</h6>
            <div class="table-responsive">
              <table class="table table-sm table-bordered table-hover">
                <thead class="table-light"><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-end">P.U.</th><th class="text-end">Subtotal</th></tr></thead>
                <tbody>${productosDetalleHTML}</tbody>
                <tfoot>
                  ${pedido.monto_Agregado > 0 ? `<tr class="table-light"><td colspan="3" class="text-end">Envío:</td><td class="text-end">S/ ${pedido.monto_Agregado.toFixed(2)}</td></tr>` : ''}
                  <tr class="table-light fw-bold"><td colspan="3" class="text-end">TOTAL:</td><td class="text-end text-primary fs-5">S/ ${(pedido.total || 0).toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
            ${pedido.historialEstados && pedido.historialEstados.length > 0 ? `
              <hr><h6 class="text-primary mb-2"><i class="bi bi-list-check me-2"></i>Historial de Estados:</h6>
              <ul class="list-unstyled small text-muted">
                ${pedido.historialEstados.map(h => `<li>${new Date(h.fechaHoraCambio).toLocaleString('es-ES')} - ${getEstadoDisplay(h.tipo_Estado)} ${h.notas ? `<span class="fst-italic">(${h.notas})</span>` : ''}</li>`).join('')}
              </ul>
            ` : ''}
          `;

        detallesPedidoModal.show(); // Mostrar modal
    };
    // Hacer global si se llama desde HTML
    window.verDetalles = verDetalles;

    // ============================================
    // CERRAR SESIÓN (Usa función global logout)
    // ============================================
    const logoutButton = document.getElementById('delivery-logout-button'); // Asigna este ID a tu botón
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("¿Seguro que deseas cerrar sesión?")) {
                logout();
            }
        });
    }

    // ============================================
    // MOSTRAR ALERTAS (Implementa visualmente si quieres)
    // ============================================
    function mostrarAlerta(tipo, mensaje) {
        console.log(`ALERTA [${tipo}]: ${mensaje}`);
        // Implementa tu lógica de UI para mostrar alertas flotantes o fijas
        alert(`${tipo === 'success' ? '✅' : '❌'} ${mensaje}`); // Fallback simple
    }

    // ============================================
    // INICIALIZAR Y AUTO-REFRESH
    // ============================================
    console.log('--- Panel de Delivery Iniciado ---');
    cargarPedidos(); // Carga inicial

    // Auto-actualizar cada 30 segundos (o el intervalo que prefieras)
    setInterval(cargarPedidos, 30000);
});