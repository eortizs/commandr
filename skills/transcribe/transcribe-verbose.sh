#!/bin/bash
# Transcribe audio usando Groq Whisper API (verbose)
# Uso: ./transcribe-verbose.sh archivo.mp3
# Requiere: GROQ_API_KEY en environment

API_KEY="${GROQ_API_KEY:-${GROQ_WHISPER_API_KEY}}"
AUDIO_FILE="$1"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: GROQ_API_KEY no configurada"
    echo "Uso: GROQ_API_KEY=tu_key ./transcribe-verbose.sh archivo.mp3"
    exit 1
fi

if [ -z "$AUDIO_FILE" ]; then
    echo "Uso: $0 <archivo_de_audio>"
    exit 1
fi

echo "🎙️ Transcribiendo: $AUDIO_FILE"
echo "⏳ Procesando..."

RESPONSE=$(curl -s https://api.groq.com/openai/v1/audio/transcriptions \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@$AUDIO_FILE" \
    -F "model=whisper-large-v3" \
    -F "response_format=verbose_json")

echo "$RESPONSE" | jq .
