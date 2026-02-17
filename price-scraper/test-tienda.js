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

const PRODUCTOS_TEST = ['cebolla blanca', 'jitomate saladet', 'limon'];

const TIENDAS = {
    soriana: {
        nombre: 'Soriana',
        url: (p) => `https://www.soriana.com/buscar?q=${encodeURIComponent(p)}`,
    },
    chedraui: {
        nombre: 'Chedraui',
        url: (p) => `https://www.chedraui.com.mx/${encodeURIComponent(p)}?_q=${encodeURIComponent(p)}&map=ft`,
    },
    walmart: {
        nombre: 'Walmart',
        url: (p) => `https://www.walmart.com.mx/buscar?q=${encodeURIComponent(p)}`,
    },
    bodegaaurrera: {
        nombre: 'Bodega Aurrera',
        url: (p) => `https://www.bodegaaurrera.com.mx/buscar?q=${encodeURIComponent(p)}`,
    },
    lacomer: {
        nombre: 'La Comer',
        url: (p) => `https://www.lacomer.com.mx/lacomer/#!/item-search/287/${encodeURIComponent(p)}/true?p=1&t=0&succId=287&succFmt=100`,
    }
};

async function testTienda(tiendaKey) {
    const tienda = TIENDAS[tiendaKey];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏪 PROBANDO: ${tienda.nombre}`);
    console.log('='.repeat(50));
    
    const browser = await puppeteer.launch(BROWSER_CONFIG);
    
    for (const producto of PRODUCTOS_TEST) {
        console.log(`\n📦 Producto: "${producto}"`);
        
        const page = await browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 720 });
            
            const url = tienda.url(producto);
            console.log(`🌐 URL: ${url}`);
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));
            
            // Análisis de la página
            const info = await page.evaluate(() => {
                const titulo = document.title;
                const h1 = document.querySelector('h1')?.textContent?.trim() || 'No H1';
                
                // Contar elementos potenciales
                const articles = document.querySelectorAll('article').length;
                const products = document.querySelectorAll('[class*="product"]').length;
                const dataTestid = document.querySelectorAll('[data-testid]').length;
                
                // Buscar precios - span con $ y números (incluye formatos como $21.90 M.N.)
                const spans = Array.from(document.querySelectorAll('span'));
                const precios = spans
                    .map(s => s.textContent.trim())
                    .filter(t => t.match(/\$[\d,]+\.?\d*/))
                    .slice(0, 5);
                
                return { titulo, h1, articles, products, dataTestid, precios };
            });
            
            console.log(`   📄 Título: ${info.titulo}`);
            console.log(`   📄 H1: ${info.h1}`);
            console.log(`   🔢 Elementos: ${info.articles} articles, ${info.products} product-classes, ${info.dataTestid} data-testid`);
            console.log(`   💰 Precios encontrados: ${info.precios.join(', ') || 'Ninguno'}`);
            
            // Screenshot
            const safeName = `${tiendaKey}-${producto.replace(/\s+/g, '_')}`;
            await page.screenshot({ path: `test-${safeName}.png`, fullPage: true });
            console.log(`   📸 Screenshot: test-${safeName}.png`);
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        } finally {
            await page.close();
        }
        
        // Delay entre productos
        await new Promise(r => setTimeout(r, 3000));
    }
    
    await browser.close();
    console.log(`\n✅ ${tienda.nombre} completado`);
}

// Ejecutar prueba para una tienda específica
async function main() {
    const tienda = process.argv[2];
    
    if (!tienda || !TIENDAS[tienda]) {
        console.log('Uso: node test-tienda.js <nombre_tienda>');
        console.log('Tiendas disponibles:', Object.keys(TIENDAS).join(', '));
        process.exit(1);
    }
    
    await testTienda(tienda);
    console.log('\n' + '='.repeat(50));
    console.log('🎉 PRUEBA COMPLETADA');
    console.log('='.repeat(50));
}

main();
