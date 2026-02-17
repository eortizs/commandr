#!/bin/bash
# Gemini Vision - Análisis de imágenes con Gemini API
# Uso: ./gemini-vision.sh imagen.jpg ["prompt opcional"]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_FILE="$1"
PROMPT="${2:-Describe lo que ves en esta imagen con detalle, incluyendo cualquier texto visible.}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"  # Debe configurarse como variable de entorno
GEMINI_MODEL="gemini-flash-lite-latest"

if [ -z "$IMAGE_FILE" ] || [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ Error: Archivo no encontrado: $IMAGE_FILE"
    echo "Uso: $0 imagen.jpg [\"prompt opcional\"]"
    exit 1
fi

# Generar payload JSON en archivo temporal
TEMP_JSON=$(mktemp)
python3 "$SCRIPT_DIR/gemini-vision.py" "$IMAGE_FILE" "$PROMPT" > "$TEMP_JSON" 2>/dev/null

if [ ! -s "$TEMP_JSON" ]; then
    echo "❌ Error generando payload"
    rm -f "$TEMP_JSON"
    exit 1
fi

# Llamar a Gemini
echo "🤖 Analizando con Gemini..."
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "@$TEMP_JSON")

# Limpiar temporal
rm -f "$TEMP_JSON"

# Extraer respuesta
RESULT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['candidates'][0]['content']['parts'][0]['text'])" 2>/dev/null)

if [ -n "$RESULT" ]; then
    echo "$RESULT"
else
    echo "❌ Error al procesar: $(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', {}).get('message', 'Error desconocido'))" 2>/dev/null || echo 'Error desconocido')"
fi
