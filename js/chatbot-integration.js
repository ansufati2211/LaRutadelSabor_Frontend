document.addEventListener('DOMContentLoaded', () => {
    const dfMessenger = document.querySelector('df-messenger');

    // Inicializar sesión
    dfMessenger.addEventListener('df-messenger-loaded', () => {
        const usuarioGuardado = localStorage.getItem('usuario_ruta_sabor') || localStorage.getItem('user');
        if (usuarioGuardado) {
            try {
                const usuario = JSON.parse(usuarioGuardado);
                console.log("🟢 Usuario Chatbot:", usuario.nombre);
                // Establecer contexto inicial visualmente
                dfMessenger.renderCustomCard([{
                    "type": "info",
                    "title": "Verónica",
                    "subtitle": `¡Hola ${usuario.nombre}! Estoy lista.`
                }]);
            } catch (e) {}
        }
    });

    // ESCUCHAR PAYLOADS
    dfMessenger.addEventListener('df-response-received', (event) => {
        const response = event.detail.response;
        if (response.queryResult && response.queryResult.responseMessages) {
            response.queryResult.responseMessages.forEach(msg => {
                if (msg.payload) {
                    const data = msg.payload;
                    console.log("📨 Payload:", data);

                    // 1. NAVEGACIÓN PURA
                    if (data.tipo === "NAVEGACION") {
                        console.log("🚀 Navegando a:", data.url);
                        setTimeout(() => { window.location.href = data.url; }, 3000);
                    }

                    // 2. AGREGAR AL CARRITO + REDIRECCIÓN
                    if (data.tipo === "AGREGAR_CARRITO") {
                        console.log("🛒 Agregando:", data.items);
                        agregarItemsLocalStorage(data.items);
                        
                        // Si el backend dice redirigir, vamos al carrito
                        if (data.redirigir) {
                            setTimeout(() => { window.location.href = "carrito.html"; }, 3000);
                        }
                    }
                }
            });
        }
    });

    function agregarItemsLocalStorage(itemsNuevos) {
        let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        itemsNuevos.forEach(itemBot => {
            const index = carrito.findIndex(p => p.id === itemBot.id);
            if (index !== -1) {
                // Sumar cantidad si no excede stock
                let nuevaCant = carrito[index].cantidad + itemBot.cantidad;
                carrito[index].cantidad = (nuevaCant <= itemBot.stock) ? nuevaCant : itemBot.stock;
            } else {
                carrito.push(itemBot);
            }
        });
        localStorage.setItem('carrito', JSON.stringify(carrito));
        
        // Intentar actualizar contador visual del header
        const contador = document.getElementById('cart-item-count');
        if(contador) {
            const total = carrito.reduce((acc, it) => acc + it.cantidad, 0);
            contador.textContent = total;
            contador.style.display = total > 0 ? 'flex' : 'none';
        }
    }
});