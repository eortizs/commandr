# Telegram Bot con Whitelist

Bot de Telegram privado con lista de usuarios autorizados.

## Características

- ✅ Solo usuarios en whitelist pueden usar el bot
- ✅ Mensaje de rechazo para usuarios no autorizados
- ✅ Logs de intentos de acceso no autorizado
- ✅ Comandos básicos: /start, /help, /status

## Instalación

```bash
# Instalar dependencias
npm install node-telegram-bot-api

# Configurar variables de entorno
export TELEGRAM_BOT_TOKEN="tu-token-de-botfather"
export ALLOWED_USERS="123456789,987654321"  # IDs separados por coma
```

## Configuración

### 1. Crear bot con BotFather

1. Busca @BotFather en Telegram
2. Envía `/newbot`
3. Sigue las instrucciones (nombre y username)
4. Copia el token que te dan

### 2. Obtener tu chat ID

1. Busca @userinfobot
2. Inicia el bot
3. Te responderá con tu ID (ej: `123456789`)

### 3. Configurar

Edita `.env`:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
ALLOWED_USERS=123456789
```

## Uso

```bash
node bot.js
```

## Comandos

- `/start` - Iniciar bot (solo usuarios autorizados)
- `/help` - Mostrar ayuda
- `/status` - Verificar estado y usuario actual
- `/id` - Obtener tu chat ID

## Seguridad

- El bot ignora mensajes de usuarios no autorizados
- Registra intentos de acceso en logs
- No almacena mensajes de usuarios no autorizados

## Agregar más usuarios

1. Pide a la persona que use @userinfobot para obtener su ID
2. Agrega el ID a `ALLOWED_USERS`:
   ```
   ALLOWED_USERS=123456789,987654321,456789123
   ```
3. Reinicia el bot

## Notas

- Mantén el token seguro, nunca lo compartas
- El username del bot no debe ser fácil de adivinar
- Considera usar un proxy si necesitas mayor privacidad
