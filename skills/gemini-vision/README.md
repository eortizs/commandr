# Gemini Vision Skill

Análisis de imágenes usando Google Gemini API.

## Requisitos

- Python 3
- API Key de Google Gemini (obtener en https://ai.google.dev/)
- `curl` instalado

## Configuración

```bash
export GEMINI_API_KEY="tu-api-key-aqui"
```

O crear archivo `.env`:
```
GEMINI_API_KEY=tu-api-key-aqui
```

## Uso

```bash
# Análisis básico
./gemini-vision.sh imagen.jpg

# Con prompt personalizado
./gemini-vision.sh imagen.jpg "Extrae todo el texto de esta imagen"

# Ejemplos de prompts
./gemini-vision.sh foto.png "Describe los objetos principales"
./gemini-vision.sh documento.jpg "Transcribe el texto completo"
./gemini-vision.sh captura.png "Resume el contenido"
```

## Archivos

- `gemini-vision.sh` - Script principal
- `gemini-vision.py` - Generador de payload (helper)

## Nota de seguridad

La API key debe configurarse como variable de entorno. Nunca hardcodear en el script.
