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

# Configurar LLM (OpenAI u OpenRouter)
export LLM_PROVIDER=openai
export OPENAI_API_KEY="sk-..."

# O usar OpenRouter
export LLM_PROVIDER=openrouter
export OPENROUTER_API_KEY="sk-or-v1-..."

npm start
```

## 🚀 Instalación

### Opción 1: Script automático (recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/eortizs/commandr/main/openclaw-lite/install.sh | bash
```

Luego configura tus API keys:
```bash
nano ~/.openclaw-lite/openclaw-lite/.env
```

### Opción 2: Manual

```bash
# 1. Clonar
git clone --depth 1 https://github.com/eortizs/commandr.git
cd commandr/openclaw-lite

# 2. Instalar dependencias
npm install

# 3. Configurar
cp .env.example .env
nano .env  # Agrega tus API keys

# 4. Validar
node validate.js

# 5. Iniciar
npm start
```

### Requisitos

| Requisito | Versión | Opcional |
|-----------|---------|----------|
| Node.js | 18+ | ❌ |
| npm | 9+ | ❌ |
| Python | 3.8+ | ✅ (para skills con pandas) |
| ffmpeg | 5+ | ✅ (para video-processor) |
| Git | 2+ | ✅ |

### Validación

```bash
node validate.js
```

Verifica:
- ✅ Node.js y npm instalados
- ✅ Estructura de archivos
- ✅ Dependencias npm
- ✅ API keys configuradas
- ✅ Puertos disponibles

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

## 📦 Dependencias de Skills

Las skills pueden usar librerías externas:

### Tipos soportados

| Tipo | Ejemplos | Instalación |
|------|----------|-------------|
| `npm` | `fluent-ffmpeg`, `axios` | `npm install` |
| `pip` | `pandas`, `numpy` | Virtualenv automático |
| `system` | `ffmpeg`, `sox` | Manual (`apt install`) |

### Ejemplos

**Skill con ffmpeg:**
```javascript
// skills/user/video-processor/index.js
const ffmpeg = require('fluent-ffmpeg');

async execute(args) {
    const [input, output] = args;
    await new Promise((resolve, reject) => {
        ffmpeg(input).output(output).on('end', resolve).run();
    });
    return 'Video procesado';
}
```

**Skill con Python/pandas:**
```javascript
// skills/user/data-analyzer/index.js
async execute(args, tools) {
    const result = await tools.runPython('data-analyzer', 'analyze.py', args);
    return result.stdout;
}
```

### Instalación automática

```javascript
// En SKILL.md o package.json
dependencies: {
  "npm": ["fluent-ffmpeg"],
  "pip": ["pandas", "numpy"],
  "system": ["ffmpeg"]
}
```

## 📝 Memoria

- `memory/MEMORY.md` - Memoria persistente
- `memory/sessions/` - Contexto por chat

## 🌐 Gateway

- WebSocket en `:18789`
- Health checks
- Métricas básicas

## 📄 Licencia

MIT
