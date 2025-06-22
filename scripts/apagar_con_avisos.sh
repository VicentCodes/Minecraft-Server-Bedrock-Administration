#!/bin/bash

SERVER_SCREEN="minecraft_server"

# Forzar detach si está abierto
screen -d "$SERVER_SCREEN"

avisar() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}

avisar "El servidor se apagará en 10 minutos."
sleep 300
avisar "El servidor se apagará en 5 minutos."
sleep 240
avisar "El servidor se apagará en 1 minuto."
sleep 30
avisar "El servidor se apagará en 30 segundos."
sleep 20
avisar "Apagando en 10 segundos..."
for i in {9..1}; do
  sleep 1
  avisar "Apagando en $i..."
done

avisar "Apagando servidor ahora."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"
