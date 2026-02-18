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

            // Programación
            json: {
                parse: async (str) => {
                    console.log(`   📝 json.parse`);
                    try {
                        return { success: true, data: JSON.parse(str) };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                },
                stringify: async (obj, space = 2) => {
                    console.log(`   📝 json.stringify`);
                    try {
                        return { success: true, data: JSON.stringify(obj, null, space) };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            },

            csv: {
                parse: async (content, delimiter = ',') => {
                    console.log(`   📊 csv.parse`);
                    try {
                        const lines = content.split('\n').filter(l => l.trim());
                        const headers = lines[0].split(delimiter).map(h => h.trim());
                        const rows = lines.slice(1).map(line => {
                            const values = line.split(delimiter).map(v => v.trim());
                            return headers.reduce((obj, header, i) => {
                                obj[header] = values[i];
                                return obj;
                            }, {});
                        });
                        return { success: true, headers, rows, count: rows.length };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                },
                stringify: async (rows, headers) => {
                    console.log(`   📊 csv.stringify`);
                    try {
                        const lines = [headers.join(',')];
                        rows.forEach(row => {
                            lines.push(headers.map(h => row[h] || '').join(','));
                        });
                        return { success: true, data: lines.join('\n') };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            },

            hash: async (data, algorithm = 'sha256') => {
                console.log(`   🔐 hash: ${algorithm}`);
                try {
                    const crypto = require('crypto');
                    const hash = crypto.createHash(algorithm).update(data).digest('hex');
                    return { success: true, hash };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            uuid: async () => {
                console.log(`   🆔 uuid`);
                try {
                    const { v4 } = require('uuid');
                    return { success: true, uuid: v4() };
                } catch (error) {
                    // Fallback sin dependencia
                    return { 
                        success: true, 
                        uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                            const r = Math.random() * 16 | 0;
                            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                        })
                    };
                }
            },

            regex: {
                test: async (pattern, str) => {
                    console.log(`   🔍 regex.test: ${pattern}`);
                    try {
                        const regex = new RegExp(pattern);
                        return { success: true, matches: regex.test(str) };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                },
                match: async (pattern, str) => {
                    console.log(`   🔍 regex.match: ${pattern}`);
                    try {
                        const regex = new RegExp(pattern, 'g');
                        const matches = str.match(regex) || [];
                        return { success: true, matches, count: matches.length };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                },
                replace: async (pattern, str, replacement) => {
                    console.log(`   🔍 regex.replace: ${pattern}`);
                    try {
                        const regex = new RegExp(pattern, 'g');
                        return { success: true, result: str.replace(regex, replacement) };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
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
        
        const provider = process.env.LLM_PROVIDER || 'openai';
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
        
        try {
            let response;
            
            switch (provider) {
                case 'openrouter':
                    response = await this.callOpenRouter(prompt, context, apiKey);
                    break;
                case 'openai':
                default:
                    response = await this.callOpenAI(prompt, context, apiKey);
                    break;
            }
            
            return response;
        } catch (error) {
            console.error('   ✗ Error LLM:', error.message);
            return {
                type: 'llm-response',
                content: `Error: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }

    async callOpenAI(prompt, context, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4',
                messages: [
                    { role: 'system', content: 'Eres OpenClaw Lite, un asistente útil.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });
        
        const data = await response.json();
        return {
            type: 'llm-response',
            content: data.choices[0].message.content,
            timestamp: new Date().toISOString(),
            provider: 'openai'
        };
    }

    async callOpenRouter(prompt, context, apiKey) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://openclaw.local',
                'X-Title': 'OpenClaw Lite'
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
                messages: [
                    { role: 'system', content: 'Eres OpenClaw Lite, un asistente útil.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });
        
        const data = await response.json();
        return {
            type: 'llm-response',
            content: data.choices[0].message.content,
            timestamp: new Date().toISOString(),
            provider: 'openrouter',
            model: data.model
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
