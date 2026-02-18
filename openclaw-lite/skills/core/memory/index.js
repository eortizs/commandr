/**
 * OpenClaw Lite - Skill: Memory
 * Gestión de memoria persistente
 */

const fs = require('fs-extra');
const path = require('path');

class MemorySkill {
    constructor(basePath) {
        this.basePath = basePath || path.join(__dirname, '..', '..', 'memory');
        this.memoryFile = path.join(this.basePath, 'MEMORY.md');
    }

    async init() {
        await fs.ensureDir(this.basePath);
        
        if (!await fs.pathExists(this.memoryFile)) {
            const template = `# MEMORY.md

## Información del Asistente

**Nombre:** OpenClaw Lite
**Versión:** 1.0.0
**Creado:** ${new Date().toISOString()}

## Contexto

Este archivo contiene la memoria persistente del asistente.
Se actualiza automáticamente durante las conversaciones.

## Notas

- Última actualización: ${new Date().toISOString()}
`;
            await fs.writeFile(this.memoryFile, template);
        }
    }

    async read() {
        return await fs.readFile(this.memoryFile, 'utf-8');
    }

    async write(content) {
        await fs.writeFile(this.memoryFile, content);
    }

    async append(text) {
        const timestamp = new Date().toISOString();
        const entry = `\n## ${timestamp}\n\n${text}\n`;
        await fs.appendFile(this.memoryFile, entry);
    }

    async search(query) {
        const content = await this.read();
        const lines = content.split('\n');
        const results = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    line: i + 1,
                    content: lines[i]
                });
            }
        }
        
        return results;
    }

    async getLastEntries(count = 5) {
        const content = await this.read();
        const entries = content.split(/\n## /).filter(e => e.trim());
        return entries.slice(-count);
    }

    async execute(args, tools) {
        const [operation, ...params] = args;
        
        switch (operation) {
            case 'read':
                return await this.read();
            case 'write':
                await this.write(params[0]);
                return 'OK';
            case 'append':
                await this.append(params[0]);
                return 'OK';
            case 'search':
                return await this.search(params[0]);
            case 'last':
                return await this.getLastEntries(parseInt(params[0]) || 5);
            default:
                throw new Error(`Operación desconocida: ${operation}`);
        }
    }
}

module.exports = new MemorySkill();
