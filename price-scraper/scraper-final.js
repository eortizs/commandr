const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs-extra');
const path = require('path');

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

// Lista de productos a buscar (frutas y verduras)
const PRODUCTOS = [
    'cebolla blanca',
    'jitomate saladet',
    'aguacate hass',
    'limon',
    'chile serrano',
    'papa',
    'zanahoria',
    'lechuga',
    'pepino',
    'calabacita',
    'tomate',
    'manzana',
    'platano',
    'naranja',
    'pera'
];

// Tiendas funcionando (Soriana, Chedraui, La Comer)
const TIENDAS = {
    soriana: {
        nombre: 'Soriana',
        buscar: (producto) => `https://www.soriana.com/buscar?q=${encodeURIComponent(producto)}`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('article, .product, [data-testid]');
                
                contenedores.forEach(cont => {
                    const nombreSelectors = ['h3', 'h2', '.name', '[class*="name"]', '[class*="title"]', '[class*="product"]'];
                    let nombre = null;
                    for (const sel of nombreSelectors) {
                        const el = cont.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            nombre = el.textContent.trim();
                            break;
                        }
                    }
                    
                    const spans = cont.querySelectorAll('span');
                    let precio = null;
                    for (const span of spans) {
                        const texto = span.textContent.trim();
                        const match = texto.match(/\$[\d,]+\.?\d*/);
                        if (match) {
                            precio = match[0];
                            break;
                        }
                    }
                    
                    if (nombre && precio) {
                        items.push({ nombre, precio });
                    }
                });
                
                return items.slice(0, 3);
            });
        }
    },
    chedraui: {
        nombre: 'Chedraui',
        buscar: (producto) => `https://www.chedraui.com.mx/${encodeURIComponent(producto)}?_q=${encodeURIComponent(producto)}&map=ft`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('article, .product, [data-testid]');
                
                contenedores.forEach(cont => {
                    const nombreSelectors = ['h3', 'h2', '.name', '[class*="name"]', '[class*="title"]'];
                    let nombre = null;
                    for (const sel of nombreSelectors) {
                        const el = cont.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            nombre = el.textContent.trim();
                            break;
                        }
                    }
                    
                    const spans = cont.querySelectorAll('span');
                    let precio = null;
                    for (const span of spans) {
                        const texto = span.textContent.trim();
                        const match = texto.match(/\$[\d,]+\.?\d*/);
                        if (match) {
                            precio = match[0];
                            break;
                        }
                    }
                    
                    if (nombre && precio) {
                        items.push({ nombre, precio });
                    }
                });
                
                return items.slice(0, 3);
            });
        }
    },
    lacomer: {
        nombre: 'La Comer',
        buscar: (producto) => `https://www.lacomer.com.mx/lacomer/#!/item-search/287/${encodeURIComponent(producto)}/true?p=1&t=0&succId=287&succFmt=100`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('.product-item, article, [class*="product"]');
                
                contenedores.forEach(cont => {
                    const nombreSelectors = ['.product-name', 'h3', 'h2', '[class*="name"]', '[class*="title"]'];
                    let nombre = null;
                    for (const sel of nombreSelectors) {
                        const el = cont.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            nombre = el.textContent.trim();
                            break;
                        }
                    }
                    
                    const spans = cont.querySelectorAll('span');
                    let precio = null;
                    for (const span of spans) {
                        const texto = span.textContent.trim();
                        const match = texto.match(/\$[\d,]+\.?\d*/);
                        if (match) {
                            precio = match[0];
                            break;
                        }
                    }
                    
                    if (nombre && precio) {
                        items.push({ nombre, precio });
                    }
                });
                
                return items.slice(0, 3);
            });
        }
    }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(4000 + Math.random() * 3000);

class PriceScraper {
    constructor() {
        this.resultados = [];
        this.fecha = new Date().toISOString().split('T')[0];
    }

    async init() {
        console.log('🚀 Iniciando scraper de precios...\n');
        console.log(`📅 Fecha: ${this.fecha}`);
        console.log(`🛒 Tiendas: ${Object.values(TIENDAS).map(t => t.nombre).join(', ')}`);
        console.log(`📦 Productos: ${PRODUCTOS.length}\n`);
        
        this.browser = await puppeteer.launch(BROWSER_CONFIG);
    }

    async scrapeTienda(tiendaKey, producto) {
        const tienda = TIENDAS[tiendaKey];
        console.log(`🔍 ${tienda.nombre} | "${producto}"`);
        
        const page = await this.browser.newPage();
        
        try {
            await page.setViewport({ width: 1280, height: 720 });
            
            const url = tienda.buscar(producto);
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });
            
            await randomDelay();
            
            const datos = await tienda.extraer(page);
            
            await page.close();
            
            if (datos.length > 0) {
                console.log(`   ✅ ${datos.length} productos`);
                datos.forEach((p, i) => {
                    console.log(`      ${i+1}. ${p.nombre.substring(0, 40)}... ${p.precio}`);
                });
            } else {
                console.log(`   ⚠️  Sin resultados`);
            }
            
            return datos.map(p => ({
                tienda: tienda.nombre,
                producto: producto,
                nombre: p.nombre,
                precio: p.precio,
                fecha: this.fecha,
                url: url
            }));
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            await page.close();
            return [];
        }
    }

    async scrapeTodo() {
        for (const tiendaKey of Object.keys(TIENDAS)) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🏪 ${TIENDAS[tiendaKey].nombre}`);
            console.log('='.repeat(50));
            
            for (const producto of PRODUCTOS) {
                const resultados = await this.scrapeTienda(tiendaKey, producto);
                this.resultados.push(...resultados);
                await randomDelay();
            }
        }
    }

    async guardarResultados() {
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        // JSON
        const jsonFile = path.join(outputDir, `precios-${this.fecha}.json`);
        await fs.writeJson(jsonFile, this.resultados, { spaces: 2 });
        
        // CSV
        if (this.resultados.length > 0) {
            const csvFile = path.join(outputDir, `precios-${this.fecha}.csv`);
            const headers = Object.keys(this.resultados[0]).join(',');
            const rows = this.resultados.map(d => 
                Object.values(d).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
            );
            await fs.writeFile(csvFile, [headers, ...rows].join('\n'));
        }
        
        // Resumen
        console.log(`\n${'='.repeat(50)}`);
        console.log('📊 RESUMEN');
        console.log('='.repeat(50));
        console.log(`💾 JSON: precios-${this.fecha}.json`);
        console.log(`💾 CSV: precios-${this.fecha}.csv`);
        console.log(`📈 Total: ${this.resultados.length} productos`);
        
        // Por tienda
        Object.values(TIENDAS).forEach(tienda => {
            const count = this.resultados.filter(r => r.tienda === tienda.nombre).length;
            console.log(`   • ${tienda.nombre}: ${count}`);
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n👋 Navegador cerrado');
        }
    }
}

async function main() {
    const scraper = new PriceScraper();
    
    try {
        await scraper.init();
        await scraper.scrapeTodo();
        await scraper.guardarResultados();
    } catch (error) {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { PriceScraper, PRODUCTOS, TIENDAS };
