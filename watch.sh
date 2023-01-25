#!/bin/sh

bye() {
  echo Killing vite
  kill "$!"
}
caddy_file=./Caddyfile.dev
vite_port=8001
log_dir=./logs
log_file=./logs/access.dev.log
if ! [ -d "$log_dir" ]; then
  mkdir "$log_dir" || exit
fi
trap bye EXIT
./node_modules/.bin/vite --port "$vite_port" --strictPort --clearScreen false &
PORT="$vite_port" LOG_FILE="$log_file" caddy run --config "$caddy_file"
