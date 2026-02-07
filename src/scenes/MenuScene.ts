import Phaser from 'phaser';
import { themeManager } from '../managers/ThemeManager';
import { audioManager } from '../managers/AudioManager';

export class MenuScene extends Phaser.Scene {

  constructor() {
    super({ key: 'MenuScene' });
  }

  async preload(): Promise<void> {
    try {
      await themeManager.loadTheme('classic');

      // Load background images
      this.load.image('menu-bg', themeManager.getBackgroundPath('menu'));
      this.load.image('button-img', themeManager.getAssetPath('button.png'));

      // Load sounds (graceful handling)
      const clickSound = themeManager.getSoundPath('buttonClick');
      if (clickSound) {
        this.load.audio('sound_buttonClick', clickSound);
      }
    } catch (err) {
      console.error('Failed to load theme:', err);
    }
  }

  create(): void {
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
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    muteBtn.on('pointerdown', () => {
      audioManager.toggleMute();
      muteBtn.setText(audioManager.isMuted ? 'Sound: OFF' : 'Sound: ON');
    });

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
