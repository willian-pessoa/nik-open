import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RotateCcw, ArrowUpDown, Info, Loader2, Key } from "lucide-react";
import type { Arrow } from "react-chessboard";

import type {
  StudySession,
  GameHistoryItem,
  EngineMoveEvaluation,
  OpeningBookMove,
} from "./types/chess";
import { StorageService, type UserSettings } from "./services/storage";
import { SoundService } from "./services/sound";
import {
  getPositionOpeningStatus,
  fetchLichessExplorerOnline,
  pickWeightedMove,
  type OpeningStatus,
} from "./services/openingBook";
import { engineService } from "./services/engine";

import { Navbar } from "./components/Navbar";
import { EvalBar } from "./components/EvalBar";
import { MoveList } from "./components/MoveList";
import { TutorBlunderModal } from "./components/TutorBlunderModal";
import { OpeningSuccessModal } from "./components/OpeningSuccessModal";
import { SessionManagerModal } from "./components/SessionManagerModal";
import { HistoryModal } from "./components/HistoryModal";
import { StatsModal } from "./components/StatsModal";
import { SettingsModal } from "./components/SettingsModal";

export const App: React.FC = () => {
  // Sessions & Storage State
  const [sessions, setSessions] = useState<StudySession[]>(() =>
    StorageService.getSessions(),
  );
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    StorageService.getActiveSessionId(),
  );
  const [settings, setSettings] = useState<UserSettings>(() =>
    StorageService.getSettings(),
  );
  const [historyCount, setHistoryCount] = useState<number>(
    () => StorageService.getHistory().length,
  );

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const isTutorMode = activeSession.mode === "tutor";
  const playerColor = activeSession.playerColor; // 'w' or 'b'
  const sessionRating = isTutorMode
    ? activeSession.tutorRating
    : activeSession.hardRating;

  // Board & Game State
  const gameRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState<string>(() => gameRef.current.fen());
  const [movesSan, setMovesSan] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [orientation, setOrientation] = useState<"white" | "black">(
    playerColor === "w" ? "white" : "black",
  );
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);

  // Click-to-move square selection state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [customSquareStyles, setCustomSquareStyles] = useState<
    Record<string, React.CSSProperties>
  >({});

  // Engine & Evaluation State
  const [evalScore, setEvalScore] = useState<number>(0);
  const [mateScore, setMateScore] = useState<number | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const previousEvalScoreRef = useRef<number>(0);

  // Dynamic Opening Status from Lichess / Local Book
  const [openingStatus, setOpeningStatus] = useState<OpeningStatus>(() =>
    getPositionOpeningStatus(gameRef.current.fen()),
  );
  const [isLoadingOpening, setIsLoadingOpening] = useState<boolean>(false);

  // Modals State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Blunder / Tutor Feedback State
  const [isBlunderModalOpen, setIsBlunderModalOpen] = useState(false);
  const [blunderData, setBlunderData] = useState<{
    playedSan: string;
    explanation: string;
    ratingDelta: number;
    newRating: number;
    topMoves: EngineMoveEvaluation[];
    pgn: string;
  } | null>(null);

  // Success Opening Complete State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<{
    movesCount: number;
    ratingDelta: number;
    newRating: number;
    pgn: string;
    openingName: string;
  } | null>(null);

  // Replay Mode State
  const [isReplaying, setIsReplaying] = useState(false);

  // Effective Lichess token from settings
  const effectiveToken = (settings.lichessToken || "").trim();
  const hasToken = effectiveToken.length > 0;

  // Asynchronously query Lichess Opening Explorer whenever position changes
  useEffect(() => {
    let isCancelled = false;

    async function updateOpeningInfo() {
      if (!hasToken) {
        setOpeningStatus({
          inBook: false,
          totalGames: 0,
          eco: "",
          name: "Token do Lichess não configurado",
          candidateMoves: [],
        });
        return;
      }

      setIsLoadingOpening(true);

      // Query live Lichess Opening Explorer API with token
      try {
        const live = await fetchLichessExplorerOnline(
          fen,
          effectiveToken,
          sessionRating,
        );
        if (!isCancelled && live) {
          setOpeningStatus(live);
        } else if (!isCancelled && !live) {
          setOpeningStatus({
            inBook: false,
            totalGames: 0,
            eco: "",
            name: "Linha Fora do Livro / Meio-Jogo",
            candidateMoves: [],
          });
        }
      } catch (err) {
        console.warn("Lichess online query error:", err);
      }

      if (!isCancelled) {
        setIsLoadingOpening(false);
      }
    }

    updateOpeningInfo();

    return () => {
      isCancelled = true;
    };
  }, [fen, effectiveToken, hasToken, sessionRating]);

  // Update orientation & engine calibration on session change
  useEffect(() => {
    setOrientation(activeSession.playerColor === "w" ? "white" : "black");
    engineService.setSkillLevel(sessionRating);
  }, [activeSession, sessionRating]);

  // Generate Current PGN
  const getCurrentPgn = useCallback(
    (result = "*") => {
      return StorageService.generatePgn({
        eventName: `NIK-Open ${activeSession.mode === "tutor" ? "Tutor" : "Hard"} Training`,
        white:
          activeSession.playerColor === "w"
            ? `Jogador (${sessionRating})`
            : `Lichess Blitz Engine`,
        black:
          activeSession.playerColor === "b"
            ? `Jogador (${sessionRating})`
            : `Lichess Blitz Engine`,
        result,
        eco: openingStatus.eco,
        openingName: openingStatus.name,
        movesSan,
      });
    },
    [activeSession, sessionRating, movesSan, openingStatus],
  );

  // Trigger Opening Success (Out of Book without disadvantage)
  const triggerSuccess = useCallback(
    (movesCount: number, openingName: string) => {
      SoundService.playSuccess();
      const ratingGain = 15;
      const newRating = sessionRating + ratingGain;
      const pgn = getCurrentPgn("1/2-1/2");

      const historyItem: GameHistoryItem = {
        id: `game-${Date.now()}`,
        sessionId: activeSession.id,
        sessionName: activeSession.name,
        mode: activeSession.mode,
        playerColor: activeSession.playerColor,
        openingName,
        eco: openingStatus.eco,
        pgn,
        fen: gameRef.current.fen(),
        result: "completed",
        movesCount,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        ratingBefore: sessionRating,
        ratingAfter: newRating,
        ratingDelta: ratingGain,
        reason: `Linha teórica de ${openingName} concluída! Variante esgotada no banco do Lichess. Posição consolidada para o meio-jogo sem desvantagem.`,
        finalEval: evalScore,
      };

      StorageService.saveGameResult(historyItem);
      setSessions(StorageService.getSessions());
      setHistoryCount(StorageService.getHistory().length);

      setSuccessData({
        movesCount,
        ratingDelta: ratingGain,
        newRating,
        pgn,
        openingName,
      });
      setIsSuccessModalOpen(true);
    },
    [activeSession, openingStatus, evalScore, getCurrentPgn, sessionRating],
  );

  // Trigger Blunder / Disadvantage Detected
  const triggerBlunder = useCallback(
    async (
      fenBefore: string,
      playedSan: string,
      evalDrop: number,
      topMoves: EngineMoveEvaluation[],
    ) => {
      SoundService.playBlunder();

      const ratingPenalty = -16;
      const newRating = Math.max(800, sessionRating + ratingPenalty);
      const pgn = getCurrentPgn("0-1");

      const bestAlt = topMoves[0]?.san || "lance melhor";
      const explanation = engineService.generateBlunderExplanation(
        fenBefore,
        playedSan,
        evalDrop,
        activeSession.playerColor,
        bestAlt,
      );

      const historyItem: GameHistoryItem = {
        id: `game-${Date.now()}`,
        sessionId: activeSession.id,
        sessionName: activeSession.name,
        mode: activeSession.mode,
        playerColor: activeSession.playerColor,
        openingName: openingStatus.name,
        eco: openingStatus.eco,
        pgn,
        fen: gameRef.current.fen(),
        result: "blunder",
        movesCount: gameRef.current.history().length,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        ratingBefore: sessionRating,
        ratingAfter: newRating,
        ratingDelta: ratingPenalty,
        reason: explanation,
        finalEval: evalScore,
      };

      StorageService.saveGameResult(historyItem);
      setSessions(StorageService.getSessions());
      setHistoryCount(StorageService.getHistory().length);

      // Visual arrows for top 3 engine recommendations
      const newArrows: Arrow[] = [];
      topMoves.slice(0, 3).forEach((m, idx) => {
        if (m.uci && m.uci.length >= 4) {
          newArrows.push({
            startSquare: m.uci.substring(0, 2),
            endSquare: m.uci.substring(2, 4),
            color: idx === 0 ? "rgb(16, 185, 129)" : "rgb(245, 158, 11)",
          });
        }
      });
      setArrows(newArrows);

      setBlunderData({
        playedSan,
        explanation,
        ratingDelta: ratingPenalty,
        newRating,
        topMoves,
        pgn,
      });
      setIsBlunderModalOpen(true);
    },
    [activeSession, openingStatus, evalScore, getCurrentPgn, sessionRating],
  );

  // Opponent (White or Black) plays move based on Lichess Blitz database or Stockfish
  const makeOpponentMove = useCallback(async () => {
    if (isBlunderModalOpen || isSuccessModalOpen || isReplaying) return;
    const currentFen = gameRef.current.fen();

    if (gameRef.current.isGameOver()) return;

    setIsOpponentThinking(true);

    // Realistic blitz think delay
    await new Promise((r) => setTimeout(r, 450));

    // 1. Check live Lichess API (using user configured token)
    let bookMove: OpeningBookMove | null = null;
    if (effectiveToken) {
      const liveStatus = await fetchLichessExplorerOnline(
        currentFen,
        effectiveToken,
        sessionRating,
      );
      if (liveStatus && liveStatus.candidateMoves.length > 0) {
        bookMove = pickWeightedMove(liveStatus.candidateMoves);
      }
    }

    let chosenSan = "";
    let from = "";
    let to = "";

    if (bookMove) {
      try {
        const testMove = gameRef.current.move(bookMove.san);
        if (testMove) {
          chosenSan = testMove.san;
          from = testMove.from;
          to = testMove.to;
          gameRef.current.undo();
        }
      } catch {
        // Fallback to engine
      }
    }

    // 3. If out of book, query Stockfish Engine at calibrated skill level
    if (!chosenSan) {
      const evalRes = await engineService.evaluate(
        currentFen,
        settings.engineDepth,
      );
      if (evalRes.bestMove && evalRes.bestMove.length >= 4) {
        from = evalRes.bestMove.substring(0, 2);
        to = evalRes.bestMove.substring(2, 4);
        const promotion =
          evalRes.bestMove.length > 4 ? evalRes.bestMove[4] : undefined;
        try {
          const m = gameRef.current.move({ from, to, promotion });
          if (m) {
            chosenSan = m.san;
            gameRef.current.undo();
          }
        } catch {
          const legal = gameRef.current.moves({ verbose: true });
          if (legal.length > 0) {
            chosenSan = legal[0].san;
          }
        }
      }
    }

    // Execute opponent move
    try {
      const executed = gameRef.current.move(chosenSan || { from, to });
      if (executed) {
        if (executed.captured) SoundService.playCapture();
        else if (gameRef.current.inCheck()) SoundService.playCheck();
        else SoundService.playMove();

        const newFen = gameRef.current.fen();
        const newMoves = [...gameRef.current.history()];

        setFen(newFen);
        setMovesSan(newMoves);
        setCurrentMoveIndex(newMoves.length - 1);

        // Update evaluation bar
        const updatedEval = await engineService.evaluate(
          newFen,
          settings.engineDepth,
        );
        setEvalScore(updatedEval.score);
        setMateScore(updatedEval.mate);
        previousEvalScoreRef.current = updatedEval.score;

        // Check if opening phase is completed after opponent move:
        let postStatus: OpeningStatus | null = null;
        if (effectiveToken) {
          postStatus = await fetchLichessExplorerOnline(
            newFen,
            effectiveToken,
            sessionRating,
          );
        }
        if (!postStatus) {
          postStatus = getPositionOpeningStatus(newFen);
        }

        if (
          newMoves.length >= 10 &&
          (!postStatus.inBook || postStatus.totalGames <= 25)
        ) {
          triggerSuccess(newMoves.length, postStatus.name);
        }
      }
    } catch (err) {
      console.error("Opponent move failed:", err);
    } finally {
      setIsOpponentThinking(false);
    }
  }, [
    isBlunderModalOpen,
    isSuccessModalOpen,
    isReplaying,
    effectiveToken,
    sessionRating,
    settings.engineDepth,
    triggerSuccess,
  ]);

  // Start / Reset Game
  const resetGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setFen(newGame.fen());
    setMovesSan([]);
    setCurrentMoveIndex(-1);
    setArrows([]);
    setSelectedSquare(null);
    setCustomSquareStyles({});
    setIsBlunderModalOpen(false);
    setIsSuccessModalOpen(false);
    setBlunderData(null);
    setSuccessData(null);
    setIsReplaying(false);
    setEvalScore(0);
    setMateScore(null);
    previousEvalScoreRef.current = 0;

    // If player is Black, White opens the game (only if token is configured)
    if (activeSession.playerColor === "b") {
      if (!hasToken) {
        return;
      }
      const initialMove = activeSession.initialWhiteMove;
      if (initialMove && initialMove !== "any") {
        try {
          setTimeout(async () => {
            const m = gameRef.current.move(initialMove);
            if (m) {
              SoundService.playMove();
              const f = gameRef.current.fen();
              const hist = [...gameRef.current.history()];
              setFen(f);
              setMovesSan(hist);
              setCurrentMoveIndex(hist.length - 1);
              const initEval = await engineService.evaluate(
                f,
                settings.engineDepth,
              );
              setEvalScore(initEval.score);
              previousEvalScoreRef.current = initEval.score;
            }
          }, 300);
        } catch {
          setTimeout(() => makeOpponentMove(), 300);
        }
      } else {
        setTimeout(() => makeOpponentMove(), 300);
      }
    }
  }, [activeSession, hasToken, makeOpponentMove, settings.engineDepth]);

  useEffect(() => {
    resetGame();
  }, [activeSessionId]);

  // Unified Move Execution Handler (Used by both Drag & Drop and Click to Move)
  const handlePieceMove = (
    sourceSquare: string,
    targetSquare: string,
  ): boolean => {
    if (!hasToken) {
      setIsSettingsModalOpen(true);
      return false;
    }

    if (
      isBlunderModalOpen ||
      isSuccessModalOpen ||
      isReplaying ||
      isOpponentThinking
    ) {
      return false;
    }

    // Verify it is player's turn
    const turn = gameRef.current.turn();
    if (turn !== activeSession.playerColor) {
      return false;
    }

    const fenBefore = gameRef.current.fen();

    try {
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (!move) return false;

      // Clear click selection & highlights
      setSelectedSquare(null);
      setCustomSquareStyles({});
      setArrows([]);

      // Play sound
      if (move.captured) SoundService.playCapture();
      else if (gameRef.current.inCheck()) SoundService.playCheck();
      else SoundService.playMove();

      const newFen = gameRef.current.fen();
      const updatedMoves = [...gameRef.current.history()];

      setFen(newFen);
      setMovesSan(updatedMoves);
      setCurrentMoveIndex(updatedMoves.length - 1);

      // Asynchronously evaluate the played move
      (async () => {
        const evalRes = await engineService.evaluate(
          newFen,
          settings.engineDepth,
        );
        setEvalScore(evalRes.score);
        setMateScore(evalRes.mate);

        const prevPlayerScore =
          activeSession.playerColor === "w"
            ? previousEvalScoreRef.current
            : -previousEvalScoreRef.current;

        const newPlayerScore =
          activeSession.playerColor === "w" ? evalRes.score : -evalRes.score;

        const evalDrop = prevPlayerScore - newPlayerScore;

        let isDisadvantage =
          evalDrop >= 120 || (newPlayerScore < -160 && evalDrop >= 80);

        let postStatus: OpeningStatus | null = null;
        if (effectiveToken) {
          postStatus = await fetchLichessExplorerOnline(
            newFen,
            effectiveToken,
            sessionRating,
          );
        }
        if (!postStatus) {
          postStatus = getPositionOpeningStatus(newFen);
        }

        if (isDisadvantage && postStatus.totalGames > 50) {
          isDisadvantage = false;
        }

        if (isDisadvantage) {
          const beforeEval = await engineService.evaluate(
            fenBefore,
            settings.engineDepth,
          );
          triggerBlunder(fenBefore, move.san, evalDrop, beforeEval.topMoves);
        } else {
          previousEvalScoreRef.current = evalRes.score;

          let postStatus: OpeningStatus | null = null;
          if (effectiveToken) {
            postStatus = await fetchLichessExplorerOnline(
              newFen,
              effectiveToken,
              sessionRating,
            );
          }
          if (!postStatus) {
            postStatus = getPositionOpeningStatus(newFen);
          }

          if (
            updatedMoves.length >= 10 &&
            (!postStatus.inBook || postStatus.totalGames <= 25)
          ) {
            triggerSuccess(updatedMoves.length, postStatus.name);
          } else {
            makeOpponentMove();
          }
        }
      })();

      return true;
    } catch {
      return false;
    }
  };

  // Click-to-Move Handler
  const onSquareClick = ({ square }: { square: string }) => {
    if (!hasToken) {
      setIsSettingsModalOpen(true);
      return;
    }

    if (
      isBlunderModalOpen ||
      isSuccessModalOpen ||
      isReplaying ||
      isOpponentThinking
    )
      return;

    const turn = gameRef.current.turn();
    if (turn !== activeSession.playerColor) return;

    if (!selectedSquare) {
      const pieceOnSquare = gameRef.current.get(square as Square);
      if (pieceOnSquare && pieceOnSquare.color === activeSession.playerColor) {
        setSelectedSquare(square);

        const legalMoves = gameRef.current.moves({
          square: square as Square,
          verbose: true,
        });
        const styles: Record<string, React.CSSProperties> = {
          [square]: {
            backgroundColor: "rgba(245, 158, 11, 0.45)",
            boxShadow: "inset 0 0 0 3px rgba(245, 158, 11, 0.9)",
          },
        };

        legalMoves.forEach((m) => {
          styles[m.to] = {
            background: m.captured
              ? "radial-gradient(circle, rgba(239, 68, 68, 0.8) 25%, transparent 26%)"
              : "radial-gradient(circle, rgba(16, 185, 129, 0.8) 22%, transparent 23%)",
            cursor: "pointer",
          };
        });

        setCustomSquareStyles(styles);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setCustomSquareStyles({});
      return;
    }

    const clickedPiece = gameRef.current.get(square as Square);
    if (clickedPiece && clickedPiece.color === activeSession.playerColor) {
      setSelectedSquare(square);
      const legalMoves = gameRef.current.moves({
        square: square as Square,
        verbose: true,
      });
      const styles: Record<string, React.CSSProperties> = {
        [square]: {
          backgroundColor: "rgba(245, 158, 11, 0.45)",
          boxShadow: "inset 0 0 0 3px rgba(245, 158, 11, 0.9)",
        },
      };

      legalMoves.forEach((m) => {
        styles[m.to] = {
          background: m.captured
            ? "radial-gradient(circle, rgba(239, 68, 68, 0.8) 25%, transparent 26%)"
            : "radial-gradient(circle, rgba(16, 185, 129, 0.8) 22%, transparent 23%)",
          cursor: "pointer",
        };
      });

      setCustomSquareStyles(styles);
      return;
    }

    const success = handlePieceMove(selectedSquare, square);
    if (!success) {
      setSelectedSquare(null);
      setCustomSquareStyles({});
    }
  };

  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    return handlePieceMove(sourceSquare, targetSquare);
  };

  const handleRetryMove = () => {
    gameRef.current.undo();
    setFen(gameRef.current.fen());
    const hist = [...gameRef.current.history()];
    setMovesSan(hist);
    setCurrentMoveIndex(hist.length - 1);
    setSelectedSquare(null);
    setCustomSquareStyles({});
    setIsBlunderModalOpen(false);
  };

  const handlePlayRecommended = (moveSan: string) => {
    gameRef.current.undo();
    try {
      const m = gameRef.current.move(moveSan);
      if (m) {
        SoundService.playMove();
        const newFen = gameRef.current.fen();
        const hist = [...gameRef.current.history()];
        setFen(newFen);
        setMovesSan(hist);
        setCurrentMoveIndex(hist.length - 1);
        setArrows([]);
        setSelectedSquare(null);
        setCustomSquareStyles({});
        setIsBlunderModalOpen(false);

        setTimeout(() => makeOpponentMove(), 400);
      }
    } catch {
      handleRetryMove();
    }
  };

  const handleReplayGame = (gameItem: GameHistoryItem) => {
    const replayChess = new Chess();
    try {
      replayChess.loadPgn(gameItem.pgn);
      gameRef.current = replayChess;
      setFen(replayChess.fen());
      const hist = [...replayChess.history()];
      setMovesSan(hist);
      setCurrentMoveIndex(hist.length - 1);
      setIsReplaying(true);
      setOrientation(gameItem.playerColor === "w" ? "white" : "black");
    } catch (e) {
      console.error("Failed to load PGN for replay:", e);
    }
  };

  const handleSelectMove = (index: number) => {
    const tempChess = new Chess();
    for (let i = 0; i <= index; i++) {
      if (movesSan[i]) {
        tempChess.move(movesSan[i]);
      }
    }
    setFen(tempChess.fen());
    setCurrentMoveIndex(index);
    setSelectedSquare(null);
    setCustomSquareStyles({});
  };

  const currentTurn = gameRef.current.turn();

  return (
    <div className="nik-app-container">
      <Navbar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={(id) => {
          StorageService.setActiveSessionId(id);
          setActiveSessionId(id);
        }}
        onOpenSessionManager={() => setIsSessionModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        soundEnabled={settings.soundEnabled}
        onToggleSound={() => {
          const updated = !settings.soundEnabled;
          setSettings((s) => ({ ...s, soundEnabled: updated }));
          SoundService.setMuted(!updated);
        }}
        historyCount={historyCount}
      />

      <main className="app-layout">
        {/* Left Column: Chessboard & Status */}
        <section className="board-section">
          {/* Status Bar */}
          <div className="board-status-banner">
            <div className="status-left">
              <span
                className={`turn-pill ${currentTurn === "w" ? "white" : "black"}`}
              >
                {currentTurn === "w" ? "♔ Vez das Brancas" : "♚ Vez das Pretas"}
                {isOpponentThinking && " (Calculando...)"}
              </span>

              <div className="opening-live-status-pill">
                <span className="live-eco-badge">{openingStatus.eco}</span>
                <span className="live-opening-name" title={openingStatus.name}>
                  {openingStatus.name}
                </span>
                {isLoadingOpening && (
                  <Loader2 size={13} className="animate-spin text-blue-400" />
                )}
              </div>
            </div>

            <div className="board-action-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setOrientation((o) => (o === "white" ? "black" : "white"))
                }
                title="Girar Tabuleiro"
              >
                <ArrowUpDown size={15} />
                <span>Girar</span>
              </button>
              <button
                type="button"
                className="btn-secondary btn-danger"
                onClick={resetGame}
                title="Reiniciar Partida"
              >
                <RotateCcw size={15} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Replay Notice if active */}
          {isReplaying && (
            <div className="replay-alert-banner">
              <span>
                Modo Replay da Partida. Navegue pelos lances abaixo ou reinicie
                para treinar.
              </span>
              <button
                type="button"
                className="replay-exit-btn"
                onClick={resetGame}
              >
                Voltar ao Treino
              </button>
            </div>
          )}

          {/* Chessboard + Eval Bar */}
          <div className="board-with-eval">
            <EvalBar
              score={evalScore}
              mate={mateScore}
              orientation={orientation}
            />

            <div className="board-container" style={{ position: "relative" }}>
              <Chessboard
                options={{
                  position: fen,
                  boardOrientation: orientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (!targetSquare) return false;
                    return onPieceDrop(sourceSquare, targetSquare);
                  },
                  onSquareClick: ({ square }) => {
                    onSquareClick({ square });
                  },
                  squareStyles: customSquareStyles,
                  arrows,
                  boardStyle: {
                    borderRadius: "10px",
                    boxShadow: "0 15px 30px rgba(0, 0, 0, 0.5)",
                  },
                  darkSquareStyle: { backgroundColor: "#779952" },
                  lightSquareStyle: { backgroundColor: "#edeed1" },
                  animationDurationInMs: 180,
                }}
              />

              {!hasToken && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.88)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    textAlign: "center",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                      color: "#f87171",
                    }}
                  >
                    <Key size={28} />
                  </div>
                  <h3
                    style={{
                      color: "#fff",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Acesso ao Lichess Bloqueado
                  </h3>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.85rem",
                      maxWidth: "340px",
                      lineHeight: 1.5,
                      marginBottom: "1.25rem",
                    }}
                  >
                    Para jogar com todas as velocidades do Lichess (UltraBullet
                    a Clássico) sem aberturas fixas, configure seu Token
                    Pessoal.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "0.65rem 1.25rem",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
                    }}
                  >
                    <Key size={16} />
                    Configurar Token Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Move List (Explorer card removed, MoveList wrapped for responsiveness) */}
        <aside className="side-panel">
          <div
            className="responsive-movelist-container"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MoveList
              movesSan={movesSan}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={handleSelectMove}
              openingName={openingStatus.name}
              eco={openingStatus.eco}
              pgn={getCurrentPgn()}
            />
          </div>
        </aside>
      </main>

      {/* MODALS */}
      <TutorBlunderModal
        isOpen={isBlunderModalOpen}
        mode={activeSession.mode}
        playedMoveSan={blunderData?.playedSan || ""}
        explanation={blunderData?.explanation || ""}
        ratingDelta={blunderData?.ratingDelta || -16}
        newRating={blunderData?.newRating || sessionRating - 16}
        topMoves={blunderData?.topMoves || []}
        pgn={blunderData?.pgn || getCurrentPgn("0-1")}
        onRetry={handleRetryMove}
        onNewGame={resetGame}
        onPlayRecommendedMove={handlePlayRecommended}
      />

      <OpeningSuccessModal
        isOpen={isSuccessModalOpen}
        sessionName={activeSession.name}
        openingName={successData?.openingName || openingStatus.name}
        movesCount={successData?.movesCount || movesSan.length}
        ratingDelta={successData?.ratingDelta || 15}
        newRating={successData?.newRating || sessionRating + 15}
        pgn={successData?.pgn || getCurrentPgn("1/2-1/2")}
        onNewGame={resetGame}
        onClose={() => setIsSuccessModalOpen(false)}
      />

      <SessionManagerModal
        isOpen={isSessionModalOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          StorageService.setActiveSessionId(id);
          setActiveSessionId(id);
        }}
        onCreateSession={(newSess) => {
          const created = StorageService.createSession(newSess);
          setSessions(StorageService.getSessions());
          setActiveSessionId(created.id);
        }}
        onDeleteSession={(id) => {
          StorageService.deleteSession(id);
          setSessions(StorageService.getSessions());
          setActiveSessionId(StorageService.getActiveSessionId());
        }}
        onClose={() => setIsSessionModalOpen(false)}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onReplayGame={handleReplayGame}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        session={activeSession}
        onClose={() => setIsStatsModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen || !hasToken}
        isRequired={!hasToken}
        onClose={() => {
          if (hasToken) {
            setIsSettingsModalOpen(false);
          }
        }}
        onSettingsSaved={(updated) => {
          setSettings(updated);
          setIsSettingsModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
