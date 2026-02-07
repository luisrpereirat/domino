export interface DominoData {
  id: number;
  topIndex: number;
  bottomIndex: number;
  available: boolean;
}

export class Domino implements DominoData {
  constructor(
    public readonly id: number,
    public readonly topIndex: number,
    public readonly bottomIndex: number,
    public available: boolean = true,
  ) {}

  get isDouble(): boolean {
    return this.topIndex === this.bottomIndex;
  }

  toJSON(): DominoData {
    return {
      id: this.id,
      topIndex: this.topIndex,
      bottomIndex: this.bottomIndex,
      available: this.available,
    };
  }

  static fromJSON(data: DominoData): Domino {
    return new Domino(data.id, data.topIndex, data.bottomIndex, data.available);
  }
}
