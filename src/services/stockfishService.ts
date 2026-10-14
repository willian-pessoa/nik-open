let stockfishWorker: Worker | null = null;
let onEvaluationCallback:
  | ((
      evaluations: Array<{
        move: string;
        score: number;
        isMate: boolean;
        pv: string;
      }>,
      turn: "w" | "b",
    ) => void)
  | null = null;
let currentTurn: "w" | "b" = "w";
let currentResolve:
  | ((
      evaluations: Array<{
        move: string;
        score: number;
        isMate: boolean;
        pv: string;
      }>,
      turn: "w" | "b",
    ) => void)
  | null = null;

export function initStockfish(
  callback: (
    evaluations: Array<{
      move: string;
      score: number;
      isMate: boolean;
      pv: string;
    }>,
    turn: "w" | "b",
  ) => void,
) {
  if (stockfishWorker) return;

  onEvaluationCallback = callback;
  stockfishWorker = new Worker("/stockfish-19-lite-single.js"); // Use o nome correto do seu arquivo baixado

  stockfishWorker.postMessage("uci");
  // Habilita o modo de múltiplos melhores lances (Top 5)
  stockfishWorker.postMessage("setoption name MultiPV value 5");
  stockfishWorker.postMessage("isready");

  let currentEvaluations: Array<{
    move: string;
    score: number;
    isMate: boolean;
    pv: string;
  }> = [];

  stockfishWorker.onmessage = (event) => {
    const line = event.data;
    if (typeof line !== "string") return;

    // O motor envia linhas de info para cada um dos PVs (MultiPV) durante a busca
    if (
      line.includes("info") &&
      line.includes("score") &&
      line.includes("pv")
    ) {
      const pvMatch = line.match(/multipv\s+(\d+)/);
      const scoreCpMatch = line.match(/score cp\s+(-?\d+)/);
      const scoreMateMatch = line.match(/score mate\s+(-?\d+)/);
      const pvMoveMatch = line.match(/\bpv\s+(\S+)/);

      if (pvMatch && pvMoveMatch) {
        const pvIndex = parseInt(pvMatch[1], 10) - 1;
        const move = pvMoveMatch[1];

        let score = 0;
        let isMate = false;

        if (scoreMateMatch) {
          score = parseInt(scoreMateMatch[1], 10);
          isMate = true;
        } else if (scoreCpMatch) {
          score = parseInt(scoreCpMatch[1], 10);
        }

        currentEvaluations[pvIndex] = { move, score, isMate, pv: line };
      }
    }

    // Quando termina a análise da profundidade/tempo, o motor retorna o bestmove
    if (line.startsWith("bestmove")) {
      if (currentResolve && currentEvaluations.length > 0) {
        currentResolve(currentEvaluations.filter(Boolean), currentTurn);
        currentResolve = null;
      }

      if (onEvaluationCallback && currentEvaluations.length > 0) {
        onEvaluationCallback(currentEvaluations.filter(Boolean), currentTurn);
      }

      currentEvaluations = [];
    }
  };
}

export function evaluatePosition(fen: string) {
  if (!stockfishWorker) return;

  // Extrai o turno ('w' ou 'b') diretamente do segundo campo da string FEN
  // Exemplo de FEN: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" -> o 'b' indica que a vez é das pretas
  const fenParts = fen.split(" ");
  if (fenParts.length > 1) {
    currentTurn = fenParts[1] === "b" ? "b" : "w";
  }

  stockfishWorker.postMessage("stop interromper_busca_anterior"); // Para buscas anteriores se houver
  stockfishWorker.postMessage(`position fen ${fen}`);
  stockfishWorker.postMessage("go depth 14");
}

export function analyzePositionAsync(
  fen: string,
): Promise<
  Array<{ move: string; score: number; isMate: boolean; pv: string }>
> {
  return new Promise((resolve) => {
    if (!stockfishWorker) {
      resolve([]);
      return;
    }

    // Se houver uma análise pendente anterior, resolve vazia para não travar
    if (currentResolve) {
      currentResolve([], currentTurn);
    }

    currentResolve = resolve;

    // Extrai o turno ('w' ou 'b') diretamente do segundo campo da string FEN
    // Exemplo de FEN: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" -> o 'b' indica que a vez é das pretas
    const fenParts = fen.split(" ");
    if (fenParts.length > 1) {
      currentTurn = fenParts[1] === "b" ? "b" : "w";
    }

    stockfishWorker.postMessage("stop");
    stockfishWorker.postMessage(`position fen ${fen}`);
    stockfishWorker.postMessage("go depth 14"); // Profundidade rápida e segura
  });
}
