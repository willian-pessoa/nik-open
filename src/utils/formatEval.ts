import type { MoveSuggestion } from "../types";

// Converte a avaliação do Stockfish em centipawns comparáveis (mate vira um valor alto)
export function toCentipawns(evaluation: {
  score: number;
  isMate: boolean;
}): number {
  if (!evaluation.isMate) return evaluation.score;
  return (
    Math.sign(evaluation.score) * (10000 - Math.abs(evaluation.score) * 10)
  );
}

// Mesma curva usada pelo Lichess: centipawns -> chance de vitória (0 a 100).
// O clamp em ±1000 faz mate e vantagens enormes valerem praticamente o mesmo.
const WIN_PERCENT_K = 0.00368208;
const WIN_PERCENT_CLAMP_CP = 1000;

export function toWinPercent(cp: number): number {
  const clamped = Math.max(
    -WIN_PERCENT_CLAMP_CP,
    Math.min(WIN_PERCENT_CLAMP_CP, cp),
  );
  return 50 + 50 * (2 / (1 + Math.exp(-WIN_PERCENT_K * clamped)) - 1);
}

// Ex.: +0.35, -1.20, #3, #-2
export function formatEval({ score, isMate }: MoveSuggestion): string {
  if (isMate) return `#${score}`;
  const pawns = score / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

export function formatLoss(lossCp: number): string {
  return (lossCp / 100).toFixed(1);
}
