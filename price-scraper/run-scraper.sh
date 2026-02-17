#!/bin/bash
# Script wrapper para ejecutar el scraper
# Uso: ./run-scraper.sh

cd "$(dirname "$0")"

echo "🚀 Iniciando scraper de precios..."
echo "📅 Fecha: $(date)"
echo ""

# Configurar ruta de Chromium para Puppeteer
export CHROMIUM_PATH=/usr/bin/chromium-browser
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Ejecutar scraper
node scraper.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Scraper completado exitosamente"
    
    # Opcional: Enviar notificación (telegram, email, etc.)
    # curl -s "https://api.telegram.org/botTOKEN/sendMessage?chat_id=CHAT_ID&text=Scraper completado"
else
    echo "❌ Scraper falló con código: $EXIT_CODE"
fi

echo "📅 Finalizado: $(date)"
echo ""
