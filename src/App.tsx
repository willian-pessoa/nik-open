import { useState, type CSSProperties } from "react";
import "./App.css";

import AppChessBoard from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";

import type { ChessMove } from "./types";

const MOVES_PANEL_WIDTH = "18rem";

function App() {
  const [openingName, setOpeningName] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);

  return (
    <div className="flex flex-col bg-slate-950 h-screen w-screen text-slate-50 text-lg overflow-hidden">
      <AppHeader />
      {/* Área disponível: centraliza o conjunto tabuleiro + lances e serve de
          container para o dimensionamento do tabuleiro (cqw / cqh) */}
      <div
        className="flex flex-1 min-h-0 items-center justify-center p-2 @container-size"
        style={{ "--side-panel-w": MOVES_PANEL_WIDTH } as CSSProperties}
      >
        <div className="flex items-stretch gap-2">
          <AppChessBoard
            playerOrientation="b"
            playerRating={1200}
            onOpeningChange={setOpeningName}
            onMoveMade={setMoveHistory}
          />
          <AppChessMoves openingName={openingName} moves={moveHistory} />
        </div>
      </div>
    </div>
  );
}

export default App;
