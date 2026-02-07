export interface TileConfig {
  maxPip: number;
}

export function getTileCount(config: TileConfig): number {
  return ((config.maxPip + 1) * (config.maxPip + 2)) / 2;
}
