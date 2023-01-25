#!/bin/sh

address="$1"
if [ -z "$address" ]; then
  echo 'Missing address' >&2
  exit 1
fi

log_dir=./logs
log_file="$log_dir"/access.log
if ! [ -d "$log_dir" ]; then
  mkdir "$log_dir" || exit
fi
./node_modules/.bin/vite build &&
  LOG_FILE="$log_file" ADDRESS="$address" exec caddy run --config ./Caddyfile.prod
