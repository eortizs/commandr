// popup.js - Versión autónoma que hace TODO

const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

document.getElementById('btnBuscar').addEventListener('click', iniciarBusqueda);

async function iniciarBusqueda() {
    const producto = document.getElementById('producto').value.trim();
    if (!producto) return;
    
    const btn = document.getElementById('btnBuscar');
    const status = document.getElementById('status');
    const resultados = document.getElementById('resultados');
    
    btn.disabled = true;
    status.textContent = '🌐 Abriendo Walmart...';
    resultados.innerHTML = '';
    
    try {
        // 1. Obtener pestaña actual
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 2. Navegar a Walmart en la pestaña actual
        status.textContent = '🌐 Navegando a Walmart...';
        await chrome.tabs.update(tab.id, { url: 'https://www.walmart.com.mx/' });
        
        // 3. Esperar carga
        status.textContent = '⏳ Cargando página...';
        await esperar(6000);
        
        // 3. Ejecutar búsqueda en la pestaña
        status.textContent = '⌨️ Buscando...';
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: buscarEnPagina,
            args: [producto]
        });
        
        // 4. Esperar resultados
        status.textContent = '⏳ Esperando resultados...';
        await esperar(10000);
        
        // 5. Tomar screenshot
        status.textContent = '📸 Capturando...';
        await chrome.tabs.update(tab.id, { active: true });
        await esperar(2000);
        
        const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png'
        });
        
        // 6. Analizar con Gemini
        status.textContent = '🤖 Analizando...';
        const productos = await analizarConGemini(screenshot);
        
        // 7. Mostrar resultados
        status.textContent = `✅ ${productos.length} productos encontrados`;
        mostrarResultados(productos);
        
        // 8. Descargar JSON
        descargarJSON(producto, productos);
        
    } catch (error) {
        status.textContent = `❌ Error: ${error.message}`;
        console.error(error);
    } finally {
        btn.disabled = false;
    }
}

// Función que se ejecuta en la página de Walmart
function buscarEnPagina(producto) {
    return new Promise((resolve) => {
        const findInput = () => {
            const selectores = [
                'input[data-automation-id="header-input-search"]',
                'input[placeholder*="Buscar" i]',
                'input[type="search"]',
                'input[name="q"]'
            ];
            
            for (const selector of selectores) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) return el;
            }
            
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                if ((input.placeholder || '').toLowerCase().includes('buscar')) {
                    return input;
                }
            }
            return null;
        };
        
        const input = findInput();
        if (!input) {
            console.error('Input no encontrado');
            resolve();
            return;
        }
        
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            input.focus();
            input.click();
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            let i = 0;
            const typeChar = () => {
                if (i < producto.length) {
                    input.value += producto[i];
                    input.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: producto[i]
                    }));
                    i++;
                    setTimeout(typeChar, 100 + Math.random() * 150);
                } else {
                    setTimeout(() => {
                        input.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                        }));
                        const form = input.closest('form');
                        if (form) form.submit();
                        resolve();
                    }, 500);
                }
            };
            
            typeChar();
        }, 1000);
    });
}

async function analizarConGemini(base64Image) {
    try {
        // La imagen ya viene como data URL desde chrome.tabs.captureVisibleTab
        const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
        
        console.log('Enviando a Gemini...');
        
        const prompt = `Analiza esta imagen de resultados de búsqueda de Walmart México.
Extrae los productos con sus precios visibles.

Responde ÚNICAMENTE en formato JSON válido:
[
  {
    "nombre": "nombre del producto",
    "precio": "$XX.XX"
  }
]

Si no hay productos visibles o hay un error en la página, responde: []`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/png', data: base64Data } }
                    ]
                }]
            })
        });
        
        console.log('Respuesta Gemini status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Gemini:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Respuesta Gemini:', data);
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Respuesta de Gemini sin candidates');
        }
        
        const texto = data.candidates[0].content.parts[0].text;
        
        // Extraer JSON
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
    } catch (error) {
        console.error('Error en analizarConGemini:', error);
        throw error;
    }
}

function mostrarResultados(productos) {
    const div = document.getElementById('resultados');
    div.innerHTML = productos.map((p, i) => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold;">${i + 1}. ${p.nombre}</div>
            <div style="color: #0071ce;">${p.precio}</div>
        </div>
    `).join('');
}

function descargarJSON(producto, productos) {
    const data = {
        tienda: 'Walmart',
        producto,
        fecha: new Date().toISOString(),
        productos
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: `walmart-${producto}-${Date.now()}.json`
    });
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
