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
        
        // Esperar a que la página cargue completamente
        mostrarStatus('⏳ Esperando carga de página...', 'info');
        await esperarCargaCompleta(newTab.id);
        
        mostrarStatus('⌨️ Escribiendo búsqueda...', 'info');
        
        // Ejecutar búsqueda con reintentos
        let intentos = 0;
        let exito = false;
        
        while (intentos < 3 && !exito) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: newTab.id },
                    func: buscarProducto,
                    args: [producto]
                });
                exito = true;
            } catch (e) {
                intentos++;
                console.log(`Intento ${intentos} fallido, reintentando...`);
                await esperar(2000);
            }
        }
        
        if (!exito) {
            throw new Error('No se pudo interactuar con la página');
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

// Esperar a que la pestaña cargue completamente
async function esperarCargaCompleta(tabId) {
    return new Promise((resolve) => {
        let intentos = 0;
        const maxIntentos = 30; // 30 segundos máximo
        
        const intervalo = setInterval(async () => {
            intentos++;
            
            try {
                const tab = await chrome.tabs.get(tabId);
                
                if (tab.status === 'complete') {
                    // Verificar que la página tenga contenido
                    try {
                        const result = await chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => document.readyState
                        });
                        
                        if (result[0].result === 'complete') {
                            clearInterval(intervalo);
                            resolve();
                        }
                    } catch (e) {
                        // Aún no está listo
                    }
                }
            } catch (e) {
                // Tab no disponible
            }
            
            if (intentos >= maxIntentos) {
                clearInterval(intervalo);
                resolve(); // Continuar de todos modos
            }
        }, 1000);
    });
}

// Función de búsqueda que se ejecuta en la página
function buscarProducto(producto) {
    return new Promise((resolve, reject) => {
        // Buscar input
        const findInput = () => {
            const selectores = [
                'input[data-automation-id="header-input-search"]',
                'input[placeholder*="Buscar" i]',
                'input[type="search"]',
                'input[name="q"]',
                'input[aria-label*="Buscar" i]',
                'input.search-bar',
                'header input',
                'nav input'
            ];
            
            for (const selector of selectores) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    return el;
                }
            }
            
            // Buscar cualquier input visible con placeholder de búsqueda
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                const placeholder = (input.placeholder || '').toLowerCase();
                if (placeholder.includes('buscar') && input.offsetParent !== null) {
                    return input;
                }
            }
            
            return null;
        };
        
        const input = findInput();
        
        if (!input) {
            console.error('Input no encontrado. HTML:', document.body.innerHTML.substring(0, 500));
            reject(new Error('Input de búsqueda no encontrado'));
            return;
        }
        
        console.log('Input encontrado:', input);
        
        // Scroll suave al input
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            // Focus y click
            input.focus();
            input.click();
            
            // Limpiar
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Escribir con delays
            let i = 0;
            const typeChar = () => {
                if (i < producto.length) {
                    input.value += producto[i];
                    
                    // Eventos
                    input.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: producto[i]
                    }));
                    
                    i++;
                    setTimeout(typeChar, 150 + Math.random() * 200);
                } else {
                    // Presionar Enter
                    setTimeout(() => {
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        input.dispatchEvent(enterEvent);
                        
                        // Submit form
                        const form = input.closest('form');
                        if (form) {
                            setTimeout(() => {
                                form.dispatchEvent(new Event('submit', { bubbles: true }));
                            }, 100);
                        }
                        
                        resolve();
                    }, 500);
                }
            };
            
            typeChar();
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
