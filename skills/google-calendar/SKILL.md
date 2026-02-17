# Google Calendar Skill

Integración con Google Calendar para crear recordatorios y eventos.

## Requisitos

- Archivo `client_secret.json` de Google Cloud Console
- `jq` instalado (`sudo apt install jq`)
- `curl` instalado

## Configuración

### 1. Obtener client_secret.json

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Google Calendar API**
4. Ve a **Credentials** → **Create Credentials** → **OAuth client ID**
5. Tipo: **Desktop app**
6. Descarga el JSON (se llamará `client_secret_*.json`)

### 2. Autenticar

```bash
./google-calendar-auth.sh client_secret_*.json
```

Esto abrirá un navegador para autorizar el acceso. El token se guardará en `~/.openclaw/google-calendar-token.json`.

## Uso

### Listar eventos

```bash
# Eventos de hoy
./google-calendar-list.sh

# Eventos de una fecha específica
./google-calendar-list.sh "2026-02-17T00:00:00Z" "2026-02-18T00:00:00Z"
```

### Crear recordatorio

```bash
./google-calendar-create.sh "Reunión importante" \
    "2026-02-17T11:00:00" \
    "2026-02-17T11:30:00" \
    "Descripción opcional"
```

## Notas

- Los horarios deben estar en formato ISO 8601
- La zona horaria por defecto es `America/Mexico_City` (CDMX)
- Los eventos incluyen recordatorio popup 10 minutos antes

## Archivos

- `google-calendar-auth.sh` - Autenticación OAuth
- `google-calendar-list.sh` - Listar eventos
- `google-calendar-create.sh` - Crear eventos
