import { useState, type CSSProperties } from "react";

import AppChessBoard from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";
import ManageSessions from "./components/ManageSessions";

import type { ChessMove } from "./types";
import { useSessions } from "./hooks/useSessions";

const MOVES_PANEL_WIDTH = "18rem";
const FALLBACK_RATING = 1200;

function App() {
  const {
    sessions,
    activeSession,
    createSession,
    deleteSession,
    selectSession,
  } = useSessions();

  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [openingName, setOpeningName] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);

  // Ao trocar de sessão o tabuleiro é remontado (key), então zera também o
  // que o pai guarda da partida anterior
  const activeSessionId = activeSession?.id ?? null;
  const [prevSessionId, setPrevSessionId] = useState(activeSessionId);
  if (prevSessionId !== activeSessionId) {
    setPrevSessionId(activeSessionId);
    setOpeningName("");
    setMoveHistory([]);
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
            key={activeSessionId ?? "no-session"}
            // playerSide null = "escolher a cada partida" (ainda sem seletor): usa brancas
            playerOrientation={activeSession?.playerSide ?? "w"}
            playerRating={activeSession?.currentRating ?? FALLBACK_RATING}
            onOpeningChange={setOpeningName}
            onMoveMade={setMoveHistory}
            cpuStartMove={activeSession?.cpuStartMove ?? null}
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
    </div>
  );
}

export default App;
