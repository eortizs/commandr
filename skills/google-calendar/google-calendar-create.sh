#!/bin/bash
# Crear evento en Google Calendar
# Uso: ./google-calendar-create.sh "Título" "2026-02-17T11:00:00" "2026-02-17T11:30:00" ["Descripción"]

TOKEN_FILE="${HOME}/.openclaw/google-calendar-token.json"

if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Token no encontrado. Ejecuta primero:"
    echo "   ./google-calendar-auth.sh client_secret.json"
    exit 1
fi

SUMMARY="$1"
START_TIME="$2"
END_TIME="$3"
DESCRIPTION="${4:-Recordatorio de OpenClaw}"

if [ -z "$SUMMARY" ] || [ -z "$START_TIME" ] || [ -z "$END_TIME" ]; then
    echo "Uso: $0 \"Título del evento\" \"2026-02-17T11:00:00\" \"2026-02-17T11:30:00\" [\"Descripción\"]"
    exit 1
fi

ACCESS_TOKEN=$(jq -r '.access_token' "$TOKEN_FILE")

echo "📅 Creando evento: $SUMMARY"
echo "   Inicio: $START_TIME"
echo "   Fin: $END_TIME"

# Crear JSON del evento
EVENT_JSON=$(cat <<EOF
{
  "summary": "$SUMMARY",
  "description": "$DESCRIPTION",
  "start": {
    "dateTime": "$START_TIME",
    "timeZone": "America/Mexico_City"
  },
  "end": {
    "dateTime": "$END_TIME",
    "timeZone": "America/Mexico_City"
  },
  "reminders": {
    "useDefault": false,
    "overrides": [
      {"method": "popup", "minutes": 10}
    ]
  }
}
EOF
)

# Crear evento
RESPONSE=$(curl -s -X POST \
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$EVENT_JSON")

if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Evento creado:"
    echo "$RESPONSE" | jq -r '.htmlLink'
else
    echo "❌ Error:"
    echo "$RESPONSE" | jq .
fi
