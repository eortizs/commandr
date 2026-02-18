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

## 🛠️ Skills Core

- `memory` - Gestión de MEMORY.md
- `tools` - exec, read, write
- `llm` - Interfaz con APIs de IA

## 📝 Memoria

- `memory/MEMORY.md` - Memoria persistente
- `memory/sessions/` - Contexto por chat

## 🌐 Gateway

- WebSocket en `:18789`
- Health checks
- Métricas básicas

## 📄 Licencia

MIT
