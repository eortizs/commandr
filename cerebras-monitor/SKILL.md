# Cerebras Model Monitor

Skill para monitorear cuando Cerebras lanza nuevos modelos.

## Descripción

Monitorea la página de modelos de Cerebras (`https://inference-docs.cerebras.ai/models/overview`) y notifica cuando se detecta un nuevo modelo.

## Modelos actuales (baseline)

### Producción
- `llama3.1-8b` - Llama 3.1 8B (~2200 tokens/s)
- `gpt-oss-120b` - OpenAI GPT OSS 120B (~3000 tokens/s)

### Preview
- `qwen-3-235b-a22b-instruct-2507` - Qwen 3 235B (~1400 tokens/s)
- `zai-glm-4.7` - Z.ai GLM 4.7 355B (~1000 tokens/s)

## Instalación

```bash
# Copiar skill al workspace
cp -r cerebras-monitor ~/.openclaw/skills/

# Instalar dependencias
cd ~/.openclaw/skills/cerebras-monitor
npm install
```

## Configuración

Editar `config.json`:
```json
{
  "checkInterval": "0 9 * * *",
  "notifyChannel": "telegram",
  "baselineModels": [
    "llama3.1-8b",
    "gpt-oss-120b",
    "qwen-3-235b-a22b-instruct-2507",
    "zai-glm-4.7"
  ]
}
```

## Uso

### Manual
```bash
node check-models.js
```

### Automático (cron)
```bash
# Agregar a crontab
crontab -e

# Añadir línea:
0 9 * * * cd ~/.openclaw/skills/cerebras-monitor && node check-models.js
```

## Funcionamiento

1. Descarga la página de modelos de Cerebras
2. Extrae los model IDs de la tabla
3. Compara con la lista baseline
4. Si hay modelos nuevos:
   - Guarda en `new-models.json`
   - Envía notificación al canal configurado
   - Actualiza el baseline automáticamente

## Salida

```json
{
  "timestamp": "2025-02-17T09:00:00Z",
  "newModels": [
    {
      "name": "Nuevo Modelo",
      "modelId": "nuevo-modelo-100b",
      "parameters": "100 billion",
      "speed": "~2500 tokens/s",
      "type": "production"
    }
  ],
  "previousModels": [...],
  "allModels": [...]
}
```

## Notificaciones

La skill notifica vía:
- Telegram (mensaje directo)
- Email (si está configurado)
- Log local (`notifications.log`)

## Troubleshooting

**Error: "No se pudo obtener la página"**
- Verificar conectividad a internet
- Cerebras puede estar bloqueando requests
- Intentar con proxy o VPN

**No detecta cambios**
- Verificar que la estructura HTML no cambió
- Actualizar selectores en `parser.js`

## Licencia

MIT
