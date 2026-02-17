const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs-extra');
const path = require('path');

puppeteer.use(StealthPlugin());

// Configuración
const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Ruta a la extensión
const EXTENSION_PATH = path.join(__dirname, 'walmart-extension');

async function scrapeWalmart(producto) {
    console.log(`🚀 Iniciando scraping de Walmart para: ${producto}`);
    
    const browser = await puppeteer.launch({
        headless: false, // Necesario para que la extensión funcione
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1280,900'
        ]
        // Puppeteer usará su Chromium descargado automáticamente
    });
    
    try {
        // Obtener página de background de la extensión
        const targets = await browser.targets();
        const extensionTarget = targets.find(t => t.type() === 'service_worker' && t.url().includes('walmart'));
        
        // Crear nueva página
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        
        // PASO 1: Ir a Walmart
        console.log('🌐 Navegando a Walmart...');
        await page.goto('https://www.walmart.com.mx/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await delay(3000);
        
        // PASO 2: Simular búsqueda humana
        console.log('⌨️ Simulando búsqueda...');
        await page.evaluate((prod) => {
            return new Promise((resolve) => {
                const findInput = () => {
                    const selectores = [
                        'input[data-automation-id="header-input-search"]',
                        'input[placeholder*="Buscar" i]',
                        'input[type="search"]',
                        'input[name="q"]',
                        'input[aria-label*="Buscar" i]'
                    ];
                    
                    for (const selector of selectores) {
                        const el = document.querySelector(selector);
                        if (el && el.offsetParent !== null) return el;
                    }
                    
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
                        if (i < prod.length) {
                            input.value += prod[i];
                            input.dispatchEvent(new InputEvent('input', {
                                bubbles: true,
                                inputType: 'insertText',
                                data: prod[i]
                            }));
                            i++;
                            setTimeout(typeChar, 100 + Math.random() * 150);
                        } else {
                            setTimeout(() => {
                                input.dispatchEvent(new KeyboardEvent('keydown', {
                                    key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                                }));
                                input.dispatchEvent(new KeyboardEvent('keyup', {
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
        }, producto);
        
        // PASO 3: Esperar resultados
        console.log('⏳ Esperando resultados...');
        await delay(8000);
        
        // PASO 4: Tomar screenshot
        console.log('📸 Capturando pantalla...');
        const screenshot = await page.screenshot({ 
            type: 'png',
            fullPage: true 
        });
        
        // PASO 5: Analizar con Gemini
        console.log('🤖 Analizando con Gemini...');
        const productos = await analizarConGemini(screenshot);
        
        console.log(`✅ ${productos.length} productos encontrados`);
        
        // Guardar resultados
        const fecha = new Date().toISOString().split('T')[0];
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        // Guardar screenshot
        await fs.writeFile(path.join(outputDir, `walmart-${producto}-${fecha}.png`), screenshot);
        
        // Guardar JSON
        const resultado = {
            tienda: 'Walmart',
            producto: producto,
            fecha: fecha,
            productos: productos
        };
        
        await fs.writeJson(
            path.join(outputDir, `walmart-${producto}-${fecha}.json`),
            resultado,
            { spaces: 2 }
        );
        
        console.log('💾 Resultados guardados en:', outputDir);
        
        return productos;
        
    } finally {
        await browser.close();
    }
}

async function analizarConGemini(imageBuffer) {
    const base64Data = imageBuffer.toString('base64');
    
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
        throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const texto = data.candidates[0].content.parts[0].text;
    
    try {
        const jsonMatch = texto.match(/\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return [];
    } catch (e) {
        console.error('Error parseando JSON:', texto);
        return [];
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Uso
async function main() {
    const producto = process.argv[2] || 'cebolla blanca';
    
    try {
        const productos = await scrapeWalmart(producto);
        console.log('\n📊 Resultados:');
        productos.forEach((p, i) => {
            console.log(`${i + 1}. ${p.nombre} - ${p.precio}`);
        });
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { scrapeWalmart };
