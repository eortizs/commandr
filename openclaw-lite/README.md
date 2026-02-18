# OpenClaw Lite 🦞

Versión simplificada de OpenClaw enfocada en WhatsApp.

## 🎯 Filosofía

**Menos es más:** Solo lo esencial para un asistente AI por WhatsApp.

## 📁 Estructura

```
openclaw-lite/
├── gateway/          # Servidor WebSocket + orquestador
├── agent/            # Ejecutor de tareas con LLM
├── channel/whatsapp/ # Adapter de Baileys
├── skills/core/      # Herramientas básicas
└── memory/           # Memoria persistente
```

## 🚀 Inicio Rápido

```bash
# Instalar
npm install

# Configurar
export OPENAI_API_KEY="sk-..."

# Iniciar
npm start
```

## 🔌 Arquitectura

```
Usuario WhatsApp
       ↓
Baileys Adapter (channel/whatsapp/)
       ↓
Message Handler
       ↓
Agent Runner (agent/)
       ↓
LLM API (OpenAI/Anthropic)
       ↓
Response → Usuario
```

## 🛠️ Tools Core (18 total)

| Categoría | Tool | Función | Ejemplo |
|-----------|------|---------|---------|
| **Básicas** | `exec` | Ejecutar comandos shell | `exec('ls -la')` |
| **Básicas** | `read` | Leer archivos | `read('/path/file.txt')` |
| **Básicas** | `write` | Escribir archivos | `write('/path/file.txt', 'contenido')` |
| **Básicas** | `memory` | Gestión de MEMORY.md | `memory.read()` |
| **Básicas** | `generateSkill` | Generar skills automáticamente | `generateSkill('consultar clima')` |
| **Web** | `fetch` | HTTP requests | `fetch('https://api.example.com')` |
| **Web** | `download` | Descargar archivos | `download('https://...', '/tmp/file.zip')` |
| **Archivos** | `search` | Buscar en archivos | `search('pattern', '/path/file.txt')` |
| **Archivos** | `exists` | Verificar si archivo existe | `exists('/path/file')` |
| **Archivos** | `mkdir` | Crear directorios | `mkdir('/path/newdir')` |
| **Utilidad** | `sleep` | Esperar N ms | `sleep(2000)` |
| **Utilidad** | `notify` | Enviar notificaciones | `notify('Tarea completada')` |
| **Programación** | `json` | Parse/stringify JSON | `json.parse('{"a":1}')` |
| **Programación** | `csv` | Leer/escribir CSV | `csv.parse(content)` |
| **Programación** | `hash` | MD5, SHA-256 | `hash('texto', 'sha256')` |
| **Programación** | `uuid` | Generar IDs únicos | `uuid()` |
| **Programación** | `regex` | Validar/extraer texto | `regex.match('\d+', 'abc123')` |
| **Programación** | `cron` | Programar tareas | `cron.schedule('0 9 * * *', 'tarea')` |

## 📝 Memoria

- `memory/MEMORY.md` - Memoria persistente
- `memory/sessions/` - Contexto por chat

## 🌐 Gateway

- WebSocket en `:18789`
- Health checks
- Métricas básicas

## 📄 Licencia

MIT
