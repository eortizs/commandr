#!/usr/bin/env python3
# Gemini Vision - Generador de payload

import base64
import json
import sys

if len(sys.argv) < 2:
    print("Uso: gemini-vision.py imagen.jpg [prompt]", file=sys.stderr)
    sys.exit(1)

image_file = sys.argv[1]
prompt = sys.argv[2] if len(sys.argv) > 2 else "Describe lo que ves en esta imagen con detalle."

try:
    with open(image_file, "rb") as f:
        img_data = base64.b64encode(f.read()).decode("utf-8")
    
    # Detectar mime type simple
    if image_file.lower().endswith('.jpg') or image_file.lower().endswith('.jpeg'):
        mime_type = "image/jpeg"
    elif image_file.lower().endswith('.png'):
        mime_type = "image/png"
    elif image_file.lower().endswith('.gif'):
        mime_type = "image/gif"
    elif image_file.lower().endswith('.webp'):
        mime_type = "image/webp"
    else:
        mime_type = "image/jpeg"
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": img_data
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 2048
        }
    }
    
    print(json.dumps(payload))
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
