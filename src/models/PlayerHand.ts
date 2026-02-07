import { Domino, DominoData } from './Domino';

export type PlayerType = 'human' | 'ai' | 'remote';
export type PlayerPosition = 'bottom' | 'left' | 'top' | 'right';

export interface PlayerHandData {
  tiles: DominoData[];
  score: number;
  playerType: PlayerType;
  position: PlayerPosition;
  name: string;
}

export class PlayerHand {
  public tiles: Domino[];
  public score: number;
  public readonly playerType: PlayerType;
  public readonly position: PlayerPosition;
  public readonly name: string;

  constructor(
    playerType: PlayerType,
    position: PlayerPosition,
    name: string,
  ) {
    this.tiles = [];
    this.score = 0;
    this.playerType = playerType;
    this.position = position;
    this.name = name;
  }

  addTile(tile: Domino): void {
    this.tiles.push(tile);
  }

  removeTile(tileId: number): Domino | undefined {
    const index = this.tiles.findIndex(t => t.id === tileId);
    if (index === -1) return undefined;
    return this.tiles.splice(index, 1)[0];
  }

  getValidTiles(leftBranch: number, rightBranch: number): Domino[] {
    return this.tiles.filter(tile =>
      tile.topIndex === leftBranch ||
      tile.bottomIndex === leftBranch ||
      tile.topIndex === rightBranch ||
      tile.bottomIndex === rightBranch
    );
  }

  hasValidMoves(leftBranch: number, rightBranch: number): boolean {
    return this.getValidTiles(leftBranch, rightBranch).length > 0;
  }

  get isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  toJSON(): PlayerHandData {
    return {
      tiles: this.tiles.map(t => t.toJSON()),
      score: this.score,
      playerType: this.playerType,
      position: this.position,
      name: this.name,
    };
  }

  static fromJSON(data: PlayerHandData): PlayerHand {
    const hand = new PlayerHand(data.playerType, data.position, data.name);
    hand.tiles = data.tiles.map(t => Domino.fromJSON(t));
    hand.score = data.score;
    return hand;
  }
}
