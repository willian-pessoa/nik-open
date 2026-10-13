import type { LichessMove } from "../types";

export const getRandomMoveByWeight = (
  moves: LichessMove[],
): LichessMove | null => {
  if (!moves || moves.length === 0) return null;

  // Calcula o total de partidas de todos os lances fornecidos
  const totalGames = moves.reduce((acc, move) => {
    return acc + (move.white + move.draws + move.black);
  }, 0);

  if (totalGames === 0) return null;

  // Sorteia um número aleatório entre 0 e o total de partidas
  let randomWeight = Math.random() * totalGames;

  // Percorre os lances acumulando o peso até atingir o número sorteado
  for (const move of moves) {
    const moveGames = move.white + move.draws + move.black;
    randomWeight -= moveGames;

    if (randomWeight <= 0) {
      return move;
    }
  }

  // Fallback de segurança (retorna o primeiro lance caso ocorra algum arredondamento)
  return moves[0];
};
