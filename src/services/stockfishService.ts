let stockfishWorker: Worker | null = null;
let onEvaluationCallback:
  | ((bestMove: string, evaluation: string) => void)
  | null = null;

export function initStockfish(
  callback: (bestMove: string, evaluation: string) => void,
) {
  if (stockfishWorker) return;

  onEvaluationCallback = callback;

  // Aponta para o arquivo JS que está na pasta public
  stockfishWorker = new Worker("/stockfish-19-lite-single.js");

  stockfishWorker.postMessage("uci");
  stockfishWorker.postMessage("isready");

  stockfishWorker.onmessage = (event) => {
    const line = event.data;
    if (typeof line !== "string") return;

    // O motor retorna a linha com o melhor lance encontrado
    if (line.startsWith("bestmove")) {
      const match = line.match(/bestmove\s+(\S+)/);
      if (match && onEvaluationCallback) {
        const bestMove = match[1];
        onEvaluationCallback(bestMove, line);
      }
    }
  };
}

export function evaluatePosition(fen: string) {
  if (!stockfishWorker) return;
  stockfishWorker.postMessage(`position fen ${fen}`);
  // 'go depth 10' ou 'go movetime 100' mantêm o motor rápido e leve para a web
  stockfishWorker.postMessage("go depth 12");
}

export function stopStockfish() {
  if (stockfishWorker) {
    stockfishWorker.postMessage("stop");
  }
}
