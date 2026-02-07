import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { Domino } from '../models/Domino';
import { DeckManager } from '../managers/DeckManager';
import { SlotHelper, SlotPosition } from '../managers/SlotHelper';
import { themeManager } from '../managers/ThemeManager';
import { audioManager } from '../managers/AudioManager';
import { EventBus } from '../utils/EventBus';
import { createStrategy, TileChoice } from '../ai/AIStrategy';

interface TileSprite {
  container: Phaser.GameObjects.Container;
  faceSprite: Phaser.GameObjects.Image;
  backSprite: Phaser.GameObjects.Image;
  lockOverlay: Phaser.GameObjects.Rectangle;
  glowGraphics: Phaser.GameObjects.Graphics;
  shadowGraphics: Phaser.GameObjects.Rectangle;
  domino: Domino;
  handX: number;
  handY: number;
  showingFace: boolean;
}

const TILE_WIDTH = 60;
const TILE_HEIGHT = 120;
const AI_SCALE = 0.5;
const BOARD_CENTER_X = 480;
const BOARD_CENTER_Y = 260;

export class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private deckManager!: DeckManager;
  private slotHelper!: SlotHelper;
  private eventBus!: EventBus;
  private difficulty = 1;

  private tileSprites: Map<number, TileSprite> = new Map();
  private ghostSlots: Phaser.GameObjects.Graphics[] = [];
  private boardContainer!: Phaser.GameObjects.Container;

  private turnText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private passButton!: Phaser.GameObjects.Container;
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private thinkingText!: Phaser.GameObjects.Text;

  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  private glowTweens: Phaser.Tweens.Tween[] = [];
  private aiTimerEvent: Phaser.Time.TimerEvent | null = null;
  private thinkingDotsTimer: Phaser.Time.TimerEvent | null = null;
  private thinkingDotCount = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { difficulty?: number }): void {
    this.difficulty = data.difficulty ?? 1;
  }

  preload(): void {
    // Load tile images
    for (let i = 0; i < 28; i++) {
      const key = `tile_${i}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, themeManager.getTileImagePath(i));
      }
    }

    // Tile back loaded in create() - procedural fallback if file missing

    // Load backgrounds
    if (!this.textures.exists('game-bg')) {
      this.load.image('game-bg', themeManager.getBackgroundPath('game'));
    }

    // Load sounds from theme
    const soundKeys = ['tilePlace', 'tilePickup', 'tileDeal', 'pass', 'gameStart', 'gameOver', 'buttonClick', 'gameWin', 'gameLose'];
    for (const key of soundKeys) {
      const path = themeManager.getSoundPath(key);
      if (path && !this.cache.audio.exists(`sound_${key}`)) {
        this.load.audio(`sound_${key}`, path);
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;

    this.eventBus = new EventBus();
    this.gameState = new GameState(this.difficulty);
    this.deckManager = new DeckManager();
    this.slotHelper = new SlotHelper(this.gameState.board);

    // Initialize audio
    audioManager.init(this);

    // Generate tile-back texture if missing
    if (!this.textures.exists('tile-back')) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0x8B4513, 1);
      gfx.fillRoundedRect(0, 0, TILE_WIDTH, TILE_HEIGHT, 4);
      gfx.lineStyle(2, 0x654321, 1);
      gfx.strokeRoundedRect(1, 1, TILE_WIDTH - 2, TILE_HEIGHT - 2, 4);
      // Diamond pattern
      gfx.lineStyle(1, 0x6B3410, 0.5);
      for (let i = 0; i < 5; i++) {
        const cx = TILE_WIDTH / 2;
        const cy = TILE_HEIGHT / 2;
        const s = 8 + i * 8;
        gfx.strokeRect(cx - s / 2, cy - s / 2, s, s);
      }
      gfx.generateTexture('tile-back', TILE_WIDTH, TILE_HEIGHT);
      gfx.destroy();
    }

    // Background
    if (this.textures.exists('game-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'game-bg');
      bg.setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#1B5E20');
    }

    // Board container for placed tiles
    this.boardContainer = this.add.container(0, 0);

    // UI elements
    this.createUI();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Start dealing after fade + 1s pause
    this.time.delayedCall(1500, () => {
      this.dealTiles();
    });
  }

  private createUI(): void {
    const { width } = this.scale;
    const colors = themeManager.getColors();

    // Turn indicator
    this.turnText = this.add.text(width / 2, 30, '', {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: colors.textColor,
    }).setOrigin(0.5).setDepth(100);

    // Center message
    this.messageText = this.add.text(width / 2, 300, '', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      fontStyle: 'bold',
      color: colors.textColor,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 6,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // AI thinking indicator
    this.thinkingText = this.add.text(width / 2, 60, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#AAAAAA',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Score displays
    this.createScoreDisplays();

    // Pass button
    this.createPassButton();

    // Menu (hamburger) button
    this.createMenuButton();
  }

  private createScoreDisplays(): void {
    const colors = themeManager.getColors();
    const positions = [
      { x: 480, y: 570 },   // Player (bottom)
      { x: 30, y: 300 },    // Left AI
      { x: 480, y: 12 },    // Top AI
      { x: 930, y: 300 },   // Right AI
    ];

    this.scoreTexts = [];
    for (let i = 0; i < 4; i++) {
      const pos = positions[i]!;
      this.add.rectangle(pos.x, pos.y, 80, 24, 0x000000, 0.5)
        .setOrigin(0.5).setDepth(100);

      const text = this.add.text(pos.x, pos.y, 'Score: 0', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: colors.scoreColor,
      }).setOrigin(0.5).setDepth(101);

      this.scoreTexts.push(text);
    }

    this.eventBus.on('scoreChange', (playerIndex: unknown, newScore: unknown) => {
      const idx = playerIndex as number;
      const score = newScore as number;
      const scoreText = this.scoreTexts[idx];
      if (scoreText) {
        scoreText.setText(`Score: ${score}`);
        this.tweens.add({
          targets: scoreText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 150,
          yoyo: true,
          ease: 'Power2',
        });
      }
    });
  }

  private createPassButton(): void {
    const passRect = this.add.rectangle(0, 0, 120, 50, 0xD32F2F)
      .setInteractive({ useHandCursor: true });
    const passLabel = this.add.text(0, 0, 'Pass', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.passButton = this.add.container(880, 540, [passRect, passLabel]);
    this.passButton.setDepth(100);
    this.passButton.setVisible(false);

    passRect.on('pointerdown', () => {
      // Only respond if button is active (full opacity)
      if (this.passButton.alpha < 0.9) return;
      this.handlePass();
    });
  }

  private setPassButtonEnabled(enabled: boolean): void {
    this.passButton.setVisible(true);
    if (enabled) {
      this.passButton.setAlpha(1);
    } else {
      this.passButton.setAlpha(0.5);
    }
  }

  private createMenuButton(): void {
    const { width } = this.scale;
    const menuBtn = this.add.container(width - 35, 35);
    menuBtn.setDepth(150);

    const bg = this.add.rectangle(0, 0, 50, 50, 0x4E342E, 0.8)
      .setInteractive({ useHandCursor: true });
    menuBtn.add(bg);

    // Hamburger lines
    for (let i = -1; i <= 1; i++) {
      const line = this.add.rectangle(0, i * 8, 24, 3, 0xFFFFFF);
      menuBtn.add(line);
    }

    bg.on('pointerdown', () => {
      if (this.pauseOverlay) {
        this.resumeGame();
      } else {
        this.showPauseMenu();
      }
    });
  }

  private showPauseMenu(): void {
    if (this.paused) return;
    this.paused = true;

    const { width, height } = this.scale;

    // Overlay background
    const overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();

    // Popup panel
    const panelBg = this.add.rectangle(0, 0, 280, 250, 0x3E2723);
    panelBg.setStrokeStyle(3, 0x5D4037);

    const title = this.add.text(0, -80, 'Paused', {
      fontFamily: 'Georgia',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    const resumeBtn = this.createPauseButton(0, -20, 'Resume', () => this.resumeGame());
    const restartBtn = this.createPauseButton(0, 30, 'Restart', () => this.restartGame());
    const menuBtn = this.createPauseButton(0, 80, 'Main Menu', () => this.goToMenu());

    this.pauseOverlay = this.add.container(width / 2, height / 2, [
      panelBg, title, ...resumeBtn, ...restartBtn, ...menuBtn,
    ]);
    this.pauseOverlay.setDepth(300);

    // Click outside to close
    overlayBg.on('pointerdown', () => {
      this.resumeGame();
    });

    // Store overlay bg for cleanup
    this.pauseOverlay.setData('overlayBg', overlayBg);
  }

  private createPauseButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.GameObject[] {
    const bg = this.add.rectangle(x, y, 180, 40, 0x4E342E)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x6D4C41);

    const label = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      audioManager.playSound('buttonClick');
      onClick();
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x6D4C41);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x4E342E);
    });

    return [bg, label];
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;

    if (this.pauseOverlay) {
      const overlayBg = this.pauseOverlay.getData('overlayBg') as Phaser.GameObjects.Rectangle;
      overlayBg?.destroy();
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  private restartGame(): void {
    this.cleanupScene();
    this.scene.restart({ difficulty: this.difficulty });
  }

  private goToMenu(): void {
    this.cleanupScene();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }

  private cleanupScene(): void {
    this.paused = false;
    this.glowTweens.forEach(t => t.destroy());
    this.glowTweens = [];
    if (this.aiTimerEvent) {
      this.aiTimerEvent.destroy();
      this.aiTimerEvent = null;
    }
    if (this.thinkingDotsTimer) {
      this.thinkingDotsTimer.destroy();
      this.thinkingDotsTimer = null;
    }
    this.eventBus.removeAll();
    this.tileSprites.clear();
    this.ghostSlots = [];
    if (this.pauseOverlay) {
      const overlayBg = this.pauseOverlay.getData('overlayBg') as Phaser.GameObjects.Rectangle | undefined;
      overlayBg?.destroy();
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  // --- Tile dealing ---

  private dealTiles(): void {
    const tiles = this.deckManager.generateTileSet(this.gameState.tileConfig);
    const tilesPerPlayer = DeckManager.getTilesPerPlayer(this.gameState.tileConfig, 4);
    const hands = this.deckManager.distributeTiles(this.gameState.players, tilesPerPlayer);

    // Create tile sprites at center
    const allTiles = tiles;
    for (const tile of allTiles) {
      this.createTileSprite(tile, BOARD_CENTER_X, BOARD_CENTER_Y);
    }

    // Animate tiles to hands with stagger
    let delay = 0;
    const stagger = 200;
    const flyDuration = 1000;

    for (let p = 0; p < 4; p++) {
      const hand = hands[p]!;
      const positions = this.getHandPositions(p, hand.length);

      for (let t = 0; t < hand.length; t++) {
        const tile = hand[t]!;
        const pos = positions[t]!;
        const tileSprite = this.tileSprites.get(tile.id);
        if (!tileSprite) continue;

        tileSprite.handX = pos.x;
        tileSprite.handY = pos.y;

        this.time.delayedCall(delay, () => {
          audioManager.playSound('tileDeal');

          this.tweens.add({
            targets: tileSprite.container,
            x: pos.x,
            y: pos.y,
            rotation: pos.rotation,
            scaleX: pos.scale,
            scaleY: pos.scale,
            duration: flyDuration,
            ease: 'Power2',
            onComplete: () => {
              // Player tiles show face after arriving
              if (p === 0) {
                this.showTileFace(tileSprite);
              }
            },
          });
        });

        delay += stagger;
      }
    }

    // After all tiles are dealt
    this.time.delayedCall(delay + flyDuration + 200, () => {
      this.showMessage('Game Started', 1000);
      audioManager.playSound('gameStart');
      this.eventBus.emit('gameStart');

      // Select random starting player
      this.gameState.currentTurn = Math.floor(Math.random() * 4);

      this.time.delayedCall(1200, () => {
        this.startTurn();
      });
    });
  }

  private getHandPositions(playerIndex: number, tileCount: number): { x: number; y: number; rotation: number; scale: number }[] {
    const positions: { x: number; y: number; rotation: number; scale: number }[] = [];
    const { width, height } = this.scale;

    switch (playerIndex) {
      case 0: { // Player (bottom)
        const spacing = Math.min(70, (width - 200) / tileCount);
        const startX = width / 2 - (spacing * (tileCount - 1)) / 2;
        for (let i = 0; i < tileCount; i++) {
          positions.push({ x: startX + i * spacing, y: height - 70, rotation: 0, scale: 1 });
        }
        break;
      }
      case 1: { // Left AI
        const spacing = Math.min(40, (height - 200) / tileCount);
        const startY = height / 2 - (spacing * (tileCount - 1)) / 2;
        for (let i = 0; i < tileCount; i++) {
          positions.push({ x: 45, y: startY + i * spacing, rotation: Math.PI / 2, scale: AI_SCALE });
        }
        break;
      }
      case 2: { // Top AI
        const spacing = Math.min(40, (width - 200) / tileCount);
        const startX = width / 2 - (spacing * (tileCount - 1)) / 2;
        for (let i = 0; i < tileCount; i++) {
          positions.push({ x: startX + i * spacing, y: 45, rotation: 0, scale: AI_SCALE });
        }
        break;
      }
      case 3: { // Right AI
        const spacing = Math.min(40, (height - 200) / tileCount);
        const startY = height / 2 - (spacing * (tileCount - 1)) / 2;
        for (let i = 0; i < tileCount; i++) {
          positions.push({ x: width - 45, y: startY + i * spacing, rotation: Math.PI / 2, scale: AI_SCALE });
        }
        break;
      }
    }

    return positions;
  }

  private createTileSprite(domino: Domino, x: number, y: number): TileSprite {
    const faceKey = `tile_${domino.id}`;
    const faceSprite = this.add.image(0, 0, faceKey).setVisible(false);
    faceSprite.setDisplaySize(TILE_WIDTH, TILE_HEIGHT);

    const backSprite = this.add.image(0, 0, 'tile-back');
    backSprite.setDisplaySize(TILE_WIDTH, TILE_HEIGHT);

    const lockOverlay = this.add.rectangle(0, 0, TILE_WIDTH, TILE_HEIGHT, 0x000000, 0)
      .setVisible(false);

    const glowGraphics = this.add.graphics();

    // Drop shadow (hidden by default, shown during drag)
    const shadowGraphics = this.add.rectangle(3, 5, TILE_WIDTH, TILE_HEIGHT, 0x000000, 0.3)
      .setVisible(false);

    const container = this.add.container(x, y, [
      shadowGraphics,
      glowGraphics,
      faceSprite,
      backSprite,
      lockOverlay,
    ]);
    container.setSize(TILE_WIDTH, TILE_HEIGHT);
    container.setDepth(10);

    const tileSprite: TileSprite = {
      container,
      faceSprite,
      backSprite,
      lockOverlay,
      glowGraphics,
      shadowGraphics,
      domino,
      handX: x,
      handY: y,
      showingFace: false,
    };

    this.tileSprites.set(domino.id, tileSprite);
    return tileSprite;
  }

  private showTileFace(tileSprite: TileSprite): void {
    tileSprite.faceSprite.setVisible(true);
    tileSprite.backSprite.setVisible(false);
    tileSprite.showingFace = true;
  }

  // --- Turn management ---

  private startTurn(): void {
    if (this.gameState.gameOver || this.paused) return;

    const player = this.gameState.currentPlayer;
    this.eventBus.emit('turnStart', this.gameState.currentTurn);

    if (this.gameState.isHumanTurn) {
      this.turnText.setText('Your Turn');
      this.enablePlayerTurn();
    } else {
      this.turnText.setText(`${player.name}'s Turn`);
      this.lockAllPlayerTiles();
      this.passButton.setVisible(false);
      this.startAITurn();
    }
  }

  private enablePlayerTurn(): void {
    const board = this.gameState.board;

    if (!board.started) {
      // First move: all tiles are valid
      this.enableAllPlayerTiles();
      this.setPassButtonEnabled(false);
      return;
    }

    const validTiles = this.gameState.humanPlayer.getValidTiles(
      board.leftBranchNum,
      board.rightBranchNum,
    );

    if (validTiles.length === 0) {
      // Must pass
      this.lockAllPlayerTiles();
      this.setPassButtonEnabled(true);
      return;
    }

    this.setPassButtonEnabled(false);

    // Highlight valid tiles, dim invalid ones
    for (const tile of this.gameState.humanPlayer.tiles) {
      const sprite = this.tileSprites.get(tile.id);
      if (!sprite) continue;

      const isValid = validTiles.some(v => v.id === tile.id);
      if (isValid) {
        this.enableTileDrag(sprite);
        this.setTileGlow(sprite, true);
      } else {
        this.setTileLocked(sprite, true);
      }
    }
  }

  private enableAllPlayerTiles(): void {
    for (const tile of this.gameState.humanPlayer.tiles) {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        this.enableTileDrag(sprite);
        this.setTileGlow(sprite, true);
      }
    }
  }

  private lockAllPlayerTiles(): void {
    for (const tile of this.gameState.humanPlayer.tiles) {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        this.disableTileDrag(sprite);
        this.setTileGlow(sprite, false);
        this.setTileLocked(sprite, true);
      }
    }
  }

  private setTileGlow(tileSprite: TileSprite, enabled: boolean): void {
    const gfx = tileSprite.glowGraphics;
    gfx.clear();

    if (enabled) {
      const colors = themeManager.getColors();
      const color = Phaser.Display.Color.HexStringToColor(colors.highlightColor).color;
      gfx.lineStyle(3, color, 0.6);
      gfx.strokeRoundedRect(-TILE_WIDTH / 2 - 3, -TILE_HEIGHT / 2 - 3, TILE_WIDTH + 6, TILE_HEIGHT + 6, 4);

      const tween = this.tweens.add({
        targets: gfx,
        alpha: { from: 0.3, to: 0.8 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
      this.glowTweens.push(tween);
    }
  }

  private setTileLocked(tileSprite: TileSprite, locked: boolean): void {
    if (locked) {
      tileSprite.lockOverlay.setVisible(true);
      tileSprite.lockOverlay.setFillStyle(0x000000, 0.5);
      tileSprite.container.setAlpha(0.4);
    } else {
      tileSprite.lockOverlay.setVisible(false);
      tileSprite.container.setAlpha(1);
    }
  }

  // --- Drag and drop ---

  private enableTileDrag(tileSprite: TileSprite): void {
    const container = tileSprite.container;
    container.setInteractive(
      new Phaser.Geom.Rectangle(-TILE_WIDTH / 2, -TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(container);
    this.setTileLocked(tileSprite, false);

    container.off('dragstart');
    container.off('drag');
    container.off('dragend');

    container.on('dragstart', () => {
      this.onDragStart(tileSprite);
    });

    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on('dragend', () => {
      this.onDragEnd(tileSprite);
    });
  }

  private disableTileDrag(tileSprite: TileSprite): void {
    tileSprite.container.removeInteractive();
  }

  private onDragStart(tileSprite: TileSprite): void {
    tileSprite.container.setDepth(500);
    tileSprite.container.setScale(1.1);
    tileSprite.shadowGraphics.setVisible(true);

    audioManager.playSound('tilePickup');

    // Haptic feedback
    try {
      navigator.vibrate?.(20);
    } catch {
      // Not supported
    }

    // Show ghost slots
    this.showGhostSlots(tileSprite.domino);
  }

  private onDragEnd(tileSprite: TileSprite): void {
    tileSprite.shadowGraphics.setVisible(false);
    const { height } = this.scale;
    const threshold = height * (2 / 3); // 1/3 from top = 2/3 from bottom

    if (tileSprite.container.y < threshold && this.ghostSlots.length > 0) {
      // Try to place tile (find nearest before clearing)
      const slot = this.findNearestSlot(tileSprite);
      this.clearGhostSlots();
      if (slot) {
        this.placeTile(tileSprite, slot);
        return;
      }
    } else {
      this.clearGhostSlots();
    }

    // Return to hand
    tileSprite.container.setDepth(10);
    this.tweens.add({
      targets: tileSprite.container,
      x: tileSprite.handX,
      y: tileSprite.handY,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Power2',
    });
  }

  private showGhostSlots(domino: Domino): void {
    this.clearGhostSlots();
    const board = this.gameState.board;
    const colors = themeManager.getColors();
    const color = Phaser.Display.Color.HexStringToColor(colors.validSlotColor).color;

    const branches: ('left' | 'right')[] = ['left', 'right'];

    for (const branch of branches) {
      if (!board.started || board.canPlaceOnBranch(domino, branch)) {
        const slotPos = this.slotHelper.getSlotPosition(board, domino, branch, BOARD_CENTER_X, BOARD_CENTER_Y);
        const gfx = this.add.graphics();
        gfx.fillStyle(color, 0.4);

        const w = slotPos.standing ? TILE_WIDTH : TILE_HEIGHT;
        const h = slotPos.standing ? TILE_HEIGHT : TILE_WIDTH;
        gfx.fillRoundedRect(slotPos.x - w / 2, slotPos.y - h / 2, w, h, 4);
        gfx.setDepth(5);

        gfx.setData('slotPosition', slotPos);
        this.ghostSlots.push(gfx);
      }
    }
  }

  private clearGhostSlots(): void {
    for (const gfx of this.ghostSlots) {
      gfx.destroy();
    }
    this.ghostSlots = [];
  }

  private findNearestSlot(tileSprite: TileSprite): SlotPosition | null {
    let nearest: SlotPosition | null = null;
    let minDist = Infinity;

    for (const gfx of this.ghostSlots) {
      const slotPos = gfx.getData('slotPosition') as SlotPosition;
      const dx = tileSprite.container.x - slotPos.x;
      const dy = tileSprite.container.y - slotPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        nearest = slotPos;
      }
    }

    return nearest;
  }

  // --- Tile placement ---

  private placeTile(tileSprite: TileSprite, slot: SlotPosition): void {
    audioManager.playSound('tilePlace');

    // Animate to slot
    this.tweens.add({
      targets: tileSprite.container,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation * (Math.PI / 180),
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.finalizePlacement(tileSprite, slot);
      },
    });
  }

  private finalizePlacement(tileSprite: TileSprite, slot: SlotPosition): void {
    tileSprite.container.setDepth(8);
    this.boardContainer.add(tileSprite.container);

    // Update board state
    this.slotHelper.confirmOccupation(this.gameState.board, tileSprite.domino, slot.branch);
    this.slotHelper.confirmMoving(this.gameState.board, tileSprite.domino, slot.branch);
    this.gameState.board.addPlacedTile(tileSprite.domino, slot.x, slot.y, slot.rotation, slot.branch);

    // Remove from player hand
    const playerIndex = this.gameState.currentTurn;
    const player = this.gameState.players[playerIndex]!;
    player.removeTile(tileSprite.domino.id);
    tileSprite.domino.available = false;

    // Disable interaction
    this.disableTileDrag(tileSprite);
    this.setTileGlow(tileSprite, false);
    this.setTileLocked(tileSprite, false);

    // Update last active player
    this.gameState.lastActivePlayer = playerIndex;

    // Clear glow tweens
    this.glowTweens.forEach(t => t.destroy());
    this.glowTweens = [];

    // Re-center remaining hand tiles
    this.repositionHand(playerIndex);

    // Emit event
    this.eventBus.emit('tilePlace', tileSprite.domino, slot.branch);

    // Check win
    if (player.isEmpty) {
      this.endGame(playerIndex);
      return;
    }

    // Next turn
    this.gameState.advanceTurn();
    this.eventBus.emit('turnEnd', playerIndex);

    this.time.delayedCall(300, () => {
      this.startTurn();
    });
  }

  private repositionHand(playerIndex: number): void {
    const player = this.gameState.players[playerIndex]!;
    const positions = this.getHandPositions(playerIndex, player.tiles.length);

    for (let i = 0; i < player.tiles.length; i++) {
      const tile = player.tiles[i]!;
      const sprite = this.tileSprites.get(tile.id);
      const pos = positions[i];
      if (!sprite || !pos) continue;

      sprite.handX = pos.x;
      sprite.handY = pos.y;

      this.tweens.add({
        targets: sprite.container,
        x: pos.x,
        y: pos.y,
        duration: 300,
        ease: 'Power2',
      });
    }
  }

  // --- Pass handling ---

  private handlePass(): void {
    if (this.gameState.gameOver) return;

    audioManager.playSound('pass');
    this.passButton.setVisible(false);

    // Award point to last active player
    if (this.gameState.lastActivePlayer >= 0) {
      const scorer = this.gameState.players[this.gameState.lastActivePlayer]!;
      scorer.score += 1;
      this.eventBus.emit('scoreChange', this.gameState.lastActivePlayer, scorer.score);
    }

    this.showMessage('Pass', 1000);
    this.eventBus.emit('pass', this.gameState.currentTurn);

    // Check for Fish
    if (this.checkFish()) {
      return;
    }

    // Next turn
    this.gameState.advanceTurn();
    this.eventBus.emit('turnEnd', this.gameState.currentTurn);

    this.time.delayedCall(1200, () => {
      this.startTurn();
    });
  }

  private checkFish(): boolean {
    if (this.gameState.lastActivePlayer === this.gameState.currentTurn) {
      // This means we came all the way around
      return false; // Can't be fish on the player who just placed
    }

    // Check if after this pass, the turn would cycle back to lastActivePlayer
    // with all intervening players also passing
    // This is detected naturally by tracking passes
    // For now, let the turn cycle handle it - Fish is detected when
    // currentTurn wraps back to lastActivePlayer
    let nextTurn = (this.gameState.currentTurn + 1) % 4;
    while (nextTurn !== this.gameState.lastActivePlayer) {
      const nextPlayer = this.gameState.players[nextTurn]!;
      const board = this.gameState.board;
      if (nextPlayer.hasValidMoves(board.leftBranchNum, board.rightBranchNum)) {
        return false; // Someone can still play
      }
      nextTurn = (nextTurn + 1) % 4;
    }

    // Check if lastActivePlayer can play
    const lastPlayer = this.gameState.players[this.gameState.lastActivePlayer]!;
    const board = this.gameState.board;
    if (!lastPlayer.hasValidMoves(board.leftBranchNum, board.rightBranchNum)) {
      // True Fish - nobody can play
      this.endGame(-1); // -1 indicates Fish
      return true;
    }

    return false;
  }

  // --- AI ---

  private startAITurn(): void {
    if (this.gameState.gameOver || this.paused) return;

    const playerIndex = this.gameState.currentTurn;
    const player = this.gameState.players[playerIndex]!;
    const board = this.gameState.board;

    // Show thinking indicator with animated dots
    const baseName = player.name;
    this.thinkingDotCount = 0;
    this.thinkingText.setText(`${baseName} is thinking`);
    this.thinkingText.setAlpha(1);

    if (this.thinkingDotsTimer) {
      this.thinkingDotsTimer.destroy();
    }
    this.thinkingDotsTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.thinkingDotCount = (this.thinkingDotCount + 1) % 4;
        const dots = '.'.repeat(this.thinkingDotCount);
        this.thinkingText.setText(`${baseName} is thinking${dots}`);
      },
    });

    const thinkTime = 500 + Math.random() * 2500; // 0.5-3.0 seconds

    this.aiTimerEvent = this.time.delayedCall(thinkTime, () => {
      if (this.paused || this.gameState.gameOver) return;

      this.thinkingText.setAlpha(0);
      if (this.thinkingDotsTimer) {
        this.thinkingDotsTimer.destroy();
        this.thinkingDotsTimer = null;
      }

      if (!board.started) {
        // First move: play a random tile
        const randomTile = player.tiles[Math.floor(Math.random() * player.tiles.length)]!;
        this.executeAIMove({
          tile: randomTile,
          branch: 'right',
        }, playerIndex);
        return;
      }

      const matchingTiles = this.slotHelper.getMatchingTiles(
        player.tiles,
        board.leftBranchNum,
        board.rightBranchNum,
      );

      if (matchingTiles.length === 0) {
        // AI must pass
        this.handleAIPass(playerIndex);
        return;
      }

      const strategy = createStrategy(this.difficulty);
      const choice = strategy.selectTile(this.gameState, playerIndex, matchingTiles);

      if (choice) {
        this.executeAIMove(choice, playerIndex);
      } else {
        // Strategy decided to pass (Easy mode voluntary pass)
        this.handleAIPass(playerIndex);
      }
    });
  }

  private executeAIMove(choice: TileChoice, _playerIndex: number): void {
    const tileSprite = this.tileSprites.get(choice.tile.id);
    if (!tileSprite) return;

    // Flip tile from back to face
    this.tweens.add({
      targets: tileSprite.container,
      scaleX: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.showTileFace(tileSprite);
        this.tweens.add({
          targets: tileSprite.container,
          scaleX: 1,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            // Calculate slot position
            const slot = this.slotHelper.getSlotPosition(
              this.gameState.board,
              choice.tile,
              choice.branch,
              BOARD_CENTER_X,
              BOARD_CENTER_Y,
            );

            this.placeTile(tileSprite, slot);
          },
        });
      },
    });
  }

  private handleAIPass(playerIndex: number): void {
    audioManager.playSound('pass');
    this.showMessage('Pass', 1000);
    this.eventBus.emit('pass', playerIndex);

    // Award point
    if (this.gameState.lastActivePlayer >= 0) {
      const scorer = this.gameState.players[this.gameState.lastActivePlayer]!;
      scorer.score += 1;
      this.eventBus.emit('scoreChange', this.gameState.lastActivePlayer, scorer.score);
    }

    // Check fish
    if (this.checkFish()) return;

    // Next turn
    this.gameState.advanceTurn();
    this.eventBus.emit('turnEnd', playerIndex);

    this.time.delayedCall(1200, () => {
      this.startTurn();
    });
  }

  // --- Game over ---

  private endGame(winnerIndex: number): void {
    this.gameState.gameOver = true;

    // Lock everything
    this.lockAllPlayerTiles();
    this.passButton.setVisible(false);
    this.thinkingText.setAlpha(0);
    if (this.thinkingDotsTimer) {
      this.thinkingDotsTimer.destroy();
      this.thinkingDotsTimer = null;
    }

    let message: string;
    if (winnerIndex === -1) {
      message = 'Fish - Game Over';
      audioManager.playSound('gameOver');
    } else if (winnerIndex === 0) {
      message = 'You win!';
      audioManager.playSound('gameWin');
    } else {
      const winner = this.gameState.players[winnerIndex]!;
      message = `${winner.name} wins!`;
      audioManager.playSound('gameLose');
    }

    this.eventBus.emit('gameOver', winnerIndex);

    // Dramatic entrance animation
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.messageText.setScale(0);

    this.tweens.add({
      targets: this.messageText,
      scaleX: 1,
      scaleY: 1,
      duration: 1000,
      ease: 'Bounce.easeOut',
    });

    this.turnText.setText('Game Over');
  }

  // --- Messages ---

  private showMessage(text: string, duration: number): void {
    this.messageText.setText(text);
    this.messageText.setScale(1);

    this.tweens.add({
      targets: this.messageText,
      alpha: 1,
      duration: 300,
      hold: duration,
      yoyo: true,
      ease: 'Power2',
    });
  }
}
