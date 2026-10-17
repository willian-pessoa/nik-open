import { Chess, type Square } from "chess.js";

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const game = new Chess(fen);
    const move = game.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] || undefined,
    });
    return move.san;
  } catch {
    return null;
  }
}
