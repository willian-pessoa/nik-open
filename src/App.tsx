import { useState } from "react";
import "./App.css";

import AppChessBoard from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";

import type { ChessMove } from "./types";

function App() {
  const [openingName, setOpeningName] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);

  return (
    <div className="flex flex-col bg-slate-950 h-screen w-screen text-slate-50 text-lg overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        <AppChessBoard
          playerOrientation="b"
          playerRating={1200}
          onOpeningChange={setOpeningName}
          onMoveMade={setMoveHistory}
        />
        <AppChessMoves openingName={openingName} moves={moveHistory} />
      </div>
    </div>
  );
}

export default App;
