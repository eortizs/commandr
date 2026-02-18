const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function assignPMToTask() {
    console.log('🚀 Iniciando asignación de PM a tarea...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    // Crear directorio para screenshots
    const screenshotDir = path.join(__dirname, 'screenshots', `assign-pm-${Date.now()}`);
    fs.mkdirSync(screenshotDir, { recursive: true });
    
    let step = 0;
    
    try {
        // PASO 1: Login
        step++;
        console.log(`📸 Paso ${step}: Login`);
        await page.goto('http://216.238.79.133:5176/', { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', 'daniela.canizalez@fifa.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button:has-text("ENTRAR")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-login.png`) });
        
        // PASO 2: Click en FIFA
        step++;
        console.log(`📸 Paso ${step}: Click en FIFA`);
        await page.click('text=FIFA');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-fifa.png`) });
        
        // PASO 3: Click en C02
        step++;
        console.log(`📸 Paso ${step}: Click en C02`);
        await page.click('text=C02');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-c02.png`) });
        
        // PASO 4: Buscar y click en tarea con Partida = '1.1.2'
        step++;
        console.log(`📸 Paso ${step}: Buscar tarea con Partida 1.1.2`);
        // Esperar a que la tabla cargue
        await page.waitForSelector('table, [role="table"], .MuiDataGrid-root', { timeout: 10000 });
        await page.waitForTimeout(2000); // Esperar datos
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-before-task.png`) });
        
        // Buscar de múltiples formas
        const selectors = [
            'tr:has-text("1.1.2")',
            'td:has-text("1.1.2")',
            '[data-field="partida"]:has-text("1.1.2")',
            'text=1.1.2'
        ];
        
        let found = false;
        for (const selector of selectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 5000 })) {
                    console.log(`   ✅ Encontrado con selector: ${selector}`);
                    await element.click();
                    found = true;
                    break;
                }
            } catch (e) {
                console.log(`   ❌ No funciona: ${selector}`);
            }
        }
        
        if (!found) {
            throw new Error('No se pudo encontrar la tarea con Partida 1.1.2');
        }
        
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-task.png`) });
        
        // PASO 5: Click en pestaña ACTIVIDADES
        step++;
        console.log(`📸 Paso ${step}: Click en pestaña ACTIVIDADES`);
        await page.click('text=ACTIVIDADES');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-actividades.png`) });
        
        // PASO 6: Escribir "Hola Mundo" en el textarea
        step++;
        console.log(`📸 Paso ${step}: Escribir Hola Mundo`);
        // Buscar textarea por placeholder o por ser un textarea visible
        await page.fill('textarea[placeholder*="reporte"], textarea.MuiInputBase-input', 'Hola Mundo');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-texto.png`) });
        
        // PASO 7: Click en botón enviar
        step++;
        console.log(`📸 Paso ${step}: Click en botón enviar`);
        // Nota: El botón tiene disabled, esperar a que se habilite
        await page.waitForSelector('button:has(svg.lucide-send):not([disabled])', { timeout: 5000 });
        await page.click('button:has(svg.lucide-send)');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-enviado.png`) });
        
        console.log('\n✅ Flujo completado exitosamente!');
        console.log(`📁 Screenshots guardados en: ${screenshotDir}`);
        
    } catch (error) {
        console.error(`\n❌ Error en paso ${step}:`, error.message);
        await page.screenshot({ path: path.join(screenshotDir, `error-step-${step}.png`) });
        throw error;
    } finally {
        await browser.close();
        console.log('\n👋 Navegador cerrado');
    }
}

assignPMToTask();
