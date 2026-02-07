import Phaser from 'phaser';
import { themeManager } from '../managers/ThemeManager';
import { audioManager } from '../managers/AudioManager';

// Known themes - add entries here when creating new themes
const AVAILABLE_THEMES = ['classic', 'ocean'];

export class MenuScene extends Phaser.Scene {
  private themeLoaded = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(): void {
    this.themeLoaded = false;
  }

  preload(): void {
    const themeIndex = this.registry.get('themeIndex') ?? 0;
    const themeName = AVAILABLE_THEMES[themeIndex] ?? 'classic';

    // Load theme JSON, then queue Phaser asset loads
    themeManager.loadTheme(themeName).then(() => {
      this.themeLoaded = true;

      // Remove old textures so new theme assets load fresh
      if (this.textures.exists('menu-bg')) this.textures.remove('menu-bg');

      this.load.image('menu-bg', themeManager.getBackgroundPath('menu'));
      this.load.image('button-img', themeManager.getAssetPath('button.png'));

      const btnClickPath = themeManager.getSoundPath('buttonClick');
      if (btnClickPath && !this.cache.audio.exists('sound_buttonClick')) {
        this.load.audio('sound_buttonClick', btnClickPath);
      }

      this.load.start(); // Trigger the queued loads
    }).catch((err) => {
      console.error('Failed to load theme:', err);
      this.themeLoaded = true; // Allow create to run with fallback
      this.load.start();
    });
  }

  create(): void {
    // If theme hasn't loaded yet, wait for it
    if (!this.themeLoaded) {
      this.time.delayedCall(100, () => this.create());
      return;
    }

    const { width, height } = this.scale;

    // Background
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      bg.setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#0D2818');
    }

    // Title
    this.add.text(width / 2, height * 0.2, "Quarzen's Domino", {
      fontFamily: 'Georgia',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    }).setOrigin(0.5);

    // Difficulty buttons
    const buttonY = height * 0.45;
    const buttonSpacing = 70;

    this.createButton(width / 2, buttonY, 'Easy', () => this.startGame(0));
    this.createButton(width / 2, buttonY + buttonSpacing, 'Random', () => this.startGame(1));
    this.createButton(width / 2, buttonY + buttonSpacing * 2, 'Hard', () => this.startGame(2));

    // Rules button
    this.createButton(width / 2, buttonY + buttonSpacing * 3 + 10, 'Rules', () => this.showRules());

    // Mute toggle
    const muteText = audioManager.isMuted ? 'Sound: OFF' : 'Sound: ON';
    const muteBtn = this.add.text(width - 20, 20, muteText, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#4E342E',
      padding: { x: 12, y: 12 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    muteBtn.on('pointerdown', () => {
      audioManager.toggleMute();
      muteBtn.setText(audioManager.isMuted ? 'Sound: OFF' : 'Sound: ON');
    });

    // Theme selector (only shown if multiple themes exist)
    if (AVAILABLE_THEMES.length > 1) {
      let themeName = 'Classic';
      try {
        themeName = themeManager.getTheme().name;
      } catch {
        // Theme not loaded, use default
      }
      const themeLabel = this.add.text(20, 20, `Theme: ${themeName}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#4E342E',
        padding: { x: 12, y: 12 },
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

      themeLabel.on('pointerdown', () => {
        const currentIndex = this.registry.get('themeIndex') ?? 0;
        this.registry.set('themeIndex', (currentIndex + 1) % AVAILABLE_THEMES.length);
        this.scene.restart();
      });
    }

    // Initialize audio manager with this scene
    audioManager.init(this);
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 60, 0x4E342E)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, 0x6D4C41);

    const label = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Hover effects
    bg.on('pointerover', () => {
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
      });
      bg.setFillStyle(0x6D4C41);
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
      bg.setFillStyle(0x4E342E);
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: [bg, label],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
      });
      audioManager.playSound('buttonClick');
      onClick();
    });
  }

  private startGame(difficulty: number): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { difficulty });
    });
  }

  private showRules(): void {
    const overlay = document.getElementById('rules-overlay');
    if (overlay) {
      overlay.classList.add('visible');

      const closeBtn = document.getElementById('rules-close-btn');
      const closeHandler = () => {
        overlay.classList.remove('visible');
        closeBtn?.removeEventListener('click', closeHandler);
        overlay.removeEventListener('click', outsideHandler);
      };

      const outsideHandler = (e: MouseEvent) => {
        if (e.target === overlay) {
          closeHandler();
        }
      };

      closeBtn?.addEventListener('click', closeHandler);
      overlay.addEventListener('click', outsideHandler);
    }
  }
}
