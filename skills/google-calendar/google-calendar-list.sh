#!/bin/bash
# Listar eventos de Google Calendar
# Uso: ./google-calendar-list.sh [fecha_inicio] [fecha_fin]

TOKEN_FILE="${HOME}/.openclaw/google-calendar-token.json"

if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Token no encontrado. Ejecuta primero:"
    echo "   ./google-calendar-auth.sh client_secret.json"
    exit 1
fi

# Obtener access token
ACCESS_TOKEN=$(jq -r '.access_token' "$TOKEN_FILE")

# Fechas por defecto (hoy)
TIME_MIN="${1:-$(date -u +%Y-%m-%dT00:00:00Z)}"
TIME_MAX="${2:-$(date -u -d '+7 days' +%Y-%m-%dT23:59:59Z)}"

echo "📅 Eventos desde $TIME_MIN hasta $TIME_MAX"
echo ""

# Llamar a la API
curl -s "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${TIME_MIN}&timeMax=${TIME_MAX}&orderBy=startTime&singleEvents=true" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq -r '.items[] | "\(.start.dateTime // .start.date) | \(.summary)"'
