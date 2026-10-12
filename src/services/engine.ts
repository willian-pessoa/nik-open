import { Chess } from "chess.js";
import type { EngineMoveEvaluation } from "../types/chess";

export interface EvalResult {
  score: number; // Centipawns from White's perspective (+ = White better, - = Black better)
  mate: number | null;
  depth: number;
  bestMove: string;
  topMoves: EngineMoveEvaluation[];
}

class EngineService {
  private worker: Worker | null = null;
  public isReady = false;
  private pendingResolves: Map<string, (result: EvalResult) => void> =
    new Map();
  private currentFen = "";
  private currentMultiPvMap: Map<number, EngineMoveEvaluation> = new Map();
  private workerFailed = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === "undefined") return;

    try {
      this.worker = new Worker("/stockfish/stockfish.js");

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        this.handleEngineOutput(line);
      };

      this.worker.onerror = (err) => {
        console.warn("Stockfish worker error:", err);
        this.workerFailed = true;
      };

      // Send initial UCI commands
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name MultiPV value 3");
      this.worker.postMessage("isready");
    } catch (err) {
      console.warn("Could not initialize Stockfish worker:", err);
      this.workerFailed = true;
    }
  }

  private handleEngineOutput(line: string) {
    if (line.includes("readyok")) {
      this.isReady = true;
      return;
    }

    // Parse info depth ... multipv ... score ... pv ...
    if (
      line.startsWith("info") &&
      line.includes("multipv") &&
      line.includes("score")
    ) {
      const parsed = this.parseInfoLine(line);
      if (parsed) {
        this.currentMultiPvMap.set(parsed.multipv, parsed.evaluation);
      }
    }

    // Bestmove signal terminates position search
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const bestMoveUci = parts[1] || "";

      const topMoves = Array.from(this.currentMultiPvMap.entries())
        .sort(([pvA], [pvB]) => pvA - pvB)
        .map(([, evalMove]) => evalMove);

      const topEval = topMoves[0] || {
        san: bestMoveUci,
        uci: bestMoveUci,
        score: 0,
        mate: null,
        depth: 0,
        pv: [bestMoveUci],
      };

      const result: EvalResult = {
        score: topEval.score,
        mate: topEval.mate,
        depth: topEval.depth,
        bestMove: bestMoveUci,
        topMoves: topMoves.slice(0, 3),
      };

      const resolve = this.pendingResolves.get(this.currentFen);
      if (resolve) {
        resolve(result);
        this.pendingResolves.delete(this.currentFen);
      }
    }
  }

  private parseInfoLine(
    line: string,
  ): { multipv: number; evaluation: EngineMoveEvaluation } | null {
    try {
      const depthMatch = line.match(/depth\s+(\d+)/);
      const multipvMatch = line.match(/multipv\s+(\d+)/);
      const scoreCpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const scoreMateMatch = line.match(/score\s+mate\s+(-?\d+)/);

      // Procura especificamente pela cláusula 'pv' seguida pelos lances reais
      const pvIndex = line.indexOf(" pv ");
      if (!multipvMatch || pvIndex === -1) return null;

      const multipv = parseInt(multipvMatch[1], 10);
      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 10;

      // Extrai apenas a parte que vem após o ' pv ' e divide os lances
      const pvString = line.substring(pvIndex + 4).trim();
      const rawTokens = pvString.split(/\s+/);

      // Filtra apenas tokens que parecem movimentos de xadrez válidos em UCI (ex: e2e4, f6g6, e7e8q)
      const pv = rawTokens.filter((token) =>
        /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(token),
      );

      const firstUci = pv[0] || "";

      let score = 0;
      let mate: number | null = null;

      let isWhiteToMove = true;
      try {
        const fenParts = this.currentFen.split(" ");
        isWhiteToMove = fenParts[1] !== "b";
      } catch {
        isWhiteToMove = true;
      }

      if (scoreCpMatch) {
        const rawCp = parseInt(scoreCpMatch[1], 10);
        score = isWhiteToMove ? rawCp : -rawCp;
      } else if (scoreMateMatch) {
        const rawMate = parseInt(scoreMateMatch[1], 10);
        const signedMate = isWhiteToMove ? rawMate : -rawMate;
        mate = signedMate;
        score =
          signedMate > 0
            ? 10000 - Math.abs(signedMate) * 100
            : -10000 + Math.abs(signedMate) * 100;
      }

      // Converte o lance UCI para SAN usando chess.js
      let san = firstUci;
      try {
        const tempChess = new Chess(this.currentFen);
        if (firstUci.length >= 4) {
          const from = firstUci.substring(0, 2);
          const to = firstUci.substring(2, 4);
          const promotion = firstUci.length > 4 ? firstUci[4] : undefined;
          const m = tempChess.move({ from, to, promotion });
          if (m) san = m.san;
        }
      } catch {
        // fallback caso o lance da engine dê algum conflito na posição
      }

      return {
        multipv,
        evaluation: {
          san,
          uci: firstUci,
          score,
          mate,
          depth,
          pv,
        },
      };
    } catch {
      return null;
    }
  }

  public setSkillLevel(rating: number) {
    if (!this.worker || this.workerFailed) return;
    const skill = Math.max(0, Math.min(20, Math.round((rating - 1000) / 70)));
    this.worker.postMessage(`setoption name Skill Level value ${skill}`);
  }

  public async evaluate(
    fen: string,
    depth = 10,
    timeoutMs = 2500,
  ): Promise<EvalResult> {
    if (this.workerFailed || !this.worker) {
      return {
        score: 0,
        mate: null,
        depth: 0,
        bestMove: "",
        topMoves: [],
      };
    }

    this.currentFen = fen;
    this.currentMultiPvMap.clear();

    return new Promise((resolve) => {
      this.pendingResolves.set(fen, resolve);

      const timeout = setTimeout(() => {
        if (this.pendingResolves.has(fen)) {
          this.pendingResolves.delete(fen);
          const topMoves = Array.from(this.currentMultiPvMap.values());
          resolve({
            score: topMoves[0]?.score || 0,
            mate: topMoves[0]?.mate || null,
            depth: topMoves[0]?.depth || 0,
            bestMove: topMoves[0]?.uci || "",
            topMoves: topMoves.slice(0, 3),
          });
        }
      }, timeoutMs);

      try {
        this.worker!.postMessage("stop");
        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go depth ${depth}`);
      } catch {
        clearTimeout(timeout);
        resolve({
          score: 0,
          mate: null,
          depth: 0,
          bestMove: "",
          topMoves: [],
        });
      }
    });
  }

  public generateBlunderExplanation(
    _fenBefore: string,
    playedSan: string,
    evalDropCentipawns: number,
    _playerColor: "w" | "b",
    bestAlternativeSan: string,
  ): string {
    const dropPawns = (evalDropCentipawns / 100).toFixed(1);

    let concept = "";
    if (evalDropCentipawns >= 300) {
      concept = "Pendurou peça ou permitiu golpe tático decisivo.";
    } else if (evalDropCentipawns >= 180) {
      concept =
        "Perdeu material imediato ou controle central decisivo sem compensação.";
    } else if (
      playedSan.startsWith("f") ||
      playedSan.includes("f6") ||
      playedSan.includes("f3")
    ) {
      concept =
        "Avanço do peão de f fragilizou perigosamente a diagonal do rei e a segurança do roque.";
    } else if (playedSan.startsWith("h") || playedSan.startsWith("a")) {
      concept =
        "Avanço de peão de flanco precoce, negligenciando o controle do centro e desenvolvimento.";
    } else {
      concept =
        "Cede a iniciativa e o controle das casas-chave da abertura para o adversário.";
    }

    return `O lance ${playedSan} reduziu sua vantagem em ${dropPawns} peões! ${concept} A melhor continuação teórica recomendada pela engine é ${bestAlternativeSan}.`;
  }
}

export const engineService = new EngineService();
