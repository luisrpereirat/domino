# Quarzen's Domino

A mobile-first Progressive Web Application (PWA) domino game where a human player competes against 3 AI opponents around a virtual table. Built with Phaser 3, TypeScript, and Vite.

## Features

- Standard double-six domino set (28 tiles) with drag-and-drop placement
- Three AI difficulty levels: Easy (helps you), Random (neutral), Hard (blocks you)
- JSON-based theme system for swappable tile designs, sounds, and color schemes
- PWA support for offline play and home screen installation
- Smooth animations with 60fps target
- Mobile-first with full desktop support

## Quick Start

```bash
# Option 1: Use init.sh
chmod +x init.sh
./init.sh

# Option 2: Manual
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

## Deployment

The game is deployed via Docker + Cloudflare Tunnel at **domino.5ps.tech**.

**Demo credentials:**

| Field    | Value      |
|----------|------------|
| Username | `demo`     |
| Password | `test1234` |

### Deploy commands

```bash
# Start the deployment (builds and serves on port 7847)
cd deploy && docker compose up -d

# Set custom credentials
./deploy/setup.sh myuser mypassword

# Stop the deployment
cd deploy && docker compose down
```

Point your Cloudflare tunnel `domino.5ps.tech` to `http://localhost:7847`.

## Project Structure

```
src/
  main.ts                 # Phaser game config and boot
  models/                 # Data models (Domino, GameState, BoardState, PlayerHand)
  managers/               # Game managers (DeckManager, ThemeManager, AudioManager, SlotHelper, ScoreManager)
  scenes/                 # Phaser scenes (MenuScene, GameScene)
  ai/                     # AI strategies (Easy, Random, Hard)
  utils/                  # Utilities (EventBus)
public/
  assets/themes/classic/  # Default theme (tiles, backgrounds, sounds, theme.json)
```

## Technology Stack

- **Engine:** Phaser 3.80+
- **Language:** TypeScript 5.x (strict mode)
- **Bundler:** Vite 6.x
- **State:** Phaser scene data + central GameState class
