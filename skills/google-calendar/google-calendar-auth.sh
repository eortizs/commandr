#!/bin/bash
# Google Calendar OAuth Setup
# Uso: ./google-calendar-auth.sh

CLIENT_SECRET_FILE="${1:-client_secret.json}"
TOKEN_FILE="${HOME}/.openclaw/google-calendar-token.json"

if [ ! -f "$CLIENT_SECRET_FILE" ]; then
    echo "❌ No se encuentra: $CLIENT_SECRET_FILE"
    echo "Uso: $0 client_secret.json"
    exit 1
fi

# Extraer client_id y client_secret
CLIENT_ID=$(jq -r '.web.client_id' "$CLIENT_SECRET_FILE")
CLIENT_SECRET=$(jq -r '.web.client_secret' "$CLIENT_SECRET_FILE")
REDIRECT_URI="http://127.0.0.1:42891/oauth2/callback"
SCOPE="https://www.googleapis.com/auth/calendar"

echo "🚀 Configuración de Google Calendar OAuth"
echo ""
echo "1. Abre esta URL en tu navegador:"
echo ""
echo "https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&response_type=code&access_type=offline&prompt=consent"
echo ""
echo "2. Inicia sesión y autoriza el acceso"
echo "3. Copia el 'code' de la URL de redirección"
echo ""
read -p "Pega el código aquí: " AUTH_CODE

echo ""
echo "⏳ Intercambiando código por token..."

# Intercambiar código por token
RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "code=${AUTH_CODE}" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "redirect_uri=${REDIRECT_URI}" \
    -d "grant_type=authorization_code")

# Guardar token
mkdir -p "$(dirname "$TOKEN_FILE")"
echo "$RESPONSE" | jq . > "$TOKEN_FILE"

if echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo "✅ Token guardado en: $TOKEN_FILE"
    echo ""
    echo "📅 Ahora puedes usar Google Calendar:"
    echo "   ./google-calendar-list.sh"
else
    echo "❌ Error:"
    echo "$RESPONSE" | jq .
fi
