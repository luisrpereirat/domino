# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Domino Royale -- a client-side 2D domino game. Human player vs 3 AI opponents around a virtual table. Double-six set (28 tiles), drag-and-drop placement, three AI difficulty levels (Easy, Random, Hard), JSON-based swappable themes. No backend, no database -- fully client-side.

The complete specification lives in `app_spec.txt`. It is the authoritative contract for all features.

## Technology Stack

- **Engine:** Phaser 3.80+ (rendering, input, tweens, audio)
- **Language:** TypeScript 5.x (strict mode)
- **Bundler:** Vite 6.x
- **Styling:** Minimal CSS for HTML overlay; all game UI inside Phaser canvas
- **State:** Phaser scene data + central `GameState` TypeScript class (no external state library)
- **Routing:** None -- single-page app with Phaser scene transitions (MenuScene, GameScene)

## Build and Dev Commands

Once the project is initialized (via `init.sh` or manual setup):

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (port 5173 only)
npm run build        # production build
npm run preview      # preview production build
```

## Project Structure (Target)

```
public/assets/themes/classic/   # pre-built theme assets (tiles, backgrounds, sounds)
  theme.json                    # theme config (colors, asset paths, sound mappings)
  tiles/0-27.png                # 28 domino tile face images
  tile-back.png, table-bg.png, menu-bg.png, game-bg.png, button.png, popup.png, etc.
  sounds/                       # audio files (empty -- to be created)
src/                            # game source code (to be created)
app_spec.txt                    # complete specification (read-only contract)
feature_list.json               # 200+ test cases with pass/fail tracking
claude-progress.txt             # session continuity notes
init.sh                         # environment setup script
```

## Autonomous Session Workflow

This project uses a multi-session autonomous build process defined in `prompts/`:

1. **Session 1** (`prompts/initializer_prompt.md`): Create `feature_list.json` (200+ tests), `init.sh`, git repo, project scaffold, optionally begin implementing.
2. **Session 2+** (`prompts/coding_prompt.md`): Orient -> regress-test -> pick one failing feature -> implement -> verify via browser automation -> commit -> update progress.

## Critical Rules

- **feature_list.json is append-only.** Only modify `passes` and `screenshots` fields. Never remove, reorder, or edit test descriptions or steps.
- **Verify via browser automation.** All features must be tested through actual UI interaction (click, type, drag) with screenshots. Not curl, not JS evaluation.
- **One feature per session.** Implement completely, verify, commit. Depth over breadth.
- **Regression before new work.** Re-test 1-2 passing features each session before starting new implementation.
- **Clean exits.** Every session ends committed, progress updated, app working.

## Architecture (from app_spec.txt)

### Core Data Models

- **Domino:** `{ id, topIndex, bottomIndex, available }` -- 28 tiles, IDs 0-27
- **BoardState:** Two-branch system tracking `rightBranchNum`, `leftBranchNum`, phases (0-4), horizontal/vertical offsets
- **GameState:** `currentTurn`, `lastActivePlayer`, `scores`, `gameOver`, `difficulty`
- **DeckManager:** Creates all 28 tiles, manages 4 hand arrays

### Board Placement Algorithm (5-phase, two-branch)

Ported from a C# SlotHelper. Each branch grows outward from center:
- Phase 0: Horizontal expansion outward
- Phase 1: First corner (turn down/up at side limit = 13 tile units)
- Phase 2: Cross-direction turn
- Phase 3: End corner
- Phase 4+: Reversed horizontal expansion

Standing tiles (doubles) offset by 1 unit; lying tiles (non-doubles) offset by 2 units. Vertical shifts of 1.5 units at corners.

### AI System

- **Random (difficulty 1):** Pick any valid matching tile
- **Hard (difficulty 2):** Classify tiles as "good" (helps next player) or "bad" (blocks them); play strategically based on turn position
- **Easy (difficulty 0):** Help the human player; avoid forcing passes; prefer non-double good tiles

### Theme System

Themes live at `public/assets/themes/{name}/`. Each theme is self-contained:
- `theme.json` defines colors, asset paths, sound mappings
- All asset references in code go through the theme system -- no hardcoded paths
- Non-developers can create themes by copying a folder and swapping images

### Scenes

- **MenuScene:** Title, difficulty buttons (Easy/Random/Hard), theme selector, mute toggle
- **GameScene:** Board (700x400px center), player hand (bottom), 3 AI hands (left/top/right at 0.5x scale, face down), scores, turn indicator, pass button, menu button
- **Pause overlay:** Resume, Restart, Main Menu

### Key Dimensions

- Base resolution: 960x600, FIT scaling
- Tile size: 60x120px at base scale; AI tiles at 0.5x
- Drag threshold: 1/3 screen height
- Animation timings: 0.5s placement, 1.0s dealing, 0.2s stagger between dealt tiles
- AI thinking delay: random 0.5-3.0s

## Design System

- Table: #1B5E20 (dark green felt)
- Valid slot: #FFD700 (gold) at 40% opacity
- Active tile glow: #4FC3F7 (light blue)
- Text: #FFFFFF, scores: #FFD700
- Buttons: #4E342E background, #6D4C41 hover
- Fonts: Georgia (headings), Arial/system sans-serif (UI)
