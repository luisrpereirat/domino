import { Domino } from '../models/Domino';
import { BoardState } from '../models/BoardState';

export interface SlotPosition {
  x: number;
  y: number;
  rotation: number;
  standing: boolean;
  branch: 'left' | 'right';
  flipped: boolean;
}

export interface MatchResult {
  tile: Domino;
  branch: 'left' | 'right';
}

export class SlotHelper {
  private readonly tileOffset: number;
  private readonly lyingOffset: number;
  private readonly cornerShift: number;
  private readonly sideLimit: number;

  constructor(board: BoardState) {
    this.tileOffset = board.config.tileOffset;
    this.lyingOffset = board.config.lyingOffset;
    this.cornerShift = board.config.cornerShift;
    this.sideLimit = board.config.sideLimit;
  }

  checkStanding(domino: Domino, phase: number): boolean {
    // In horizontal phases (0, 4+), doubles stand; non-doubles lie
    // In vertical phases (1, 3), non-doubles stand; doubles lie
    const isHorizontalPhase = phase === 0 || phase >= 4;
    if (isHorizontalPhase) {
      return domino.isDouble;
    }
    return !domino.isDouble;
  }

  getSlotPosition(
    board: BoardState,
    domino: Domino,
    branch: 'left' | 'right',
    centerX: number,
    centerY: number,
  ): SlotPosition {
    const hor = branch === 'right' ? board.rightHor : board.leftHor;
    const ver = branch === 'right' ? board.rightVer : board.leftVer;
    const phase = branch === 'right' ? board.rightPhase : board.leftPhase;
    const direction = branch === 'right' ? 1 : -1;

    const standing = this.checkStanding(domino, phase);

    let x = centerX;
    let y = centerY;
    let rotation = 0;

    if (!board.started) {
      // First tile at center
      if (domino.isDouble) {
        rotation = 0; // Standing vertical
      } else {
        rotation = -90; // Lying horizontal (CCW so topIndex is on the left)
        x += this.lyingOffset * 0.5;
      }
      return { x, y, rotation, standing, branch, flipped: false };
    }

    switch (phase) {
      case 0: // Horizontal expansion
        x = centerX + (hor + (standing ? 1 : 2)) * this.tileOffset * direction;
        y = centerY + ver * this.tileOffset;
        rotation = standing ? 0 : -90;
        break;

      case 1: // First corner (turn down for right, up for left)
        x = centerX + hor * this.tileOffset * direction;
        y = centerY + (ver + this.cornerShift) * this.tileOffset * (branch === 'right' ? 1 : -1);
        rotation = standing ? -90 : 0;
        break;

      case 2: // Cross-direction
        x = centerX + (hor - (standing ? 1 : 2)) * this.tileOffset * direction;
        y = centerY + ver * this.tileOffset * (branch === 'right' ? 1 : -1);
        rotation = standing ? 0 : -90;
        break;

      case 3: // End corner
        x = centerX + hor * this.tileOffset * direction;
        y = centerY + (ver + this.cornerShift) * this.tileOffset * (branch === 'right' ? 1 : -1);
        rotation = standing ? -90 : 0;
        break;

      default: // Phase 4+: Reversed horizontal
        x = centerX + (hor + (standing ? 1 : 2)) * this.tileOffset * direction * -1;
        y = centerY + ver * this.tileOffset * (branch === 'right' ? 1 : -1);
        rotation = standing ? 0 : -90;
        break;
    }

    const branchNum = branch === 'right' ? board.rightBranchNum : board.leftBranchNum;
    const flipped = this.computeFlip(domino, branchNum, branch, phase);

    return { x, y, rotation, standing, branch, flipped };
  }

  private computeFlip(domino: Domino, branchNum: number, branch: 'left' | 'right', phase: number): boolean {
    // Doubles are symmetric - never need flipping
    if (domino.isDouble) return false;
    // If branchNum is -1 (first tile), no flip needed
    if (branchNum < 0) return false;

    // Determine if the growth direction is "normal" (outward from center) or "reversed"
    // Normal: phases 0, 1, 3 | Reversed: phases 2, 4+
    const reversed = phase === 2 || phase >= 4;

    // For right+normal or left+reversed: topIndex should face the connection
    //   → flip needed when bottomIndex matches branchNum
    // For right+reversed or left+normal: bottomIndex should face the connection
    //   → flip needed when topIndex matches branchNum
    const topShouldMatch = (branch === 'right') !== reversed;

    if (topShouldMatch) {
      return domino.bottomIndex === branchNum && domino.topIndex !== branchNum;
    } else {
      return domino.topIndex === branchNum && domino.bottomIndex !== branchNum;
    }
  }

