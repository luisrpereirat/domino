export type GameEventType =
  | 'turnStart'
  | 'turnEnd'
  | 'tilePlace'
  | 'pass'
  | 'gameOver'
  | 'scoreChange'
  | 'gameStart';

type EventCallback = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<GameEventType, EventCallback[]>();

  on(event: GameEventType, callback: EventCallback): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(callback);
    this.listeners.set(event, existing);
  }

  off(event: GameEventType, callback: EventCallback): void {
    const existing = this.listeners.get(event);
    if (!existing) return;
    const index = existing.indexOf(callback);
    if (index !== -1) {
      existing.splice(index, 1);
    }
  }

  emit(event: GameEventType, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      try {
        cb(...args);
      } catch (err) {
        console.error(`EventBus error in "${event}" handler:`, err);
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
