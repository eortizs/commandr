#!/bin/bash
# Script para automatizar Walmart Scraper usando xdotool
# Uso: ./auto-walmart.sh "producto1,producto2,producto3"

set -e

# Configuración
PRODUCTOS="${1:-cebolla blanca, jitomate saladet, aguacate hass}"
CHROME_WINDOW_NAME="Walmart"
EXTENSION_ICON_X=1100  # Ajustar según posición del icono en tu barra
EXTENSION_ICON_Y=75    # Ajustar según posición del icono en tu barra

echo "🚀 Automatización Walmart Scraper"
echo "📦 Productos: $PRODUCTOS"

# 1. Abrir Chrome con Walmart si no está abierto
echo "🌐 Verificando Chrome..."
if ! xdotool search --name "$CHROME_WINDOW_NAME" > /dev/null 2>&1; then
    echo "🌐 Abriendo Chrome..."
    google-chrome "https://www.walmart.com.mx/" &
    sleep 5
fi

# 2. Activar ventana de Chrome
echo "🖱️ Activando Chrome..."
WINDOW_ID=$(xdotool search --name "$CHROME_WINDOW_NAME" | head -1)
xdotool windowactivate "$WINDOW_ID"
sleep 1

# 3. Click en el icono de la extensión
echo "🔌 Abriendo extensión..."
xdotool mousemove $EXTENSION_ICON_X $EXTENSION_ICON_Y
xdotool click 1
sleep 2

# 4. Limpiar campo y escribir productos
echo "⌨️ Insertando productos..."
xdotool key ctrl+a  # Seleccionar todo
xdotool key Delete   # Borrar
xdotool type "$PRODUCTOS"
sleep 1

# 5. Click en botón "Buscar Todos en Secuencia"
echo "🔍 Iniciando búsqueda..."
# Coordenadas del botón (ajustar según tu pantalla)
BOTON_X=200
BOTON_Y=250
xdotool mousemove $BOTON_X $BOTON_Y
xdotool click 1

echo "✅ Automatización iniciada"
echo "⏳ Esperando resultados..."
