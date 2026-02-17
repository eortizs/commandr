#!/bin/bash
# Script para establecer la hora de CDMX como default
# Este script debe ejecutarse antes de cualquier acción

export TZ=America/Mexico_City
export LC_TIME=es_MX.UTF-8
export LANG=es_MX.UTF-8

# Guardar la hora actual en un archivo para referencia
FECHA_CDmx=$(date '+%Y-%m-%d')
HORA_CDmx=$(date '+%I:%M %p')
HORA_ISO=$(date -Iseconds)

cat > /tmp/hora-cdmx-actual.txt << EOF
FECHA_CDmx=$FECHA_CDmx
HORA_CDmx=$HORA_CDmx
HORA_ISO=$HORA_ISO
TZ=America/Mexico_City
EOF

echo "✅ Hora establecida: $FECHA_CDmx $HORA_CDmx (CDMX)"
