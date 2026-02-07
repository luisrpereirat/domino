import { TileConfig } from './TileConfig';
import { PlayerHand, PlayerHandData } from './PlayerHand';
import { BoardState, BoardStateData } from './BoardState';

export interface GameStateData {
  currentTurn: number;
  lastActivePlayer: number;
  gameOver: boolean;
  difficulty: number;
  tileConfig: TileConfig;
  players: PlayerHandData[];
  board: BoardStateData;
}

export class GameState {
  public currentTurn: number;
  public lastActivePlayer: number;
  public gameOver: boolean;
  public difficulty: number;
  public tileConfig: TileConfig;
  public players: PlayerHand[];
  public board: BoardState;

  constructor(difficulty: number, tileConfig: TileConfig = { maxPip: 6 }) {
    this.currentTurn = 0;
    this.lastActivePlayer = -1;
    this.gameOver = false;
    this.difficulty = difficulty;
    this.tileConfig = tileConfig;
    this.board = new BoardState();
    this.players = [
      new PlayerHand('human', 'bottom', 'You'),
      new PlayerHand('ai', 'left', 'Left AI'),
      new PlayerHand('ai', 'top', 'Top AI'),
      new PlayerHand('ai', 'right', 'Right AI'),
    ];
  }

  get currentPlayer(): PlayerHand {
    return this.players[this.currentTurn]!;
  }

  get humanPlayer(): PlayerHand {
    return this.players[0]!;
  }

  get isHumanTurn(): boolean {
    return this.currentTurn === 0;
  }

  advanceTurn(): void {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
  }

  toJSON(): GameStateData {
    return {
      currentTurn: this.currentTurn,
      lastActivePlayer: this.lastActivePlayer,
      gameOver: this.gameOver,
      difficulty: this.difficulty,
      tileConfig: { ...this.tileConfig },
      players: this.players.map(p => p.toJSON()),
      board: this.board.toJSON(),
    };
  }

  static fromJSON(data: GameStateData): GameState {
    const state = new GameState(data.difficulty, data.tileConfig);
    state.currentTurn = data.currentTurn;
    state.lastActivePlayer = data.lastActivePlayer;
    state.gameOver = data.gameOver;
    state.players = data.players.map(p => PlayerHand.fromJSON(p));
    state.board = BoardState.fromJSON(data.board);
    return state;
  }
}
