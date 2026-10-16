import type { Match, MatchResult } from "../types";

// Pontos base de uma vitória ou derrota
export const BASE_POINTS = 15;
// A sequência só começa a render bônus a partir da 3ª partida seguida
export const STREAK_BONUS_START = 3;
// Teto do bônus de sequência (vitória: máx. 25 pontos; derrota: máx. 20)
export const MAX_WIN_STREAK_BONUS = 10;
export const MAX_LOSS_STREAK_BONUS = 5;
// Modo tutor: cada ajuda usada reduz o ganho da vitória (e zera o bônus)
export const HELP_PENALTY = 1;
export const MIN_WIN_POINTS = 1;

export const MIN_RATING = 400;
export const MAX_RATING = 2800;

export interface RatingChange {
  result: MatchResult;
  ratingBefore: number;
  ratingAfter: number;
  // Variação aplicada de fato (já considera os limites de rating)
  delta: number;
  base: number;
  streakBonus: number;
  helpPenalty: number;
  // Tamanho da sequência após esta partida (0 se usou ajuda)
  streak: number;
}

export interface CalculateRatingInput {
  currentStreak: number;
  currentRating: number;
  result: MatchResult;
  helpsUsed?: number;
}

// Partidas antigas não guardavam o resultado: deduz pelo sinal do rating
export function getMatchResult(match: Match): MatchResult {
  if (match.result) return match.result;
  return match.ratingEarned >= 0 ? "win" : "loss";
}

export function calculateRating({
  currentStreak,
  currentRating,
  result,
  helpsUsed = 0,
}: CalculateRatingInput): RatingChange {
  const isWin = result === "win";
  const usedHelp = helpsUsed > 0;

  const streak = usedHelp ? 0 : currentStreak;
  const maxBonus = isWin ? MAX_WIN_STREAK_BONUS : MAX_LOSS_STREAK_BONUS;
  const streakBonus = usedHelp
    ? 0
    : Math.min(Math.max(streak - (STREAK_BONUS_START - 1), 0), maxBonus);

  // Ajudas só abatem o ganho de vitórias, e nunca abaixo do mínimo
  const helpPenalty = isWin
    ? Math.min(helpsUsed * HELP_PENALTY, BASE_POINTS - MIN_WIN_POINTS)
    : 0;

  const points = BASE_POINTS + streakBonus - helpPenalty;
  const rawDelta = isWin ? points : -points;

  const ratingAfter = Math.min(
    MAX_RATING,
    Math.max(MIN_RATING, currentRating + rawDelta),
  );

  return {
    result,
    ratingBefore: currentRating,
    ratingAfter,
    delta: ratingAfter - currentRating,
    base: BASE_POINTS,
    streakBonus,
    helpPenalty,
    streak,
  };
}
