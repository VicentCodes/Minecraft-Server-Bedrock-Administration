#!/bin/bash

# Configuración
FECHA=$(date +"%Y-%m-%d_%H-%M-%S")
NOMBRE_BACKUP="backup_${FECHA}.zip"
ORIGEN="/home/tomas/minecraft/worlds"
DESTINO="/home/tomas/minecraft/backups"

# Crear carpeta de backups si no existe
mkdir -p "$DESTINO"

# Mensaje al servidor
screen -S minecraft_server -p 0 -X stuff "say Iniciando backup...$(printf \\r)"
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"
sleep 2

# Crear el archivo zip
zip -r "$DESTINO/$NOMBRE_BACKUP" "$ORIGEN" > /dev/null

# Confirmación
screen -S minecraft_server -p 0 -X stuff "say Backup completo: $NOMBRE_BACKUP$(printf \\r)"
