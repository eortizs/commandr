#!/bin/bash
# Búsqueda con Serper.dev API
# Uso: ./serper-search.sh "consulta"

API_KEY="4cfeca55b7906c133502ad7993737186a444f13e"

if [ -z "$1" ]; then
    echo "Uso: $0 \"consulta de búsqueda\""
    exit 1
fi

QUERY="$1"

echo "🔍 Buscando: $QUERY"
echo ""

curl -s -X POST https://google.serper.dev/search \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"q\": \"$QUERY\",
    \"gl\": \"mx\",
    \"hl\": \"es\",
    \"num\": 10
  }" | jq -r '.organic[] | "\(.title)\n\(.link)\n\(.snippet)\n---"' 2>/dev/null || echo "Error en la búsqueda"
