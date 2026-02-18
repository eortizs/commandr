/**
 * OpenClaw Lite - Agent Runner
 * Ejecuta tareas con LLM
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
    }

    loadTools() {
        return {
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
        // Placeholder - implementar con OpenAI/Anthropic
        console.log('   🤖 Llamando a LLM...');
        
        // Por ahora, respuesta simulada
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
        
        // Cargar memoria para contexto
        const memory = await this.tools.memory.read();
        
        // Construir prompt
        const prompt = `
Contexto: Eres OpenClaw Lite, un asistente AI por WhatsApp.
Memoria: ${memory.substring(0, 500)}...

Mensaje del usuario: ${msg.body}

Responde de manera útil y concisa.
`;

        // Llamar a LLM (simulado por ahora)
        const response = await this.callLLM(prompt, {});
        
        return response.content;
    }
}

module.exports = AgentRunner;
