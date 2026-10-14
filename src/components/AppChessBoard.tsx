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
import { evaluatePosition, initStockfish } from "../services/stockfishService";

export interface IAppChessBoardProps {
  playerOrientation?: "w" | "b";
  playerRating: number;
}

const getBoardOrientation = (playerSide: "w" | "b") => {
  return playerSide === "w" ? "white" : "black";
};

export default function AppChessBoard({
  playerOrientation = "w",
  playerRating,
}: IAppChessBoardProps) {
  // create a chess game using a ref to always have access to the latest game state within closures and maintain the game state across renders
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  // track the current position of the chess game in state to trigger a re-render of the chessboard
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
  const [showAnimations, setShowAnimations] = useState(true);
  const premovesRef = useRef<PieceDropHandlerArgs[]>([]);

  // state to manage click-to-move selection
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  function makeCpuMove(from: string, to: string) {
    try {
      chessGame.move({
        from: from as Square,
        to: to as Square,
        promotion: "q",
      });
      setChessPosition(chessGame.fen());
      return true;
    } catch (error) {
      console.error("Movimento inválido:", error);
      return false;
    }
  }

  // Faz um movimento inteligente baseado no banco de dados do lichess
  async function makeSmartCpuMove() {
    if (chessGame.isGameOver()) {
      return;
    }

    // Consulta os 90% lances mais populares baseados no rating do jogador
    const topMoves = await getNextMove(playerRating, chessGame.fen());
    console.log("🚀 ~ makeSmartCpuMove ~ topMoves:", topMoves);
    let selectedMoveUci: string | null = null;

    if (topMoves.length > 0) {
      const weightedMove = getRandomMoveByWeight(topMoves);
      if (weightedMove) {
        selectedMoveUci = normalizeLichessUci(weightedMove.uci);
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
      chessGame.move({
        from: selectedMoveUci.slice(0, 2) as Square,
        to: selectedMoveUci.slice(2, 4) as Square,
        promotion: selectedMoveUci[4] || "q",
      });
      setChessPosition(chessGame.fen());

      // Avaliar Posicao
      evaluatePosition(chessGame.fen());
    } catch (e) {
      console.error("Erro ao executar o lance da CPU:", e);
      return;
    }

    // Gerenciamento de premoves (mantido igual)
    if (premovesRef.current.length > 0) {
      const nextPlayerPremove = premovesRef.current[0];
      premovesRef.current.splice(0, 1);

      setTimeout(() => {
        const premoveSuccessful = onPieceDrop(nextPlayerPremove);

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

  // handle piece drop
  function onPieceDrop({
    sourceSquare,
    targetSquare,
    piece,
  }: PieceDropHandlerArgs) {
    // type targetSquare potentially being null (e.g. if dropped off board) or user dropping piece onto same square
    if (!targetSquare || sourceSquare === targetSquare) {
      return false;
    }

    // check if a premove (piece isn't the color of the current player's turn)
    const pieceColor = piece.pieceType[0]; // 'w' or 'b'
    if (chessGame.turn() !== pieceColor) {
      premovesRef.current.push({
        sourceSquare,
        targetSquare,
        piece,
      });
      setPremoves([...premovesRef.current]);
      // return early to stop processing the move and return true to not animate the move
      return true;
    }

    // try to make the move
    try {
      chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to a queen for example simplicity
      });

      // update the position state
      setChessPosition(chessGame.fen());
      setSelectedSquare(null); // clear selection on successful move

      // Avaliar Posicao
      evaluatePosition(chessGame.fen());

      // Vez da CPU jogar
      setTimeout(makeSmartCpuMove, 500);

      // return true as the move was successful
      return true;
    } catch {
      // return false as the move was not successful
      return false;
    }
  }

  // handle square click for click-to-move
  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    // Se já temos uma casa selecionada
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const sourcePiece = chessGame.get(selectedSquare as Square);

      // Validação de segurança: Se a peça selecionada for preta (inimigo), cancela a seleção imediatamente
      if (!sourcePiece || sourcePiece.color !== playerOrientation) {
        setSelectedSquare(null);
        return;
      }

      const isMyTurn = chessGame.turn() === sourcePiece?.color;

      if (isMyTurn) {
        // É a minha vez: tenta fazer o movimento normal
        try {
          const moveResult = chessGame.move({
            from: selectedSquare as Square,
            to: square as Square,
            promotion: "q",
          });

          if (moveResult) {
            setChessPosition(chessGame.fen());
            setSelectedSquare(null);

            // Avaliar Posicao
            evaluatePosition(chessGame.fen());

            // Vez da CPU jogar
            setTimeout(makeSmartCpuMove, 500);
            return;
          }
        } catch {
          // Movimento normal inválido. Se clicou em outra peça própria, troca a seleção.
          if (piece && piece.pieceType[0] === chessGame.turn()) {
            setSelectedSquare(square as Square);
            return;
          }
        }
      } else {
        // NÃO é a minha vez: isso sim é um Premove por clique
        if (sourcePiece) {
          premovesRef.current.push({
            sourceSquare: selectedSquare,
            targetSquare: square,
            piece: {
              pieceType: `${sourcePiece.color}${sourcePiece.type.toUpperCase()}`,
              isSparePiece: false,
              position: selectedSquare,
            },
          });
          setPremoves([...premovesRef.current]);
        }
      }

      setSelectedSquare(null);
      return;
    }

    // Se nenhuma casa estava selecionada antes, seleciona se houver peça
    if (piece) {
      setSelectedSquare(square as Square);
    } else {
      setSelectedSquare(null);
    }
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
  function canDragPiece({ piece }: PieceHandlerArgs) {
    return piece.pieceType[0] === playerOrientation;
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

    // Optional: highlight valid moves for the selected piece
    const validMoves = chessGame.moves({
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
    onPieceDrop,
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
    initStockfish((bestMove, evaluation) => {
      console.log("🚀 ~ AppChessBoard ~ evaluation:", evaluation);
      console.log("Stockfish - Melhor lance:", bestMove);
      // Aqui você pode tratar o feedback para o usuário depois se quiser
    });
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
