import { Chess } from "chess.js";
import type { Match } from "../types";

// Monta o link do tabuleiro de análise do Lichess com os lances da partida.
// Retorna null se o PGN não puder ser lido.
export function getLichessAnalysisUrl(match: Match): string | null {
  try {
    const game = new Chess();
    game.loadPgn(match.pgn);

    const moves = game.history();
    if (moves.length === 0) return null;

    const path = moves.map(encodeURIComponent).join("_");
    const color = match.playerSide === "b" ? "?color=black" : "";

    return `https://lichess.org/analysis/pgn/${path}${color}`;
  } catch {
    return null;
  }
}
