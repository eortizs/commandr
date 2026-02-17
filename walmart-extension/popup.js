// Configuración de Gemini
const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Elementos del DOM
const btnBuscar = document.getElementById('btnBuscar');
const btnExportar = document.getElementById('btnExportar');
const inputProducto = document.getElementById('producto');
const statusDiv = document.getElementById('status');
const resultadosDiv = document.getElementById('resultados');

let resultados = [];

// Event listeners
btnBuscar.addEventListener('click', iniciarBusqueda);
btnExportar.addEventListener('click', exportarJSON);

async function iniciarBusqueda() {
    const producto = inputProducto.value.trim();
    
    if (!producto) {
        mostrarStatus('❌ Ingresa un producto', 'error');
        return;
    }
    
    btnBuscar.disabled = true;
    resultados = [];
    resultadosDiv.innerHTML = '';
    btnExportar.style.display = 'none';
    
    try {
        mostrarStatus('🌐 Abriendo Walmart...', 'info');
        
        // Crear nueva pestaña
        const newTab = await chrome.tabs.create({ 
            url: 'https://www.walmart.com.mx/',
            active: true
        });
        
        // Esperar a que el content script se cargue
        mostrarStatus('⏳ Esperando carga...', 'info');
        await esperar(5000);
        
        // Esperar a que la página esté lista
        await esperarCargaCompleta(newTab.id);
        
        mostrarStatus('⌨️ Enviando búsqueda...', 'info');
        
        // Enviar mensaje al content script
        const response = await enviarMensajeConRetry(newTab.id, {
            action: 'buscar',
            producto: producto
        });
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'No se pudo realizar la búsqueda');
        }
        
        mostrarStatus('⏳ Esperando resultados...', 'info');
        await esperar(10000);
        
        // Activar pestaña y tomar screenshot
        await chrome.tabs.update(newTab.id, { active: true });
        await esperar(2000);
        
        mostrarStatus('📸 Capturando...', 'info');
        const screenshot = await chrome.tabs.captureVisibleTab(newTab.windowId, { format: 'png' });
        
        mostrarStatus('🤖 Analizando...', 'info');
        const productos = await analizarConGemini(screenshot);
        
        if (productos.length > 0) {
            resultados = productos;
            mostrarResultados(productos);
            mostrarStatus(`✅ ${productos.length} productos`, 'success');
            btnExportar.style.display = 'block';
        } else {
            mostrarStatus('⚠️ Sin productos', 'error');
        }
        
    } catch (error) {
        mostrarStatus(`❌ Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        btnBuscar.disabled = false;
    }
}

// Enviar mensaje con reintentos
async function enviarMensajeConRetry(tabId, message, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Intento ${i + 1} de enviar mensaje...`);
            const response = await chrome.tabs.sendMessage(tabId, message);
            console.log('Respuesta recibida:', response);
            return response;
        } catch (e) {
            console.log(`Intento ${i + 1} fallido:`, e.message);
            if (i < maxRetries - 1) {
                await esperar(1000);
            }
        }
    }
    throw new Error('No se pudo comunicar con el content script');
}

// Esperar a que la pestaña cargue
async function esperarCargaCompleta(tabId) {
    return new Promise((resolve) => {
        let intentos = 0;
        const maxIntentos = 20;
        
        const intervalo = setInterval(async () => {
            intentos++;
            
            try {
                const tab = await chrome.tabs.get(tabId);
                
                if (tab.status === 'complete') {
                    clearInterval(intervalo);
                    resolve();
                }
            } catch (e) {
                console.error('Error verificando tab:', e);
            }
            
            if (intentos >= maxIntentos) {
                clearInterval(intervalo);
                resolve();
            }
        }, 1000);
    });
}

async function analizarConGemini(base64Image) {
    const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
    
    const prompt = `Analiza esta imagen de resultados de búsqueda de Walmart México.
    Extrae los productos con sus precios.
    
    Responde ÚNICAMENTE en formato JSON válido:
    [
      {
        "nombre": "nombre del producto",
        "precio": "$XX.XX"
      }
    ]
    
    Si no hay productos visibles o hay error 404, responde: []`;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: 'image/png',
                            data: base64Data
                        }
                    }
                ]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const texto = data.candidates[0].content.parts[0].text;
    
    try {
        const jsonMatch = texto.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (e) {
        console.error('Error parseando JSON:', texto);
        return [];
    }
}

function mostrarResultados(productos) {
    resultadosDiv.innerHTML = productos.map((p, i) => `
        <div class="producto">
            <div class="producto-nombre">${i + 1}. ${p.nombre}</div>
            <div class="producto-precio">${p.precio}</div>
        </div>
    `).join('');
}

function exportarJSON() {
    const dataStr = JSON.stringify(resultados, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `walmart-precios-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    mostrarStatus('💾 Archivo descargado', 'success');
}

function mostrarStatus(mensaje, tipo) {
    statusDiv.textContent = mensaje;
    statusDiv.className = tipo;
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
