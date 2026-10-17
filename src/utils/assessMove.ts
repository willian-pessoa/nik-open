import type { BadMoveKind, SessionMode } from "../types";
import { MIN_LOSS_FOR_FLOOR, MOVE_ANALYSIS } from "../const/moveAnalysis";
import { toWinPercent } from "./formatEval";

export interface MoveAssessment {
  kind: BadMoveKind;
  // Perda em centipawns (melhor lance possível x resultado do lance jogado)
  lossCp: number;
  // Avaliação da posição depois do lance, já contando a melhor resposta da CPU
  evalAfterCp: number;
}

interface AssessInput {
  // Melhor avaliação possível ANTES do lance (ponto de vista do jogador)
  scoreBeforeCp: number;
  // Avaliação DEPOIS do lance e da melhor resposta da CPU (idem)
  scoreAfterCp: number;
  mode: SessionMode;
}

// Decide se o lance do jogador foi ruim. Retorna null se foi aceitável.
export function assessPlayerMove({
  scoreBeforeCp,
  scoreAfterCp,
  mode,
}: AssessInput): MoveAssessment | null {
  const config = MOVE_ANALYSIS[mode];

  const winLoss = toWinPercent(scoreBeforeCp) - toWinPercent(scoreAfterCp);
  const lossCp = scoreBeforeCp - scoreAfterCp;

  // Regra 1: o lance custou caro em chance de vitória
  const tooCostly = winLoss >= config.maxWinLoss;
  // Regra 2: a posição ficou ruim demais e este lance contribuiu para isso
  // (pega o acúmulo de vários lances "só um pouco" imprecisos)
  const drifted =
    scoreAfterCp <= config.floorCp && winLoss >= MIN_LOSS_FOR_FLOOR;

  if (!tooCostly && !drifted) return null;

  let kind: BadMoveKind;
  if (!tooCostly) kind = "drift";
  else if (scoreAfterCp >= 0) kind = "missed";
  else kind = "mistake";

  return { kind, lossCp, evalAfterCp: scoreAfterCp };
}
