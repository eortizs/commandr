#!/usr/bin/env node
/**
 * OpenClaw Lite - Skill Generator Engine
 * Motor robusto para generación de skills desde descripción natural
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SkillGeneratorEngine {
    constructor(options = {}) {
        this.skillsPath = options.skillsPath || path.join(__dirname, '..', 'skills', 'user');
        this.templatesPath = options.templatesPath || path.join(__dirname, 'templates');
        this.validator = new SkillValidator();
        this.security = new SkillSecurityChecker();
    }

    /**
     * Genera una skill completa desde descripción
     */
    async generate(description, options = {}) {
        console.log('🔧 Skill Generator Engine');
        console.log('═════════════════════════');
        console.log(`Descripción: ${description}\n`);

        // 1. Parsear intención
        const intent = this.parseIntent(description);
        console.log(`📋 Intención detectada: ${intent.type}`);
        console.log(`   Parámetros: ${JSON.stringify(intent.params)}`);

        // 2. Seleccionar template base
        const template = this.selectTemplate(intent.type);
        console.log(`   Template: ${template.name}`);

        // 3. Generar código
        const code = await this.generateCode(template, intent, options);
        
        // 4. Validar sintaxis
        const validation = await this.validator.validate(code);
        if (!validation.valid) {
            throw new Error(`Validación fallida: ${validation.errors.join(', ')}`);
        }
        console.log('   ✅ Sintaxis válida');

        // 5. Chequeo de seguridad
        const security = await this.security.check(code);
        if (security.dangerous.length > 0) {
            console.log('   ⚠️  Operaciones potencialmente peligrosas detectadas:');
            security.dangerous.forEach(op => console.log(`      - ${op}`));
        }

        // 6. Crear estructura de archivos
        const skillId = this.generateSkillId(intent.name);
        const skillPath = await this.createSkillStructure(skillId, code, intent);

        // 7. Instalar dependencias si es necesario
        if (intent.dependencies && intent.dependencies.length > 0) {
            await this.installDependencies(skillPath, intent.dependencies);
        }

        // 8. Registrar skill
        await this.registerSkill(skillId, intent);

        console.log(`\n✅ Skill '${skillId}' generada exitosamente!`);
        console.log(`   Ubicación: ${skillPath}`);
        console.log(`   Uso: ${skillId} ${intent.params.map(p => `[${p}]`).join(' ')}`);

        return {
            id: skillId,
            path: skillPath,
            intent,
            validation,
            security
        };
    }

    /**
     * Parsea la descripción para entender la intención
     */
    parseIntent(description) {
        const lower = description.toLowerCase();
        
        // Detectar tipo de skill
        let type = 'generic';
        if (lower.includes('clima') || lower.includes('weather')) type = 'weather';
        else if (lower.includes('precio') || lower.includes('price')) type = 'price-monitor';
        else if (lower.includes('recordatorio') || lower.includes('reminder')) type = 'reminder';
        else if (lower.includes('scrap') || lower.includes('extraer')) type = 'scraper';
        else if (lower.includes('api') || lower.includes('consultar')) type = 'api-client';
        else if (lower.includes('archivo') || lower.includes('file')) type = 'file-processor';
        else if (lower.includes('notificación') || lower.includes('alerta')) type = 'notifier';
        
        // Extraer nombre
        const nameMatch = description.match(/(?:crea|genera|haz).+?(?:skill|una|un).+?(?:para|que|de)?\s*(\w+)/i);
        const name = nameMatch ? nameMatch[1] : 'custom';
        
        // Detectar parámetros
        const params = [];
        if (lower.includes('ciudad')) params.push('ciudad');
        if (lower.includes('url')) params.push('url');
        if (lower.includes('número') || lower.includes('cantidad')) params.push('cantidad');
        if (lower.includes('mensaje') || lower.includes('texto')) params.push('mensaje');
        if (lower.includes('archivo') || lower.includes('file')) params.push('archivo');
        if (params.length === 0) params.push('input');
        
        // Detectar dependencias
        const dependencies = [];
        if (lower.includes('axios') || lower.includes('http')) dependencies.push('axios');
        if (lower.includes('cheerio') || lower.includes('scrap')) dependencies.push('cheerio');
        if (lower.includes('puppeteer') || lower.includes('navegador')) dependencies.push('puppeteer');
        if (lower.includes('moment') || lower.includes('fecha')) dependencies.push('moment');
        
        return {
            type,
            name,
            params,
            dependencies,
            description
        };
    }

    /**
     * Selecciona el template base según el tipo
     */
    selectTemplate(type) {
        const templates = {
            'weather': {
                name: 'weather',
                imports: ['const axios = require("axios");'],
                executeBody: `
        const [ciudad = 'CDMX'] = args;
        const response = await axios.get(\`https://api.openweathermap.org/data/2.5/weather?q=\${ciudad}&appid=\${process.env.WEATHER_API_KEY}&units=metric\`);
        const data = response.data;
        return \`Clima en \${ciudad}: \${data.main.temp}°C, \${data.weather[0].description}\`;`,
                env: ['WEATHER_API_KEY']
            },
            'api-client': {
                name: 'api-client',
                imports: ['const axios = require("axios");'],
                executeBody: `
        const [endpoint, ...params] = args;
        const response = await axios.get(endpoint);
        return JSON.stringify(response.data, null, 2);`,
                env: []
            },
            'scraper': {
                name: 'scraper',
                imports: ['const axios = require("axios");', 'const cheerio = require("cheerio");'],
                executeBody: `
        const [url, selector] = args;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        return $(selector).text().trim();`,
                env: []
            },
            'file-processor': {
                name: 'file-processor',
                imports: ['const fs = require("fs-extra");', 'const path = require("path");'],
                executeBody: `
        const [filePath, operation = 'read'] = args;
        
        switch(operation) {
            case 'read':
                return await fs.readFile(filePath, 'utf-8');
            case 'size':
                const stats = await fs.stat(filePath);
                return \`Tamaño: \${stats.size} bytes\`;
            default:
                throw new Error('Operación no soportada');
        }`,
                env: []
            },
            'notifier': {
                name: 'notifier',
                imports: [],
                executeBody: `
        const [mensaje, nivel = 'info'] = args;
        const timestamp = new Date().toISOString();
        return \`[\${nivel.toUpperCase()}] \${timestamp}: \${mensaje}\`;`,
                env: []
            },
            'generic': {
                name: 'generic',
                imports: [],
                executeBody: `
        const [input] = args;
        // TODO: Implementar lógica específica
        return \`Procesado: \${input}\`;`,
                env: []
            }
        };
        
        return templates[type] || templates['generic'];
    }

    /**
     * Genera el código completo de la skill
     */
    async generateCode(template, intent, options) {
        const imports = template.imports.join('\n');
        const className = this.toPascalCase(intent.name) + 'Skill';
        
        const code = `${imports}

/**
 * Skill: ${intent.name}
 * Tipo: ${intent.type}
 * Generado: ${new Date().toISOString()}
 * Descripción: ${intent.description}
 */

class ${className} {
    constructor() {
        this.name = '${intent.name}';
        this.version = '1.0.0';
        this.description = '${intent.description}';
    }

    /**
     * Ejecuta la skill
     * @param {Array} args - Argumentos pasados por el usuario
     * @param {Object} tools - Herramientas disponibles (exec, read, write, memory)
     * @returns {Promise<string>} Resultado de la ejecución
     */
    async execute(args, tools) {
        try {${template.executeBody}
        } catch (error) {
            console.error('Error en skill ${intent.name}:', error.message);
            return \`Error: \${error.message}\`;
        }
    }

    /**
     * Valida los argumentos antes de ejecutar
     */
    validateArgs(args) {
        ${intent.params.map((param, i) => `
        if (!args[${i}]) {
            throw new Error('Se requiere: ${param}');
        }`).join('')}
        return true;
    }

    /**
     * Obtiene información de la skill
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            params: ${JSON.stringify(intent.params)},
            examples: [
                '${intent.name} ${intent.params.map(() => 'valor').join(' ')}'
            ]
        };
    }
}

module.exports = new ${className}();
`;

        return code;
    }

    /**
     * Crea la estructura de carpetas y archivos
     */
    async createSkillStructure(skillId, code, intent) {
        const skillPath = path.join(this.skillsPath, skillId);
        
        // Crear directorio
        await fs.ensureDir(skillPath);
        
        // Escribir código principal
        await fs.writeFile(path.join(skillPath, 'index.js'), code);
        
        // Crear SKILL.md
        const skillDoc = `# ${intent.name}

## Descripción
${intent.description}

## Uso
\`\`\`
${skillId} ${intent.params.map(p => `[${p}]`).join(' ')}
\`\`\`

## Ejemplos
\`\`\`
${skillId} ${intent.params.map(() => 'ejemplo').join(' ')}
\`\`\`

## Parámetros
${intent.params.map(p => `- **${p}**: Descripción del parámetro`).join('\n')}

## Dependencias
${intent.dependencies.length > 0 ? intent.dependencies.map(d => `- ${d}`).join('\n') : 'Ninguna'}

## Notas
- Generado: ${new Date().toISOString()}
- Tipo: ${intent.type}
`;
        await fs.writeFile(path.join(skillPath, 'SKILL.md'), skillDoc);
        
        // Crear package.json si hay dependencias
        if (intent.dependencies.length > 0) {
            const pkg = {
                name: `skill-${skillId}`,
                version: '1.0.0',
                dependencies: {}
            };
            intent.dependencies.forEach(dep => {
                pkg.dependencies[dep] = 'latest';
            });
            await fs.writeFile(path.join(skillPath, 'package.json'), JSON.stringify(pkg, null, 2));
        }
        
        return skillPath;
    }

    /**
     * Instala dependencias de la skill
     */
    async installDependencies(skillPath, dependencies) {
        console.log(`   📦 Instalando dependencias: ${dependencies.join(', ')}`);
        
        const pkgPath = path.join(skillPath, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            await execPromise('npm install', { cwd: skillPath });
            console.log('   ✅ Dependencias instaladas');
        }
    }

    /**
     * Registra la skill en el sistema
     */
    async registerSkill(skillId, intent) {
        const registryPath = path.join(this.skillsPath, 'registry.json');
        
        let registry = {};
        if (await fs.pathExists(registryPath)) {
            registry = await fs.readJson(registryPath);
        }
        
        registry[skillId] = {
            id: skillId,
            name: intent.name,
            type: intent.type,
            created: new Date().toISOString(),
            params: intent.params,
            dependencies: intent.dependencies
        };
        
        await fs.writeJson(registryPath, registry, { spaces: 2 });
        console.log('   ✅ Skill registrada');
    }

    /**
     * Genera ID único para la skill
     */
    generateSkillId(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Convierte a PascalCase
     */
    toPascalCase(str) {
        return str
            .replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase())
            .replace(/-/g, '');
    }
}

