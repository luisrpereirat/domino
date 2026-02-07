import { Domino, DominoData } from './Domino';

export interface PlacedTile {
  domino: DominoData;
  x: number;
  y: number;
  rotation: number;
  branch: 'right' | 'left';
}

export interface BoardStateData {
  rightBranchNum: number;
  leftBranchNum: number;
  rightPhase: number;
  leftPhase: number;
  rightHor: number;
  rightVer: number;
  leftHor: number;
  leftVer: number;
  started: boolean;
  placedTiles: PlacedTile[];
}

export interface BoardConfig {
  sideLimit: number;
  tileOffset: number;
  lyingOffset: number;
  cornerShift: number;
}

const DEFAULT_BOARD_CONFIG: BoardConfig = {
  sideLimit: 13,
  tileOffset: 60,
  lyingOffset: 30,
  cornerShift: 1.5,
};

export class BoardState {
  public rightBranchNum = -1;
  public leftBranchNum = -1;
  public rightPhase = 0;
  public leftPhase = 0;
  public rightHor = 0;
  public rightVer = 0;
  public leftHor = 0;
  public leftVer = 0;
  public started = false;
  public placedTiles: PlacedTile[] = [];
  public readonly config: BoardConfig;

  constructor(config?: Partial<BoardConfig>) {
    this.config = { ...DEFAULT_BOARD_CONFIG, ...config };
  }

  get branchNums(): { left: number; right: number } {
    return { left: this.leftBranchNum, right: this.rightBranchNum };
  }

  canPlaceOnBranch(domino: Domino, branch: 'left' | 'right'): boolean {
    if (!this.started) return true;
    const branchNum = branch === 'left' ? this.leftBranchNum : this.rightBranchNum;
    return domino.topIndex === branchNum || domino.bottomIndex === branchNum;
  }

  addPlacedTile(domino: Domino, x: number, y: number, rotation: number, branch: 'right' | 'left'): void {
    this.placedTiles.push({
      domino: domino.toJSON(),
      x,
      y,
      rotation,
      branch,
    });
  }

  toJSON(): BoardStateData {
    return {
      rightBranchNum: this.rightBranchNum,
      leftBranchNum: this.leftBranchNum,
      rightPhase: this.rightPhase,
      leftPhase: this.leftPhase,
      rightHor: this.rightHor,
      rightVer: this.rightVer,
      leftHor: this.leftHor,
      leftVer: this.leftVer,
      started: this.started,
      placedTiles: [...this.placedTiles],
    };
  }

  static fromJSON(data: BoardStateData): BoardState {
    const state = new BoardState();
    state.rightBranchNum = data.rightBranchNum;
    state.leftBranchNum = data.leftBranchNum;
    state.rightPhase = data.rightPhase;
    state.leftPhase = data.leftPhase;
    state.rightHor = data.rightHor;
    state.rightVer = data.rightVer;
    state.leftHor = data.leftHor;
    state.leftVer = data.leftVer;
    state.started = data.started;
    state.placedTiles = [...data.placedTiles];
    return state;
  }
}
