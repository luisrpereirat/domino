import { PlayerHand } from '../models/PlayerHand';
import { EventBus } from '../utils/EventBus';

export class ScoreManager {
  constructor(private eventBus: EventBus) {}

  awardPassPoint(players: PlayerHand[], lastActivePlayer: number): void {
    if (lastActivePlayer < 0 || lastActivePlayer >= players.length) return;

    const player = players[lastActivePlayer]!;
    player.score += 1;

    this.eventBus.emit('scoreChange', lastActivePlayer, player.score);
  }

  getScores(players: PlayerHand[]): number[] {
    return players.map(p => p.score);
  }

  resetScores(players: PlayerHand[]): void {
    for (const player of players) {
      player.score = 0;
    }
  }
}
