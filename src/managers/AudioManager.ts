const MUTE_KEY = 'quarzen_domino_muted';

export class AudioManager {
  private scene: Phaser.Scene | null = null;
  private muted: boolean;
  private initialized = false;

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === 'true';
  }

  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.initialized = true;
  }

  playSound(eventName: string): void {
    if (!this.scene || !this.initialized || this.muted) return;

    const key = `sound_${eventName}`;
    try {
      if (this.scene.sound.get(key)) {
        this.scene.sound.play(key);
      }
    } catch {
      // Graceful handling of missing or failed audio
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, String(this.muted));

    if (this.scene) {
      this.scene.sound.mute = this.muted;
    }

    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(this.muted));

    if (this.scene) {
      this.scene.sound.mute = this.muted;
    }
  }

  destroy(): void {
    this.scene = null;
    this.initialized = false;
  }
}

export const audioManager = new AudioManager();
