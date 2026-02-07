import { Domino } from '../models/Domino';
import { GameState } from '../models/GameState';
import { MatchResult } from '../managers/SlotHelper';

export interface TileChoice {
  tile: Domino;
  branch: 'left' | 'right';
}

export interface AIStrategy {
  selectTile(
    gameState: GameState,
    playerIndex: number,
    matchingTiles: MatchResult[],
  ): TileChoice | null;
}

export class RandomStrategy implements AIStrategy {
  selectTile(
    _gameState: GameState,
    _playerIndex: number,
    matchingTiles: MatchResult[],
  ): TileChoice | null {
    if (matchingTiles.length === 0) return null;
    const pick = matchingTiles[Math.floor(Math.random() * matchingTiles.length)]!;
    return { tile: pick.tile, branch: pick.branch };
  }
}

interface ClassifiedTiles {
  good: TileChoice[];
  bad: TileChoice[];
}

function separateTiles(
  matchingTiles: MatchResult[],
  gameState: GameState,
  targetPlayerIndex: number,
): ClassifiedTiles {
  const targetHand = gameState.players[targetPlayerIndex]!;
  const good: TileChoice[] = [];
  const bad: TileChoice[] = [];

  for (const match of matchingTiles) {
    const branchNum = match.branch === 'right'
      ? gameState.board.rightBranchNum
      : gameState.board.leftBranchNum;

    // Determine what the new open end would be after placing this tile
    let newOpenEnd: number;
    if (match.tile.topIndex === branchNum) {
      newOpenEnd = match.tile.bottomIndex;
    } else {
      newOpenEnd = match.tile.topIndex;
    }

    // Check if the target player has any tile matching the new open end
    const targetHasMatch = targetHand.tiles.some(
      t => t.id !== match.tile.id && (t.topIndex === newOpenEnd || t.bottomIndex === newOpenEnd)
    );

    const choice: TileChoice = { tile: match.tile, branch: match.branch };
    if (targetHasMatch) {
      good.push(choice);
    } else {
      bad.push(choice);
    }
  }

  return { good, bad };
}

export class HardStrategy implements AIStrategy {
  selectTile(
    gameState: GameState,
    playerIndex: number,
    matchingTiles: MatchResult[],
  ): TileChoice | null {
    if (matchingTiles.length === 0) return null;

    const nextPlayerIndex = (playerIndex + 1) % gameState.players.length;
    const isBeforeHuman = nextPlayerIndex === 0;

    const classified = separateTiles(matchingTiles, gameState, nextPlayerIndex);

    if (isBeforeHuman) {
      // Play bad tiles to block the human
      if (classified.bad.length > 0) {
        return classified.bad[Math.floor(Math.random() * classified.bad.length)]!;
      }
    } else {
      // Play good tiles to help the next player
      if (classified.good.length > 0) {
        return classified.good[Math.floor(Math.random() * classified.good.length)]!;
      }
    }

    // Fallback to random
    const pick = matchingTiles[Math.floor(Math.random() * matchingTiles.length)]!;
    return { tile: pick.tile, branch: pick.branch };
  }
}

export class EasyStrategy implements AIStrategy {
  selectTile(
    gameState: GameState,
    _playerIndex: number,
    matchingTiles: MatchResult[],
  ): TileChoice | null {
    if (matchingTiles.length === 0) return null;

    // Classify tiles relative to the HUMAN player (index 0)
    const classified = separateTiles(matchingTiles, gameState, 0);

    // Prefer non-double good tiles
    const nonDoubleGood = classified.good.filter(c => !c.tile.isDouble);
    if (nonDoubleGood.length > 0) {
      return nonDoubleGood[Math.floor(Math.random() * nonDoubleGood.length)]!;
    }

    // Then any good tile
    if (classified.good.length > 0) {
      return classified.good[Math.floor(Math.random() * classified.good.length)]!;
    }

    // CausePass analysis: check if all moves would force human to pass
    const humanHand = gameState.players[0]!;
    const allCausePass = matchingTiles.every(match => {
      const branchNum = match.branch === 'right'
        ? gameState.board.rightBranchNum
        : gameState.board.leftBranchNum;

      let newOpenEnd: number;
      if (match.tile.topIndex === branchNum) {
        newOpenEnd = match.tile.bottomIndex;
      } else {
        newOpenEnd = match.tile.topIndex;
      }

      // Would the human have a valid tile for this new end?
      const otherBranch = match.branch === 'right'
        ? gameState.board.leftBranchNum
        : gameState.board.rightBranchNum;

      return !humanHand.tiles.some(
        t => t.topIndex === newOpenEnd || t.bottomIndex === newOpenEnd ||
             t.topIndex === otherBranch || t.bottomIndex === otherBranch
      );
    });

    if (allCausePass) {
      // Check if passing voluntarily also forces human to pass
      const humanCanPlay = humanHand.hasValidMoves(
        gameState.board.leftBranchNum,
        gameState.board.rightBranchNum,
      );

      if (humanCanPlay) {
        // Pass voluntarily to avoid forcing human to pass
        return null;
      }
    }

    // Fallback to random
    const pick = matchingTiles[Math.floor(Math.random() * matchingTiles.length)]!;
    return { tile: pick.tile, branch: pick.branch };
  }
}

export function createStrategy(difficulty: number): AIStrategy {
  switch (difficulty) {
    case 0: return new EasyStrategy();
    case 2: return new HardStrategy();
    default: return new RandomStrategy();
  }
}
