const TelegramBot = require('node-telegram-bot-api');

// Configuración
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USERS = (process.env.ALLOWED_USERS || '').split(',').map(id => id.trim());

if (!TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN no configurado');
    console.error('Uso: TELEGRAM_BOT_TOKEN=tu_token node bot.js');
    process.exit(1);
}

if (ALLOWED_USERS.length === 0 || ALLOWED_USERS[0] === '') {
    console.error('❌ Error: ALLOWED_USERS no configurado');
    console.error('Uso: ALLOWED_USERS=123456789 node bot.js');
    process.exit(1);
}

console.log('🤖 Iniciando bot...');
console.log(`✅ Usuarios autorizados: ${ALLOWED_USERS.length}`);

// Crear bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Middleware de autorización
function isAuthorized(userId) {
    return ALLOWED_USERS.includes(userId.toString());
}

// Manejar mensajes
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'sin_username';
    const text = msg.text || '[no texto]';
    
    // Verificar autorización
    if (!isAuthorized(userId)) {
        console.log(`🚫 Acceso denegado: ${userId} (@${username})`);
        console.log(`   Mensaje: ${text.substring(0, 50)}`);
        
        bot.sendMessage(chatId, 
            '🚫 *Acceso Denegado*\n\n' +
            'No estás autorizado para usar este bot.\n' +
            'Si crees que es un error, contacta al administrador.',
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Usuario autorizado - procesar comandos
    console.log(`✅ Mensaje de ${userId} (@${username}): ${text.substring(0, 50)}`);
    
    // Comando /start
    if (text === '/start') {
        bot.sendMessage(chatId,
            '👋 *¡Bienvenido!*\n\n' +
            'Este es un bot privado.\n' +
            'Usa /help para ver los comandos disponibles.',
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Comando /help
    if (text === '/help') {
        bot.sendMessage(chatId,
            '📖 *Comandos disponibles:*\n\n' +
            '/start - Iniciar bot\n' +
            '/help - Mostrar esta ayuda\n' +
            '/status - Verificar estado\n' +
            '/id - Obtener tu chat ID\n' +
            '/echo [texto] - Repetir mensaje',
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Comando /status
    if (text === '/status') {
        bot.sendMessage(chatId,
            '✅ *Bot activo*\n\n' +
            `👤 Tu ID: \`${userId}\`\n` +
            `📛 Username: @${username}\n` +
            `✅ Autorizado: Sí`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Comando /id
    if (text === '/id') {
        bot.sendMessage(chatId,
            `🆔 *Tu chat ID:* \`${chatId}\`\n\n` +
            `Comparte este ID con el administrador para agregarte a la whitelist.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Comando /echo
    if (text.startsWith('/echo ')) {
        const echoText = text.substring(6);
        bot.sendMessage(chatId, `📢 ${echoText}`);
        return;
    }
    
    // Mensaje no reconocido
    bot.sendMessage(chatId,
        '❓ Comando no reconocido.\n' +
        'Usa /help para ver los comandos disponibles.'
    );
});

// Manejar errores
bot.on('error', (error) => {
    console.error('❌ Error del bot:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error.code, error.message);
});

console.log('✅ Bot iniciado correctamente');
console.log('📝 Esperando mensajes...');
