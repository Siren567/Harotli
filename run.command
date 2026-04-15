#!/bin/bash

cd "$(dirname "$0")"

echo "Starting site + admin..."

bash "./scripts/start-all.sh"

echo "Servers stopped"
read