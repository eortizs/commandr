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
        
        // Obtener tab activa
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // PASO 1: Crear nueva pestaña con Walmart (más limpio)
        const newTab = await chrome.tabs.create({ 
            url: 'https://www.walmart.com.mx/',
            active: true
        });
        
        mostrarStatus('⏳ Esperando carga...', 'info');
        await esperar(8000); // Más tiempo
        
        // PASO 2: Inyectar script de búsqueda humana
        mostrarStatus('⌨️ Simulando búsqueda...', 'info');
        
        // Esperar a que la página esté completamente lista
        await chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: esperarCargaPagina
        });
        
        await esperar(2000);
        
        // Escribir búsqueda
        await chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: simularBusquedaHumana,
            args: [producto]
        });
        
        mostrarStatus('⏳ Esperando resultados...', 'info');
        await esperar(10000); // Más tiempo para resultados
        
        // PASO 3: Tomar screenshot
        mostrarStatus('📸 Capturando...', 'info');
        
        // Activar la pestaña antes de screenshot
        await chrome.tabs.update(newTab.id, { active: true });
        await esperar(1000);
        
        const screenshot = await chrome.tabs.captureVisibleTab(newTab.windowId, { format: 'png' });
        
        // PASO 4: Analizar
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

// Esperar a que la página cargue completamente
function esperarCargaPagina() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// Simular búsqueda humana realista
function simularBusquedaHumana(producto) {
    return new Promise((resolve) => {
        // Buscar input con múltiples selectores
        const selectores = [
            'input[data-automation-id="header-input-search"]',
            'input[placeholder*="Buscar"]',
            'input[type="search"]',
            'input[name="q"]',
            'input[aria-label*="Buscar"]',
            'input.search-bar',
            'form input'
        ];
        
        let input = null;
        for (const selector of selectores) {
            input = document.querySelector(selector);
            if (input) break;
        }
        
        if (!input) {
            console.error('Input no encontrado');
            // Intentar con cualquier input visible
            const inputs = document.querySelectorAll('input');
            for (const inp of inputs) {
                if (inp.offsetParent !== null && (inp.placeholder || '').toLowerCase().includes('buscar')) {
                    input = inp;
                    break;
                }
            }
        }
        
        if (!input) {
            console.error('No se encontró input de búsqueda');
            resolve();
            return;
        }
        
        console.log('Input encontrado:', input);
        
        // Scroll al input
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            // Click con eventos completos
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            input.dispatchEvent(clickEvent);
            input.focus();
            
            // Seleccionar todo y borrar
            input.select();
            input.value = '';
            
            // Disparar eventos de limpieza
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Escribir letra por letra con delays variables
            let i = 0;
            const escribirLetra = () => {
                if (i < producto.length) {
                    const char = producto[i];
                    input.value += char;
                    
                    // Eventos de input
                    input.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: char
                    }));
                    
                    i++;
                    // Delay aleatorio entre 100-300ms (más humano)
                    setTimeout(escribirLetra, 100 + Math.random() * 200);
                } else {
                    // Terminó de escribir, ahora ENTER
                    setTimeout(() => {
                        // Evento keydown
                        input.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        }));
                        
                        // Evento keypress
                        input.dispatchEvent(new KeyboardEvent('keypress', {
                            key: 'Enter',
                            code: 'Enter',
                            charCode: 13,
                            bubbles: true
                        }));
                        
                        // Evento keyup
                        input.dispatchEvent(new KeyboardEvent('keyup', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        }));
                        
                        // Intentar submit del form
                        const form = input.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true }));
                            setTimeout(() => form.submit(), 100);
                        }
                        
                        // Click en botón de búsqueda si existe
                        const btn = document.querySelector('button[type="submit"]') ||
                                   document.querySelector('[data-automation-id*="search"]') ||
                                   document.querySelector('button[aria-label*="Buscar"]');
                        if (btn) {
                            setTimeout(() => btn.click(), 200);
                        }
                        
                        resolve();
                    }, 500 + Math.random() * 500);
                }
            };
            
            escribirLetra();
        }, 500);
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
