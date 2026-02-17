# Transcribe Skill

Skill para transcribir audio a texto usando Groq Whisper.

## Uso

```bash
# Con API key como variable de entorno
export GROQ_API_KEY="tu-api-key"
./transcribe.sh archivo.ogg

# O en una sola línea
GROQ_API_KEY=tu-api-key ./transcribe.sh archivo.ogg
```

## Configuración

Crear archivo `.env` o exportar variable:
```bash
export GROQ_API_KEY="gsk_..."
```

## Requisitos

- Groq API key (obtener en https://console.groq.com)
- Archivos de audio en formato soportado (ogg, mp3, wav)
- `curl` y `jq` instalados

## Archivos

- `transcribe.sh` - Transcripción básica (JSON)
- `transcribe-verbose.sh` - Transcripción con metadata completa

## Nota de Seguridad

La API key **nunca** debe estar hardcodeada en los scripts. Siempre usar variables de entorno.
