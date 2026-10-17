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

// Ex.: +0.35, -1.20, #3, #-2
export function formatEval({ score, isMate }: MoveSuggestion): string {
  if (isMate) return `#${score}`;
  const pawns = score / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

export function formatLoss(lossCp: number): string {
  return (lossCp / 100).toFixed(1);
}
