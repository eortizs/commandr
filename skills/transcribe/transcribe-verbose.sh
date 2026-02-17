#!/bin/bash
# Transcribe audio usando Groq Whisper API con verbose_json
# Uso: ./transcribe-verbose.sh archivo.mp3
# Salida: archivo.json con timestamps detallados

API_KEY="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"
AUDIO_FILE="$1"

if [ -z "$AUDIO_FILE" ]; then
    echo "Uso: $0 <archivo_de_audio>"
    exit 1
fi

# Crear nombre de salida
OUTPUT_FILE="${AUDIO_FILE%.*}.json"

echo "Procesando: $AUDIO_FILE"
echo "Salida: $OUTPUT_FILE"

# Llamar a Groq API con verbose_json
curl -s https://api.groq.com/openai/v1/audio/transcriptions \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@$AUDIO_FILE" \
    -F "model=whisper-large-v3" \
    -F "response_format=verbose_json" \
    -F "timestamp_granularities[]=word" \
    -F "timestamp_granularities[]=segment" \
    > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
    echo "✅ Transcripción guardada: $OUTPUT_FILE"
    # Mostrar preview
    echo ""
    echo "Preview:"
    head -50 "$OUTPUT_FILE" | jq . 2>/dev/null || cat "$OUTPUT_FILE" | head -20
else
    echo "❌ Error: No se pudo generar la transcripción"
    rm -f "$OUTPUT_FILE"
    exit 1
fi
