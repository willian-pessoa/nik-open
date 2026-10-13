import type { LichessMove } from "../types";

const TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

interface ExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  opening?: {
    eco: string;
    name: string;
  };
}

// Mapeia o rating fornecido para o bucket mais próximo aceito pelo Lichess
const getClosestRatingBucket = (rating: number): number => {
  const buckets = [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
  return buckets.reduce((prev, curr) =>
    Math.abs(curr - rating) < Math.abs(prev - rating) ? curr : prev,
  );
};

export const getNextMove = async (
  averageRating: number,
  fen: string,
): Promise<LichessMove[]> => {
  const url = new URL("https://explorer.lichess.ovh/lichess");

  // Adiciona os filtros necessários
  const ratingBucket = getClosestRatingBucket(averageRating);
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

    if (moves.length === 0) return [];

    // Calcula o total de partidas somando todas as opções de lances
    const totalGamesAllMoves = moves.reduce((acc, move) => {
      return acc + move.white + move.draws + move.black;
    }, 0);

    if (totalGamesAllMoves === 0) return [];

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

    return topMoves90Percent;
  } catch (error) {
    console.error("Erro ao consultar o Lichess Explorer:", error);
    return [];
  }
};
