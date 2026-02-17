// popup.js - Versión autónoma que hace TODO

const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Event listeners
document.getElementById('btnBuscar').addEventListener('click', () => {
    const productos = parsearProductos();
    if (productos.length > 0) {
        buscarProducto(productos[0]);
    }
});

document.getElementById('btnBuscarTodos').addEventListener('click', buscarTodosEnSecuencia);

function parsearProductos() {
    const texto = document.getElementById('productos').value;
    return texto
        .split(/[\n,]+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

async function buscarTodosEnSecuencia() {
    const productos = parsearProductos();
    
    if (productos.length === 0) {
        actualizarStatus('❌ Ingresa al menos un producto');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    const btnBuscarTodos = document.getElementById('btnBuscarTodos');
    
    btnBuscar.disabled = true;
    btnBuscarTodos.disabled = true;
    
    const resultadosTotales = [];
    
    for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];
        actualizarProgreso(i + 1, productos.length, producto);
        
        try {
            const resultado = await buscarProducto(producto, false); // No guardar individual
            if (resultado && resultado.length > 0) {
                resultadosTotales.push(...resultado);
            }
            
            // Esperar entre búsquedas
            if (i < productos.length - 1) {
                actualizarStatus(`⏳ Esperando antes de siguiente producto...`);
                await esperar(5000 + Math.random() * 5000);
            }
        } catch (error) {
            console.error(`Error buscando ${producto}:`, error);
            actualizarStatus(`❌ Error con ${producto}: ${error.message}`);
        }
    }
    
    // Guardar consolidado al final
    if (resultadosTotales.length > 0) {
        actualizarStatus(`💾 Guardando consolidado con ${resultadosTotales.length} productos...`);
        await guardarResultado('todos-los-productos', resultadosTotales);
        
        // También descargar JSON consolidado único
        await descargarConsolidadoFinal(resultadosTotales, productos);
    }
    
    actualizarStatus(`✅ Completado: ${resultadosTotales.length} productos de ${productos.length} búsquedas`);
    mostrarResultados(resultadosTotales);
    
    btnBuscar.disabled = false;
    btnBuscarTodos.disabled = false;
}

async function descargarConsolidadoFinal(productos, productosBuscados) {
    const fecha = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    
    // JSON consolidado
    const data = {
        tienda: 'Walmart',
        fecha: fecha,
        productosBuscados: productosBuscados,
        totalProductos: productos.length,
        productos: productos
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
        url: url,
        filename: `walmart-consolidado-${fecha}-${timestamp}.json`
    });
    
    // CSV consolidado
    if (productos.length > 0) {
        const headers = 'tienda,producto,nombre,precio,fecha,url\n';
        const rows = productos.map(r => 
            `"${r.tienda}","${r.producto}","${r.nombre}","${r.precio}","${r.fecha}","${r.url}"`
        ).join('\n');
        
        const csvBlob = new Blob([headers + rows], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        
        await chrome.downloads.download({
            url: csvUrl,
            filename: `walmart-consolidado-${fecha}-${timestamp}.csv`
        });
    }
}

async function buscarProducto(producto, guardarIndividual = true) {
    actualizarStatus(`🚀 Buscando: ${producto}`);
    limpiarResultados();
    
    try {
        // 1. Obtener pestaña actual
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 2. Navegar a Walmart
        actualizarStatus(`🌐 Navegando a Walmart...`);
        await chrome.tabs.update(tab.id, { url: 'https://www.walmart.com.mx/' });
        await esperar(6000);
        
        // 3. Buscar producto
        actualizarStatus(`⌨️ Buscando "${producto}"...`);
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: buscarEnPagina,
            args: [producto]
        });
        
        // 4. Esperar resultados
        actualizarStatus(`⏳ Esperando resultados...`);
        await esperar(10000);
        
        // 5. Screenshot
        actualizarStatus(`📸 Capturando...`);
        await chrome.tabs.update(tab.id, { active: true });
        await esperar(2000);
        
        const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png'
        });
        
        // 6. Analizar
        actualizarStatus(`🤖 Analizando con Gemini...`);
        const productos = await analizarConGemini(screenshot);
        
        // 7. Guardar individual si se solicita
        if (guardarIndividual && productos.length > 0) {
            actualizarStatus(`💾 Guardando ${productos.length} resultados...`);
            await guardarResultado(producto, productos);
        } else if (productos.length === 0) {
            actualizarStatus(`⚠️ No se encontraron productos para "${producto}"`);
        }
        
        return productos;
        
    } catch (error) {
        actualizarStatus(`❌ Error: ${error.message}`);
        console.error(error);
        return [];
    }
}

function actualizarStatus(mensaje) {
    document.getElementById('status').textContent = mensaje;
    console.log(mensaje);
}

function actualizarProgreso(actual, total, productoActual) {
    const progress = document.getElementById('progress');
    progress.innerHTML = `
        <div>📊 Progreso: ${actual} de ${total}</div>
        <div>🔍 Actual: ${productoActual}</div>
        <div style="margin-top: 5px; background: #ddd; height: 20px; border-radius: 10px; overflow: hidden;">
            <div style="width: ${(actual/total)*100}%; background: #0071ce; height: 100%;"></div>
        </div>
    `;
}

function limpiarResultados() {
    document.getElementById('resultados').innerHTML = '';
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
        const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
        
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
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Respuesta de Gemini sin candidates');
        }
        
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
    } catch (error) {
        console.error('Error en analizarConGemini:', error);
        throw error;
    }
}

async function guardarResultado(producto, productos) {
    const fecha = new Date().toISOString().split('T')[0];
    
    // Formato homologado
    const resultadosFormateados = productos.map(p => ({
        tienda: 'Walmart',
        producto: producto,
        nombre: p.nombre,
        precio: p.precio,
        fecha: fecha,
        url: 'https://www.walmart.com.mx/buscar?q=' + encodeURIComponent(producto)
    }));
    
    // Descargar JSON
    const data = {
        tienda: 'Walmart',
        producto: producto,
        fecha: fecha,
        productos: resultadosFormateados
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
        url: url,
        filename: `walmart-${producto}-${fecha}.json`
    });
    
    // CSV
    if (resultadosFormateados.length > 0) {
        const headers = 'tienda,producto,nombre,precio,fecha,url\n';
        const rows = resultadosFormateados.map(r => 
            `"${r.tienda}","${r.producto}","${r.nombre}","${r.precio}","${r.fecha}","${r.url}"`
        ).join('\n');
        
        const csvBlob = new Blob([headers + rows], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        
        await chrome.downloads.download({
            url: csvUrl,
            filename: `walmart-${producto}-${fecha}.csv`
        });
    }
    
    return resultadosFormateados;
}

function mostrarResultados(productos) {
    const div = document.getElementById('resultados');
    
    if (productos.length === 0) {
        div.innerHTML = '<div>No se encontraron productos</div>';
        return;
    }
    
    // Agrupar por producto buscado
    const porProducto = {};
    productos.forEach(p => {
        const key = p.producto || 'Desconocido';
        if (!porProducto[key]) porProducto[key] = [];
        porProducto[key].push(p);
    });
    
    let html = '';
    Object.entries(porProducto).forEach(([prod, items]) => {
        html += `<h3>${prod} (${items.length} resultados)</h3>`;
        html += items.map((p, i) => `
            <div class="producto-item">
                <div style="font-weight: bold;">${i + 1}. ${p.nombre}</div>
                <div style="color: #0071ce;">${p.precio}</div>
            </div>
        `).join('');
    });
    
    div.innerHTML = html;
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
