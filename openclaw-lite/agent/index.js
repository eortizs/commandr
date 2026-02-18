/**
 * OpenClaw Lite - Agent Runner
 * Ejecuta tareas con LLM y tools expandidas
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class AgentRunner {
    constructor(options = {}) {
        this.memoryPath = options.memoryPath || path.join(__dirname, '..', 'memory', 'MEMORY.md');
        this.onResponse = options.onResponse || (() => {});
        this.sessions = new Map();
        this.tools = this.loadTools();
    }

    async init() {
        console.log('   📦 Cargando skills core...');
        this.skills = {
            memory: require('../skills/core/memory'),
            tools: this.tools
        };
        console.log('   ✓ Skills cargadas:', Object.keys(this.skills).join(', '));
        console.log('   ✓ Tools disponibles:', Object.keys(this.tools).filter(k => typeof this.tools[k] === 'function' || k === 'memory' || k === 'cron').join(', '));
    }

    loadTools() {
        return {
            // TOOLS BÁSICAS
            exec: async (command) => {
                console.log(`   🔧 exec: ${command.substring(0, 50)}...`);
                try {
                    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
                    return { success: true, stdout, stderr };
                } catch (error) {
                    return { success: false, error: error.message, stderr: error.stderr };
                }
            },
            
            read: async (filePath) => {
                console.log(`   📖 read: ${filePath}`);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    return { success: true, content };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            
            write: async (filePath, content) => {
                console.log(`   ✍️  write: ${filePath}`);
                try {
                    await fs.ensureDir(path.dirname(filePath));
                    await fs.writeFile(filePath, content);
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            
            memory: {
                read: async () => {
                    return await fs.readFile(this.memoryPath, 'utf-8');
                },
                write: async (content) => {
                    await fs.writeFile(this.memoryPath, content);
                },
                append: async (text) => {
                    await fs.appendFile(this.memoryPath, `\n${text}\n`);
                }
            },
            
            generateSkill: async (description) => {
                console.log(`   🎨 Generando skill: ${description.substring(0, 50)}...`);
                try {
                    const SkillGeneratorEngine = require('../skills/core/skill-generator');
                    const generator = new SkillGeneratorEngine();
                    const result = await generator.generate(description);
                    return { 
                        success: true, 
                        skillId: result.id,
                        path: result.path,
                        type: result.intent.type,
                        usage: `${result.id} ${result.intent.params.map(p => `[${p}]`).join(' ')}`
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // TOOLS EXPANDIDAS - WEB
            fetch: async (url, options = {}) => {
                console.log(`   🌐 fetch: ${url}`);
                try {
                    const response = await fetch(url, options);
                    const data = await response.text();
                    return { 
                        success: true, 
                        status: response.status,
                        data,
                        headers: Object.fromEntries(response.headers)
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            download: async (url, outputPath) => {
                console.log(`   ⬇️  download: ${url} → ${outputPath}`);
                try {
                    const response = await fetch(url);
                    const buffer = await response.arrayBuffer();
                    await fs.ensureDir(path.dirname(outputPath));
                    await fs.writeFile(outputPath, Buffer.from(buffer));
                    return { 
                        success: true, 
                        size: buffer.byteLength,
                        path: outputPath
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // TOOLS EXPANDIDAS - ARCHIVOS
            search: async (pattern, filePath) => {
                console.log(`   🔍 search: "${pattern}" in ${filePath}`);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const lines = content.split('\n');
                    const matches = [];
                    const regex = new RegExp(pattern, 'i');
                    
                    lines.forEach((line, index) => {
                        if (regex.test(line)) {
                            matches.push({ line: index + 1, content: line.trim() });
                        }
                    });
                    
                    return { success: true, matches, count: matches.length };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            exists: async (filePath) => {
                console.log(`   📂 exists: ${filePath}`);
                try {
                    const exists = await fs.pathExists(filePath);
                    const stats = exists ? await fs.stat(filePath) : null;
                    return { 
                        success: true, 
                        exists,
                        isFile: stats ? stats.isFile() : false,
                        isDirectory: stats ? stats.isDirectory() : false,
                        size: stats ? stats.size : 0
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            mkdir: async (dirPath) => {
                console.log(`   📁 mkdir: ${dirPath}`);
                try {
                    await fs.ensureDir(dirPath);
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // TOOLS EXPANDIDAS - UTILIDAD
            sleep: async (ms) => {
                console.log(`   ⏱️  sleep: ${ms}ms`);
                await new Promise(resolve => setTimeout(resolve, ms));
                return { success: true };
            },

            notify: async (message, options = {}) => {
                console.log(`   🔔 notify: ${message}`);
                const notification = {
                    message,
                    timestamp: new Date().toISOString(),
                    level: options.level || 'info',
                    channel: options.channel || 'console'
                };
                console.log(`   📢 Notificación: ${JSON.stringify(notification)}`);
                return { success: true, notification };
            },

            cron: {
                schedule: async (expression, task) => {
                    console.log(`   📅 cron.schedule: ${expression}`);
                    return { 
                        success: true, 
                        message: 'Cron programado (placeholder - requiere node-cron)',
                        expression,
                        task: task.substring(0, 50)
                    };
                },
                list: async () => {
                    return { success: true, jobs: [] };
                }
            }
        };
    }

    async execute(payload) {
        const { task, context = {} } = payload;
        
        console.log(`   🎯 Ejecutando tarea: ${task.type}`);
        
        switch (task.type) {
            case 'llm':
                return await this.callLLM(task.prompt, context);
                
            case 'tool':
                return await this.executeTool(task.tool, task.args);
                
            case 'skill':
                return await this.executeSkill(task.skill, task.args);
                
            default:
                throw new Error(`Tipo de tarea desconocido: ${task.type}`);
        }
    }

    async callLLM(prompt, context) {
        console.log('   🤖 Llamando a LLM...');
        
        return {
            type: 'llm-response',
            content: `Respuesta simulada para: ${prompt.substring(0, 50)}...`,
            timestamp: new Date().toISOString()
        };
    }

    async executeTool(toolName, args) {
        const tool = this.tools[toolName];
        if (!tool) {
            throw new Error(`Tool no encontrada: ${toolName}`);
        }
        
        if (typeof tool === 'function') {
            return await tool(...args);
        } else if (typeof tool === 'object' && args[0] && tool[args[0]]) {
            return await tool[args[0]](...args.slice(1));
        }
        
        throw new Error(`Tool inválida: ${toolName}`);
    }

    async executeSkill(skillName, args) {
        const skill = this.skills[skillName];
        if (!skill) {
            throw new Error(`Skill no encontrada: ${skillName}`);
        }
        
        return await skill.execute(args, this.tools);
    }

    async processWhatsAppMessage(msg) {
        console.log(`   🔄 Procesando mensaje de WhatsApp...`);
        
        const memory = await this.tools.memory.read();
        
        const prompt = `
Contexto: Eres OpenClaw Lite, un asistente AI por WhatsApp.
Tools disponibles: ${Object.keys(this.tools).filter(k => typeof this.tools[k] === 'function').join(', ')}
Memoria: ${memory.substring(0, 500)}...

Mensaje del usuario: ${msg.body}

Responde de manera útil y concisa.
`;

        const response = await this.callLLM(prompt, {});
        
        return response.content;
    }
}

module.exports = AgentRunner;
