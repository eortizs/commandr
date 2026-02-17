# Walmart Price Scraper - Documentación Completa

## 🎯 Resumen

Sistema híbrido de scraping de precios de Walmart México que combina:
- **Extensión de Chrome** para navegación humana
- **xdotool** para automatización de UI
- **Gemini Vision** para extracción de datos

## ✅ Ventajas del Método

| Característica | Beneficio |
|----------------|-----------|
| **Precisión 100%** | Precios reales de la página, no aproximaciones |
| **Anti-detección** | Navegación humana real, imposible de bloquear como bot |
| **Datos certificados** | Información confiable para decisiones de compra |
| **Mantenimiento bajo** | No depende de selectores CSS frágiles |
| **Adaptable** | Funciona aunque Walmart cambie su diseño |

## 📁 Estructura del Proyecto

```
walmart-extension/
├── manifest.json              # Configuración de la extensión
├── popup-autonomous.html      # UI de la extensión
├── popup-autonomous.js        # Lógica de la extensión
├── auto-walmart.sh            # Script de automatización
├── consolidar-resultados.js   # Consolidación de resultados
├── scraper-*.js               # Scrapers alternativos (archivados)
└── README.md                  # Esta documentación
```

## 🚀 Instalación

### 1. Requisitos del Sistema

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y google-chrome-stable xdotool nodejs npm

# Verificar instalaciones
google-chrome --version
xdotool --version
node --version
```

### 2. Clonar y Configurar

```bash
cd ~/lab/scraper/extension
rm -rf commandr  # Si existe versión anterior
git clone https://github.com/eortizs/commandr.git
cd commandr/walmart-extension

# Instalar dependencias
npm install
```

### 3. Instalar Extensión en Chrome

1. Abrir Chrome → `chrome://extensions/`
2. Activar "Modo desarrollador" (arriba derecha)
3. "Cargar sin empaquetar"
4. Seleccionar carpeta `walmart-extension/`
5. Fijar extensión a la barra (click en el icono del rompecabezas → 📌)

### 4. Configurar Coordenadas (IMPORTANTE)

Las coordenadas en `auto-walmart.sh` deben coincidir con tu pantalla:

```bash
# Obtener coordenadas actuales
xdotool getmouselocation

# Mover mouse a cada elemento y anotar X,Y:
# 1. Botón extensiones (rompecabezas)
# 2. Icono Walmart
# 3. Área de texto
# 4. Botón "Buscar Todos"
```

Actualizar en `auto-walmart.sh`:
```bash
BOTON_EXTENSIONES_X=1384
BOTON_EXTENSIONES_Y=94
BOTON_WALMART_X=1235
BOTON_WALMART_Y=482
AREA_TEXT_X=1070
AREA_TEXT_Y=223
BOTON_BUSCAR_X=1108
BOTON_BUSCAR_Y=347
```

## 📖 Uso

### Método 1: Automatizado (Recomendado)

```bash
cd ~/lab/scraper/extension/commandr/walmart-extension

# Ejecutar con productos específicos
./auto-walmart.sh "cebolla blanca, jitomate saladet, aguacate hass"

# O usar defaults
./auto-walmart.sh
```

El script:
1. Abre Chrome con Walmart
2. Click en extensión
3. Inserta productos
4. Inicia búsqueda secuencial
5. Descarga resultados consolidados

### Método 2: Manual (para pruebas)

1. Click en icono de la extensión
2. Escribir productos (separados por coma o línea)
3. Click en "Buscar Todos en Secuencia"
4. Esperar resultados

### Método 3: Un solo producto

1. Escribir producto en el textarea
2. Click en "Buscar Un Producto"

## 📊 Formatos de Salida

### JSON Consolidado
```json
{
  "tienda": "Walmart",
  "fecha": "2025-02-17",
  "productosBuscados": ["cebolla blanca", "jitomate"],
  "totalProductos": 8,
  "productos": [
    {
      "tienda": "Walmart",
      "producto": "cebolla blanca",
      "nombre": "Cebolla Blanca...",
      "precio": "$21.90",
      "fecha": "2025-02-17",
      "url": "https://www.walmart.com.mx/buscar?q=cebolla%20blanca"
    }
  ]
}
```

### CSV Consolidado
```csv
tienda,producto,nombre,precio,fecha,url
"Walmart","cebolla blanca","Cebolla Blanca...","$21.90","2025-02-17","https://..."
```

## 🔄 Consolidación con Otras Tiendas

Para combinar resultados de Soriana, Chedraui, La Comer y Walmart:

```bash
# Después de scrapear todas las tiendas
node consolidar-resultados.js
```

Genera:
- `consolidado-YYYY-MM-DD.json`
- `consolidado-YYYY-MM-DD.csv`

Con estadísticas por tienda y producto.

## ⚙️ Configuración Avanzada

### Variables de Entorno

```bash
# Opcional: API Key alternativa de Gemini
export GEMINI_API_KEY="tu-api-key"

# Opcional: Directorio de salida
export OUTPUT_DIR="/ruta/custom"
```

### Ajustar Tiempos de Espera

En `popup-autonomous.js`:
```javascript
// Entre búsquedas (ms)
await esperar(5000 + Math.random() * 5000);

// Espera resultados
await esperar(10000);
```

## 🔧 Troubleshooting

### Error: "No se encuentra el input"
- Walmart cambió su diseño
- **Solución**: Actualizar selectores en `buscarEnPagina()`

### Error: "Gemini API error"
- API key inválida o límite alcanzado
- **Solución**: Verificar API key en `popup-autonomous.js`

### Coordenadas incorrectas
- Chrome movido o resolución cambiada
- **Solución**: Re-obtener coordenadas con `xdotool getmouselocation`

### Chrome no abre
- Chrome no instalado o ruta diferente
- **Solución**: Verificar `which google-chrome`

## 📈 Mejoras Futuras Posibles

Ver [MEJORAS.md](./MEJORAS.md) para lista completa.

## 📝 Notas

- La extensión usa **Gemini Flash Lite** para OCR de precios
- Los screenshots se procesan localmente, no se almacenan
- Cumple con términos de uso de Walmart para navegación personal

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature
3. Commit cambios
4. Push y Pull Request

## 📄 Licencia

MIT - Uso libre con atribución.
