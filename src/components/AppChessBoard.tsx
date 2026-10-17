import { Chess, Move, type Square } from "chess.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Chessboard,
  fenStringToPositionObject,
  type ChessboardOptions,
  type PieceDropHandlerArgs,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import {
  getClosestRatingBuckets,
  getNextMove,
  type ExplorerResult,
} from "../services/lichessApi";
import { getRandomMoveByWeight } from "../utils/getRandomMoveByWeight";
import { normalizeLichessUci } from "../utils/normalizeLichesUci";
import {
  analyzePositionAsync,
  evaluatePosition,
  initStockfish,
  type StockfishEvaluation,
} from "../services/stockfishService";
import type {
  BadMoveInfo,
  ChessMove,
  MoveSuggestion,
  SessionMode,
  Side,
} from "../types";
import { PlayerInfo } from "./PlayerInfo";
import { uciToSan } from "../utils/uciToSan";
import { toCentipawns } from "../utils/formatEval";
import { playSound } from "../utils/playSound";
import { X } from "lucide-react";
import { assessPlayerMove, type MoveAssessment } from "../utils/assessMove";

export interface IAppChessBoardProps {
  playerOrientation?: "w" | "b";
  playerRating: number;
  onOpeningChange: (openingName: string) => void;
  onMoveMade: (moves: ChessMove[]) => void;
  onOpeningFinished: (pgn: string) => void;
  cpuStartMove: string | null;
  onBadMove: (info: BadMoveInfo) => void;
  mode: SessionMode;
}

export interface AppChessBoardHandle {
  // Desfaz o lance ruim do jogador e devolve a vez a ele
  retryLastMove: () => void;
  // Trava o tabuleiro de vez (partida encerrada)
  lock: () => void;
}

// Perda (em centipawns) a partir da qual o lance é considerado ruim
const BAD_MOVE_THRESHOLD_CP = 150;
const MIN_GAMES_IN_BOOK = 50;
const MIN_PLIES_BEFORE_OPENING_END = 2;
const MAX_SUGGESTIONS = 5;

const getBoardOrientation = (playerSide: Side) => {
  return playerSide === "w" ? "white" : "black";
};

function playMoveSound(move: Move) {
  playSound(move.captured ? "capture" : "move");
}

// Retorna a mesma posição, mas com o turno trocado (e sem en passant),
// usado para calcular lances válidos do jogador durante a vez da CPU (premoves)
function fenWithTurn(fen: string, turn: Side) {
  const parts = fen.split(" ");
  parts[1] = turn;
  parts[3] = "-";
  return parts.join(" ");
}

