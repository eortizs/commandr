# Price Scraper - Banana Pi

Sistema automatizado de scraping de precios de frutas y verduras para tiendas mexicanas.

## 🎯 Características

- **Tiendas soportadas**: Soriana, Chedraui, Walmart, La Comer
- **Productos**: 10 frutas y verduras predefinidas
- **Automatización**: Ejecución diaria a las 5:00 AM vía cron
- **Optimizado para**: Banana Pi BPI-M2 Ultra (2GB RAM, ARM)

## 📁 Estructura

```
price-scraper/
├── package.json          # Dependencias
├── scraper.js            # Lógica principal
├── run-scraper.sh        # Script wrapper
├── setup.sh              # Script de instalación
├── resultados/           # Datos extraídos
│   ├── precios-2026-02-17.json
│   └── precios-2026-02-17.csv
└── scraper.log           # Log de ejecuciones
```

## 🚀 Instalación

```bash
# 1. Copiar archivos a la Banana Pi
scp -r price-scraper/ usuario@banana-pi:~/

# 2. Conectar vía SSH
ssh usuario@banana-pi

# 3. Ejecutar setup
cd ~/price-scraper
./setup.sh
```

## 🕐 Automatización

El setup configura automáticamente un cron job para ejecutar a las 5:00 AM:

```cron
0 5 * * * cd ~/price-scraper && ./run-scraper.sh >> ~/price-scraper/scraper.log 2>&1
```

## 📊 Resultados

Los precios se guardan en formato JSON y CSV:

```json
[
  {
    "tienda": "Soriana",
    "producto": "cebolla blanca",
    "nombre": "Cebolla Blanca 1kg",
    "precio": "$19.70",
    "imagen": "https://...",
    "fecha": "2026-02-17",
    "url": "https://www.soriana.com/..."
  }
]
```

## 🧪 Prueba manual

```bash
cd ~/price-scraper
./run-scraper.sh
```

## ⚙️ Configuración

Editar `scraper.js` para:
- Modificar lista de productos (array `PRODUCTOS`)
- Cambiar tiendas (objeto `TIENDAS`)
- Ajustar delays y timeouts

## 🛠️ Troubleshooting

### Chromium no encontrado
```bash
which chromium-browser
# Si no existe:
sudo apt install chromium-browser
```

### Error de memoria
Reducir número de productos o ejecutar tiendas por separado.

### Bloqueo de tienda
Las tiendas pueden cambiar sus selectores CSS. Actualizar en `TIENDAS.{tienda}.selectors`.

## 📝 Notas

- Usa Puppeteer con stealth plugin para evadir detección
- Navegación headless (sin interfaz gráfica)
- Imágenes deshabilitadas para ahorrar RAM
- Delays aleatorios entre peticiones
