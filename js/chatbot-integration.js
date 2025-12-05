/**
 * chatbot-integration.js
 * Conecta Dialogflow Messenger con la lógica de negocio (Carrito, Navegación y Sesión)
 */

document.addEventListener('DOMContentLoaded', () => {
    const dfMessenger = document.querySelector('df-messenger');

    // --- 1. INICIALIZAR SESIÓN (Enviar datos del usuario al Chatbot) ---
    dfMessenger.addEventListener('df-messenger-loaded', () => {
        const usuarioGuardado = localStorage.getItem('usuario_ruta_sabor'); // O 'user' según tu login.js
        
        if (usuarioGuardado) {
            try {
                const usuario = JSON.parse(usuarioGuardado);
                console.log("🟢 Chatbot: Usuario detectado:", usuario.nombre);

                // Configurar parámetros de sesión para Dialogflow
                const sessionParams = {
                    "nombre_usuario": usuario.nombre,
                    "email_cliente": usuario.correo || usuario.email,
                    "telefono_cliente": usuario.telefono || ""
                };

                // Enviamos un evento inicial oculto o configuramos el componente si la versión lo permite
                // Nota: dfMessenger.renderCustomCard es visual, no establece parámetros internos de sesión por sí solo en todas las versiones.
                // Lo ideal es que el backend maneje la sesión, pero esto ayuda visualmente.
                dfMessenger.renderCustomCard([
                    {
                        "type": "info",
                        "title": "¡Hola de nuevo!",
                        "subtitle": `Sesión iniciada como ${usuario.nombre}`
                    }
                ]);

            } catch (e) {
                console.error("Error al leer usuario del storage:", e);
            }
        }
    });

    // --- 2. ESCUCHAR RESPUESTAS (CEREBRO DEL FRONTEND) ---
    dfMessenger.addEventListener('df-response-received', (event) => {
        const response = event.detail.response;
        
        // Verificar si la respuesta trae mensajes y PAYLOADS
        if (response.queryResult && response.queryResult.responseMessages) {
            response.queryResult.responseMessages.forEach(msg => {
                if (msg.payload) {
                    const data = msg.payload;
                    console.log("📨 Payload recibido del Bot:", data);

                    // A. CASO NAVEGACIÓN (El bot dice: "Te llevo al menú")
                    if (data.tipo === "NAVEGACION") {
                        console.log("🚀 Navegando a:", data.url);
                        setTimeout(() => {
                            window.location.href = data.url;
                        }, 2500); // 2.5s de espera para que el usuario lea el mensaje
                    }

                    // B. CASO AGREGAR AL CARRITO (El bot dice: "He añadido hamburguesas")
                    if (data.tipo === "AGREGAR_CARRITO") {
                        console.log("🛒 Procesando productos para el carrito...");
                        agregarProductosAlCarritoLocal(data.items);
                    }

                    // C. CASO ORDEN CREADA / PAGO DIRECTO (Legacy o Flujo Alternativo)
                    if (data.tipo === "ORDEN_CREADA" || data.accion === "REDIRIGIR_PAGO") {
                        console.log("💳 Redirigiendo a pago...", data);
                        setTimeout(() => {
                            // Ajusta la URL según tu estructura (ej. pago_detalles.html)
                            const ordenId = data.ordenId || "";
                            window.location.href = `pago_detalles.html?ordenId=${ordenId}`;
                        }, 3000);
                    }
                }
            });
        }
    });

    /**
     * Función auxiliar que actualiza el localStorage y la UI del carrito
     * @param {Array} itemsNuevos - Lista de objetos enviada por el Backend
     */
    function agregarProductosAlCarritoLocal(itemsNuevos) {
        // 1. Leer el carrito actual del almacenamiento
        let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

        itemsNuevos.forEach(itemBot => {
            // Buscamos si el producto ya existe por su ID
            const indiceExistente = carrito.findIndex(p => p.id === itemBot.id);

            if (indiceExistente !== -1) {
                // Si existe, actualizamos la cantidad
                const itemExistente = carrito[indiceExistente];
                const nuevaCantidad = itemExistente.cantidad + itemBot.cantidad;
                
                // Validación básica de stock (si el backend envía el stock)
                if (itemBot.stock !== undefined && nuevaCantidad > itemBot.stock) {
                    itemExistente.cantidad = itemBot.stock;
                    console.warn(`Stock límite alcanzado para ${itemBot.nombre}`);
                } else {
                    itemExistente.cantidad = nuevaCantidad;
                }
            } else {
                // Si no existe, lo agregamos como nuevo item
                // Aseguramos de mapear los campos correctamente a lo que espera carrito.js
                carrito.push({
                    id: itemBot.id,
                    nombre: itemBot.nombre,
                    precio: itemBot.precio,
                    imagen: itemBot.imagen || 'icon/logo.png', // Fallback de imagen
                    cantidad: itemBot.cantidad,
                    stock: itemBot.stock || 99 // Fallback si no viene stock
                });
            }
        });

        // 2. Guardar el carrito actualizado
        localStorage.setItem('carrito', JSON.stringify(carrito));
        console.log("✅ Carrito actualizado en LocalStorage");

        // 3. Actualizar el contador visual en el header (si existe la función)
        if (typeof updateCartCounter === 'function') {
            updateCartCounter();
        } else {
            // Intento manual de actualización si la función no es global
            const contador = document.getElementById('cart-item-count');
            if (contador) {
                const totalItems = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);
                contador.textContent = totalItems;
                contador.style.display = totalItems > 0 ? 'flex' : 'none';
            }
        }
        
        // Opcional: Mostrar una alerta visual o 'toast' al usuario
        // alert("Productos agregados al carrito"); 
    }
});