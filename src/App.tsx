import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, ArrowUpDown } from 'lucide-react';
import type { Arrow } from 'react-chessboard';

import type { StudySession, GameHistoryItem, EngineMoveEvaluation } from './types/chess';
import { StorageService, type UserSettings } from './services/storage';
import { SoundService } from './services/sound';
import { TARGET_OPENINGS, LICHESS_BLITZ_BOOK, getFenKey, pickBookMove } from './services/openingBook';
import { engineService } from './services/engine';

import { Navbar } from './components/Navbar';
import { EvalBar } from './components/EvalBar';
import { MoveList } from './components/MoveList';
import { TutorBlunderModal } from './components/TutorBlunderModal';
import { OpeningSuccessModal } from './components/OpeningSuccessModal';
import { SessionManagerModal } from './components/SessionManagerModal';
import { HistoryModal } from './components/HistoryModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  // Sessions & Storage State
  const [sessions, setSessions] = useState<StudySession[]>(() => StorageService.getSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => StorageService.getActiveSessionId());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());
  const [historyCount, setHistoryCount] = useState<number>(() => StorageService.getHistory().length);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const isTutorMode = activeSession.mode === 'tutor';
  const playerColor = activeSession.playerColor; // 'w' or 'b'
  const sessionRating = isTutorMode ? activeSession.tutorRating : activeSession.hardRating;

  // Board & Game State
  const gameRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState<string>(() => gameRef.current.fen());
  const [movesSan, setMovesSan] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [orientation, setOrientation] = useState<'white' | 'black'>(playerColor === 'w' ? 'white' : 'black');
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);

  // Engine & Evaluation State
  const [evalScore, setEvalScore] = useState<number>(0);
  const [mateScore, setMateScore] = useState<number | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const previousEvalScoreRef = useRef<number>(0);

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
  } | null>(null);

  // Replay Mode State
  const [isReplaying, setIsReplaying] = useState(false);

  // Target Opening Repertoire Details
  const targetRepertoire = TARGET_OPENINGS.find(o => o.id === activeSession.targetOpeningKey) || TARGET_OPENINGS[0];
  const theoryDepth = targetRepertoire.theoryDepth || 14;

  // Update orientation whenever session changes
  useEffect(() => {
    setOrientation(activeSession.playerColor === 'w' ? 'white' : 'black');
    engineService.setSkillLevel(sessionRating);
  }, [activeSession, sessionRating]);

  // Helper to get current opening name and ECO from the position
  const getPositionOpeningInfo = useCallback(() => {
    const key = getFenKey(fen);
    const bookEntry = LICHESS_BLITZ_BOOK[key];
    if (bookEntry) {
      return { eco: bookEntry.eco, name: bookEntry.name };
    }
    return { eco: targetRepertoire.eco, name: targetRepertoire.name };
  }, [fen, targetRepertoire]);

  // Generate Current PGN
  const getCurrentPgn = useCallback((result = '*') => {
    const info = getPositionOpeningInfo();
    return StorageService.generatePgn({
      eventName: `NIK-Open ${activeSession.mode === 'tutor' ? 'Tutor' : 'Hard'} Training`,
      white: activeSession.playerColor === 'w' ? `Jogador (${sessionRating})` : `Lichess Blitz Engine`,
      black: activeSession.playerColor === 'b' ? `Jogador (${sessionRating})` : `Lichess Blitz Engine`,
      result,
      eco: info.eco,
      openingName: info.name,
      movesSan
    });
  }, [activeSession, sessionRating, movesSan, getPositionOpeningInfo]);

  // Opponent (White or Black) plays move based on Lichess Blitz database or Stockfish
  const makeOpponentMove = useCallback(async () => {
    if (isBlunderModalOpen || isSuccessModalOpen || isReplaying) return;
    const currentFen = gameRef.current.fen();

    // Check if game is over
    if (gameRef.current.isGameOver()) return;

    setIsOpponentThinking(true);

    // Artificial natural blitz think time
    await new Promise(r => setTimeout(r, 450));

    // 1. Try to find move from Lichess Blitz Book weighted by user's rating
    const bookMove = pickBookMove(currentFen, sessionRating);
    let chosenSan = '';
    let from = '';
    let to = '';

    if (bookMove) {
      try {
        const testMove = gameRef.current.move(bookMove.san);
        if (testMove) {
          chosenSan = testMove.san;
          from = testMove.from;
          to = testMove.to;
          // Undo test move so we execute uniformly
          gameRef.current.undo();
        }
      } catch {
        // Fallback to engine
      }
    }

    // 2. If out of book or failed, query Stockfish Engine at calibrated skill level
    if (!chosenSan) {
      const evalRes = await engineService.evaluate(currentFen, settings.engineDepth);
      if (evalRes.bestMove && evalRes.bestMove.length >= 4) {
        from = evalRes.bestMove.substring(0, 2);
        to = evalRes.bestMove.substring(2, 4);
        const promotion = evalRes.bestMove.length > 4 ? evalRes.bestMove[4] : undefined;
        try {
          const m = gameRef.current.move({ from, to, promotion });
          if (m) {
            chosenSan = m.san;
            gameRef.current.undo();
          }
        } catch {
          // Fallback random legal move
          const legal = gameRef.current.moves({ verbose: true });
          if (legal.length > 0) {
            from = legal[0].from;
            to = legal[0].to;
            chosenSan = legal[0].san;
          }
        }
      }
    }

    // Execute the move
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
        const updatedEval = await engineService.evaluate(newFen, settings.engineDepth);
        setEvalScore(updatedEval.score);
        setMateScore(updatedEval.mate);
        previousEvalScoreRef.current = updatedEval.score;

        // Check if opening phase is completed after opponent move
        if (newMoves.length >= theoryDepth) {
          triggerSuccess(newMoves.length);
        }
      }
    } catch (err) {
      console.error('Opponent move failed:', err);
    } finally {
      setIsOpponentThinking(false);
    }
  }, [isBlunderModalOpen, isSuccessModalOpen, isReplaying, sessionRating, settings.engineDepth, theoryDepth]);

  // Start / Reset Game
  const resetGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setFen(newGame.fen());
    setMovesSan([]);
    setCurrentMoveIndex(-1);
    setArrows([]);
    setIsBlunderModalOpen(false);
    setIsSuccessModalOpen(false);
    setBlunderData(null);
    setSuccessData(null);
    setIsReplaying(false);
    setEvalScore(0);
    setMateScore(null);
    previousEvalScoreRef.current = 0;

    // If player is Black, White plays first
    if (activeSession.playerColor === 'b') {
      const initialMove = activeSession.initialWhiteMove;
      if (initialMove && initialMove !== 'random') {
        try {
          setTimeout(() => {
            const m = gameRef.current.move(initialMove);
            if (m) {
              SoundService.playMove();
              const f = gameRef.current.fen();
              const hist = [...gameRef.current.history()];
              setFen(f);
              setMovesSan(hist);
              setCurrentMoveIndex(hist.length - 1);
            }
          }, 300);
        } catch {
          // If custom move failed, make opponent move
          setTimeout(() => makeOpponentMove(), 300);
        }
      } else {
        setTimeout(() => makeOpponentMove(), 300);
      }
    }
  }, [activeSession, makeOpponentMove]);

  // Initialize or reset game on active session switch
  useEffect(() => {
    resetGame();
  }, [activeSessionId]);

  // Trigger Opening Success
  const triggerSuccess = (movesCount: number) => {
    SoundService.playSuccess();
    const ratingGain = 15;
    const newRating = sessionRating + ratingGain;
    const pgn = getCurrentPgn('1/2-1/2');

    const historyItem: GameHistoryItem = {
      id: `game-${Date.now()}`,
      sessionId: activeSession.id,
      sessionName: activeSession.name,
      mode: activeSession.mode,
      playerColor: activeSession.playerColor,
      targetOpening: activeSession.targetOpeningName,
      eco: targetRepertoire.eco,
      pgn,
      fen: gameRef.current.fen(),
      result: 'completed',
      movesCount,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      ratingBefore: sessionRating,
      ratingAfter: newRating,
      ratingDelta: ratingGain,
      reason: 'Linha teórica de abertura completada com sucesso mantendo posição equilibrada!',
      finalEval: evalScore
    };

    StorageService.saveGameResult(historyItem);
    setSessions(StorageService.getSessions());
    setHistoryCount(StorageService.getHistory().length);

    setSuccessData({
      movesCount,
      ratingDelta: ratingGain,
      newRating,
      pgn
    });
    setIsSuccessModalOpen(true);
  };

  // Trigger Blunder / Disadvantage Detected
  const triggerBlunder = async (
    fenBefore: string,
    playedSan: string,
    evalDrop: number,
    topMoves: EngineMoveEvaluation[]
  ) => {
    SoundService.playBlunder();

    // Rating penalty: 16 to 22 points
    const ratingPenalty = -16;
    const newRating = Math.max(800, sessionRating + ratingPenalty);
    const pgn = getCurrentPgn('0-1');

    const bestAlt = topMoves[0]?.san || 'lance melhor';
    const explanation = engineService.generateBlunderExplanation(
      fenBefore,
      playedSan,
      evalDrop,
      activeSession.playerColor,
      bestAlt
    );

    const historyItem: GameHistoryItem = {
      id: `game-${Date.now()}`,
      sessionId: activeSession.id,
      sessionName: activeSession.name,
      mode: activeSession.mode,
      playerColor: activeSession.playerColor,
      targetOpening: activeSession.targetOpeningName,
      eco: targetRepertoire.eco,
      pgn,
      fen: gameRef.current.fen(),
      result: 'blunder',
      movesCount: gameRef.current.history().length,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      ratingBefore: sessionRating,
      ratingAfter: newRating,
      ratingDelta: ratingPenalty,
      reason: explanation,
      finalEval: evalScore
    };

    StorageService.saveGameResult(historyItem);
    setSessions(StorageService.getSessions());
    setHistoryCount(StorageService.getHistory().length);

    // Show visual arrows for top recommended moves on the board
    const newArrows: Arrow[] = [];
    topMoves.slice(0, 3).forEach((m, idx) => {
      if (m.uci && m.uci.length >= 4) {
        newArrows.push({
          startSquare: m.uci.substring(0, 2),
          endSquare: m.uci.substring(2, 4),
          color: idx === 0 ? 'rgb(16, 185, 129)' : 'rgb(245, 158, 11)'
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
      pgn
    });
    setIsBlunderModalOpen(true);
  };

  // Player drops a piece on the board
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isBlunderModalOpen || isSuccessModalOpen || isReplaying || isOpponentThinking) {
      return false;
    }

    // Verify it is player's turn
    const turn = gameRef.current.turn(); // 'w' or 'b'
    if (turn !== activeSession.playerColor) {
      return false;
    }

    const fenBefore = gameRef.current.fen();

    try {
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (!move) return false;

      // Play sound
      if (move.captured) SoundService.playCapture();
      else if (gameRef.current.inCheck()) SoundService.playCheck();
      else SoundService.playMove();

      const newFen = gameRef.current.fen();
      const updatedMoves = [...gameRef.current.history()];

      setFen(newFen);
      setMovesSan(updatedMoves);
      setCurrentMoveIndex(updatedMoves.length - 1);
      setArrows([]);

      // Asynchronously evaluate the played move
      (async () => {
        const evalRes = await engineService.evaluate(newFen, settings.engineDepth);
        setEvalScore(evalRes.score);
        setMateScore(evalRes.mate);

        // Evaluate advantage change from player's perspective
        // Positive score = White advantage, negative = Black advantage
        const prevPlayerScore = activeSession.playerColor === 'w'
          ? previousEvalScoreRef.current
          : -previousEvalScoreRef.current;

        const newPlayerScore = activeSession.playerColor === 'w'
          ? evalRes.score
          : -evalRes.score;

        const evalDrop = prevPlayerScore - newPlayerScore;

        // Disadvantage threshold: eval drop > 120 cp (1.2 pawns) or position critically worse
        const isDisadvantage = evalDrop >= 120 || (newPlayerScore < -160 && evalDrop >= 80);

        if (isDisadvantage) {
          // Get alternatives from position before the move
          const beforeEval = await engineService.evaluate(fenBefore, settings.engineDepth);
          triggerBlunder(fenBefore, move.san, evalDrop, beforeEval.topMoves);
        } else {
          previousEvalScoreRef.current = evalRes.score;

          // Check if target theory depth reached
          if (updatedMoves.length >= theoryDepth) {
            triggerSuccess(updatedMoves.length);
          } else {
            // Trigger opponent move
            makeOpponentMove();
          }
        }
      })();

      return true;
    } catch {
      return false;
    }
  };

  // Tutor: Retry move (undo bad move)
  const handleRetryMove = () => {
    gameRef.current.undo();
    setFen(gameRef.current.fen());
    const hist = [...gameRef.current.history()];
    setMovesSan(hist);
    setCurrentMoveIndex(hist.length - 1);
    setIsBlunderModalOpen(false);
  };

  // Tutor: Play recommended move directly
  const handlePlayRecommended = (moveSan: string) => {
    gameRef.current.undo(); // undo the blunder
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
        setIsBlunderModalOpen(false);

        // Trigger opponent response
        setTimeout(() => makeOpponentMove(), 400);
      }
    } catch {
      handleRetryMove();
    }
  };

  // Replay past game from history
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
      setOrientation(gameItem.playerColor === 'w' ? 'white' : 'black');
    } catch (e) {
      console.error('Failed to load PGN for replay:', e);
    }
  };

  // Move List Navigation
  const handleSelectMove = (index: number) => {
    const tempChess = new Chess();
    // If Black and initial move was played, apply moves up to index
    for (let i = 0; i <= index; i++) {
      if (movesSan[i]) {
        tempChess.move(movesSan[i]);
      }
    }
    setFen(tempChess.fen());
    setCurrentMoveIndex(index);
  };

  const currentOpeningInfo = getPositionOpeningInfo();
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
          setSettings(s => ({ ...s, soundEnabled: updated }));
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
              <span className={`turn-pill ${currentTurn === 'w' ? 'white' : 'black'}`}>
                {currentTurn === 'w' ? '♔ Vez das Brancas' : '♚ Vez das Pretas'}
                {isOpponentThinking && ' (Calculando...)'}
              </span>

              <div className="opening-theory-progress">
                <span>Progresso da Abertura:</span>
                <div className="theory-progress-bar">
                  <div
                    className="theory-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.round((movesSan.length / theoryDepth) * 100))}%`
                    }}
                  />
                </div>
                <span>{movesSan.length}/{theoryDepth} lances</span>
              </div>
            </div>

            <div className="board-action-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
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
              <span>Modo Replay da Partida. Navegue pelos lances abaixo ou inicie um novo treino.</span>
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

            <div className="board-container">
              <Chessboard
                options={{
                  position: fen,
                  boardOrientation: orientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (!targetSquare) return false;
                    return onPieceDrop(sourceSquare, targetSquare);
                  },
                  arrows,
                  boardStyle: {
                    borderRadius: '12px',
                    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5)'
                  },
                  darkSquareStyle: { backgroundColor: '#779952' },
                  lightSquareStyle: { backgroundColor: '#edeed1' },
                  animationDurationInMs: 200
                }}
              />
            </div>
          </div>
        </section>

        {/* Right Column: Opening Repertoire Info & Move List */}
        <aside className="side-panel">
          {/* Target Repertoire Card */}
          <div className="repertoire-info-card">
            <div className="repertoire-header">
              <span className="repertoire-eco">{targetRepertoire.eco}</span>
              <span className="text-xs text-slate-400">
                Meta: {theoryDepth} lances de teoria
              </span>
            </div>
            <h3 className="repertoire-name">{targetRepertoire.name}</h3>
            <p className="repertoire-desc">{targetRepertoire.description}</p>
            <div className="repertoire-plan-box">
              <strong>Plano Central da Abertura:</strong>
              {targetRepertoire.mainPlan}
            </div>
          </div>

          {/* Moves List with PGN and Lichess analysis */}
          <MoveList
            movesSan={movesSan}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={handleSelectMove}
            openingName={currentOpeningInfo.name}
            eco={currentOpeningInfo.eco}
            pgn={getCurrentPgn()}
          />
        </aside>
      </main>

      {/* MODALS */}
      <TutorBlunderModal
        isOpen={isBlunderModalOpen}
        mode={activeSession.mode}
        playedMoveSan={blunderData?.playedSan || ''}
        explanation={blunderData?.explanation || ''}
        ratingDelta={blunderData?.ratingDelta || -16}
        newRating={blunderData?.newRating || sessionRating - 16}
        topMoves={blunderData?.topMoves || []}
        pgn={blunderData?.pgn || getCurrentPgn('0-1')}
        onRetry={handleRetryMove}
        onNewGame={resetGame}
        onPlayRecommendedMove={handlePlayRecommended}
      />

      <OpeningSuccessModal
        isOpen={isSuccessModalOpen}
        sessionName={activeSession.name}
        openingName={targetRepertoire.name}
        movesCount={successData?.movesCount || theoryDepth}
        ratingDelta={successData?.ratingDelta || 15}
        newRating={successData?.newRating || sessionRating + 15}
        pgn={successData?.pgn || getCurrentPgn('1/2-1/2')}
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
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsSaved={(updated) => setSettings(updated)}
      />
    </div>
  );
};

export default App;
