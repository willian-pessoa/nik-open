import "./App.css";

import AppChessBoard from "./components/AppChessBoard";
import AppChessMoves from "./components/AppChessMoves";
import AppHeader from "./components/AppHeader";

function App() {
  return (
    <div className="flex flex-col bg-slate-950 h-screen w-screen text-slate-50 text-lg overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        <AppChessBoard playerOrientation="b" />
        <AppChessMoves />
      </div>
    </div>
  );
}

export default App;
