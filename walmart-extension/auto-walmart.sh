#!/bin/bash
# Script para automatizar Walmart Scraper usando xdotool
# Uso: ./auto-walmart.sh "producto1,producto2,producto3"

set -e

# Configuración
PRODUCTOS="${1:-cebolla blanca, jitomate saladet, aguacate hass}"

echo "🚀 Automatización Walmart Scraper"
echo "📦 Productos: $PRODUCTOS"

# Coordenadas (proporcionadas por el usuario)
BOTON_EXTENSIONES_X=1384
BOTON_EXTENSIONES_Y=94
BOTON_WALMART_X=1235
BOTON_WALMART_Y=482
AREA_TEXT_X=1070
AREA_TEXT_Y=223
BOTON_BUSCAR_X=1108
BOTON_BUSCAR_Y=347

# 1. Abrir Chrome con Walmart si no está abierto
echo "🌐 Verificando Chrome..."
if ! xdotool search --name "Walmart" > /dev/null 2>&1; then
    echo "🌐 Abriendo Chrome..."
    google-chrome "https://www.walmart.com.mx/" &
    sleep 5
fi

# 2. Activar ventana de Chrome
echo "🖱️ Activando Chrome..."
WINDOW_ID=$(xdotool search --name "Walmart" | head -1)
xdotool windowactivate "$WINDOW_ID"
sleep 1

# 3. Click en botón de extensiones (rompecabezas)
echo "🔌 Abriendo menú de extensiones..."
xdotool mousemove $BOTON_EXTENSIONES_X $BOTON_EXTENSIONES_Y
xdotool click 1
sleep 1

# 4. Click en extensión Walmart
echo "🔌 Abriendo extensión Walmart..."
xdotool mousemove $BOTON_WALMART_X $BOTON_WALMART_Y
xdotool click 1
sleep 2

# 5. Click en área de texto y escribir productos
echo "⌨️ Insertando productos..."
xdotool mousemove $AREA_TEXT_X $AREA_TEXT_Y
xdotool click 1
xdotool key ctrl+a
xdotool key Delete
xdotool type "$PRODUCTOS"
sleep 1

# 6. Click en botón "Buscar Todos en Secuencia"
echo "🔍 Iniciando búsqueda..."
xdotool mousemove $BOTON_BUSCAR_X $BOTON_BUSCAR_Y
xdotool click 1

echo "✅ Automatización iniciada"
echo "⏳ Esperando resultados..."
