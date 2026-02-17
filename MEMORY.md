# MEMORY.md - Memoria de Kimi Claw

## Usuario Principal

**Nombre:** Enrique Ortiz  
**Email:** eortizs@gmail.com  
**Ubicación:** CDMX, México  
**Zona horaria:** America/Mexico_City (GMT-6)  

### Configuración de Horario
- **Zona horaria por defecto:** America/Mexico_City (GMT-6)
- **Antes de cualquier acción:** Verificar hora actual en CDMX
- **Script de referencia:** `/root/.openclaw/tools/hora-cdmx.sh`
- Formato de fecha preferido: DD/MM/YYYY
- Formato de hora: 12h (AM/PM)
- Idioma: Español

### Regla Importante
> **SIEMPRE** consultar la hora en CDMX antes de:
> - Programar crons
> - Establecer deadlines
> - Agendar tareas
> - Cualquier acción que dependa del tiempo

### Archivos de Configuración
- Perfil: `/root/.openclaw/config/user-profile.json`
- Scripts: `/root/.openclaw/tools/user-config.sh`

### Servicios Configurados
| Servicio | Estado | API Key |
|----------|--------|---------|
| Telegram Bot | ✅ Activo | Configurado |
| Groq Whisper (STT) | ✅ Activo | Configurado |
| Cartesia (TTS) | ✅ Activo | Configurado |
| Gemini Vision | ✅ Activo | Configurado |
| Nano Banana (Imágenes) | ✅ Activo | Configurado |
| gogcli (Google Workspace) | ✅ Activo | OAuth configurado |

### Comandos TTS Activos
- "Dime en TTS"
- "Dime en voz alta"
- Frases similares → generan audio

### Notas
- Creado: 2026-02-16
- Última actualización: 2026-02-16
