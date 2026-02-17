const puppeteer = require('puppeteer-core');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuración
const GEMINI_API_KEY = 'AIzaSyAwRhyZqvgZ5e5I4e-qsEyolssrJG97_VM';
const GEMINI_MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function scrapeWalmart(producto) {
    console.log(`🚀 Scraping Walmart: ${producto}`);
    
    // Encontrar Chrome instalado
    const chromePath = await findChrome();
    console.log(`🌐 Usando Chrome: ${chromePath}`);
    
    // Lanzar Chrome con debugging port
    const debuggingPort = 9222;
    
    // Matar Chrome previo
    try {
        await execPromise('pkill -f "chrome.*--remote-debugging-port"');
        await delay(3000);
    } catch (e) {}
    
    // Lanzar Chrome con más flags
    const chromeCmd = `"${chromePath}" --remote-debugging-port=${debuggingPort} --remote-allow-origins=* --no-first-run --no-default-browser-check --window-size=1366,768 --start-maximized --disable-popup-blocking "https://www.walmart.com.mx/" > /dev/null 2>&1 &`;
    
    console.log('🌐 Lanzando Chrome...');
    exec(chromeCmd);
    
    // Esperar a que Chrome esté listo (verificar puerto)
    console.log('⏳ Esperando Chrome...');
    await esperarPuerto(debuggingPort, 30000);
    
    // Conectar con Puppeteer al Chrome existente
    console.log('🔌 Conectando a Chrome...');
    await delay(2000);
    
    // Conectar con Puppeteer al Chrome existente
    console.log('🔌 Conectando a Chrome...');
    const browser = await puppeteer.connect({
        browserURL: `http://localhost:${debuggingPort}`,
        defaultViewport: null
    });
    
    try {
        // Obtener página
        const pages = await browser.pages();
        const page = pages[0];
        
        // Esperar carga
        await delay(5000);
        
        // Buscar producto
        console.log('⌨️ Buscando producto...');
        await buscarProducto(page, producto);
        
        // Esperar resultados
        console.log('⏳ Esperando resultados...');
        await delay(10000);
        
        // Tomar screenshot con gnome-screenshot (captura toda la pantalla)
        console.log('📸 Capturando pantalla...');
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        const screenshotPath = path.join(outputDir, `walmart-${producto}-${Date.now()}.png`);
        await execPromise(`gnome-screenshot -f "${screenshotPath}"`);
        
        // Analizar con Gemini
        console.log('🤖 Analizando...');
        const screenshot = await fs.readFile(screenshotPath);
        const productos = await analizarConGemini(screenshot);
        
        console.log(`✅ ${productos.length} productos encontrados`);
        
        // Guardar JSON
        await fs.writeJson(
            path.join(outputDir, `walmart-${producto}-${Date.now()}.json`),
            { tienda: 'Walmart', producto, fecha: new Date().toISOString(), productos },
            { spaces: 2 }
        );
        
        return productos;
        
    } finally {
        await browser.disconnect();
        // Matar Chrome
        try {
            await execPromise('pkill -f "chrome.*--remote-debugging-port"');
        } catch (e) {}
    }
}

async function findChrome() {
    const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/opt/google/chrome/google-chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
    
    for (const chromePath of possiblePaths) {
        if (await fs.pathExists(chromePath)) {
            return chromePath;
        }
    }
    
    // Intentar encontrar con which
    try {
        const { stdout } = await execPromise('which google-chrome || which chromium || which chromium-browser');
        return stdout.trim();
    } catch (e) {
        throw new Error('Chrome no encontrado. Instala Google Chrome.');
    }
}

async function buscarProducto(page, producto) {
    // Encontrar input
    const input = await page.waitForSelector(
        'input[data-automation-id="header-input-search"], input[placeholder*="Buscar" i], input[type="search"]',
        { timeout: 15000 }
    );
    
    // Click y focus
    await input.click();
    await input.focus();
    
    // Limpiar
    await input.evaluate(el => el.value = '');
    await delay(300);
    
    // Escribir
    for (const char of producto) {
        await input.type(char, { delay: 50 + Math.random() * 100 });
    }
    
    await delay(500);
    
    // Enter
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

async function esperarPuerto(port, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(`http://localhost:${port}/json/version`);
            if (response.ok) {
                return;
            }
        } catch (e) {
            // Puerto no listo aún
        }
        await delay(500);
    }
    throw new Error(`Timeout esperando puerto ${port}`);
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
