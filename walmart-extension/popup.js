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
        mostrarStatus('🌐 Navegando a Walmart...', 'info');
        
        // Obtener tab activa
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Navegar a Walmart y buscar
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: buscarEnWalmart,
            args: [producto]
        });
        
        mostrarStatus('⏳ Esperando resultados...', 'info');
        await esperar(5000);
        
        // Tomar screenshot
        mostrarStatus('📸 Capturando pantalla...', 'info');
        const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        
        // Analizar con Gemini
        mostrarStatus('🤖 Analizando con Gemini...', 'info');
        const productos = await analizarConGemini(screenshot);
        
        if (productos.length > 0) {
            resultados = productos;
            mostrarResultados(productos);
            mostrarStatus(`✅ ${productos.length} productos encontrados`, 'success');
            btnExportar.style.display = 'block';
        } else {
            mostrarStatus('⚠️ No se encontraron productos', 'error');
        }
        
    } catch (error) {
        mostrarStatus(`❌ Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        btnBuscar.disabled = false;
    }
}

// Función que se ejecuta en la página de Walmart
function buscarEnWalmart(producto) {
    // Navegar a página de búsqueda
    window.location.href = `https://www.walmart.com.mx/buscar?q=${encodeURIComponent(producto)}`;
}

async function analizarConGemini(base64Image) {
    // Remover prefijo data:image/png;base64,
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
    
    Si no hay productos visibles, responde: []`;
    
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
    
    // Extraer JSON de la respuesta
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