/**
 * Validador de sintaxis de skills
 */
class SkillValidator {
    async validate(code) {
        const errors = [];
        
        // Verificar que tiene clase
        if (!code.includes('class') || !code.includes('execute')) {
            errors.push('Falta clase o método execute');
        }
        
        // Verificar que exporta
        if (!code.includes('module.exports')) {
            errors.push('Falta exportación (module.exports)');
        }
        
        // Verificar sintaxis básica de JS
        try {
            new Function(code);
        } catch (e) {
            errors.push(`Error de sintaxis: ${e.message}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Chequeo de seguridad de código
 */
class SkillSecurityChecker {
    async check(code) {
        const dangerous = [];
        const warnings = [];
        
        // Patrones peligrosos
        const patterns = [
            { pattern: /eval\s*\(/, desc: 'Uso de eval()' },
            { pattern: /child_process/, desc: 'Módulo child_process' },
            { pattern: /fs\.unlink\s*\(/, desc: 'Eliminación de archivos' },
            { pattern: /require\s*\(\s*['"]http['"]\s*\)/, desc: 'Servidor HTTP' },
            { pattern: /process\.env/, desc: 'Acceso a variables de entorno' },
            { pattern: /sudo|rm -rf/, desc: 'Comandos de sistema peligrosos' }
        ];
        
        patterns.forEach(({ pattern, desc }) => {
            if (pattern.test(code)) {
                dangerous.push(desc);
            }
        });
        
        return { dangerous, warnings };
    }
}

// Exportar
module.exports = SkillGeneratorEngine;

// CLI
if (require.main === module) {
    const description = process.argv.slice(2).join(' ');
    
    if (!description) {
        console.log('Uso: node skill-generator.js "descripción de la skill"');
        process.exit(1);
    }
    
    const generator = new SkillGeneratorEngine();
    generator.generate(description)
        .then(result => {
            console.log('\n🎉 Skill generada!');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(err => {
            console.error('\n❌ Error:', err.message);
            process.exit(1);
        });
}
