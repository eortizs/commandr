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

// Lista de productos a buscar
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
    'calabacita'
];

// Configuración de tiendas con selectores actualizados
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
                        if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                            precio = texto;
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
                        if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                            precio = texto;
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
    walmart: {
        nombre: 'Walmart',
        buscar: (producto) => `https://www.walmart.com.mx/buscar?q=${encodeURIComponent(producto)}`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('[data-automation-id="product-tile"], article, .product');
                
                contenedores.forEach(cont => {
                    const nombreSelectors = ['[data-automation-id="product-title"]', 'h3', 'h2', '[class*="title"]', '[class*="name"]'];
                    let nombre = null;
                    for (const sel of nombreSelectors) {
                        const el = cont.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            nombre = el.textContent.trim();
                            break;
                        }
                    }
                    
                    const precioSelectors = ['[data-automation-id="product-price"]', '[class*="price"]', 'span'];
                    let precio = null;
                    for (const sel of precioSelectors) {
                        const el = cont.querySelector(sel);
                        if (el) {
                            const texto = el.textContent.trim();
                            if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                                precio = texto;
                                break;
                            }
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
    bodegaaurrera: {
        nombre: 'Bodega Aurrera',
        buscar: (producto) => `https://www.bodegaaurrera.com.mx/buscar?q=${encodeURIComponent(producto)}`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('[data-automation-id="product-tile"], article, .product');
                
                contenedores.forEach(cont => {
                    const nombreSelectors = ['[data-automation-id="product-title"]', 'h3', 'h2', '[class*="title"]', '[class*="name"]'];
                    let nombre = null;
                    for (const sel of nombreSelectors) {
                        const el = cont.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            nombre = el.textContent.trim();
                            break;
                        }
                    }
                    
                    const precioSelectors = ['[data-automation-id="product-price"]', '[class*="price"]', 'span'];
                    let precio = null;
                    for (const sel of precioSelectors) {
                        const el = cont.querySelector(sel);
                        if (el) {
                            const texto = el.textContent.trim();
                            if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                                precio = texto;
                                break;
                            }
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
        buscar: (producto) => `https://www.lacomer.com.mx/buscar?q=${encodeURIComponent(producto)}`,
        extraer: async (page) => {
            return await page.evaluate(() => {
                const items = [];
                const contenedores = document.querySelectorAll('.product-item, article, [data-testid]');
                
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
                    
                    const precioSelectors = ['.product-price', '[class*="price"]', 'span'];
                    let precio = null;
                    for (const sel of precioSelectors) {
                        const el = cont.querySelector(sel);
                        if (el) {
                            const texto = el.textContent.trim();
                            if (texto.match(/^\$[\d,]+\.?\d*$/)) {
                                precio = texto;
                                break;
                            }
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
const randomDelay = () => delay(3000 + Math.random() * 2000);

class PriceScraper {
    constructor() {
        this.resultados = [];
        this.fecha = new Date().toISOString().split('T')[0];
    }

    async init() {
        console.log('🚀 Iniciando scraper...\n');
        this.browser = await puppeteer.launch(BROWSER_CONFIG);
    }

    async scrapeTienda(tiendaKey, producto) {
        const tienda = TIENDAS[tiendaKey];
        console.log(`🔍 ${tienda.nombre} - "${producto}"`);
        
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
            
            console.log(`   ✅ ${datos.length} productos encontrados`);
            
            return datos.map(p => ({
                tienda: tienda.nombre,
                producto: producto,
                nombre: p.nombre,
                precio: p.precio,
                fecha: this.fecha
            }));
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            await page.close();
            return [];
        }
    }

    async scrapeTodo() {
        for (const tiendaKey of Object.keys(TIENDAS)) {
            console.log(`\n🏪 Procesando ${TIENDAS[tiendaKey].nombre}...`);
            
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
        
        const jsonFile = path.join(outputDir, `precios-${this.fecha}.json`);
        await fs.writeJson(jsonFile, this.resultados, { spaces: 2 });
        
        console.log(`\n💾 JSON: ${jsonFile}`);
        console.log(`📊 Total: ${this.resultados.length} productos`);
        
        // CSV
        if (this.resultados.length > 0) {
            const csvFile = path.join(outputDir, `precios-${this.fecha}.csv`);
            const headers = Object.keys(this.resultados[0]).join(',');
            const rows = this.resultados.map(d => 
                Object.values(d).map(v => `"${v}"`).join(',')
            );
            await fs.writeFile(csvFile, [headers, ...rows].join('\n'));
            console.log(`💾 CSV: ${csvFile}`);
        }
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
        console.error('❌ Error fatal:', error);
        process.exit(1);
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { PriceScraper, PRODUCTOS, TIENDAS };
