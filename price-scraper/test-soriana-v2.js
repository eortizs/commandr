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
    console.log('🔍 Soriana - Cebolla Blanca\n');
    
    const browser = await puppeteer.launch(BROWSER_CONFIG);
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1280, height: 720 });
        
        const url = 'https://www.soriana.com/buscar?q=cebolla+blanca';
        console.log('🌐 Navegando...');
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        await new Promise(r => setTimeout(r, 5000));
        console.log('✅ Página lista\n');
        
        // Extraer datos con selectores más flexibles
        const productos = await page.evaluate(() => {
            const items = [];
            
            // Buscar todos los contenedores de productos
            const contenedores = document.querySelectorAll('article, .product, [data-testid]');
            
            contenedores.forEach(cont => {
                // Buscar nombre
                const nombreSelectors = [
                    'h3', 'h2', '.name', '[class*="name"]',
                    '[class*="title"]', '[class*="product"]'
                ];
                let nombre = null;
                for (const sel of nombreSelectors) {
                    const el = cont.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        nombre = el.textContent.trim();
                        break;
                    }
                }
                
                // Buscar precio - span con $ y números
                const spans = cont.querySelectorAll('span');
                let precio = null;
                for (const span of spans) {
                    const texto = span.textContent.trim();
                    if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                        precio = texto;
                        break;
                    }
                }
                
                if (nombre && precio) {
                    items.push({ nombre, precio });
                }
            });
            
            return items.slice(0, 5); // Máximo 5 productos
        });
        
        console.log(`📊 Productos encontrados: ${productos.length}\n`);
        
        productos.forEach((p, i) => {
            console.log(`${i+1}. ${p.nombre}`);
            console.log(`   💰 ${p.precio}\n`);
        });
        
        // Guardar resultado
        const fs = require('fs');
        const resultado = {
            tienda: 'Soriana',
            producto: 'cebolla blanca',
            fecha: new Date().toISOString(),
            productos: productos
        };
        
        fs.writeFileSync('test-resultado.json', JSON.stringify(resultado, null, 2));
        console.log('💾 Guardado en: test-resultado.json');
        
        await browser.close();
        return productos;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await browser.close();
        return [];
    }
}

scrapeSoriana().then(resultados => {
    console.log('\n✅ Test completado');
    process.exit(resultados.length > 0 ? 0 : 1);
});
