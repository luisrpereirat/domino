#!/usr/bin/env bash
# init.sh - Quarzen's Domino development environment setup
# Usage: ./init.sh
set -euo pipefail

FRONTEND_PORT=5173
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Quarzen's Domino - Development Environment Setup ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
  echo "  macOS: brew install node"
  echo "  Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required. Current version: $(node -v)"
  exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Install dependencies
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed. Running npm install to update..."
  npm install
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Starting Vite dev server on port $FRONTEND_PORT..."
echo "  Game URL: http://localhost:$FRONTEND_PORT"
echo ""
echo "Controls:"
echo "  Ctrl+C to stop the server"
echo ""

npm run dev -- --port "$FRONTEND_PORT"
