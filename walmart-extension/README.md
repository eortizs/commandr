# Walmart Price Scraper - Chrome Extension

Extensión de Chrome para extraer precios de Walmart México usando Gemini Vision API.

## 🎯 Características

- 🔍 Navegación automática a Walmart
- 📸 Captura de pantalla de resultados
- 🤖 Análisis con Gemini Flash Lite
- 💾 Exportación a JSON

## 📁 Archivos

```
walmart-extension/
├── manifest.json      # Configuración de la extensión
├── popup.html         # Interfaz de usuario
├── popup.js           # Lógica principal
├── background.js      # Service worker
├── content.js         # Script de contenido
└── icons/             # Iconos (necesitas crear)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 Instalación

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa "Modo desarrollador" (arriba derecha)
3. Click en "Cargar sin empaquetar"
4. Selecciona la carpeta `walmart-extension/`

## 📝 Uso

1. Ve a https://www.walmart.com.mx
2. Click en el icono de la extensión
3. Escribe el producto a buscar
4. Click en "Buscar y Extraer Precios"
5. Espera el análisis con Gemini
6. Exporta los resultados a JSON

## ⚙️ Configuración

La API key de Gemini está incluida en el código.
Para producción, considera:
- Usar un backend proxy para ocultar la API key
- Implementar rate limiting

## 🔒 Seguridad

- La extensión solo funciona en walmart.com.mx
- Los datos se guardan localmente en el navegador
- No se envían datos a servidores externos (solo a Gemini API)

## 🛠️ Desarrollo

Para modificar:
1. Edita los archivos
2. Ve a `chrome://extensions/`
3. Click en el icono de refresh de la extensión
4. Prueba los cambios

## 📄 Licencia

MIT