const AppChessBoard = forwardRef<AppChessBoardHandle, IAppChessBoardProps>(
  function AppChessBoard(
    {
      playerOrientation = "w",
      playerRating,
      onOpeningChange,
      onMoveMade,
      cpuStartMove,
      onOpeningFinished,
      onBadMove,
      mode,
    },
    ref,
  ) {
    // jogo de xadrez estável entre renders
    const [chessGame] = useState(() => new Chess());

    // track the current position of the chess game in state to trigger a re-render of the chessboard
    const [chessPosition, setChessPosition] = useState(chessGame.fen());
    const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
    const [showAnimations, setShowAnimations] = useState(true);
    const premovesRef = useRef<PieceDropHandlerArgs[]>([]);

    // state to manage click-to-move selection
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

    const cpuOpenedRef = useRef(false);
    const openingFinishedRef = useRef(false);
    const mountedRef = useRef(true);
    const badMovePendingRef = useRef(false);
    const retryContextRef = useRef<{
      score: number;
      evaluations: StockfishEvaluation[];
    } | null>(null);

    // Sempre guarda os valores mais recentes das props para uso dentro de
    // setTimeout/async (evita closures obsoletas)
    const latest = useRef({
      playerRating,
      playerOrientation,
      cpuStartMove,
      onOpeningChange,
      onMoveMade,
      onOpeningFinished,
      onBadMove,
      mode,
    });
    latest.current = {
      playerRating,
      playerOrientation,
      cpuStartMove,
      onOpeningChange,
      onMoveMade,
      onOpeningFinished,
      onBadMove,
      mode,
    };

    // STOCKFISH (em refs para que closures assíncronas leiam sempre o valor atual)
    const topMovesAnalysisRef = useRef<StockfishEvaluation[]>([]);
    const lastScoreForPlayerRef = useRef(0);
    const lastScoreForCPURef = useRef(0);

    // Controle de timers / execução de premove
    const cpuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isExecutingPremoveRef = useRef(false);

    // Rating da CPU: faixa formada pelos 2 buckets do Lichess mais próximos do
    // rating atual do jogador (ordenados do menor para o maior)
    const cpuRatingLabel = useMemo(() => {
      const [low, high] = [...getClosestRatingBuckets(playerRating)].sort(
        (a, b) => a - b,
      );
      return low === high ? `${low}` : `${low} – ${high}`;
    }, [playerRating]);
    const cpuSide: Side = playerOrientation === "w" ? "b" : "w";

    // Para tudo (CPU, premoves, seleção) e avisa o pai, que decide o que fazer
    // conforme o modo da sessão (desafio encerra; tutor abre o modal)
    function handleBadMoveDetected(
      fenBefore: string,
      playedSan: string,
      assessment: MoveAssessment,
      scoreBefore: number,
      bestMovesBefore: StockfishEvaluation[],
      bestReplyUci?: string,
    ) {
      badMovePendingRef.current = true;
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      premovesRef.current = [];
      setPremoves([]);
      setSelectedSquare(null);

      retryContextRef.current = {
        score: scoreBefore,
        evaluations: bestMovesBefore,
      };

      const suggestions: MoveSuggestion[] = [];
      for (const evaluation of bestMovesBefore) {
        const san = uciToSan(fenBefore, evaluation.move);
        if (!san) continue;
        suggestions.push({
          san,
          score: evaluation.score,
          isMate: evaluation.isMate,
        });
        if (suggestions.length === MAX_SUGGESTIONS) break;
      }

      const bestReply = bestReplyUci
        ? uciToSan(chessGame.fen(), bestReplyUci)
        : null;

      latest.current.onBadMove({
        pgn: chessGame.pgn(),
        playedSan,
        lossCp: assessment.lossCp,
        kind: assessment.kind,
        evalAfterCp: assessment.evalAfterCp,
        suggestions,
        bestReply,
      });
    }

    // Trava o tabuleiro definitivamente (partida encerrada)
    function lockBoard() {
      openingFinishedRef.current = true;
      badMovePendingRef.current = false;
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      premovesRef.current = [];
      setPremoves([]);
      setSelectedSquare(null);
    }

    // Desfaz o lance ruim e devolve a vez ao jogador
    function retryLastMove() {
      if (!badMovePendingRef.current) return;

      chessGame.undo();
      setChessPosition(chessGame.fen());
      updateMovesHistory();

      const context = retryContextRef.current;
      if (context) {
        lastScoreForPlayerRef.current = context.score;
        topMovesAnalysisRef.current = context.evaluations;
      }

      setSelectedSquare(null);
      badMovePendingRef.current = false;
    }

    useImperativeHandle(ref, () => ({
      retryLastMove,
      lock: lockBoard,
    }));

    // Trava o tabuleiro e avisa o pai (que calcula o rating, salva a partida e
    // abre o modal). Só dispara uma vez por tabuleiro.
    function handleOpeningFinished() {
      if (openingFinishedRef.current || !mountedRef.current) return;
      openingFinishedRef.current = true;

      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      premovesRef.current = [];
      setPremoves([]);
      setSelectedSquare(null);

      latest.current.onOpeningFinished(chessGame.pgn());
    }

    function hasOpeningEnded(explorer: ExplorerResult) {
      if (explorer.failed) return false;
      if (chessGame.history().length < MIN_PLIES_BEFORE_OPENING_END)
        return false;
      return explorer.totalGames < MIN_GAMES_IN_BOOK;
    }

    // Função para atualizar e repassar os movimentos ao componente pai
    function updateMovesHistory() {
      const verboseHistory = chessGame.history({ verbose: true });

      const formattedMoves: ChessMove[] = verboseHistory.map((item, index) => {
        // O número do lance no xadrez avança a cada par (Branca + Preta)
        // index 0 (Branca) -> turn 1, index 1 (Preta) -> turn 1, index 2 (Branca) -> turn 2, etc.
        const moveNumber = Math.floor(index / 2) + 1;
        return {
          move: item.san, // Ex: "e4", "Nf3", "O-O"
          number: moveNumber,
        };
      });

      latest.current.onMoveMade(formattedMoves); // Repassa para o componente pai via prop
    }

    // Monta um jogo "virtual" onde é a vez do jogador e todos os premoves da fila
    // já foram aplicados. Serve para validar premoves (inclusive encadeados da
    // mesma peça, ex.: e2e4 e depois e4e5) e para destacar lances possíveis.
    function getPremoveGame(): Chess {
      const side = latest.current.playerOrientation;
      try {
        const game = new Chess(fenWithTurn(chessGame.fen(), side));
        for (const premove of premovesRef.current) {
          try {
            game.move({
              from: premove.sourceSquare as Square,
              to: premove.targetSquare as Square,
              promotion: "q",
            });
          } catch {
            // premove que não se aplica na sequência: ignora na simulação
          }
          // devolve a vez ao jogador para simular o próximo premove
          game.load(fenWithTurn(game.fen(), side));
        }
        return game;
      } catch {
        return new Chess(chessGame.fen());
      }
    }

    function makeCpuMove(from: string, to: string) {
      try {
        const move = chessGame.move({
          from: from as Square,
          to: to as Square,
          promotion: "q",
        });
        playMoveSound(move);
        setChessPosition(chessGame.fen());
        updateMovesHistory();

        // Avaliar Posicao
        setTimeout(() => {
          evaluatePosition(chessGame.fen());
        });

        return true;
      } catch (error) {
        console.error("Movimento inválido:", error);
        return false;
      }
    }

    async function makePlayerMove(
      from: Square,
      to: Square,
      isPremove = false,
    ): Promise<boolean> {
      if (openingFinishedRef.current || badMovePendingRef.current) return false;

      const side = latest.current.playerOrientation;
      const isMyTurn = chessGame.turn() === side;

      // ---------- É a vez do jogador: executa o lance de verdade ----------
      if (isMyTurn) {
        // Um premove está prestes a ser executado: ignora cliques manuais
        if (!isPremove && isExecutingPremoveRef.current) {
          return false;
        }

        const sourcePiece = chessGame.get(from);
        if (!sourcePiece || sourcePiece.color !== side) {
          return false;
        }

        // Guarda a avaliação ANTES do lance (a análise abaixo vai sobrescrevê-la)
        const scoreBeforeMove = lastScoreForPlayerRef.current;
        const bestMovesBefore = topMovesAnalysisRef.current;

        const fenBefore = chessGame.fen();
        let playedSan: string;
        let playedMove: Move;

        try {
          playedMove = chessGame.move({ from, to, promotion: "q" });
          playedSan = playedMove.san;
        } catch {
          return false; // lance ilegal
        }

        playMoveSound(playedMove);
        setChessPosition(chessGame.fen());
        setSelectedSquare(null);
        updateMovesHistory();

        // Executa análise assíncrona do lance feito
        try {
          const evaluations = await analyzePositionAsync(chessGame.fen());

          if (!mountedRef.current || openingFinishedRef.current) return true;

          if (evaluations.length > 0) {
            // A melhor resposta da CPU vem do ponto de vista dela: inverte
            const scoreAfterMove = -toCentipawns(evaluations[0]);

            const assessment = assessPlayerMove({
              scoreBeforeCp: scoreBeforeMove,
              scoreAfterCp: scoreAfterMove,
              mode: latest.current.mode,
            });

            if (assessment) {
              // Não agenda o lance da CPU: o pai decide se encerra ou desfaz
              handleBadMoveDetected(
                fenBefore,
                playedSan,
                assessment,
                scoreBeforeMove,
                bestMovesBefore,
                evaluations[0]?.move,
              );
              return true;
            }
          }
        } catch (e) {
          console.error("Erro ao analisar o lance do jogador:", e);
        }

        if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
        cpuTimeoutRef.current = setTimeout(makeSmartCpuMove, 10);
        return true;
      }

      // ---------- Não é a vez do jogador ----------
      // Um premove que chegou aqui falhou (ainda não é a vez): sinaliza falha
      if (isPremove) {
        return false;
      }

      // Registra um novo premove, validando contra a posição virtual
      // (a que já considera os premoves anteriores da fila)
      const premoveGame = getPremoveGame();
      const virtualPiece = premoveGame.get(from);

      if (!virtualPiece || virtualPiece.color !== side) {
        return false;
      }

      const isLegalPremove = premoveGame
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to);

      if (!isLegalPremove) {
        return false;
      }

      premovesRef.current.push({
        sourceSquare: from,
        targetSquare: to,
        piece: {
          pieceType: `${virtualPiece.color}${virtualPiece.type.toUpperCase()}`,
          isSparePiece: false,
          position: from,
        },
      });
      setPremoves([...premovesRef.current]);
      return true;
    }

    // Faz um movimento inteligente baseado no banco de dados do lichess
    async function makeSmartCpuMove() {
      if (chessGame.isGameOver()) {
        return;
      }

      // Consulta os 90% lances mais populares baseados no rating do jogador
      const explorer = await getNextMove(
        latest.current.playerRating,
        chessGame.fen(),
      );
      const topMoves = explorer.moves;

      if (!mountedRef.current || openingFinishedRef.current) return;

      if (hasOpeningEnded(explorer)) {
        handleOpeningFinished();
        return;
      }

      let selectedMoveUci: string | null = null;
      let selectedMoveOpening: string = "";

      // Lance inicial fixo da sessão: vale só para o 1º lance da CPU
      const forcedStartMove =
        chessGame.history().length <= 1 ? latest.current.cpuStartMove : null;

      if (forcedStartMove) {
        selectedMoveUci = forcedStartMove;
        // O Explorer entra só para obter o nome da abertura desse lance
        const match = topMoves.find(
          (m) => normalizeLichessUci(m.uci) === forcedStartMove,
        );
        selectedMoveOpening = match?.opening?.name ?? "";
      } else if (topMoves.length > 0) {
        const weightedMove = getRandomMoveByWeight(topMoves);
        if (weightedMove) {
          selectedMoveUci = normalizeLichessUci(weightedMove.uci);
          if (weightedMove.opening?.name) {
            selectedMoveOpening = weightedMove.opening.name;
          }
        }
      }

      // Fallback: se a API falhar ou não encontrar registros, recorre aos lances válidos do chess.js aleatoriamente
      if (!selectedMoveUci) {
        const possibleMoves = chessGame.moves({ verbose: true });
        if (possibleMoves.length === 0) return;
        const fallbackMove =
          possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        selectedMoveUci = `${fallbackMove.from}${fallbackMove.to}${fallbackMove.promotion || ""}`;
      }

      try {
        const tempGame = new Chess(chessGame.fen());
        tempGame.move({
          from: selectedMoveUci.slice(0, 2) as Square,
          to: selectedMoveUci.slice(2, 4) as Square,
          promotion: selectedMoveUci[4] || "q",
        });

        const fenSimulada = tempGame.fen();

        //  Pede a análise da posição futura (simulada)
        // A CPU vai "esperar" aqui enquanto o Stockfish analisa
        await analyzePositionAsync(fenSimulada);

        const cpuMove = chessGame.move({
          from: selectedMoveUci.slice(0, 2) as Square,
          to: selectedMoveUci.slice(2, 4) as Square,
          promotion: selectedMoveUci[4] || "q",
        });

        playMoveSound(cpuMove);
        setChessPosition(chessGame.fen());

        if (selectedMoveOpening) {
          latest.current.onOpeningChange(selectedMoveOpening);
        }

        updateMovesHistory();
      } catch (e) {
        console.error("Erro ao executar o lance da CPU:", e);
        return;
      }

      // Se a partida acabou com o lance da CPU, descarta os premoves pendentes
      if (chessGame.isGameOver()) {
        premovesRef.current = [];
        setPremoves([]);
        return;
      }

      // Gerenciamento de premoves
      if (premovesRef.current.length > 0) {
        const nextPlayerPremove = premovesRef.current.shift()!;
        isExecutingPremoveRef.current = true;

        setTimeout(async () => {
          let premoveSuccessful = false;

          try {
            premoveSuccessful = await makePlayerMove(
              nextPlayerPremove.sourceSquare as Square,
              nextPlayerPremove.targetSquare as Square,
              true,
            );
          } finally {
            isExecutingPremoveRef.current = false;
          }

          // Premove falhou (ex.: peça capturada, lance ilegal): limpa a fila
          if (!premoveSuccessful) {
            premovesRef.current = [];
          }

          setPremoves([...premovesRef.current]);
          setShowAnimations(false);

          setTimeout(() => {
            setShowAnimations(true);
          }, 50);
        }, 300);
      }
    }

    // handle square click for click-to-move
    function onSquareClick({ square, piece }: SquareHandlerArgs) {
      if (openingFinishedRef.current || badMovePendingRef.current) return;

      const side = latest.current.playerOrientation;
      // "piece" vem do tabuleiro renderizado (já inclui os premoves)
      const isOwnPiece = !!piece && piece.pieceType[0] === side;

      // Se já temos uma casa selecionada
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }

        // Clicou em outra peça própria: apenas troca a seleção
        if (isOwnPiece) {
          setSelectedSquare(square as Square);
          return;
        }

        // Tenta mover (vira lance normal na sua vez, ou premove na vez da CPU)
        void makePlayerMove(selectedSquare, square as Square);
        setSelectedSquare(null);
        return;
      }

      // Se nenhuma casa estava selecionada antes, seleciona apenas peças do jogador
      setSelectedSquare(isOwnPiece ? (square as Square) : null);
    }

    // Limpa premoves e seleção (clique direito no desktop, botão no celular)
    function clearPremoves() {
      premovesRef.current = [];
      setPremoves([]);
      setSelectedSquare(null);

      // desliga as animações enquanto limpa e religa logo depois
      setShowAnimations(false);
      setTimeout(() => {
        setShowAnimations(true);
      }, 50);
    }

    // only allow player pieces to be dragged
    function canDragPiece() {
      return false;
    }

    // create a position object from the fen string to split the premoves from the game state
    const position = fenStringToPositionObject(chessPosition, 8, 8);
    const squareStyles: Record<string, React.CSSProperties> = {};

    // Destacar o último movimento realizado no jogo
    const history = chessGame.history({ verbose: true });
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      const lastMoveStyle = { backgroundColor: "rgba(155, 199, 0, 0.4)" };
      squareStyles[lastMove.from] = lastMoveStyle;
      squareStyles[lastMove.to] = lastMoveStyle;
    }

    // highlight selected square for click-to-move
    if (selectedSquare) {
      squareStyles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };

      // Na vez do jogador usa o jogo real; na vez da CPU usa o jogo virtual
      // (turno trocado + premoves aplicados), para mostrar os lances de premove
      const movesSource =
        chessGame.turn() === playerOrientation ? chessGame : getPremoveGame();

      const validMoves = movesSource.moves({
        square: selectedSquare,
        verbose: true,
      });

      for (const move of validMoves) {
        if (move.captured) {
          // Se a casa contém uma peça capturável, aplica uma borda vermelha (e mantém um indicador visual de alvo)
          squareStyles[move.to] = {
            boxShadow: "inset 0 0 0 4px rgba(255, 0, 0, 0.6)",
            background:
              "radial-gradient(circle, transparent 20%, rgba(255, 0, 0, 0.2) 20%)",
          };
        } else {
          // Movimento normal (sem captura)
          squareStyles[move.to] = {
            background:
              "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
            borderRadius: "50%",
          };
        }
      }
    }

    // add premoves to the position object to show them on the board
    for (const premove of premoves) {
      delete position[premove.sourceSquare];
      position[premove.targetSquare!] = {
        pieceType: premove.piece.pieceType,
      };
      squareStyles[premove.sourceSquare] = {
        backgroundColor: "rgba(255,0,0,0.2)",
      };
      squareStyles[premove.targetSquare!] = {
        backgroundColor: "rgba(255,0,0,0.2)",
      };
    }

    // set the chessboard options
    const chessboardOptions: ChessboardOptions = {
      canDragPiece,
      onSquareClick,
      onSquareRightClick: clearPremoves,
      position,
      showAnimations,
      squareStyles,
      id: "premoves",
      boardOrientation: getBoardOrientation(playerOrientation),
    };

    useEffect(() => {
      if (cpuOpenedRef.current) return;
      if (
        chessGame.moveNumber() === 1 &&
        chessGame.turn() === "w" &&
        playerOrientation === "b"
      ) {
        cpuOpenedRef.current = true;
        const startMove = latest.current.cpuStartMove;

        if (startMove) {
          makeCpuMove(startMove.slice(0, 2), startMove.slice(2, 4));
        } else {
          // Automático: sorteia pelo banco do Lichess, como nos demais lances
          void makeSmartCpuMove();
        }
      }
    }, [playerOrientation]);

    useEffect(() => {
      initStockfish((evaluations, turn) => {
        topMovesAnalysisRef.current = evaluations;
        if (evaluations.length > 0) {
          if (turn === latest.current.playerOrientation) {
            lastScoreForPlayerRef.current = toCentipawns(evaluations[0]);
          } else {
            lastScoreForCPURef.current = toCentipawns(evaluations[0]);
          }
        }
      });

      if (latest.current.playerOrientation === "w") {
        evaluatePosition(chessGame.fen());
      }
    }, []);

    // Marca o tabuleiro como montado e limpa o timer da CPU ao desmontar
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      };
    }, []);

    return (
      // Card único (header + tabuleiro), dimensionado pelo container do App.
      // Chrome do card: padding 8px*2 + borda 1px*2 = 18px na largura e, na
      // altura, 18px + header (56px) + gap (8px) = 82px. Como o tabuleiro é
      // quadrado, a altura do card é largura + 64px. Logo, a largura é o menor entre:
      //  - largura disponível - painel lateral (--side-panel-w, só em md+)
      //  - altura disponível - 64px - painel inferior (--bottom-panel-h, só no celular)
      <div
        className="flex shrink-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2"
        style={{
          width:
            "min(calc(100cqw - var(--side-panel-w, 0px)), calc(100cqh - 64px - var(--bottom-panel-h, 0px)))",
        }}
      >
        {/* Header: rating do jogador x rating da CPU */}
        <header className="flex h-14 items-center justify-between gap-3 px-2">
          <PlayerInfo
            name="Você"
            side={playerOrientation}
            rating={String(playerRating)}
            isPlayer
          />
          {premoves.length > 0 ? (
            <button
              type="button"
              onClick={clearPremoves}
              aria-label="Limpar premoves"
              title="Limpar premoves"
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-rose-500/60 px-2 text-xs font-semibold tabular-nums text-rose-400 transition-colors hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <X size={14} aria-hidden />
              {premoves.length}
            </button>
          ) : (
            <span className="text-xs font-bold tracking-widest text-rose-500">
              VS
            </span>
          )}
          <PlayerInfo
            name="CPU"
            side={cpuSide}
            rating={cpuRatingLabel}
            reverse
          />
        </header>

        {/* touch-manipulation: evita o zoom por toque duplo ao jogar rápido */}
        <div className="aspect-square w-full touch-manipulation select-none overflow-hidden rounded-md">
          <Chessboard options={chessboardOptions} />
        </div>
      </div>
    );
  },
);

export default AppChessBoard;
