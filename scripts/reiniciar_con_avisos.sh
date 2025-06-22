#!/bin/bash

SERVER_SCREEN="minecraft_server"

# Forzar detach por si alguien dejó el screen abierto
screen -d "$SERVER_SCREEN"

avisar() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}

avisar "El servidor se reiniciará en 2 minutos."
sleep 60
avisar "El servidor se reiniciará en 1 minuto."
sleep 30
avisar "Reinicio en 30 segundos."
sleep 20
avisar "Reinicio en 10 segundos..."
for i in {9..1}; do
  sleep 1
  avisar "Reinicio en $i..."
done

avisar "Reiniciando servidor ahora."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"
sleep 5

cd /home/mineraft/bedrock-server/bedrock-server/minecraft
screen -dmS "$SERVER_SCREEN" ./bedrock_server
