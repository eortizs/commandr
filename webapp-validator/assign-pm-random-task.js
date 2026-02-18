const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function assignPMToRandomTask() {
    console.log('🚀 Iniciando asignación de PM a tarea aleatoria...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    const screenshotDir = path.join(__dirname, 'screenshots', `assign-pm-random-${Date.now()}`);
    fs.mkdirSync(screenshotDir, { recursive: true });
    
    let step = 0;
    
    try {
        // PASO 1-3: Login (determinístico)
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
        
        // PASO 4: SELECCIÓN INTELIGENTE DE TAREA
        step++;
        console.log(`📸 Paso ${step}: Seleccionar tarea aleatoria (no completada)`);
        
        // Esperar a que la tabla cargue
        await page.waitForSelector('table, [role="table"], .MuiDataGrid-root', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Extraer todas las filas visibles
        const rows = await page.locator('table tbody tr, [role="row"]').all();
        console.log(`   📊 Total de filas encontradas: ${rows.length}`);
        
        // Filtrar tareas NO completadas
        const availableTasks = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                // Obtener texto de la fila completa
                const rowText = await row.textContent();
                
                // Verificar si tiene "COMPLETADO"
                const isCompleted = rowText.includes('COMPLETADO') || 
                                   rowText.includes('Completado') ||
                                   rowText.includes('✓') ||
                                   rowText.includes('Done');
                
                // Buscar número de partida
                const partidaMatch = rowText.match(/(\d+\.\d+\.\d+)/);
                const partida = partidaMatch ? partidaMatch[1] : null;
                
                // Buscar estatus específico
                const statusMatch = rowText.match(/(PENDIENTE|EN PROGRESO|PAUSADO|COMPLETADO)/i);
                const status = statusMatch ? statusMatch[1] : 'DESCONOCIDO';
                
                console.log(`   Fila ${i}: Partida=${partida}, Status=${status}, Completado=${isCompleted}`);
                
                if (!isCompleted && partida) {
                    availableTasks.push({
                        index: i,
                        row: row,
                        partida: partida,
                        status: status,
                        text: rowText.substring(0, 100)
                    });
                }
            } catch (e) {
                // Ignorar filas que no se pueden leer
            }
        }
        
        console.log(`   ✅ Tareas disponibles (no completadas): ${availableTasks.length}`);
        
        if (availableTasks.length === 0) {
            throw new Error('No hay tareas disponibles para asignar');
        }
        
        // Elegir una aleatoria
        const randomIndex = Math.floor(Math.random() * availableTasks.length);
        const selectedTask = availableTasks[randomIndex];
        
        console.log(`   🎯 Tarea seleccionada: Partida ${selectedTask.partida} (${selectedTask.status})`);
        
        // Click en la tarea seleccionada
        await selectedTask.row.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-task-selected.png`) });
        
        // PASO 5-7: Completar asignación (determinístico)
        step++;
        console.log(`📸 Paso ${step}: Click en pestaña ACTIVIDADES`);
        await page.click('text=ACTIVIDADES');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-actividades.png`) });
        
        step++;
        console.log(`📸 Paso ${step}: Escribir Hola Mundo`);
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(1000);
        await page.fill('textarea[placeholder*="reporte"]', 'Hola Mundo');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-texto.png`) });
        
        step++;
        console.log(`📸 Paso ${step}: Click en botón enviar`);
        await page.waitForSelector('button:has(svg.lucide-send):not([disabled])', { timeout: 5000 });
        await page.click('button:has(svg.lucide-send)');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, `step-${step}-enviado.png`) });
        
        // Reporte final
        console.log('\n✅ Flujo completado exitosamente!');
        console.log(`📁 Screenshots guardados en: ${screenshotDir}`);
        console.log(`\n📊 Resumen:`);
        console.log(`   Tarea seleccionada: Partida ${selectedTask.partida}`);
        console.log(`   Estatus: ${selectedTask.status}`);
        console.log(`   Total tareas disponibles: ${availableTasks.length}`);
        
    } catch (error) {
        console.error(`\n❌ Error en paso ${step}:`, error.message);
        await page.screenshot({ path: path.join(screenshotDir, `error-step-${step}.png`) });
        throw error;
    } finally {
        await browser.close();
        console.log('\n👋 Navegador cerrado');
    }
}

assignPMToRandomTask();
