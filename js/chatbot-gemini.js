/* js/chatbot-veronica-pro.js - VERSIÓN FINAL V8 (ESTILO PREMIUM + LÓGICA ROBUSTA) */

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY_GEMINI = 'AIzaSyDcBPtfRR1W-IYRUIRXwm3Eoi09eKIDgu4'; // <--- ¡PEGA TU CLAVE!


const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY_GEMINI}`;

// ==========================================
// 2. MENÚ MAESTRO (TODA TU BD COPIADA)
// ==========================================
const MENU_MAESTRO = [
  { "id": 43, "nombre": "Agua Mineral", "precio": 3, "imagen": "https://i.postimg.cc/c1m3cx52/refresco4.jpg", "tags": "agua mineral sin gas" },
  { "id": 37, "nombre": "Ají", "precio": 1, "imagen": "https://i.postimg.cc/rwk6jQ4f/crema7.jpg", "tags": "aji crema picante" },
  { "id": 10, "nombre": "Alita BBQ", "precio": 22, "imagen": "https://i.postimg.cc/pr67KBHJ/alitas1.jpg", "tags": "alita bbq barbacoa" },
  { "id": 14, "nombre": "Alita Broaster", "precio": 20, "imagen": "https://i.postimg.cc/h4yHFKdQ/alitas7.jpg", "tags": "alita broaster crujiente" },
  { "id": 12, "nombre": "Alita Búfalo", "precio": 24, "imagen": "https://i.postimg.cc/jjHGBNHR/alitas3.jpg", "tags": "alita bufalo buffalo picante" },
  { "id": 13, "nombre": "Alita Oriental", "precio": 23, "imagen": "https://i.postimg.cc/DZ5RwTpD/alitas4.jpg", "tags": "alita oriental china" },
  { "id": 11, "nombre": "Alita Picante", "precio": 22, "imagen": "https://i.postimg.cc/d0PbWnTW/alitas2.jpg", "tags": "alita picante hot" },
  { "id": 41, "nombre": "Chicha Morada", "precio": 5, "imagen": "https://i.postimg.cc/PJ28fywT/refresco2.jpg", "tags": "chicha bebida morada" },
  { "id": 44, "nombre": "Coca Cola", "precio": 4, "imagen": "https://i.postimg.cc/FHfJmjsX/refresco5.jpg", "tags": "coca cola gaseosa" },
  { "id": 52, "nombre": "Combo Alitas", "precio": 25, "imagen": "https://i.postimg.cc/TP0trcj5/combo3.jpg", "tags": "combo alitas 6 papas" },
  { "id": 50, "nombre": "Combo Clásico", "precio": 22, "imagen": "https://i.postimg.cc/jSV3K2d2/combo1.jpg", "tags": "combo clasico hamburguesa" },
  { "id": 51, "nombre": "Combo Dúo", "precio": 40, "imagen": "https://i.postimg.cc/jqFkgvpz/combo2.jpg", "tags": "combo duo dos hamburguesas doble" },
  { "id": 48, "nombre": "Dedos de Pollo", "precio": 16, "imagen": "https://i.postimg.cc/NfyGSJ5Y/pollo5.jpg", "tags": "dedos fingers pollo" },
  { "id": 22, "nombre": "Dona Chocolate Chispas", "precio": 5, "imagen": "https://i.postimg.cc/hvdwbdtF/dona2.jpg", "tags": "dona chocolate" },
  { "id": 21, "nombre": "Dona de Oreo", "precio": 5, "imagen": "https://i.postimg.cc/6QpmbSpf/dona6.jpg", "tags": "dona oreo galleta" },
  { "id": 20, "nombre": "Dona Glaseada", "precio": 4, "imagen": "https://i.postimg.cc/YC3P3kMS/dona1.jpg", "tags": "dona glaseada clasica" },
  { "id": 27, "nombre": "Ensalada Clásica", "precio": 14, "imagen": "https://i.postimg.cc/T16jFLcv/ensalada2.jpg", "tags": "ensalada vegetales light" },
  { "id": 26, "nombre": "Ensalada de Pollo", "precio": 18, "imagen": "https://i.postimg.cc/4xL5y3Xp/ensalada1.jpg", "tags": "ensalada pollo" },
  { "id": 16, "nombre": "Hamburguesa a lo Pobre", "precio": 18, "imagen": "https://i.postimg.cc/pTgcTLYs/hamburguesa2.jpg", "tags": "hamburguesa pobre huevo platano" },
  { "id": 15, "nombre": "Hamburguesa Clásica", "precio": 15, "imagen": "https://i.postimg.cc/L410Wj2w/hamburguesa1.jpg", "tags": "hamburguesa clasica simple" },
  { "id": 18, "nombre": "Hamburguesa Doble Queso", "precio": 24, "imagen": "https://i.postimg.cc/brkC2fmp/hamburguesa4.webp", "tags": "hamburguesa doble queso" },
  { "id": 19, "nombre": "Hamburguesa Parrillera", "precio": 22, "imagen": "https://i.postimg.cc/CxFPdtkp/hamburguesa6.jpg", "tags": "hamburguesa parrillera" },
  { "id": 17, "nombre": "Hamburguesa Queso Tocino", "precio": 20, "imagen": "https://i.postimg.cc/BQfwftv6/hamburguesa3.jpg", "tags": "hamburguesa tocino queso" },
  { "id": 35, "nombre": "Ketchup", "precio": 1, "imagen": "https://i.postimg.cc/8kxgJ1zQ/crema2.jpg", "tags": "ketchup" },
  { "id": 42, "nombre": "Limonada", "precio": 6, "imagen": "https://i.postimg.cc/TY3D7zzw/refresco3.jpg", "tags": "limonada" },
  { "id": 56, "nombre": "Limonada Frozen", "precio": 7, "imagen": "https://comidasperuanas.net/wp-content/uploads/2020/12/Limonada-Frozen.jpg", "tags": "limonada frozen hielo" },
  { "id": 40, "nombre": "Maracuyá", "precio": 5, "imagen": "https://i.postimg.cc/RVpnjPmT/refresco1.jpg", "tags": "maracuya jugo" },
  { "id": 36, "nombre": "Mayonesa", "precio": 1, "imagen": "https://i.postimg.cc/MKR21hnc/crema1.jpg", "tags": "mayonesa" },
  { "id": 47, "nombre": "Milanesa de Pollo", "precio": 22, "imagen": "https://i.postimg.cc/xCtTDBvj/pollo4.jpg", "tags": "milanesa pollo" },
  { "id": 49, "nombre": "Nuggets", "precio": 14, "imagen": "https://i.postimg.cc/rFvyk1r4/pollo6.jpg", "tags": "nuggets" },
  { "id": 30, "nombre": "Papas Clásicas", "precio": 10, "imagen": "https://i.postimg.cc/3N1GqLR2/papas1.jpg", "tags": "papas fritas clasicas" },
  { "id": 34, "nombre": "Papas con Hot Dog", "precio": 15, "imagen": "https://i.postimg.cc/L43jhsTh/papas6.jpg", "tags": "salchipapa hot dog hotdog" },
  { "id": 46, "nombre": "Pollo a la Plancha", "precio": 20, "imagen": "https://i.postimg.cc/V6YLhzbH/pollo3.jpg", "tags": "pollo plancha filete" },
  { "id": 45, "nombre": "Pollo Broaster", "precio": 18, "imagen": "https://i.postimg.cc/WzyNtrYQ/broaster.jpg", "tags": "pollo broaster pieza" },
  { "id": 55, "nombre": "Promo Estudiante", "precio": 12, "imagen": "https://i.postimg.cc/mkvv0S52/promo.png", "tags": "promo estudiante salchipapa" },
  { "id": 53, "nombre": "Promo Familiar", "precio": 55, "imagen": "https://i.postimg.cc/3Rc5ZhjG/promo2.jpg", "tags": "promo familiar pollo entero" },
  { "id": 54, "nombre": "Promo Pareja", "precio": 30, "imagen": "https://i.postimg.cc/MHfkPLtF/promo3.png", "tags": "promo pareja royal" },
  { "id": 39, "nombre": "Salsa BBQ", "precio": 2, "imagen": "https://i.postimg.cc/KYG6SjJL/crema5.jpg", "tags": "salsa bbq" },
  { "id": 28, "nombre": "Wrap de Pollo", "precio": 16, "imagen": "https://i.postimg.cc/PqCMwkq9/ensalada3.jpg", "tags": "wrap tortilla" }
];

let synth = window.speechSynthesis; 

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    injectStyles(); 
    createWidget();
    // Saludo inicial al cargar
    setTimeout(welcomeUser, 800);
});

// ==========================================
// 3. CEREBRO: FLUJO EXACTO + IA
// ==========================================
async function askVeronica(message) {
    // 1. INTENTO LOCAL (Respuestas Rápidas del Flujo)
    const local = localBrain(message);
    if (local.action !== 'NONE') return local;

    // 2. CEREBRO IA (Para entender pedidos complejos)
    try {
        const user = JSON.parse(localStorage.getItem('usuarioLogueado')) || { nombre: 'Cliente' };
        const menuTxt = MENU_MAESTRO.map(p => p.nombre).join(", ");
        
        const prompt = `
        Eres Verónica de "La Ruta del Sabor".
        Usuario: ${user.nombre}.
        MENU: [${menuTxt}]

        Si el usuario quiere:
        - "Dirección": JSON {"action": "INFO", "text": "Urb. Casuarians Mz G lt 8"}
        - "Contacto": JSON {"action": "INFO", "text": "WhatsApp: 974748045"}
        - "Horario": JSON {"action": "INFO", "text": "Lun-Sab 11am-10pm, Dom 11am-5pm"}
        - "Menú": JSON {"action": "NAVIGATE", "target": "menu.html", "text": "Yendo al menú..."}
        - PEDIR COMIDA (ej: "quiero alita picante"): JSON {"action": "ADD_TO_CART", "product_hint": "Alita Picante", "text": "Agregado."}

        Responde SOLO JSON.
        User: "${message}"
        `;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        let raw = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        return JSON.parse(raw);

    } catch (e) {
        return { action: "NONE", text: "¿Podrías repetirlo?" };
    }
}

// LÓGICA LOCAL ESTRICTA (Tus textos exactos)
function localBrain(text) {
    text = text.toLowerCase();
    
    // --- OPCIONES DE ENTRADA (BOTONES) ---
    if (text === "dirección" || text.includes("ubicacion") || text.includes("donde")) {
        return { action: "INFO", text: "Urb. Casuarians Mz G lt 8. Referencia: 5ta etapa." };
    }
    if (text === "contacto" || text.includes("telefono") || text.includes("celular")) {
        return { action: "INFO", text: "Contacto: 974748045 (WhatsApp)." };
    }
    if (text === "horario" || text.includes("hora") || text.includes("abierto")) {
        return { action: "INFO", text: "Horario:<br>Lunes a Sábado: 11:00 am - 10:00 pm<br>Domingos y Feriados: 11:00 am - 05:00 pm" };
    }
    if (text === "ver menú" || text.includes("menu") || text.includes("carta")) {
        return { action: "NAVIGATE", target: "menu.html", text: "Abriendo el módulo de menú..." };
    }

    // --- BÚSQUEDA DE PRODUCTOS ---
    for (let prod of MENU_MAESTRO) {
        // Busca en nombre y tags
        if (text.includes(prod.nombre.toLowerCase()) || prod.tags.split(" ").some(tag => text.includes(tag))) {
            return {
                action: "ADD_TO_CART",
                product_name: prod.nombre,
                text: `¡Listo! Agregué ${prod.nombre} a tu carrito.`
            };
        }
    }
    return { action: "NONE" };
}

// ==========================================
// 4. EJECUCIÓN (ACCIONES)
// ==========================================
async function handleUserInteraction(text) {
    if (!text) return;
    addMsg(text, 'user');
    
    const typingId = showTyping();
    const response = await askVeronica(text);
    removeTyping(typingId);
    
    addMsg(response.text, 'bot');
    speak(response.text);

    // AGREGAR AL CARRITO
    if (response.action === 'ADD_TO_CART') {
        let producto = null;
        if (response.product_name) producto = MENU_MAESTRO.find(p => p.nombre === response.product_name);
        else if (response.product_hint) producto = MENU_MAESTRO.find(p => p.nombre.toLowerCase().includes(response.product_hint.toLowerCase()));

        if (producto) {
            saveToEverywhere(producto);
            // SALTAMOS AL CARRITO
            setTimeout(() => window.location.href = 'carrito.html', 2000);
        }
    } 
    // NAVEGAR A MENU
    else if (response.action === 'NAVIGATE') {
        setTimeout(() => window.location.href = response.target, 1500);
    }
}

function saveToEverywhere(newItem) {
    let currentCart = JSON.parse(localStorage.getItem('productosEnCarrito')) || [];
    if (currentCart.length === 0) currentCart = JSON.parse(localStorage.getItem('carrito')) || [];

    const itemToSave = {
        id: newItem.id,
        nombre: newItem.nombre,
        precio: newItem.precio,
        imagen: newItem.imagen,
        cantidad: 1,
        uniqueId: Date.now()
    };

    // Sumar si existe
    const existe = currentCart.find(p => p.id === newItem.id);
    if (existe) existe.cantidad++;
    else currentCart.push(itemToSave);

    localStorage.setItem('productosEnCarrito', JSON.stringify(currentCart));
    localStorage.setItem('carrito', JSON.stringify(currentCart));
}

// ==========================================
// 5. INTERFAZ: SALUDO Y OPCIONES
// ==========================================
function welcomeUser() {
    // Verificar si ya hay mensajes para no duplicar al recargar si se mantiene el historial (opcional)
    const msgs = document.getElementById('v-messages');
    if (msgs.children.length > 0) return;

    const u = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const nombre = u ? u.nombre : "";
    
    // EL SALUDO QUE PEDISTE
    const saludo = `¡Bienvenido a La Ruta del Sabor ${nombre}! Soy Verónica y estoy aquí para servirte.`;
    addMsg(saludo, 'bot');
    speak(saludo);

    // LAS OPCIONES COMO BOTONES (CHIPS)
    setTimeout(() => {
        const opcionesHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                <button class="v-chip" onclick="handleUserInteraction('Horario')">🕒 Horario</button>
                <button class="v-chip" onclick="handleUserInteraction('Ubicacion')">📍 Ubicación</button>
                <button class="v-chip" onclick="handleUserInteraction('Contacto')">📞 Contacto</button>
                <button class="v-chip" onclick="handleUserInteraction('Ver Menú')">🍔 Menú</button>
                <button class="v-chip" onclick="handleUserInteraction('Quiero pedir algo')">🛒 Realizar Pedido</button>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = opcionesHTML;
        document.getElementById('v-messages').appendChild(div);
        document.getElementById('v-messages').scrollTop = 9999;
    }, 500);
}

// UI HELPERS
function createWidget() {
    const div = document.createElement('div');
    div.innerHTML = `
    <div id="veronica-orbita" onclick="toggleChat()">
        <img src="icon/hamburguesa-chatbot.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712009.png'">
    </div>
    <div id="veronica-window" class="hidden">
        <div class="v-header"><span>👩‍🍳 Verónica AI</span><span onclick="toggleChat()" style="cursor:pointer">✕</span></div>
        <div id="v-messages"></div>
        <div class="v-input-area">
            <button id="mic-btn" onclick="startListening()">🎤</button>
            <input type="text" id="chat-input" placeholder="Escribe aquí...">
            <button id="send-btn" onclick="sendText()">➤</button>
        </div>
    </div>`;
    document.body.appendChild(div);
    document.getElementById('chat-input').addEventListener('keypress', (e) => { if(e.key==='Enter') sendText() });
}

function addMsg(html, type) {
    const d = document.createElement('div'); d.className = `msg ${type}`; d.innerHTML = html;
    document.getElementById('v-messages').appendChild(d);
    document.getElementById('v-messages').scrollTop = 9999;
}
function showTyping() { const id='t-'+Date.now(); addMsg('...', 'bot'); document.getElementById('v-messages').lastChild.id=id; return id; }
function removeTyping(id) { const e=document.getElementById(id); if(e) e.remove(); }
window.sendText = () => { const i=document.getElementById('chat-input'); handleUserInteraction(i.value); i.value=''; }
window.toggleChat = () => { document.getElementById('veronica-window').classList.toggle('hidden'); }

// VOZ
function startListening() {
    if (!('webkitSpeechRecognition' in window)) return alert("Usa Chrome");
    const r = new webkitSpeechRecognition();
    r.lang = 'es-PE'; r.start();
    document.getElementById('mic-btn').style.color = 'red';
    r.onresult = (e) => handleUserInteraction(e.results[0][0].transcript);
    r.onend = () => document.getElementById('mic-btn').style.color = '#ff4500';
}
function speak(t) { if (synth.speaking) synth.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-US'; synth.speak(u); }

// ==========================================
// 6. ESTILOS CSS (ANIMACIÓN SUAVE Y CLICKEABLE)
// ==========================================
function injectStyles() {
    const css = `
    /* Animación suave "Flotando" (Arriba/Abajo) */
    @keyframes floatSoft {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
    }

    #veronica-orbita {
        position: fixed; 
        bottom: 25px; 
        right: 25px; 
        width: 65px; 
        height: 65px; 
        border-radius: 50%; 
        background: linear-gradient(135deg, #ff4500 0%, #ff8c00 100%); 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
        cursor: pointer; 
        z-index: 99999; /* Z-Index alto para estar sobre todo */
        display: flex; 
        align-items: center; 
        justify-content: center; 
        
        /* Animación suave y lenta */
        animation: floatSoft 3s ease-in-out infinite;
        transition: all 0.3s ease;
    }

    /* Efecto al pasar el mouse (se queda quieto y crece un poco) */
    #veronica-orbita:hover { 
        animation-play-state: paused; /* Detiene el movimiento para clickear fácil */
        transform: scale(1.1) translateY(-5px); 
        box-shadow: 0 6px 20px rgba(255, 69, 0, 0.6); 
    }

    #veronica-orbita img { width: 40px; height: 40px; object-fit: contain; }

    #veronica-window { 
        position: fixed; bottom: 100px; right: 25px; width: 340px; height: 480px; 
        background: #fff8f5; border-radius: 20px; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 99999; 
        display: flex; flex-direction: column; overflow: hidden; 
        font-family: 'Segoe UI', sans-serif; border: 1px solid #ffdbbf; 
    }
    .hidden { display: none !important; }

    .v-header { background: linear-gradient(135deg, #ff4500 0%, #d83a00 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
    #v-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 15px; font-size: 14px; line-height: 1.4; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .msg.bot { background: #ffffff; color: #333; border-bottom-left-radius: 2px; border: 1px solid #eee; }
    .msg.user { background: #ffdbbf; color: #5a2d0c; align-self: flex-end; border-bottom-right-radius: 2px; }

    .v-input-area { padding: 10px; background: white; border-top: 1px solid #eee; display: flex; align-items: center; gap: 8px; }
    #chat-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 10px 15px; outline: none; transition: border 0.3s; }
    #chat-input:focus { border-color: #ff4500; }
    #send-btn, #mic-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #ff4500; }
    
    /* BOTONES DE OPCIONES (CHIPS) */
    .v-chip { background: white; border: 1px solid #ff4500; color: #ff4500; padding: 6px 12px; border-radius: 15px; cursor: pointer; font-size: 13px; transition: all 0.2s; font-weight: 500; }
    .v-chip:hover { background: #ff4500; color: white; transform: translateY(-2px); box-shadow: 0 2px 5px rgba(255,69,0,0.3); }
    `;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
}