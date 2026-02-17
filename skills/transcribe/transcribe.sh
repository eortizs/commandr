#!/bin/bash
# Transcribe audio usando Groq Whisper API
# Uso: ./transcribe.sh archivo.mp3

API_KEY="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"
AUDIO_FILE="$1"

if [ -z "$AUDIO_FILE" ]; then
    echo "Uso: $0 <archivo_de_audio>"
    exit 1
fi

curl -s https://api.groq.com/openai/v1/audio/transcriptions \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@$AUDIO_FILE" \
    -F "model=whisper-large-v3" \
    -F "response_format=json"
