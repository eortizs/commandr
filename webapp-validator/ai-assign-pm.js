const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class AIAssignPM {
    constructor() {
        this.browser = null;
        this.page = null;
        this.history = [];
        this.step = 0;
        this.maxSteps = 15;
    }

    async init() {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
        console.log('🚀 AI Navigator iniciado\n');
    }

    async takeScreenshot() {
        const dir = path.join(__dirname, 'ai-screenshots', `assign-pm-${Date.now()}`);
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `step-${this.step}.png`);
        await this.page.screenshot({ path: file, fullPage: true });
        return file;
    }

    async analyzeWithGemini(screenshotPath, goal) {
        const imageBase64 = fs.readFileSync(screenshotPath).toString('base64');
        
        const prompt = `Eres un asistente de automatización web. Analiza esta captura de pantalla.

OBJETIVO: ${goal}

CREDENCIALES DE LOGIN (USAR ESTAS EXACTAS):
- Email: daniela.canizalez@fifa.com
- Password: 123456

HISTORIA DE ACCIONES:
${JSON.stringify(this.history, null, 2)}

INSTRUCCIONES:
1. Describe lo que ves en la pantalla actual
2. Identifica en qué paso del flujo estamos
3. Determina la siguiente acción necesaria
4. Genera código Playwright robusto (usa selectores simples: text=, [data-testid=], #id)

Responde ÚNICAMENTE en este formato JSON:
{
  "current_view": "Descripción de la pantalla actual",
  "step_in_flow": "login|fifa_selected|c02_selected|task_open|activities_tab|ready_to_type|done",
  "next_action_description": "Qué hay que hacer",
  "playwright_code": "await page.click('text=FIFA') // o fill, etc",
  "is_complete": false,
  "reasoning": "Por qué tomé esta decisión"
}`;

        try {
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
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No JSON found');
            
        } catch (error) {
            console.error('Gemini error:', error.message);
            return {
                current_view: "error",
                step_in_flow: "error",
                next_action_description: "Esperar",
                playwright_code: "await page.waitForTimeout(2000);",
                is_complete: false,
                reasoning: "Error en análisis, esperando"
            };
        }
    }

    async executeCode(code) {
        console.log('⚡ Ejecutando:', code);
        try {
            const func = new Function('page', `return (async () => { ${code} })()`);
            await func(this.page);
        } catch (error) {
            console.log(`⚠️ Error: ${error.message}`);
            // Intentar con selector más simple
            if (error.message.includes('Timeout')) {
                const textMatch = code.match(/text=\"([^\"]+)\"/);
                if (textMatch) {
                    console.log(`🔄 Retry with: text=${textMatch[1]}`);
                    await this.page.click(`text=${textMatch[1]}`);
                }
            }
        }
    }

    async navigate(goal) {
        console.log(`🎯 Objetivo: ${goal}\n`);
        
        // Inicio: ir al sitio
        if (this.history.length === 0) {
            await this.page.goto('http://216.238.79.133:5176/', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);
        }

        while (this.step < this.maxSteps) {
            this.step++;
            console.log(`\n📸 Paso ${this.step}`);

            // 1. Screenshot
            const screenshot = await this.takeScreenshot();
            console.log(`   Screenshot: ${screenshot}`);

            // 2. Analizar con Gemini
            console.log('   🤖 Analizando...');
            const analysis = await this.analyzeWithGemini(screenshot, goal);
            
            console.log(`   📊 Vista: ${analysis.current_view.substring(0, 60)}...`);
            console.log(`   🎯 Paso: ${analysis.step_in_flow}`);
            console.log(`   📝 Acción: ${analysis.next_action_description}`);

            // 3. Guardar historia
            this.history.push({
                step: this.step,
                view: analysis.step_in_flow,
                action: analysis.next_action_description,
                code: analysis.playwright_code
            });

            // 4. Verificar completado
            if (analysis.is_complete) {
                console.log('\n✅ ¡Objetivo completado!');
                console.log(`   Razón: ${analysis.reasoning}`);
                break;
            }

            // 5. Ejecutar código
            if (analysis.playwright_code) {
                await this.executeCode(analysis.playwright_code);
                await this.page.waitForTimeout(2000);
            }
        }

        // Guardar reporte
        const report = {
            goal,
            steps: this.step,
            history: this.history,
            completed: this.step < this.maxSteps
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'ai-screenshots', 'assign-pm-report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n📁 Reporte guardado');
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
    if (!GEMINI_API_KEY) {
        console.error('❌ Se requiere GEMINI_API_KEY');
        process.exit(1);
    }

    const ai = new AIAssignPM();
    
    try {
        await ai.init();
        await ai.navigate('Asignar PM a tarea: login, ir a FIFA > C02, abrir tarea 1.1.2, pestaña ACTIVIDADES, escribir "Hola Mundo", enviar');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await ai.close();
    }
}

main();
