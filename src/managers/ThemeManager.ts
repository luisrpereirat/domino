export interface ThemeColors {
  tableColor: string;
  highlightColor: string;
  validSlotColor: string;
  textColor: string;
  scoreColor: string;
  buttonColor?: string;
  buttonHoverColor?: string;
  passButtonColor?: string;
}

export interface ThemeSounds {
  tilePlace?: string;
  tilePickup?: string;
  tileDeal?: string;
  pass?: string;
  gameStart?: string;
  gameOver?: string;
  gameWin?: string;
  gameLose?: string;
  buttonClick?: string;
  [key: string]: string | undefined;
}

export interface ThemeData {
  name: string;
  tileImages: string;
  tileBack: string;
  tableBackground: string;
  menuBackground: string;
  gameBackground: string;
  buttonImage?: string;
  popupImage?: string;
  closeBtnImage?: string;
  avatarImage?: string;
  iconImage?: string;
  sounds: ThemeSounds;
  colors: ThemeColors;
}

export class ThemeManager {
  private currentTheme: ThemeData | null = null;
  private themePath = '';

  async loadTheme(themeName: string): Promise<ThemeData> {
    this.themePath = `assets/themes/${themeName}`;
    const response = await fetch(`${this.themePath}/theme.json`);
    this.currentTheme = await response.json() as ThemeData;
    return this.currentTheme;
  }

  getTheme(): ThemeData {
    if (!this.currentTheme) {
      throw new Error('No theme loaded. Call loadTheme() first.');
    }
    return this.currentTheme;
  }

  getAssetPath(relativePath: string): string {
    return `${this.themePath}/${relativePath}`;
  }

  getTileImagePath(tileId: number): string {
    if (!this.currentTheme) throw new Error('No theme loaded');
    return this.getAssetPath(
      this.currentTheme.tileImages.replace('{id}', String(tileId))
    );
  }

  getTileBackPath(): string {
    if (!this.currentTheme) throw new Error('No theme loaded');
    return this.getAssetPath(this.currentTheme.tileBack);
  }

  getBackgroundPath(type: 'menu' | 'game' | 'table'): string {
    if (!this.currentTheme) throw new Error('No theme loaded');
    switch (type) {
      case 'menu': return this.getAssetPath(this.currentTheme.menuBackground);
      case 'game': return this.getAssetPath(this.currentTheme.gameBackground);
      case 'table': return this.getAssetPath(this.currentTheme.tableBackground);
    }
  }

  getSoundPath(soundKey: string): string | null {
    if (!this.currentTheme) return null;
    const soundFile = this.currentTheme.sounds[soundKey];
    if (!soundFile) return null;
    return this.getAssetPath(soundFile);
  }

  getColors(): ThemeColors {
    if (!this.currentTheme) throw new Error('No theme loaded');
    return this.currentTheme.colors;
  }

  getThemePath(): string {
    return this.themePath;
  }
}

export const themeManager = new ThemeManager();
