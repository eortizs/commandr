const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const BROWSER_CONFIG = {
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,720',
    ],
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser'
};

async function scrapeSoriana() {
    console.log('🔍 Probando Soriana - Cebolla Blanca...\n');
    
    const browser = await puppeteer.launch(BROWSER_CONFIG);
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1280, height: 720 });
        
        const url = 'https://www.soriana.com/buscar?q=cebolla+blanca';
        console.log('🌐 Navegando a:', url);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        console.log('✅ Página cargada');
        console.log('⏳ Esperando 5 segundos para renderizado...');
        await new Promise(r => setTimeout(r, 5000));
        
        // Tomar screenshot para debug
        await page.screenshot({ path: 'soriana-debug.png', fullPage: true });
        console.log('📸 Screenshot guardado: soriana-debug.png');
        
        // Intentar múltiples selectores
        const selectores = [
            '.vtex-product-summary-2-x-productBrand',
            '.vtex-product-price-1-x-currencyContainer',
            '[data-testid="product-summary"]',
            '.soriana-product',
            'h3[class*="product"]',
            'span[class*="price"]',
        ];
        
        console.log('\n🔎 Buscando selectores:');
        for (const selector of selectores) {
            const count = await page.$$eval(selector, els => els.length);
            console.log(`  ${selector}: ${count} elementos`);
        }
        
        // Extraer datos con el selector más común
        const productos = await page.evaluate(() => {
            const items = [];
            const productos = document.querySelectorAll('.vtex-product-summary-2-x-container');
            
            productos.forEach((prod, i) => {
                if (i >= 3) return;
                
                const nombre = prod.querySelector('.vtex-product-summary-2-x-productBrand');
                const precio = prod.querySelector('.vtex-product-price-1-x-currencyContainer');
                
                if (nombre && precio) {
                    items.push({
                        nombre: nombre.textContent.trim(),
                        precio: precio.textContent.trim()
                    });
                }
            });
            
            return items;
        });
        
        console.log('\n📊 Productos encontrados:', productos.length);
        productos.forEach((p, i) => {
            console.log(`  ${i+1}. ${p.nombre} - ${p.precio}`);
        });
        
        await browser.close();
        return productos;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'soriana-error.png' });
        await browser.close();
        return [];
    }
}

scrapeSoriana().then(resultados => {
    console.log('\n✅ Prueba completada');
    process.exit(resultados.length > 0 ? 0 : 1);
});
