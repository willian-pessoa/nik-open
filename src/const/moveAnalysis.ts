import type { SessionMode } from "../types";

interface MoveAnalysisConfig {
  // Queda máxima de chance de vitória (pontos percentuais) por lance
  maxWinLoss: number;
  // Avaliação (cp, ponto de vista do jogador) abaixo da qual a posição já é
  // considerada ruim demais para uma abertura
  floorCp: number;
}

export const MOVE_ANALYSIS: Record<SessionMode, MoveAnalysisConfig> = {
  // Tutor pode desfazer o lance, então pode ser mais rigoroso
  tutor: { maxWinLoss: 6, floorCp: -75 },
  // No desafio o erro encerra a partida, então é mais tolerante
  challenger: { maxWinLoss: 10, floorCp: -100 },
};

// O piso só vale se o lance em si perdeu pelo menos isso (pontos percentuais).
// Evita marcar todo lance quando a posição já estava ruim antes dele.
export const MIN_LOSS_FOR_FLOOR = 3;
