const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs-extra');
const path = require('path');

// Configurar stealth
puppeteer.use(StealthPlugin());

// Configuración
const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function scrapeWalmart(producto) {
    console.log(`🚀 Iniciando scraping de Walmart para: ${producto}`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1366,768'
        ]
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        // PASO 1: Ir a Walmart
        console.log('🌐 Navegando a Walmart...');
        await page.goto('https://www.walmart.com.mx/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await delay(5000);
        
        // PASO 2: Simular comportamiento humano - mover mouse, scroll
        console.log('🖱️ Simulando comportamiento humano...');
        await simularComportamientoHumano(page);
        
        // PASO 3: Buscar producto
        console.log('⌨️ Buscando producto...');
        await buscarProducto(page, producto);
        
        // PASO 4: Esperar resultados
        console.log('⏳ Esperando resultados...');
        await delay(10000);
        
        // PASO 5: Screenshot
        console.log('📸 Capturando...');
        const screenshot = await page.screenshot({ type: 'png', fullPage: true });
        
        // PASO 6: Analizar
        console.log('🤖 Analizando con Gemini...');
        const productos = await analizarConGemini(screenshot);
        
        console.log(`✅ ${productos.length} productos encontrados`);
        
        // Guardar
        const fecha = new Date().toISOString().split('T')[0];
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        await fs.writeFile(path.join(outputDir, `walmart-${producto}-${fecha}.png`), screenshot);
        await fs.writeJson(
            path.join(outputDir, `walmart-${producto}-${fecha}.json`),
            { tienda: 'Walmart', producto, fecha, productos },
            { spaces: 2 }
        );
        
        return productos;
        
    } finally {
        await browser.close();
    }
}

async function simularComportamientoHumano(page) {
    // Mover mouse aleatoriamente
    for (let i = 0; i < 5; i++) {
        const x = 100 + Math.random() * 800;
        const y = 100 + Math.random() * 500;
        await page.mouse.move(x, y);
        await delay(200 + Math.random() * 300);
    }
    
    // Scroll suave
    await page.evaluate(() => {
        window.scrollBy(0, 300);
    });
    await delay(1000);
}

async function buscarProducto(page, producto) {
    // Encontrar input
    const input = await page.waitForSelector('input[data-automation-id="header-input-search"], input[placeholder*="Buscar"], input[type="search"]', {
        timeout: 10000
    });
    
    if (!input) {
        throw new Error('Input de búsqueda no encontrado');
    }
    
    // Click y focus
    await input.click();
    await input.focus();
    
    // Limpiar
    await input.evaluate(el => el.value = '');
    
    // Escribir letra por letra
    for (const char of producto) {
        await input.type(char, { delay: 100 + Math.random() * 150 });
    }
    
    await delay(500);
    
    // Presionar Enter
    await page.keyboard.press('Enter');
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
    
    Si no hay productos visibles o hay error 404, responde: []`;
    
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
