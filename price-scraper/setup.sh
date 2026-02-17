#!/bin/bash
# Setup script para price-scraper en Banana Pi
# Ejecutar: ./setup.sh

echo "🍌 Configurando Price Scraper para Banana Pi..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no instalado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Verificar Chromium
if ! command -v chromium-browser &> /dev/null; then
    echo "❌ Chromium no instalado. Instalando..."
    sudo apt update
    sudo apt install -y chromium-browser
fi

# Crear directorio de trabajo
mkdir -p ~/price-scraper
mkdir -p ~/price-scraper/resultados

# Copiar archivos
cp package.json ~/price-scraper/
cp scraper.js ~/price-scraper/
cp run-scraper.sh ~/price-scraper/

# Instalar dependencias
cd ~/price-scraper
npm install

# Hacer ejecutable el script
chmod +x run-scraper.sh

# Configurar cron job (5:00 AM todos los días)
echo "🕐 Configurando cron job para 5:00 AM..."
(crontab -l 2>/dev/null; echo "0 5 * * * cd ~/price-scraper && ./run-scraper.sh >> ~/price-scraper/scraper.log 2>>1") | crontab -

echo "✅ Configuración completa!"
echo ""
echo "📁 Directorio: ~/price-scraper"
echo "🕐 Horario: 5:00 AM todos los días"
echo "📊 Resultados: ~/price-scraper/resultados/"
echo ""
echo "Para probar ahora: cd ~/price-scraper && ./run-scraper.sh"
