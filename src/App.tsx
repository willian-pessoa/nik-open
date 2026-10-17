import { useRef, useState, type CSSProperties } from "react";

import AppChessBoard, {
  type AppChessBoardHandle,
} from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";
import ManageSessions from "./components/ManageSessions";

import type { BadMoveInfo, ChessMove, Side } from "./types";
import { useSessions } from "./hooks/useSessions";
import { calculateRating, type RatingChange } from "./utils/calculateRating";
import OpeningFinishedModal from "./components/OpeningFinishedModal";
import BadMoveModal from "./components/BadMoveModal";
import { pickRandomSide } from "./utils/pickRandomSide";
import { Layers, Plus } from "lucide-react";
import HistoryModal from "./components/HistoryModal";
import SettingsModal from "./components/SettingsModal";
import { useSettings } from "./hooks/useSettings";

const MOVES_PANEL_WIDTH = "18rem";

function App() {
  const {
    sessions,
    activeSession,
    createSession,
    deleteSession,
    selectSession,
    addMatch,
  } = useSessions();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, updateSettings } = useSettings();
  const [openingName, setOpeningName] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const [randomSide, setRandomSide] = useState<Side>(pickRandomSide());

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
    setRandomSide(pickRandomSide());
  }

  const playerSide: Side = activeSession?.playerSide ?? randomSide;

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
      playedAt: Date.now(),
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
      playedAt: Date.now(),
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
    setRandomSide(pickRandomSide());
  }

  return (
    <div className="flex flex-col bg-slate-950 h-screen w-screen text-slate-50 text-lg overflow-hidden">
      <AppHeader
        sessionName={activeSession?.name ?? "Sem sessão"}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSessions={() => setIsSessionsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />
      {/* Área disponível: centraliza o conjunto tabuleiro + lances e serve de
          container para o dimensionamento do tabuleiro (cqw / cqh) */}
      <div
        className="flex flex-1 min-h-0 items-center justify-center p-2 @container-size"
        style={{ "--side-panel-w": MOVES_PANEL_WIDTH } as CSSProperties}
      >
        {activeSession ? (
          <div className="flex items-stretch gap-2">
            <AppChessBoard
              ref={boardRef}
              key={`${activeSession.id}-${matchNumber}`}
              playerOrientation={playerSide}
              playerRating={activeSession.currentRating}
              onOpeningChange={setOpeningName}
              onMoveMade={setMoveHistory}
              cpuStartMove={activeSession.cpuStartMove}
              onOpeningFinished={handleOpeningFinished}
              onBadMove={handleBadMove}
            />
            <AppChessMoves openingName={openingName} moves={moveHistory} />
          </div>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center">
            <Layers size={32} className="text-rose-400" aria-hidden />
            <div>
              <p className="text-lg font-semibold text-slate-100">
                Nenhuma sessão ativa
              </p>
              <p className="mt-1 text-base text-slate-400">
                Crie ou selecione uma sessão para começar a treinar suas
                aberturas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSessionsOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Plus size={16} aria-hidden />
              Gerenciar sessões
            </button>
          </div>
        )}
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
        openingName={openingName}
        geminiApiKey={settings.geminiApiKey}
      />

      <OpeningFinishedModal
        open={finishedMatch !== null}
        openingName={openingName}
        reason={finishedMatch?.reason ?? "opening"}
        badMove={finishedMatch?.badMove ?? null}
        ratingChange={finishedMatch?.ratingChange ?? null}
        onNewMatch={handleNewMatch}
      />

      <HistoryModal
        open={isHistoryOpen}
        sessionName={activeSession?.name ?? "Sem sessão"}
        history={activeSession?.history ?? []}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SettingsModal
        open={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateSettings}
      />
    </div>
  );
}

export default App;
