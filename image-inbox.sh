#!/bin/bash
# Image Inbox Manager
# Gestiona imágenes recibidas para análisis con Gemini

INBOX_FILE="/root/.openclaw/workspace/image-inbox.json"
IMAGE_DIR="/root/.openclaw/media/inbound"

case "$1" in
  list)
    echo "📸 Imágenes en inbox:"
    jq -r '.images[] | select(.status == "pending") | "  [\(.id)] \(.filename) - \(.status)"' "$INBOX_FILE" 2>/dev/null || echo "  (vacío)"
    ;;
  
  process)
    IMAGE_ID="$2"
    if [ -z "$IMAGE_ID" ]; then
      echo "Uso: $0 process <image_id>"
      exit 1
    fi
    
    # Obtener info de la imagen
    FILENAME=$(jq -r ".images[] | select(.id == \"$IMAGE_ID\") | .filename" "$INBOX_FILE")
    if [ -z "$FILENAME" ] || [ "$FILENAME" = "null" ]; then
      echo "❌ Imagen no encontrada: $IMAGE_ID"
      exit 1
    fi
    
    IMAGE_PATH="$IMAGE_DIR/$FILENAME"
    if [ ! -f "$IMAGE_PATH" ]; then
      echo "❌ Archivo no encontrado: $IMAGE_PATH"
      exit 1
    fi
    
    echo "🤖 Procesando $IMAGE_ID..."
    # Aquí se llamaría a gemini-vision.sh
    echo "   (Requiere GEMINI_API_KEY configurada)"
    ;;
  
  status)
    PENDING=$(jq '[.images[] | select(.status == "pending")] | length' "$INBOX_FILE")
    PROCESSED=$(jq '[.images[] | select(.status == "processed")] | length' "$INBOX_FILE")
    echo "📊 Estado del inbox:"
    echo "   Pendientes: $PENDING"
    echo "   Procesadas: $PROCESSED"
    ;;
  
  *)
    echo "Image Inbox Manager"
    echo ""
    echo "Uso: $0 <comando>"
    echo ""
    echo "Comandos:"
    echo "  list      - Listar imágenes pendientes"
    echo "  process   - Procesar imagen específica"
    echo "  status    - Ver estado general"
    ;;
esac
