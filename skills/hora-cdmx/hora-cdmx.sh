#!/bin/bash
# Script para obtener la hora actual en CDMX
# Uso: ./hora-cdmx.sh

export TZ=America/Mexico_City

echo "🕐 Hora actual en Ciudad de México (CDMX):"
echo ""
echo "📅 Fecha: $(date '+%A, %d de %B de %Y')"
echo "🕐 Hora: $(date '+%I:%M %p')"
echo "🌍 Zona horaria: $(date '+%Z (GMT%:z)')"
echo ""
echo "ISO: $(date -Iseconds)"
