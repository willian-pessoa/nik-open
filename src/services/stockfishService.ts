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
let pendingSearches = 0;

export function initStockfish(callback: StockfishCallback) {
  onEvaluationCallback = callback;
  if (stockfishWorker) return;

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
      pendingSearches = Math.max(0, pendingSearches - 1);

      // Busca cancelada por um "stop": ignora os dados parciais dela
      if (pendingSearches > 0) {
        currentEvaluations = [];
        return;
      }

      const validEvaluations = currentEvaluations.filter(Boolean);
      currentEvaluations = [];

      if (currentResolve) {
        // Resolve mesmo sem avaliações (ex.: posição sem lances legais), para a
        // promessa não ficar pendente para sempre
        const resolve = currentResolve;
        currentResolve = null;
        resolve(validEvaluations, currentTurn);
      }

      if (onEvaluationCallback && validEvaluations.length > 0) {
        onEvaluationCallback(validEvaluations, currentTurn);
      }
    }
  };
}

const SEARCH_DEPTH = 12;
const DEFAULT_MULTI_PV = 3;

function startSearch(
  worker: Worker,
  fen: string,
  multiPv: number = DEFAULT_MULTI_PV,
) {
  const fenParts = fen.split(" ");
  if (fenParts.length > 1) {
    currentTurn = fenParts[1] === "b" ? "b" : "w";
  }

  pendingSearches++;
  worker.postMessage("stop");
  worker.postMessage(`setoption name MultiPV value ${multiPv}`);
  worker.postMessage(`position fen ${fen}`);
  worker.postMessage(`go depth ${SEARCH_DEPTH}`);
}

export function evaluatePosition(fen: string) {
  if (!stockfishWorker) return;
  startSearch(stockfishWorker, fen);
}

export function analyzePositionAsync(
  fen: string,
  multiPv?: number,
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

    startSearch(stockfishWorker, fen, multiPv);
  });
}
