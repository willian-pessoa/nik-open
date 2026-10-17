import { useRef, useState, type CSSProperties } from "react";

import AppChessBoard, {
  type AppChessBoardHandle,
} from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";
import ManageSessions from "./components/ManageSessions";

import type { BadMoveInfo, ChessMove } from "./types";
import { useSessions } from "./hooks/useSessions";
import { calculateRating, type RatingChange } from "./utils/calculateRating";
import OpeningFinishedModal from "./components/OpeningFinishedModal";
import BadMoveModal from "./components/BadMoveModal";

const MOVES_PANEL_WIDTH = "18rem";
const FALLBACK_RATING = 1200;

function App() {
  const {
    sessions,
    activeSession,
    createSession,
    deleteSession,
    selectSession,
    addMatch,
  } = useSessions();

  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [openingName, setOpeningName] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);

  // Contador de partidas: entra na key do tabuleiro para remontá-lo (nova partida)
  const [matchNumber, setMatchNumber] = useState(0);
  // Preenchido quando a abertura termina; mantém o modal aberto
  const [finishedMatch, setFinishedMatch] = useState<{
    ratingChange: RatingChange | null;
    reason: "opening" | "mistake";
    badMove?: BadMoveInfo;
  } | null>(null);
  // Lance ruim aguardando decisão no modo tutor (tentar de novo / encerrar)
  const [badMove, setBadMove] = useState<BadMoveInfo | null>(null);
  // Quantas vezes o tutor foi usado na partida (cada "tentar novamente" conta)
  const [helpsUsed, setHelpsUsed] = useState(0);
  const boardRef = useRef<AppChessBoardHandle>(null);

  // Ao trocar de sessão o tabuleiro é remontado (key), então zera também o
  // que o pai guarda da partida anterior
  const activeSessionId = activeSession?.id ?? null;
  const [prevSessionId, setPrevSessionId] = useState(activeSessionId);
  if (prevSessionId !== activeSessionId) {
    setPrevSessionId(activeSessionId);
    setOpeningName("");
    setMoveHistory([]);
    setFinishedMatch(null);
    setBadMove(null);
    setHelpsUsed(0);
  }

  const playerSide = activeSession?.playerSide ?? "w";

  function finishMatchAsLoss(info: BadMoveInfo) {
    boardRef.current?.lock();
    setBadMove(null);

    if (!activeSession) {
      setFinishedMatch({
        reason: "mistake",
        ratingChange: null,
        badMove: info,
      });
      return;
    }

    const ratingChange = calculateRating({
      currentStreak: activeSession.currentStreak,
      currentRating: activeSession.currentRating,
      result: "loss",
      helpsUsed,
    });

    addMatch(activeSession.id, {
      pgn: info.pgn,
      playerSide,
      playerRating: ratingChange.ratingBefore,
      opening: openingName || null,
      ratingEarned: ratingChange.delta,
      result: ratingChange.result,
      helpsUsed,
    });

    setFinishedMatch({ reason: "mistake", ratingChange, badMove: info });
  }

  function handleBadMove(info: BadMoveInfo) {
    const mode = activeSession?.mode ?? "tutor";
    if (mode === "challenger") {
      finishMatchAsLoss(info);
    } else {
      setBadMove(info);
    }
  }

  function handleRetry() {
    boardRef.current?.retryLastMove();
    setBadMove(null);
    setHelpsUsed((n) => n + 1);
  }

  function handleEndMatch() {
    if (badMove) finishMatchAsLoss(badMove);
  }

  // A abertura acabou: calcula o rating, salva a partida na sessão e abre o modal
  function handleOpeningFinished(pgn: string) {
    if (!activeSession) {
      setFinishedMatch({ reason: "opening", ratingChange: null });
      return;
    }

    const ratingChange = calculateRating({
      currentStreak: activeSession.currentStreak,
      currentRating: activeSession.currentRating,
      result: "win",
      helpsUsed,
    });

    addMatch(activeSession.id, {
      pgn,
      playerSide,
      playerRating: ratingChange.ratingBefore,
      opening: openingName || null,
      ratingEarned: ratingChange.delta,
      result: ratingChange.result,
      helpsUsed,
    });

    setFinishedMatch({ reason: "opening", ratingChange });
  }

  function handleNewMatch() {
    setFinishedMatch(null);
    setBadMove(null);
    setHelpsUsed(0);
    setOpeningName("");
    setMoveHistory([]);
    setMatchNumber((n) => n + 1);
  }

  return (
    <div className="flex flex-col bg-slate-950 h-screen w-screen text-slate-50 text-lg overflow-hidden">
      <AppHeader
        sessionName={activeSession?.name ?? "Sem sessão"}
        onOpenSettings={() => {
          // TODO: abrir o modal de configurações da aplicação
        }}
        onOpenSessions={() => setIsSessionsOpen(true)}
        onOpenHistory={() => {
          // TODO: abrir o modal com o histórico de partidas da sessão atual
        }}
      />
      {/* Área disponível: centraliza o conjunto tabuleiro + lances e serve de
          container para o dimensionamento do tabuleiro (cqw / cqh) */}
      <div
        className="flex flex-1 min-h-0 items-center justify-center p-2 @container-size"
        style={{ "--side-panel-w": MOVES_PANEL_WIDTH } as CSSProperties}
      >
        <div className="flex items-stretch gap-2">
          <AppChessBoard
            ref={boardRef}
            key={`${activeSessionId ?? "no-session"}-${matchNumber}`}
            // playerSide null = "escolher a cada partida" (ainda sem seletor): usa brancas
            playerOrientation={playerSide}
            playerRating={activeSession?.currentRating ?? FALLBACK_RATING}
            onOpeningChange={setOpeningName}
            onMoveMade={setMoveHistory}
            cpuStartMove={activeSession?.cpuStartMove ?? null}
            onOpeningFinished={handleOpeningFinished}
            onBadMove={handleBadMove}
          />
          <AppChessMoves openingName={openingName} moves={moveHistory} />
        </div>
      </div>

      <ManageSessions
        open={isSessionsOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setIsSessionsOpen(false)}
        onSelect={selectSession}
        onCreate={createSession}
        onDelete={deleteSession}
      />

      <BadMoveModal
        open={badMove !== null}
        info={badMove}
        onRetry={handleRetry}
        onEnd={handleEndMatch}
      />

      <OpeningFinishedModal
        open={finishedMatch !== null}
        openingName={openingName}
        reason={finishedMatch?.reason ?? "opening"}
        badMove={finishedMatch?.badMove ?? null}
        ratingChange={finishedMatch?.ratingChange ?? null}
        onNewMatch={handleNewMatch}
      />
    </div>
  );
}

export default App;
