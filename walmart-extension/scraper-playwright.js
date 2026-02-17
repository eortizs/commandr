const { firefox } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

// Configuración
const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function scrapeWalmart(producto) {
    console.log(`🚀 Iniciando scraping de Walmart para: ${producto}`);
    
    // Lanzar Firefox (menos detectable)
    const browser = await firefox.launch({
        headless: false,
        args: ['--width=1366', '--height=768']
    });
    
    try {
        // Crear contexto con configuración realista
        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'es-MX',
            timezoneId: 'America/Mexico_City',
            permissions: ['geolocation'],
            geolocation: { latitude: 19.4326, longitude: -99.1332 }, // CDMX
            colorScheme: 'light'
        });
        
        // Modificar navigator para evitar detección
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-MX', 'es', 'en-US', 'en'] });
            window.chrome = { runtime: {} };
        });
        
        const page = await context.newPage();
        
        // Interceptar y modificar headers
        await page.route('**/*', async (route) => {
            const headers = await route.request().allHeaders();
            headers['Accept-Language'] = 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7';
            await route.continue({ headers });
        });
        
        // PASO 1: Ir a Walmart
        console.log('🌐 Navegando a Walmart...');
        await page.goto('https://www.walmart.com.mx/', {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        
        await delay(3000);
        
        // PASO 2: Simular comportamiento humano
        console.log('🖱️ Simulando comportamiento humano...');
        await simularComportamientoHumano(page);
        
        // PASO 3: Buscar producto
        console.log('⌨️ Buscando producto...');
        await buscarProducto(page, producto);
        
        // PASO 4: Esperar resultados
        console.log('⏳ Esperando resultados...');
        await delay(8000);
        
        // PASO 5: Screenshot
        console.log('📸 Capturando pantalla...');
        const screenshot = await page.screenshot({ type: 'png', fullPage: true });
        
        // PASO 6: Analizar con Gemini
        console.log('🤖 Analizando con Gemini...');
        const productos = await analizarConGemini(screenshot);
        
        console.log(`✅ ${productos.length} productos encontrados`);
        
        // Guardar resultados
        const fecha = new Date().toISOString().split('T')[0];
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        await fs.writeFile(path.join(outputDir, `walmart-${producto}-${fecha}.png`), screenshot);
        await fs.writeJson(
            path.join(outputDir, `walmart-${producto}-${fecha}.json`),
            { tienda: 'Walmart', producto, fecha, productos },
            { spaces: 2 }
        );
        
        console.log('💾 Resultados guardados en:', outputDir);
        
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
    await page.evaluate(() => window.scrollBy(0, 300));
    await delay(1000);
    await page.evaluate(() => window.scrollBy(0, -100));
    await delay(500);
}

async function buscarProducto(page, producto) {
    // Esperar y encontrar input
    const input = await page.waitForSelector(
        'input[data-automation-id="header-input-search"], input[placeholder*="Buscar" i], input[type="search"]',
        { timeout: 10000 }
    );
    
    if (!input) {
        throw new Error('Input de búsqueda no encontrado');
    }
    
    // Click en el input
    await input.click();
    await input.focus();
    
    // Limpiar
    await input.fill('');
    await delay(300);
    
    // Escribir letra por letra con delays aleatorios
    for (const char of producto) {
        await input.type(char, { delay: 50 + Math.random() * 100 });
    }
    
    await delay(500 + Math.random() * 500);
    
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