  confirmMoving(board: BoardState, domino: Domino, branch: 'left' | 'right'): void {
    const standing = this.checkStanding(
      domino,
      branch === 'right' ? board.rightPhase : board.leftPhase
    );
    const moveAmount = standing ? 1 : 2;

    if (branch === 'right') {
      this.updateBranchPosition(board, 'right', moveAmount);
    } else {
      this.updateBranchPosition(board, 'left', moveAmount);
    }
  }

  private updateBranchPosition(board: BoardState, branch: 'left' | 'right', moveAmount: number): void {
    const isRight = branch === 'right';

    if (isRight) {
      switch (board.rightPhase) {
        case 0:
          board.rightHor += moveAmount;
          if (board.rightHor >= this.sideLimit) {
            board.rightPhase = 1;
          }
          break;
        case 1:
          board.rightVer += moveAmount;
          if (board.rightVer >= 2) {
            board.rightPhase = 2;
          }
          break;
        case 2:
          board.rightHor -= moveAmount;
          if (board.rightHor <= 0) {
            board.rightPhase = 3;
          }
          break;
        case 3:
          board.rightVer += moveAmount;
          if (board.rightVer >= 4) {
            board.rightPhase = 4;
          }
          break;
        default:
          board.rightHor += moveAmount;
          break;
      }
    } else {
      switch (board.leftPhase) {
        case 0:
          board.leftHor += moveAmount;
          if (board.leftHor >= this.sideLimit) {
            board.leftPhase = 1;
          }
          break;
        case 1:
          board.leftVer += moveAmount;
          if (board.leftVer >= 2) {
            board.leftPhase = 2;
          }
          break;
        case 2:
          board.leftHor -= moveAmount;
          if (board.leftHor <= 0) {
            board.leftPhase = 3;
          }
          break;
        case 3:
          board.leftVer += moveAmount;
          if (board.leftVer >= 4) {
            board.leftPhase = 4;
          }
          break;
        default:
          board.leftHor += moveAmount;
          break;
      }
    }
  }

  confirmOccupation(board: BoardState, domino: Domino, branch: 'left' | 'right'): void {
    const branchNum = branch === 'right' ? board.rightBranchNum : board.leftBranchNum;

    if (!board.started) {
      // First tile: set both branches
      board.rightBranchNum = domino.bottomIndex;
      board.leftBranchNum = domino.topIndex;
      if (domino.isDouble) {
        board.rightBranchNum = domino.topIndex;
        board.leftBranchNum = domino.topIndex;
      }
      board.started = true;
      return;
    }

    // Determine which end becomes the new open end
    let newBranchNum: number;
    if (domino.topIndex === branchNum) {
      newBranchNum = domino.bottomIndex;
    } else {
      newBranchNum = domino.topIndex;
    }

    if (branch === 'right') {
      board.rightBranchNum = newBranchNum;
    } else {
      board.leftBranchNum = newBranchNum;
    }
  }

  getMatchingTiles(dominos: Domino[], leftBranch: number, rightBranch: number): MatchResult[] {
    const results: MatchResult[] = [];

    for (const tile of dominos) {
      const matchesLeft = tile.topIndex === leftBranch || tile.bottomIndex === leftBranch;
      const matchesRight = tile.topIndex === rightBranch || tile.bottomIndex === rightBranch;

      if (matchesLeft) {
        results.push({ tile, branch: 'left' });
      }
      if (matchesRight && (!matchesLeft || leftBranch !== rightBranch)) {
        results.push({ tile, branch: 'right' });
      }
    }

    return results;
  }

  shouldFlipTile(domino: Domino, branchNum: number): boolean {
    // If the matching end is on the bottom and needs to be on top (or vice versa)
    return domino.bottomIndex === branchNum && domino.topIndex !== branchNum;
  }
}
