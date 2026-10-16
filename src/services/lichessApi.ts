import type { LichessMove } from "../types";

const TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

export interface ExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  opening?: {
    eco: string;
    name: string;
  };
}

export interface ExplorerResult {
  // Lances mais populares (cobrem até 90% das partidas da posição)
  moves: LichessMove[];
  // Total de partidas da posição no banco (usado para detectar o fim da abertura)
  totalGames: number;
  // true quando a consulta falhou (rede/API): não significa "sem partidas"
  failed: boolean;
}

// Mapeia os 2 rating mais próximo aceito pelo Lichess
export const getClosestRatingBuckets = (rating: number): number[] => {
  const buckets = [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

  return buckets
    .sort((a, b) => Math.abs(a - rating) - Math.abs(b - rating))
    .slice(0, 2);
};

export const getNextMove = async (
  averageRating: number,
  fen: string,
): Promise<ExplorerResult> => {
  const url = new URL("https://explorer.lichess.ovh/lichess");

  // Adiciona os filtros necessários
  const ratingBucket = getClosestRatingBuckets(averageRating);
  url.searchParams.append("ratings[]", ratingBucket.toString());

  if (fen && fen.trim() !== "") {
    url.searchParams.append("fen", fen);
  }

  const headers: HeadersInit = {};

  if (TOKEN) {
    headers["Authorization"] = `Bearer ${TOKEN}`;
  }

  try {
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Erro na API do Lichess: ${response.statusText}`);
    }

    const data: ExplorerResponse = await response.json();
    const moves = data.moves || [];
    const totalGames =
      (data.white ?? 0) + (data.draws ?? 0) + (data.black ?? 0);

    if (moves.length === 0) return { moves: [], totalGames, failed: false };

    // Calcula o total de partidas somando todas as opções de lances
    const totalGamesAllMoves = moves.reduce((acc, move) => {
      return acc + move.white + move.draws + move.black;
    }, 0);

    if (totalGamesAllMoves === 0) {
      return { moves: [], totalGames, failed: false };
    }

    // Seleciona os lances mais jogados que cobrem até 90% do volume total de partidas
    let accumulatedGames = 0;
    const topMoves90Percent: LichessMove[] = [];

    for (const move of moves) {
      const moveTotal = move.white + move.draws + move.black;
      accumulatedGames += moveTotal;
      topMoves90Percent.push(move);

      if (accumulatedGames / totalGamesAllMoves >= 0.9) {
        break;
      }
    }

    return { moves: topMoves90Percent, totalGames, failed: false };
  } catch (error) {
    console.error("Erro ao consultar o Lichess Explorer:", error);
    return { moves: [], totalGames: 0, failed: true };
  }
};
