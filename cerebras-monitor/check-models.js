const fs = require('fs-extra');
const path = require('path');

// Configuración
const CEREBRAS_MODELS_URL = 'https://inference-docs.cerebras.ai/models/overview';
const BASELINE_FILE = path.join(__dirname, 'baseline-models.json');
const OUTPUT_FILE = path.join(__dirname, 'new-models.json');

// Modelos conocidos (actualizar manualmente si es necesario)
const DEFAULT_BASELINE = [
    // Producción
    'llama3.1-8b',
    'gpt-oss-120b',
    // Preview
    'qwen-3-235b-a22b-instruct-2507',
    'zai-glm-4.7'
];

async function checkForNewModels() {
    console.log('🔍 Verificando modelos de Cerebras...');
    console.log(`🌐 URL: ${CEREBRAS_MODELS_URL}`);
    
    try {
        // 1. Cargar baseline
        let baseline = DEFAULT_BASELINE;
        if (await fs.pathExists(BASELINE_FILE)) {
            baseline = await fs.readJson(BASELINE_FILE);
            console.log(`📋 Baseline cargado: ${baseline.length} modelos`);
        } else {
            console.log(`📋 Usando baseline default: ${baseline.length} modelos`);
        }
        
        // 2. Obtener página actual
        console.log('⏳ Descargando página...');
        const response = await fetch(CEREBRAS_MODELS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CerebrasMonitor/1.0)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // 3. Extraer modelos del HTML
        const currentModels = extractModels(html);
        console.log(`📊 Modelos encontrados: ${currentModels.length}`);
        
        // 4. Detectar nuevos modelos
        const newModels = currentModels.filter(m => !baseline.includes(m.modelId));
        
        if (newModels.length > 0) {
            console.log(`🎉 ¡NUEVOS MODELOS DETECTADOS: ${newModels.length}!`);
            
            // Guardar resultado
            const result = {
                timestamp: new Date().toISOString(),
                newModels: newModels,
                previousModels: baseline,
                allModels: currentModels
            };
            
            await fs.writeJson(OUTPUT_FILE, result, { spaces: 2 });
            
            // Notificar
            await notifyNewModels(newModels);
            
            // Actualizar baseline
            const updatedBaseline = [...baseline, ...newModels.map(m => m.modelId)];
            await fs.writeJson(BASELINE_FILE, updatedBaseline, { spaces: 2 });
            
            console.log('✅ Baseline actualizado');
        } else {
            console.log('✅ No hay modelos nuevos');
        }
        
        return newModels;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function extractModels(html) {
    const models = [];
    
    // Buscar model IDs en el HTML usando regex
    // Busca patrones como `modelId` o `"model": "xxx"`
    
    // Patrón 1: En tablas markdown
    const tableRegex = /\|\s*`([^`]+)`\s*\|/g;
    let match;
    while ((match = tableRegex.exec(html)) !== null) {
        const modelId = match[1].trim();
        if (modelId && !models.find(m => m.modelId === modelId)) {
            models.push({
                modelId: modelId,
                type: detectModelType(html, modelId),
                source: 'table'
            });
        }
    }
    
    // Patrón 2: En código (ejemplos)
    const codeRegex = /"model":\s*"([^"]+)"/g;
    while ((match = codeRegex.exec(html)) !== null) {
        const modelId = match[1].trim();
        if (modelId && !models.find(m => m.modelId === modelId)) {
            models.push({
                modelId: modelId,
                type: detectModelType(html, modelId),
                source: 'code'
            });
        }
    }
    
    return models;
}

function detectModelType(html, modelId) {
    // Detectar si es production o preview basado en contexto
    const index = html.indexOf(modelId);
    const context = html.substring(Math.max(0, index - 500), index + 500);
    
    if (context.includes('Production') || context.includes('production')) {
        return 'production';
    }
    if (context.includes('Preview') || context.includes('preview')) {
        return 'preview';
    }
    return 'unknown';
}

async function notifyNewModels(newModels) {
    const message = `🎉 *Nuevos Modelos Cerebras Detectados!*\n\n` +
        newModels.map(m => 
            `• *${m.modelId}*\n  Tipo: ${m.type}`
        ).join('\n\n') +
        `\n\n📅 ${new Date().toLocaleString()}`;
    
    console.log('\n📢 Notificación:');
    console.log(message);
    
    // Aquí se puede agregar integración con Telegram, email, etc.
    // Por ahora solo loguea
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkForNewModels()
        .then(newModels => {
            if (newModels.length > 0) {
                process.exit(0);
            } else {
                process.exit(0);
            }
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { checkForNewModels, extractModels };
