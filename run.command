#!/bin/bash

cd "$(dirname "$0")"

echo "Starting server..."

python3 -m http.server 3005

echo "Server stopped"
read