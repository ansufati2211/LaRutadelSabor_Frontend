/**
 * LÓGICA DE INTEGRACIÓN FRONTEND <-> AGENTE VERONICA
 */

document.addEventListener('DOMContentLoaded', () => {
    const dfMessenger = document.querySelector('df-messenger');

    // 1. INICIALIZACIÓN: ENVIAR DATOS DEL USUARIO LOGUEADO
    // Esperamos a que el chat cargue
    dfMessenger.addEventListener('df-messenger-loaded', () => {
        const usuarioGuardado = localStorage.getItem('usuario_ruta_sabor'); // Asumiendo que guardas esto al login
        
        if (usuarioGuardado) {
            try {
                const usuario = JSON.parse(usuarioGuardado);
                console.log("🟢 Usuario detectado para el chat:", usuario.nombre);

                // Enviamos los parámetros a la sesión de Dialogflow
                // "nombre_usuario" y "email_cliente" deben coincidir con lo que configuramos en el Agente
                dfMessenger.renderCustomCard([
                    {
                        "type": "info",
                        "title": "Sesión Iniciada",
                        "subtitle": `Hola ${usuario.nombre}, Verónica está lista.`
                    }
                ]);

                const sessionParams = {
                    "nombre_usuario": usuario.nombre,
                    "email_cliente": usuario.correo,
                    "telefono_cliente": usuario.telefono || "" // Opcional
                };

                // Truco para establecer parámetros sin enviar mensaje visible (Query Event)
                // Ojo: Esto depende de la versión del componente, si no funciona, el usuario saludará y el bot ya tendrá el contexto si lo enviamos en el primer query.
                // En DF CX Messenger v1, los parámetros se pueden pasar en el query inicial o attributes.
            } catch (e) {
                console.error("Error al leer usuario del storage:", e);
            }
        }
    });

    // 2. ESCUCHAR RESPUESTAS DEL BOT (PAYLOADS)
    // Aquí atrapamos la orden de redirección al pago
    dfMessenger.addEventListener('df-response-received', (event) => {
        const response = event.detail.response;
        
        // Buscamos si hay un payload personalizado en la respuesta
        if (response.queryResult && response.queryResult.responseMessages) {
            response.queryResult.responseMessages.forEach(msg => {
                if (msg.payload) {
                    const data = msg.payload;
                    
                    // CASO: ORDEN CREADA -> REDIRIGIR A PAGO
                    if (data.tipo === "ORDEN_CREADA" || data.accion === "REDIRIGIR_PAGO") {
                        console.log("🚀 Redirigiendo a pago...", data);
                        
                        // Pequeño delay para que el usuario lea el mensaje "Orden creada"
                        setTimeout(() => {
                            // Construir la URL de pago. 
                            // data.redirectUrl viene del Backend como "/checkout?ordenId=123"
                            // Lo adaptamos a tu archivo real "pago_detalles.html"
                            const urlPago = `pago_detalles.html?ordenId=${data.ordenId}`;
                            window.location.href = urlPago;
                        }, 3000);
                    }
                }
            });
        }
    });
});