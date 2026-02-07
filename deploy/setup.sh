#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

USERNAME="${1:-demo}"
PASSWORD="${2:-$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 12)}"

echo "Generating .htpasswd for user: $USERNAME"
docker run --rm httpd:alpine htpasswd -nb "$USERNAME" "$PASSWORD" > .htpasswd

echo "Building and starting container..."
docker compose up --build -d

echo ""
echo "========================================="
echo "  Domino Royale is running!"
echo "========================================="
echo ""
echo "  Local:  http://localhost:7847"
echo "  Public: https://domino.5ps.tech"
echo ""
echo "  Username: $USERNAME"
echo "  Password: $PASSWORD"
echo ""
echo "  Point your cloudflared tunnel:"
echo "    domino.5ps.tech -> http://localhost:7847"
echo ""
echo "  Stop:  cd deploy && docker compose down"
echo "========================================="
