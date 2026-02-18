const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuración
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_ITERATIONS = 10;

class AIWebNavigator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.history = [];
        this.iteration = 0;
    }

    async init() {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
        console.log('🚀 Navegador iniciado');
    }

    async takeScreenshot() {
        const screenshotPath = path.join(__dirname, 'ai-screenshots', `step-${this.iteration}.png`);
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
    }

    async analyzeWithGemini(screenshotPath, goal) {
        // Leer imagen como base64
        const imageBase64 = fs.readFileSync(screenshotPath).toString('base64');
        
        const prompt = `Analiza esta captura de pantalla de una webapp. 

OBJETIVO: ${goal}

HISTORIA DE ACCIONES: ${JSON.stringify(this.history)}

Responde en formato JSON:
{
  "analysis": "Descripción de lo que ves en la pantalla",
  "current_state": "¿En qué página/paso estamos?",
  "next_action": "Descripción de la siguiente acción a realizar",
  "playwright_code": "Código JavaScript de Playwright. USA SELECTORES ROBUSTOS: prioriza atributos 'data-testid', IDs únicos, o texto visible exacto. Ejemplo: await page.click('[data-testid=\"fifa-link\"]') o await page.click('text=FIFA'). EVITA selectores complejos con múltiples niveles.",
  "is_complete": false,
  "reasoning": "Por qué decides esta acción"
}`;

        try {
            // Llamar a Gemini
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: 'image/png', data: imageBase64 } }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            // Verificar estructura de respuesta
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error('Respuesta inesperada:', JSON.stringify(data, null, 2));
                throw new Error('Estructura de respuesta inválida');
            }
            
            const text = data.candidates[0].content.parts[0].text;
            
            // Extraer JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Si no hay JSON, devolver estructura por defecto
            return {
                analysis: text.substring(0, 200),
                current_state: "unknown",
                next_action: "Esperar",
                playwright_code: "await page.waitForTimeout(1000);",
                is_complete: false,
                reasoning: "No se pudo parsear JSON, esperando"
            };
            
        } catch (error) {
            console.error('Error en analyzeWithGemini:', error.message);
            // Devolver acción segura por defecto
            return {
                analysis: "Error en análisis",
                current_state: "error",
                next_action: "Detener",
                playwright_code: null,
                is_complete: true,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    async executePlaywrightCode(code) {
        console.log('⚡ Ejecutando:', code);
        try {
            // Ejecutar código de Playwright de forma segura
            const func = new Function('page', `return (async () => { ${code} })()`);
            await func(this.page);
        } catch (error) {
            console.log(`⚠️  Error ejecutando código: ${error.message}`);
            // Si falla, intentar con selector de texto más simple
            if (error.message.includes('Timeout') && code.includes('click')) {
                console.log('🔄 Intentando con selector alternativo...');
                // Extraer texto del selector original si es posible
                const textMatch = code.match(/text="([^"]+)"/) || code.match(/text='([^']+)'/);
                if (textMatch) {
                    const text = textMatch[1];
                    console.log(`   Intentando: await page.click('text=${text}')`);
                    await this.page.click(`text=${text}`);
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }

    async navigate(goal) {
        console.log(`🎯 Objetivo: ${goal}\n`);
        
        // Paso inicial: ir al sitio
        if (this.history.length === 0) {
            await this.page.goto('http://216.238.79.133:5176/', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);
        }

        while (this.iteration < MAX_ITERATIONS) {
            this.iteration++;
            console.log(`\n📸 Paso ${this.iteration}`);

            // 1. Tomar screenshot
            const screenshotPath = await this.takeScreenshot();
            console.log(`   Screenshot: ${screenshotPath}`);

            // 2. Analizar con Gemini
            console.log('   🤖 Analizando con Gemini...');
            const analysis = await this.analyzeWithGemini(screenshotPath, goal);
            
            console.log(`   📊 Análisis: ${analysis.analysis}`);
            console.log(`   🎯 Siguiente acción: ${analysis.next_action}`);

            // 3. Guardar en historia
            this.history.push({
                step: this.iteration,
                analysis: analysis.analysis,
                action: analysis.next_action,
                code: analysis.playwright_code
            });

            // 4. Verificar si completamos
            if (analysis.is_complete) {
                console.log('\n✅ Objetivo completado!');
                console.log(`   Razón: ${analysis.reasoning}`);
                break;
            }

            // 5. Ejecutar código de Playwright
            if (analysis.playwright_code) {
                await this.executePlaywrightCode(analysis.playwright_code);
                await this.page.waitForTimeout(2000); // Esperar entre acciones
            }
        }

        if (this.iteration >= MAX_ITERATIONS) {
            console.log('\n⚠️  Máximo de iteraciones alcanzado');
        }

        // Guardar reporte
        const report = {
            goal: goal,
            iterations: this.iteration,
            history: this.history,
            completed: this.iteration < MAX_ITERATIONS,
            screenshots: this.history.map((_, i) => `step-${i + 1}.png`)
        };

        fs.writeFileSync(
            path.join(__dirname, 'ai-screenshots', 'report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n📁 Reporte guardado en ai-screenshots/report.json');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n👋 Navegador cerrado');
        }
    }
}

// Uso
async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Se requiere GEMINI_API_KEY');
        process.exit(1);
    }

    const navigator = new AIWebNavigator();
    
    try {
        await navigator.init();
        await navigator.navigate('Iniciar sesión con email daniela.canizalez@fifa.com y password 123456, luego buscar y hacer clic en el link FIFA en el sidebar');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await navigator.close();
    }
}

main();
