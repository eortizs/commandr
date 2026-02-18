const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function validateAndGenerateReport() {
    const timestamp = new Date().toISOString();
    const reportId = `validation-${Date.now()}`;
    
    console.log('🚀 Iniciando validación con reporte JSON...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    // Capturar datos
    const consoleLogs = [];
    const pageErrors = [];
    const networkErrors = [];
    const screenshots = [];
    
    page.on('console', msg => {
        consoleLogs.push({ type: msg.type(), text: msg.text(), time: new Date().toISOString() });
        if (msg.type() === 'error') console.log('🚨 Console Error:', msg.text());
    });
    
    page.on('pageerror', error => {
        pageErrors.push({ message: error.message, time: new Date().toISOString() });
        console.log('💥 Page Error:', error.message);
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            networkErrors.push({
                status: response.status(),
                statusText: response.statusText(),
                url: response.url(),
                time: new Date().toISOString()
            });
            console.log('🌐 Network Error:', response.status(), response.url());
        }
    });
    
    try {
        // Navegar
        console.log('🌐 Navegando al sitio...');
        await page.goto('http://216.238.79.133:5176/', { waitUntil: 'networkidle', timeout: 30000 });
        
        // Screenshots
        const screenshotDir = path.join(__dirname, 'screenshots', reportId);
        fs.mkdirSync(screenshotDir, { recursive: true });
        
        await page.screenshot({ path: path.join(screenshotDir, '01-initial.png') });
        screenshots.push('01-initial.png');
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotDir, '02-after-load.png'), fullPage: true });
        screenshots.push('02-after-load.png');
        
        // Verificar errores visibles
        const errorSelectors = ['.error', '.vite-error', '[role="alert"]', '.overlay-error'];
        let errorVisible = false;
        let errorText = null;
        
        for (const selector of errorSelectors) {
            const visible = await page.locator(selector).isVisible().catch(() => false);
            if (visible) {
                errorVisible = true;
                errorText = await page.locator(selector).textContent().catch(() => null);
                break;
            }
        }
        
        // Generar reporte JSON
        const report = {
            issue_title: pageErrors.length > 0 ? `[BUG] Error en carga: ${pageErrors[0].message.substring(0, 50)}...` : '[VALIDATION] Reporte de validación',
            issue_body: {
                description: 'Reporte automático de validación de webapp',
                environment: {
                    url: 'http://216.238.79.133:5176/',
                    browser: 'Chromium',
                    viewport: '1280x720',
                    timestamp: timestamp
                },
                summary: {
                    has_errors: pageErrors.length > 0 || errorVisible,
                    error_count: pageErrors.length,
                    console_error_count: consoleLogs.filter(l => l.type === 'error').length,
                    network_error_count: networkErrors.length
                },
                errors: {
                    page_errors: pageErrors,
                    console_errors: consoleLogs.filter(l => l.type === 'error'),
                    network_errors: networkErrors,
                    visible_error: errorVisible ? { text: errorText } : null
                },
                screenshots: screenshots.map(s => ({
                    file: s,
                    path: `screenshots/${reportId}/${s}`
                })),
                technical_details: {
                    url_final: page.url(),
                    title: await page.title(),
                    all_console_logs: consoleLogs
                }
            },
            labels: pageErrors.length > 0 ? ['bug', 'automation', 'frontend'] : ['validation', 'automation'],
            priority: pageErrors.length > 0 ? 'high' : 'low',
            assignee: null,
            metadata: {
                report_id: reportId,
                generated_by: 'webapp-validator',
                version: '1.0'
            }
        };
        
        // Guardar reporte JSON
        const reportPath = path.join(__dirname, 'reports', `${reportId}.json`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Mostrar resumen
        console.log('\n📊 REPORTE GENERADO');
        console.log('═══════════════════════════════════════');
        console.log(`ID: ${reportId}`);
        console.log(`Título del issue: ${report.issue_title}`);
        console.log(`Errores encontrados: ${report.summary.error_count}`);
        console.log(`Prioridad: ${report.priority}`);
        console.log(`\n📁 Archivos guardados:`);
        console.log(`   Reporte JSON: ${reportPath}`);
        console.log(`   Screenshots: ${screenshotDir}/`);
        
        // Mostrar comando para crear issue
        console.log('\n📝 Para crear issue en GitHub:');
        console.log(`   gh issue create --title "${report.issue_title}" --body-file "${reportPath}" --label "${report.labels.join(',')}"`);
        
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'error-critical.png') });
    } finally {
        await browser.close();
    }
}

validateAndGenerateReport();
