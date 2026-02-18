/**
 * OpenClaw Lite - WhatsApp Adapter (Baileys)
 */

const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');

class WhatsAppAdapter {
    constructor(options = {}) {
        this.onMessage = options.onMessage || (() => {});
        this.onQR = options.onQR || (() => {});
        this.onConnect = options.onConnect || (() => {});
        this.onDisconnect = options.onDisconnect || (() => {});
        
        this.sock = null;
        this.authPath = path.join(__dirname, 'store', 'auth');
        this.isConnected = false;
    }

    async init() {
        console.log('   📲 Inicializando Baileys...');
        
        // Asegurar directorio de autenticación
        await fs.ensureDir(this.authPath);
        
        // Cargar estado de autenticación
        const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
        
        // Obtener versión más reciente
        const { version } = await fetchLatestBaileysVersion();
        
        // Crear socket
        this.sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }), // Silenciar logs de Baileys
            printQRInTerminal: false, // Nosotros manejamos el QR
            auth: state,
            browser: ['OpenClaw Lite', 'Chrome', '1.0.0']
        });

        // Manejar eventos
        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
        this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));
        
        console.log('   ✓ Baileys inicializado');
    }

    handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('   📱 QR Code recibido');
            qrcode.generate(qr, { small: true });
            this.onQR(qr);
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log(`   ⚠️  Conexión cerrada. Reconectar: ${shouldReconnect}`);
            this.isConnected = false;
            this.onDisconnect();
            
            if (shouldReconnect) {
                setTimeout(() => this.init(), 5000);
            }
        } else if (connection === 'open') {
            console.log('   ✅ WhatsApp conectado!');
            this.isConnected = true;
            this.onConnect();
        }
    }

    handleMessages(m) {
        if (m.type !== 'notify') return;
        
        for (const msg of m.messages) {
            // Ignorar mensajes de estado y propios
            if (msg.key.fromMe || msg.message?.protocolMessage) continue;
            
            const messageData = this.parseMessage(msg);
            if (messageData) {
                this.onMessage(messageData);
            }
        }
    }

    parseMessage(msg) {
        try {
            const id = msg.key.id;
            const from = msg.key.remoteJid;
            const timestamp = msg.messageTimestamp;
            
            // Extraer contenido del mensaje
            let body = '';
            let type = 'text';
            
            if (msg.message?.conversation) {
                body = msg.message.conversation;
            } else if (msg.message?.extendedTextMessage?.text) {
                body = msg.message.extendedTextMessage.text;
            } else if (msg.message?.imageMessage) {
                body = '[Imagen]';
                type = 'image';
            } else if (msg.message?.videoMessage) {
                body = '[Video]';
                type = 'video';
            } else if (msg.message?.audioMessage) {
                body = '[Audio]';
                type = 'audio';
            } else if (msg.message?.documentMessage) {
                body = '[Documento]';
                type = 'document';
            }
            
            return {
                id,
                from,
                body,
                type,
                timestamp: new Date(timestamp * 1000).toISOString(),
                raw: msg
            };
        } catch (error) {
            console.error('   ✗ Error parseando mensaje:', error.message);
            return null;
        }
    }

    async sendMessage(to, text) {
        if (!this.isConnected || !this.sock) {
            throw new Error('WhatsApp no está conectado');
        }
        
        try {
            await this.sock.sendMessage(to, { text });
            console.log(`   📤 Mensaje enviado a ${to}: ${text.substring(0, 50)}...`);
            return true;
        } catch (error) {
            console.error('   ✗ Error enviando mensaje:', error.message);
            return false;
        }
    }

    async sendImage(to, imagePath, caption = '') {
        if (!this.isConnected || !this.sock) {
            throw new Error('WhatsApp no está conectado');
        }
        
        try {
            const imageBuffer = await fs.readFile(imagePath);
            await this.sock.sendMessage(to, {
                image: imageBuffer,
                caption
            });
            console.log(`   📤 Imagen enviada a ${to}`);
            return true;
        } catch (error) {
            console.error('   ✗ Error enviando imagen:', error.message);
            return false;
        }
    }

    async disconnect() {
        if (this.sock) {
            await this.sock.logout();
            this.isConnected = false;
            console.log('   👋 WhatsApp desconectado');
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            authPath: this.authPath
        };
    }
}

module.exports = WhatsAppAdapter;
