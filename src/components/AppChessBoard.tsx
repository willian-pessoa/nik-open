import { Chess, type Square } from "chess.js";
import { useEffect, useRef, useState } from "react";
import {
  Chessboard,
  fenStringToPositionObject,
  type ChessboardOptions,
  type PieceDropHandlerArgs,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { getNextMove } from "../services/lichessApi";
import { getRandomMoveByWeight } from "../utils/getRandomMoveByWeight";
import { normalizeLichessUci } from "../utils/normalizeLichesUci";
import {
  analyzePositionAsync,
  evaluatePosition,
  initStockfish,
  type StockfishEvaluation,
} from "../services/stockfishService";
import type { ChessMove, LichessMove } from "../types";

export interface IAppChessBoardProps {
  playerOrientation?: "w" | "b";
  playerRating: number;
  onOpeningChange: (openingName: string) => void;
  onMoveMade: (moves: ChessMove[]) => void;
}

type Side = "w" | "b";

// Perda (em centipawns) a partir da qual o lance é considerado ruim
const BAD_MOVE_THRESHOLD_CP = 150;

const getBoardOrientation = (playerSide: Side) => {
  return playerSide === "w" ? "white" : "black";
};

// Retorna a mesma posição, mas com o turno trocado (e sem en passant),
// usado para calcular lances válidos do jogador durante a vez da CPU (premoves)
function fenWithTurn(fen: string, turn: Side) {
  const parts = fen.split(" ");
  parts[1] = turn;
  parts[3] = "-";
  return parts.join(" ");
}

export default function AppChessBoard({
  playerOrientation = "w",
  playerRating,
  onOpeningChange,
  onMoveMade,
}: IAppChessBoardProps) {
  // jogo de xadrez estável entre renders
  const [chessGame] = useState(() => new Chess());

  // track the current position of the chess game in state to trigger a re-render of the chessboard
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
  const [showAnimations, setShowAnimations] = useState(true);
  const premovesRef = useRef<PieceDropHandlerArgs[]>([]);

  // state to manage click-to-move selection
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  // Sempre guarda os valores mais recentes das props para uso dentro de
  // setTimeout/async (evita closures obsoletas)
  const latest = useRef({
    playerRating,
    playerOrientation,
    onOpeningChange,
    onMoveMade,
  });
  latest.current = {
    playerRating,
    playerOrientation,
    onOpeningChange,
    onMoveMade,
  };

  // STOCKFISH (em refs para que closures assíncronas leiam sempre o valor atual)
  const topMovesAnalysisRef = useRef<StockfishEvaluation[]>([]);
  const lastScoreForPlayerRef = useRef(0);
  const lastScoreForCPURef = useRef(0);

  // Controle de timers / execução de premove
  const cpuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingPremoveRef = useRef(false);

  async function handleBadMoveDetected(
    from: string,
    to: string,
    scoreLost: number,
    bestMoves: StockfishEvaluation[],
  ) {
    console.log("BAD MOVE");
    // TODO
    // Essa função provalvemente vai vim do componente pai, por enquanto deixamos sua declaracao aqui
    // sua tarefa vai ser disparar o modal de movimento errado com caso esteja no modo tutor,
    // caso no modo desafio, partida é encerrada, calcula novo rating, salva a partida no historico da sessao e aparece o botao para iniciar uma nova partida
  }

  async function handleOpeningFinished() {
    // TODO
    // Essa função provalvemente vai vim do componente pai, por enquanto deixamos sua declaracao aqui
    // tarefa vai ser disparar o modal de conclusao da abertura, calculo do rating, salvamento da partida no historico da sessao e o botao para iniciar uma nova rodada
  }

  function hasOpeningEnded(topMoves: LichessMove[]) {
    //TODO
    // verifica se abertura acababou baseaod na quantidade de partidas naquela posição
    return false;
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
      chessGame.move({
        from: from as Square,
        to: to as Square,
        promotion: "q",
      });
      setChessPosition(chessGame.fen());

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

      try {
        chessGame.move({ from, to, promotion: "q" });
      } catch {
        return false; // lance ilegal
      }

      setChessPosition(chessGame.fen());
      setSelectedSquare(null);
      updateMovesHistory();

      // Executa análise assíncrona do lance feito
      try {
        const evaluations = await analyzePositionAsync(chessGame.fen());

        if (evaluations.length > 0) {
          const melhorScoreDaCpu = evaluations[0].score;
          const scoreRealDoJogadorAposCpu = -melhorScoreDaCpu;
          const perdaCentipawns = scoreBeforeMove - scoreRealDoJogadorAposCpu;

          if (perdaCentipawns >= BAD_MOVE_THRESHOLD_CP) {
            await handleBadMoveDetected(
              from,
              to,
              perdaCentipawns,
              bestMovesBefore,
            );
          }
        }
      } catch (e) {
        console.error("Erro ao analisar o lance do jogador:", e);
      }

      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = setTimeout(makeSmartCpuMove, 500);
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
    const topMoves = await getNextMove(
      latest.current.playerRating,
      chessGame.fen(),
    );

    if (hasOpeningEnded(topMoves)) {
      handleOpeningFinished();
    }

    let selectedMoveUci: string | null = null;
    let selectedMoveOpening: string = "";

    if (topMoves.length > 0) {
      const weightedMove = getRandomMoveByWeight(topMoves);
      if (weightedMove) {
        selectedMoveUci = normalizeLichessUci(weightedMove.uci);
        if (weightedMove.opening?.name) {
          selectedMoveOpening = weightedMove.opening?.name;
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

      chessGame.move({
        from: selectedMoveUci.slice(0, 2) as Square,
        to: selectedMoveUci.slice(2, 4) as Square,
        promotion: selectedMoveUci[4] || "q",
      });

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

  // clear all premoves and selection on right click
  function onSquareRightClick() {
    premovesRef.current = [];
    setPremoves([...premovesRef.current]);
    setSelectedSquare(null);

    // disable animations while clearing premoves
    setShowAnimations(false);

    // re-enable animations after a short delay
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
    onSquareRightClick,
    position,
    showAnimations,
    squareStyles,
    id: "premoves",
    boardOrientation: getBoardOrientation(playerOrientation),
  };

  useEffect(() => {
    if (
      chessGame.moveNumber() === 1 &&
      chessGame.turn() === "w" &&
      playerOrientation === "b"
    ) {
      makeCpuMove("e2", "e4");
    }
  }, [playerOrientation]);

  useEffect(() => {
    initStockfish((evaluations, turn) => {
      topMovesAnalysisRef.current = evaluations;
      if (evaluations.length > 0) {
        if (turn === latest.current.playerOrientation) {
          lastScoreForPlayerRef.current = evaluations[0].score;
        } else {
          lastScoreForCPURef.current = evaluations[0].score;
        }
      }
    });
  }, []);

  // Limpa o timer da CPU ao desmontar
  useEffect(() => {
    return () => {
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-2 h-full flex-1 min-w-0 min-h-0 overflow-hidden">
      <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0">
        <div className="w-auto h-auto max-w-full max-h-full aspect-square flex items-center justify-center">
          <Chessboard options={chessboardOptions} />
        </div>
      </div>
    </div>
  );
}
