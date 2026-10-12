import { Chess } from 'chess.js';
import type { EngineMoveEvaluation } from '../types/chess';

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
  private pendingResolves: Map<string, (result: EvalResult) => void> = new Map();
  private currentFen = '';
  private currentMultiPvMap: Map<number, EngineMoveEvaluation> = new Map();
  private workerFailed = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    try {
      this.worker = new Worker('/stockfish/stockfish.js');

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';
        this.handleEngineOutput(line);
      };

      this.worker.onerror = (err) => {
        console.warn('Stockfish worker error, using fallback evaluator:', err);
        this.workerFailed = true;
      };

      // Send initial UCI commands
      this.worker.postMessage('uci');
      this.worker.postMessage('setoption name MultiPV value 3');
      this.worker.postMessage('isready');
    } catch (err) {
      console.warn('Could not initialize Stockfish worker:', err);
      this.workerFailed = true;
    }
  }

  private handleEngineOutput(line: string) {
    if (line.includes('readyok')) {
      this.isReady = true;
      return;
    }

    // Parse info depth ... multipv ... score ... pv ...
    if (line.startsWith('info') && line.includes('multipv') && line.includes('score')) {
      const parsed = this.parseInfoLine(line);
      if (parsed) {
        this.currentMultiPvMap.set(parsed.multipv, parsed.evaluation);
      }
    }

    // Bestmove signal terminates position search
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMoveUci = parts[1] || '';

      const topMoves = Array.from(this.currentMultiPvMap.values()).sort((a, b) => {
        // Sort best to worst
        if (a.mate !== null && b.mate !== null) return b.mate - a.mate;
        return b.score - a.score;
      });

      const topEval = topMoves[0] || {
        san: bestMoveUci,
        uci: bestMoveUci,
        score: 0,
        mate: null,
        depth: 8,
        pv: [bestMoveUci]
      };

      const result: EvalResult = {
        score: topEval.score,
        mate: topEval.mate,
        depth: topEval.depth,
        bestMove: bestMoveUci,
        topMoves: topMoves.slice(0, 3)
      };

      const resolve = this.pendingResolves.get(this.currentFen);
      if (resolve) {
        resolve(result);
        this.pendingResolves.delete(this.currentFen);
      }
    }
  }

  private parseInfoLine(line: string): { multipv: number; evaluation: EngineMoveEvaluation } | null {
    try {
      const depthMatch = line.match(/depth\s+(\d+)/);
      const multipvMatch = line.match(/multipv\s+(\d+)/);
      const scoreCpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const scoreMateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      const pvMatch = line.match(/pv\s+(.+)$/);

      if (!multipvMatch || !pvMatch) return null;

      const multipv = parseInt(multipvMatch[1], 10);
      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 10;
      const pv = pvMatch[1].trim().split(/\s+/);
      const firstUci = pv[0] || '';

      let score = 0;
      let mate: number | null = null;

      if (scoreCpMatch) {
        score = parseInt(scoreCpMatch[1], 10);
      } else if (scoreMateMatch) {
        mate = parseInt(scoreMateMatch[1], 10);
        score = mate > 0 ? 10000 - mate * 100 : -10000 - mate * 100;
      }

      // Convert UCI move to SAN
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
        // fallback
      }

      return {
        multipv,
        evaluation: {
          san,
          uci: firstUci,
          score,
          mate,
          depth,
          pv
        }
      };
    } catch {
      return null;
    }
  }

  public setSkillLevel(rating: number) {
    if (!this.worker || this.workerFailed) return;
    // Map rating (1000 to 2400) to Stockfish Skill Level (0 to 20)
    const skill = Math.max(0, Math.min(20, Math.round((rating - 1000) / 70)));
    this.worker.postMessage(`setoption name Skill Level value ${skill}`);
  }

  public async evaluate(fen: string, depth = 10, timeoutMs = 2500): Promise<EvalResult> {
    if (this.workerFailed || !this.worker) {
      return this.heuristicEvaluate(fen);
    }

    this.currentFen = fen;
    this.currentMultiPvMap.clear();

    return new Promise((resolve) => {
      this.pendingResolves.set(fen, resolve);

      const timeout = setTimeout(() => {
        if (this.pendingResolves.has(fen)) {
          this.pendingResolves.delete(fen);
          // Return whatever top moves we found or fallback
          if (this.currentMultiPvMap.size > 0) {
            const topMoves = Array.from(this.currentMultiPvMap.values());
            resolve({
              score: topMoves[0].score,
              mate: topMoves[0].mate,
              depth: topMoves[0].depth,
              bestMove: topMoves[0].uci,
              topMoves: topMoves.slice(0, 3)
            });
          } else {
            resolve(this.heuristicEvaluate(fen));
          }
        }
      }, timeoutMs);

      try {
        this.worker!.postMessage('stop');
        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go depth ${depth}`);
      } catch {
        clearTimeout(timeout);
        resolve(this.heuristicEvaluate(fen));
      }
    });
  }

  // Fast internal heuristic evaluator (fallback or instant hints)
  public heuristicEvaluate(fen: string): EvalResult {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });

    let score = 0;
    const pieceValues: Record<string, number> = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 0
    };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq) {
          const val = pieceValues[sq.type] || 0;
          // Center control bonus
          let centerBonus = 0;
          if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
            centerBonus = 25;
          } else if ((r >= 2 && r <= 5) && (c >= 2 && c <= 5)) {
            centerBonus = 10;
          }
          const totalVal = val + centerBonus;
          if (sq.color === 'w') score += totalVal;
          else score -= totalVal;
        }
      }
    }

    // Build evaluations for legal moves
    const topMoves: EngineMoveEvaluation[] = moves.slice(0, 3).map((m) => {
      const copy = new Chess(fen);
      copy.move(m);
      const delta = m.captured ? (pieceValues[m.captured] || 100) : 0;
      const moveScore = chess.turn() === 'w' ? score + delta : score - delta;
      return {
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion || ''}`,
        score: moveScore,
        mate: null,
        depth: 4,
        pv: [`${m.from}${m.to}`]
      };
    });

    const bestMove = topMoves[0]?.uci || (moves[0] ? `${moves[0].from}${moves[0].to}` : 'e2e4');

    return {
      score,
      mate: null,
      depth: 4,
      bestMove,
      topMoves
    };
  }

  // Explains in Portuguese why a player's move was bad based on evaluation drop and chess concepts
  public generateBlunderExplanation(
    _fenBefore: string,
    playedSan: string,
    evalDropCentipawns: number,
    _playerColor: 'w' | 'b',
    bestAlternativeSan: string
  ): string {
    const dropPawns = (evalDropCentipawns / 100).toFixed(1);

    // Check tactical features of the position
    let concept = '';
    if (evalDropCentipawns >= 300) {
      concept = 'Pendurou peça ou permitiu golpe tático decisivo.';
    } else if (evalDropCentipawns >= 180) {
      concept = 'Perdeu material imediato ou controle central decisivo sem compensação.';
    } else if (playedSan.startsWith('f') || playedSan.includes('f6') || playedSan.includes('f3')) {
      concept = 'Avanço do peão de f fragilizou perigosamente a diagonal do rei e a segurança do roque.';
    } else if (playedSan.startsWith('h') || playedSan.startsWith('a')) {
      concept = 'Avanço de peão de flanco precoce, negligenciando o controle do centro e desenvolvimento.';
    } else {
      concept = 'Cede a iniciativa e o controle das casas-chave da abertura para o adversário.';
    }

    return `O lance ${playedSan} reduziu sua vantagem em ${dropPawns} peões! ${concept} A melhor continuação teórica recomendada pela engine é ${bestAlternativeSan}.`;
  }
}

export const engineService = new EngineService();
