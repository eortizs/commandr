#!/bin/bash
# Comparador de precios de supermercados en México
# Usa SOLO campos estructurados price de Serper (más confiable)
# Uso: ./precios-super.sh "producto1,producto2,..."

API_KEY="4cfeca55b7906c133502ad7993737186a444f13e"

if [ -z "$1" ]; then
    echo "🔍 Comparador de Precios - Supermercados México"
    echo ""
    echo "Uso: $0 \"producto1, producto2,...\""
    echo "Ejemplo: $0 \"cebolla blanca\""
    echo ""
    exit 1
fi

IFS=',' read -ra PRODUCTOS <<< "$1"

# Función para buscar precio en una tienda
buscar_precio() {
    local producto="$1"
    local tienda="$2"
    local nombre="$3"
    
    echo -n "  $nombre: "
    
    resultado=$(curl -s -X POST https://google.serper.dev/search \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"q\": \"$producto $tienda\",
            \"gl\": \"mx\",
            \"hl\": \"es\",
            \"num\": 10
        }" 2>/dev/null)
    
    # Extraer SOLO de campos estructurados price (más confiable)
    precio=$(echo "$resultado" | jq -r '[.organic[] | select(.price != null and .price != "") | .price] | first // empty')
    
    if [ -n "$precio" ] && [ "$precio" != "null" ]; then
        echo "\$$precio/kg"
    else
        echo "❌ No disponible"
    fi
}

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     🔍 COMPARADOR DE PRECIOS - MÉXICO         ║"
echo "║     (Usando datos estructurados de Serper)    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

for producto in "${PRODUCTOS[@]}"; do
    producto_trim=$(echo "$producto" | xargs)
    
    echo "┌────────────────────────────────────────────────┐"
    echo "│  📌 $producto_trim"
    echo "├────────────────────────────────────────────────┤"
    
    buscar_precio "$producto_trim" "Chedraui" "🛒 Chedraui  "
    buscar_precio "$producto_trim" "La Comer" "🏪 La Comer  "
    buscar_precio "$producto_trim" "Walmart" "🛍️ Walmart   "
    buscar_precio "$producto_trim" "Soriana" "📦 Soriana   "
    
    echo "└────────────────────────────────────────────────┘"
    echo ""
    
    sleep 1
done

echo "✅ Comparación completada"
echo ""
echo "💡 Nota: Solo muestra precios oficiales de las tiendas"
