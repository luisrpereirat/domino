import { Domino } from '../models/Domino';
import { TileConfig, getTileCount } from '../models/TileConfig';
import { PlayerHand } from '../models/PlayerHand';

export class DeckManager {
  private tiles: Domino[] = [];

  generateTileSet(config: TileConfig): Domino[] {
    this.tiles = [];
    let id = 0;
    for (let top = 0; top <= config.maxPip; top++) {
      for (let bottom = top; bottom <= config.maxPip; bottom++) {
        this.tiles.push(new Domino(id, top, bottom));
        id++;
      }
    }
    return [...this.tiles];
  }

  shuffleTiles(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j]!, this.tiles[i]!];
    }
  }

  distributeTiles(players: PlayerHand[], tilesPerPlayer: number): Domino[][] {
    this.shuffleTiles();
    const hands: Domino[][] = [];

    for (let p = 0; p < players.length; p++) {
      const hand: Domino[] = [];
      for (let t = 0; t < tilesPerPlayer; t++) {
        const tileIndex = p * tilesPerPlayer + t;
        const tile = this.tiles[tileIndex];
        if (tile) {
          players[p]!.addTile(tile);
          hand.push(tile);
        }
      }
      hands.push(hand);
    }

    return hands;
  }

  getTiles(): Domino[] {
    return [...this.tiles];
  }

  static getTilesPerPlayer(config: TileConfig, playerCount: number): number {
    const totalTiles = getTileCount(config);
    return Math.floor(totalTiles / playerCount);
  }
}
