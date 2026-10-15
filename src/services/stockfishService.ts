export interface StockfishEvaluation {
  move: string;
  score: number;
  isMate: boolean;
  pv: string;
}

export type StockfishTurn = "w" | "b";

export type StockfishCallback = (
  evaluations: StockfishEvaluation[],
  turn: StockfishTurn,
) => void;

let stockfishWorker: Worker | null = null;
let onEvaluationCallback: StockfishCallback | null = null;
let currentTurn: StockfishTurn = "w";
let currentResolve: StockfishCallback | null = null;

export function initStockfish(callback: StockfishCallback) {
  if (stockfishWorker) return;

  onEvaluationCallback = callback;
  stockfishWorker = new Worker("/stockfish-19-lite-single.js");

  stockfishWorker.postMessage("uci");
  stockfishWorker.postMessage("setoption name MultiPV value 5");
  stockfishWorker.postMessage("isready");

  let currentEvaluations: StockfishEvaluation[] = [];

  stockfishWorker.onmessage = (event) => {
    const line = event.data;
    if (typeof line !== "string") return;

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

    if (line.startsWith("bestmove")) {
      const validEvaluations = currentEvaluations.filter(Boolean);

      if (currentResolve && validEvaluations.length > 0) {
        currentResolve(validEvaluations, currentTurn);
        currentResolve = null;
      }

      if (onEvaluationCallback && validEvaluations.length > 0) {
        onEvaluationCallback(validEvaluations, currentTurn);
      }

      currentEvaluations = [];
    }
  };
}

export function evaluatePosition(fen: string) {
  if (!stockfishWorker) return;

  const fenParts = fen.split(" ");
  if (fenParts.length > 1) {
    currentTurn = fenParts[1] === "b" ? "b" : "w";
  }

  stockfishWorker.postMessage("stop");
  stockfishWorker.postMessage(`position fen ${fen}`);
  stockfishWorker.postMessage("go depth 14");
}

export function analyzePositionAsync(
  fen: string,
): Promise<StockfishEvaluation[]> {
  return new Promise((resolve) => {
    if (!stockfishWorker) {
      resolve([]);
      return;
    }

    if (currentResolve) {
      currentResolve([], currentTurn);
    }

    // Como o Promise resolve apenas o array de avaliações, adaptamos o callback interno
    currentResolve = (evaluations) => {
      resolve(evaluations);
    };

    const fenParts = fen.split(" ");
    if (fenParts.length > 1) {
      currentTurn = fenParts[1] === "b" ? "b" : "w";
    }

    stockfishWorker.postMessage("stop");
    stockfishWorker.postMessage(`position fen ${fen}`);
    stockfishWorker.postMessage("go depth 14");
  });
}
