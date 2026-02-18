#!/usr/bin/env node
/**
 * OpenClaw Lite - Gateway
 * Servidor WebSocket + Orquestador
 */

// Cargar variables de entorno PRIMERO
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');

// Intentar cargar dotenv si está instalado, sino hacerlo manualmente
try {
    require('dotenv').config({ path: envPath });
} catch (e) {
    // Fallback: cargar manualmente
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) {
                process.env[match[1].trim()] = match[2].trim();
            }
        });
    }
}

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');

const CONFIG = {
    port: process.env.GATEWAY_PORT || process.env.PORT || 18789,
    host: process.env.GATEWAY_HOST || process.env.HOST || '127.0.0.1',
    memoryPath: path.join(__dirname, '..', 'memory', 'MEMORY.md')
};

class Gateway {
    constructor() {
        this.wss = null;
        this.clients = new Map();
        this.whatsapp = null;
        this.agent = null;
    }

    async start() {
        console.log('🦞 OpenClaw Lite - Gateway');
        console.log('═══════════════════════════\n');

        // Inicializar componentes
        await this.initMemory();
        await this.initWebSocket();
        await this.initWhatsApp();
        await this.initAgent();

        console.log(`\n✅ Gateway listo en ws://${CONFIG.host}:${CONFIG.port}`);
        console.log('   Esperando conexiones...\n');
    }

    async initMemory() {
        console.log('📝 Inicializando memoria...');
        await fs.ensureDir(path.dirname(CONFIG.memoryPath));
        
        if (!await fs.pathExists(CONFIG.memoryPath)) {
            await fs.writeFile(CONFIG.memoryPath, '# MEMORY.md\n\nMemoria de OpenClaw Lite\n');
        }
        
        const memory = await fs.readFile(CONFIG.memoryPath, 'utf-8');
        console.log(`   ✓ Memoria cargada (${memory.length} chars)`);
    }

    async initWebSocket() {
        console.log('🌐 Iniciando WebSocket server...');
        
        this.wss = new WebSocket.Server({
            host: CONFIG.host,
            port: CONFIG.port
        });

        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            console.log(`   + Cliente conectado: ${clientId}`);
            
            this.clients.set(clientId, {
                ws,
                id: clientId,
                connectedAt: new Date()
            });

            ws.on('message', (data) => this.handleMessage(clientId, data));
            ws.on('close', () => this.handleDisconnect(clientId));
            ws.on('error', (err) => console.error(`   ✗ Error ${clientId}:`, err.message));

            // Enviar handshake
            ws.send(JSON.stringify({
                type: 'hello',
                clientId,
                timestamp: new Date().toISOString()
            }));
        });
    }

    async initWhatsApp() {
        console.log('📱 Iniciando WhatsApp adapter...');
        
        // Lazy load para evitar errores si no está configurado
        const WhatsAppAdapter = require('../channel/whatsapp/baileys-adapter');
        this.whatsapp = new WhatsAppAdapter({
            onMessage: (msg) => this.handleWhatsAppMessage(msg),
            onQR: (qr) => console.log('   📲 Escanea el QR para conectar WhatsApp')
        });

        await this.whatsapp.init();
        console.log('   ✓ WhatsApp adapter inicializado');
    }

    async initAgent() {
        console.log('🤖 Iniciando Agent Runner...');
        
        const AgentRunner = require('../agent');
        this.agent = new AgentRunner({
            memoryPath: CONFIG.memoryPath,
            onResponse: (response) => this.broadcast(response)
        });

        await this.agent.init();
        console.log('   ✓ Agent Runner listo');
    }

    async handleMessage(clientId, data) {
        try {
            const msg = JSON.parse(data);
            console.log(`   📩 Mensaje de ${clientId}:`, msg.type);

            switch (msg.type) {
                case 'ping':
                    this.sendTo(clientId, { type: 'pong', time: Date.now() });
                    break;
                    
                case 'agent':
                    // Ejecutar tarea con el agente
                    const result = await this.agent.execute(msg.payload);
                    this.sendTo(clientId, { type: 'agent-response', result });
                    break;
                    
                case 'memory':
                    // Operaciones de memoria
                    const memory = await this.handleMemoryOp(msg.operation, msg.data);
                    this.sendTo(clientId, { type: 'memory-response', memory });
                    break;
                    
                default:
                    console.log(`   ⚠️  Tipo desconocido: ${msg.type}`);
            }
        } catch (err) {
            console.error('   ✗ Error procesando mensaje:', err.message);
            this.sendTo(clientId, { type: 'error', message: err.message });
        }
    }

    async handleWhatsAppMessage(msg) {
        console.log(`   💬 WhatsApp [${msg.from}]: ${msg.body?.substring(0, 50)}...`);
        
        // Enviar al agente para procesar
        const response = await this.agent.processWhatsAppMessage(msg);
        
        // Responder por WhatsApp (usar msg.to que es el destino correcto)
        if (response) {
            await this.whatsapp.sendMessage(msg.to || msg.from, response);
        }
    }

    async handleMemoryOp(operation, data) {
        const memory = await fs.readFile(CONFIG.memoryPath, 'utf-8');
        
        switch (operation) {
            case 'read':
                return memory;
            case 'append':
                await fs.appendFile(CONFIG.memoryPath, `\n${data}\n`);
                return 'OK';
            default:
                return memory;
        }
    }

    handleDisconnect(clientId) {
        console.log(`   - Cliente desconectado: ${clientId}`);
        this.clients.delete(clientId);
    }

    sendTo(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    }

    broadcast(data) {
        this.clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(data));
            }
        });
    }
}

// Iniciar si se ejecuta directamente
if (require.main === module) {
    const gateway = new Gateway();
    gateway.start().catch(console.error);
}

module.exports = Gateway;
