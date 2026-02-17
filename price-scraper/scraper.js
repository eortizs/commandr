const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs-extra');
const path = require('path');

// Activar stealth mode
puppeteer.use(StealthPlugin());

// Configuración para Banana Pi (bajos recursos)
const BROWSER_CONFIG = {
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',  // No cargar imágenes para ahorrar RAM
        '--disable-javascript',  // Deshabilitar JS inicialmente
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
    'calabacita'
];

// Configuración de tiendas
const TIENDAS = {
    soriana: {
        nombre: 'Soriana',
        baseUrl: 'https://www.soriana.com',
        buscar: (producto) => `https://www.soriana.com/buscar?q=${encodeURIComponent(producto)}`,
        selectors: {
            producto: '[data-testid="product-summary"]',
            nombre: '.vtex-product-summary-2-x-productBrand',
            precio: '.vtex-product-price-1-x-currencyContainer',
            imagen: '.vtex-product-summary-2-x-imageNormal'
        }
    },
    chedraui: {
        nombre: 'Chedraui',
        baseUrl: 'https://www.chedraui.com.mx',
        buscar: (producto) => `https://www.chedraui.com.mx/${encodeURIComponent(producto)}?_q=${encodeURIComponent(producto)}&map=ft`,
        selectors: {
            producto: '[data-testid="product-summary"]',
            nombre: '.vtex-product-summary-2-x-productBrand',
            precio: '.vtex-product-price-1-x-sellingPrice',
            imagen: '.vtex-product-summary-2-x-imageNormal'
        }
    },
    walmart: {
        nombre: 'Walmart',
        baseUrl: 'https://www.walmart.com.mx',
        buscar: (producto) => `https://www.walmart.com.mx/buscar?q=${encodeURIComponent(producto)}`,
        selectors: {
            producto: '[data-automation-id="product-tile"]',
            nombre: '[data-automation-id="product-title"]',
            precio: '[data-automation-id="product-price"]',
            imagen: '[data-automation-id="product-image"]'
        }
    },
    lacomer: {
        nombre: 'La Comer',
        baseUrl: 'https://www.lacomercio.com.mx',
        buscar: (producto) => `https://www.lacomercio.com.mx/buscar?q=${encodeURIComponent(producto)}`,
        selectors: {
            producto: '.product-item',
            nombre: '.product-name',
            precio: '.product-price',
            imagen: '.product-image'
        }
    }
};

// Delay aleatorio para evitar detección
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(2000 + Math.random() * 3000);

class PriceScraper {
    constructor() {
        this.resultados = [];
        this.fecha = new Date().toISOString().split('T')[0];
    }

    async init() {
        console.log('🚀 Iniciando scraper...');
        this.browser = await puppeteer.launch(BROWSER_CONFIG);
        console.log('✅ Navegador listo');
    }

    async scrapeTienda(tiendaKey, producto) {
        const tienda = TIENDAS[tiendaKey];
        console.log(`\n🔍 Buscando "${producto}" en ${tienda.nombre}...`);
        
        const page = await this.browser.newPage();
        
        try {
            // Configurar viewport y user agent
            await page.setViewport({ width: 1280, height: 720 });
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Navegar a la página
            const url = tienda.buscar(producto);
            await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            
            // Esperar carga
            await randomDelay();
            
            // Habilitar JavaScript temporalmente para la página
            await page.setJavaScriptEnabled(true);
            await delay(3000);
            
            // Extraer datos
            const datos = await page.evaluate((selectors) => {
                const productos = [];
                const items = document.querySelectorAll(selectors.producto);
                
                items.forEach((item, index) => {
                    if (index >= 3) return; // Solo primeros 3 resultados
                    
                    const nombreEl = item.querySelector(selectors.nombre);
                    const precioEl = item.querySelector(selectors.precio);
                    const imagenEl = item.querySelector(selectors.imagen);
                    
                    if (nombreEl && precioEl) {
                        const precioTexto = precioEl.textContent.trim();
                        const precioMatch = precioTexto.match(/\$[\d,]+\.?\d*/);
                        
                        productos.push({
                            nombre: nombreEl.textContent.trim(),
                            precio: precioMatch ? precioMatch[0] : precioTexto,
                            imagen: imagenEl ? imagenEl.src : null
                        });
                    }
                });
                
                return productos;
            }, tienda.selectors);
            
            await page.close();
            
            return datos.map(p => ({
                tienda: tienda.nombre,
                producto: producto,
                ...p,
                fecha: this.fecha,
                url: url
            }));
            
        } catch (error) {
            console.error(`❌ Error en ${tienda.nombre}: ${error.message}`);
            await page.close();
            return [];
        }
    }

    async scrapeTodo() {
        for (const tiendaKey of Object.keys(TIENDAS)) {
            for (const producto of PRODUCTOS) {
                const resultados = await this.scrapeTienda(tiendaKey, producto);
                this.resultados.push(...resultados);
                
                // Delay entre búsquedas para no saturar
                await randomDelay();
            }
            
            // Delay entre tiendas
            await delay(10000);
        }
    }

    async guardarResultados() {
        const outputDir = path.join(__dirname, 'resultados');
        await fs.ensureDir(outputDir);
        
        const filename = path.join(outputDir, `precios-${this.fecha}.json`);
        await fs.writeJson(filename, this.resultados, { spaces: 2 });
        
        console.log(`\n💾 Resultados guardados en: ${filename}`);
        console.log(`📊 Total de productos encontrados: ${this.resultados.length}`);
        
        // También guardar como CSV
        const csvFilename = path.join(outputDir, `precios-${this.fecha}.csv`);
        const csv = this.convertirACSV(this.resultados);
        await fs.writeFile(csvFilename, csv);
        
        console.log(`💾 CSV guardado en: ${csvFilename}`);
    }

    convertirACSV(datos) {
        if (datos.length === 0) return '';
        
        const headers = Object.keys(datos[0]).join(',');
        const rows = datos.map(d => Object.values(d).map(v => `"${v}"`).join(','));
        
        return [headers, ...rows].join('\n');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('👋 Navegador cerrado');
        }
    }
}

// Ejecución principal
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

// Si se ejecuta directamente
if (require.main === module) {
    main();
}

module.exports = { PriceScraper, PRODUCTOS, TIENDAS };
