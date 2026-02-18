const { chromium } = require('playwright');
const fs = require('fs');

async function validateLogin() {
    console.log('🚀 Iniciando validación de login...');
    
    const browser = await chromium.launch({ headless: false }); // Visible para ver el proceso
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Array para almacenar screenshots
    const screenshots = [];
    
    try {
        // 1. Navegar al sitio
        console.log('🌐 Navegando al sitio...');
        await page.goto('http://216.238.79.133:5176/', { waitUntil: 'networkidle' });
        
        // Screenshot inicial
        await page.screenshot({ path: '/tmp/01-initial.png' });
        screenshots.push('/tmp/01-initial.png');
        console.log('📸 Screenshot: Página inicial');
        
        // 2. Llenar email
        console.log('✉️  Ingresando email...');
        await page.fill('input[type="email"], input[name="email"], #email', 'daniela.canizalez@fifa.com');
        await page.screenshot({ path: '/tmp/02-email-filled.png' });
        screenshots.push('/tmp/02-email-filled.png');
        
        // 3. Llenar password
        console.log('🔑 Ingresando password...');
        await page.fill('input[type="password"], input[name="password"], #password', '123456');
        await page.screenshot({ path: '/tmp/03-password-filled.png' });
        screenshots.push('/tmp/03-password-filled.png');
        
        // 4. Click en login
        console.log('🔘 Click en login...');
        await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
        
        // 5. Esperar respuesta
        console.log('⏳ Esperando respuesta...');
        await page.waitForTimeout(3000);
        
        // Screenshot post-login
        await page.screenshot({ path: '/tmp/04-after-login.png', fullPage: true });
        screenshots.push('/tmp/04-after-login.png');
        console.log('📸 Screenshot: Después del login');
        
        // 6. Validar resultado
        const url = page.url();
        const title = await page.title();
        
        console.log('\n📊 Resultados:');
        console.log(`   URL final: ${url}`);
        console.log(`   Título: ${title}`);
        
        // Verificar si hay mensaje de error
        const errorMessage = await page.locator('.error, .alert-error, [role="alert"]').textContent().catch(() => null);
        
        if (errorMessage) {
            console.log(`   ❌ Error: ${errorMessage}`);
        } else if (url !== 'http://216.238.79.133:5176/') {
            console.log('   ✅ Login exitoso - Redirección detectada');
        } else {
            console.log('   ⚠️  URL sin cambios - Verificar manualmente');
        }
        
        console.log('\n📁 Screenshots guardados:');
        screenshots.forEach(s => console.log(`   - ${s}`));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/tmp/error-screenshot.png' });
        console.log('📸 Screenshot de error guardado: /tmp/error-screenshot.png');
    } finally {
        await browser.close();
        console.log('\n👋 Navegador cerrado');
    }
}

validateLogin();
