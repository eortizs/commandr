const { chromium } = require('playwright');

async function validateWithErrorDetection() {
    console.log('🚀 Iniciando validación con detección de errores...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Arrays para capturar logs
    const consoleLogs = [];
    const pageErrors = [];
    const networkErrors = [];
    
    // Capturar console logs
    page.on('console', msg => {
        const log = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push(log);
        if (msg.type() === 'error') {
            console.log('🚨 Console Error:', msg.text());
        }
    });
    
    // Capturar errores de página
    page.on('pageerror', error => {
        pageErrors.push(error.message);
        console.log('💥 Page Error:', error.message);
    });
    
    // Capturar errores de red
    page.on('response', response => {
        if (response.status() >= 400) {
            const error = `${response.status()} ${response.statusText()} - ${response.url()}`;
            networkErrors.push(error);
            console.log('🌐 Network Error:', error);
        }
    });
    
    try {
        // Navegar al sitio
        console.log('🌐 Navegando al sitio...');
        await page.goto('http://216.238.79.133:5176/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Screenshot inicial
        await page.screenshot({ path: '/tmp/01-initial.png' });
        console.log('📸 Screenshot: Página inicial guardada');
        
        // Esperar un poco para que carguen recursos dinámicos
        await page.waitForTimeout(3000);
        
        // Segundo screenshot después de carga completa
        await page.screenshot({ path: '/tmp/02-after-load.png', fullPage: true });
        console.log('📸 Screenshot: Después de carga completa');
        
        // Verificar si hay errores visibles en la página
        const errorVisible = await page.locator('.error, .vite-error, [role="alert"]').isVisible().catch(() => false);
        
        // Reporte
        console.log('\n📊 REPORTE DE VALIDACIÓN');
        console.log('═══════════════════════════════════════');
        console.log(`URL: ${page.url()}`);
        console.log(`Título: ${await page.title()}`);
        console.log(`Error visible: ${errorVisible ? 'SÍ ⚠️' : 'No ✅'}`);
        
        console.log('\n📝 Console Logs:', consoleLogs.length);
        consoleLogs.forEach(log => console.log('   ', log));
        
        console.log('\n💥 Page Errors:', pageErrors.length);
        pageErrors.forEach(err => console.log('   ', err));
        
        console.log('\n🌐 Network Errors:', networkErrors.length);
        networkErrors.forEach(err => console.log('   ', err));
        
        // Intentar login si no hay errores visibles graves
        if (!errorVisible && pageErrors.length === 0) {
            console.log('\n🔑 Intentando login...');
            await page.fill('input[type="email"]', 'daniela.canizalez@fifa.com');
            await page.fill('input[type="password"]', '123456');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(3000);
            await page.screenshot({ path: '/tmp/03-after-login.png', fullPage: true });
            console.log('📸 Screenshot: Después del login');
        } else {
            console.log('\n⚠️  Login omitido debido a errores detectados');
        }
        
        console.log('\n✅ Validación completada');
        console.log('Screenshots guardados en /tmp/');
        
    } catch (error) {
        console.error('\n❌ Error crítico:', error.message);
        await page.screenshot({ path: '/tmp/error-critical.png' });
    } finally {
        await browser.close();
    }
}

validateWithErrorDetection();
