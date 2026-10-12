import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, ExternalLink, Download } from 'lucide-react';
import { StorageService } from '../services/storage';

interface MoveListProps {
  movesSan: string[];
  currentMoveIndex: number; // -1 = start position, 0 = after first half-move, etc.
  onSelectMove: (index: number) => void;
  openingName?: string;
  eco?: string;
  pgn: string;
}

export const MoveList: React.FC<MoveListProps> = ({
  movesSan,
  currentMoveIndex,
  onSelectMove,
  openingName,
  eco,
  pgn
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLichessAnalysis = () => {
    StorageService.openInLichess(pgn);
  };

  const handleDownloadPgn = () => {
    StorageService.downloadPgn(pgn, `nik-open-${eco || 'game'}.pgn`);
  };

  // Group moves into pairs (turn 1: white, black)
  const turns: { moveNumber: number; white: { san: string; index: number }; black?: { san: string; index: number } }[] = [];
  for (let i = 0; i < movesSan.length; i += 2) {
    turns.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: { san: movesSan[i], index: i },
      black: movesSan[i + 1] ? { san: movesSan[i + 1], index: i + 1 } : undefined
    });
  }

  return (
    <div className="move-list-card">
      <div className="move-list-header">
        <div className="opening-badge-row">
          {eco && <span className="eco-pill">{eco}</span>}
          <span className="opening-title" title={openingName}>
            {openingName || 'Abertura'}
          </span>
        </div>
      </div>

      <div className="moves-scroll-container">
        {turns.length === 0 ? (
          <div className="empty-moves-placeholder">
            Faça seu primeiro lance para iniciar a abertura...
          </div>
        ) : (
          <div className="turns-table">
            {turns.map(turn => (
              <div key={turn.moveNumber} className="turn-row">
                <span className="turn-num">{turn.moveNumber}.</span>
                <button
                  type="button"
                  className={`move-btn ${currentMoveIndex === turn.white.index ? 'active' : ''}`}
                  onClick={() => onSelectMove(turn.white.index)}
                >
                  {turn.white.san}
                </button>
                {turn.black ? (
                  (() => {
                    const blackMove = turn.black;
                    return (
                      <button
                        type="button"
                        className={`move-btn ${currentMoveIndex === blackMove.index ? 'active' : ''}`}
                        onClick={() => onSelectMove(blackMove.index)}
                      >
                        {blackMove.san}
                      </button>
                    );
                  })()
                ) : (
                  <span className="move-btn placeholder">...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="move-nav-controls">
        <button
          type="button"
          className="nav-btn"
          disabled={currentMoveIndex === -1}
          onClick={() => onSelectMove(-1)}
          title="Início da partida"
        >
          <ChevronsLeft size={18} />
        </button>
        <button
          type="button"
          className="nav-btn"
          disabled={currentMoveIndex === -1}
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          title="Lance anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="nav-btn"
          disabled={currentMoveIndex >= movesSan.length - 1}
          onClick={() => onSelectMove(Math.min(movesSan.length - 1, currentMoveIndex + 1))}
          title="Próximo lance"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="nav-btn"
          disabled={currentMoveIndex >= movesSan.length - 1}
          onClick={() => onSelectMove(movesSan.length - 1)}
          title="Último lance"
        >
          <ChevronsRight size={18} />
        </button>
      </div>

      {/* PGN Actions */}
      <div className="pgn-action-buttons">
        <button
          type="button"
          className="pgn-btn"
          onClick={handleCopy}
          title="Copiar PGN para a área de transferência"
        >
          <Copy size={14} />
          {copied ? 'Copiado!' : 'Copiar PGN'}
        </button>
        <button
          type="button"
          className="pgn-btn"
          onClick={handleDownloadPgn}
          title="Baixar arquivo PGN"
        >
          <Download size={14} />
          Baixar
        </button>
        <button
          type="button"
          className="pgn-btn lichess-btn"
          onClick={handleLichessAnalysis}
          title="Abrir tabuleiro de análise do Lichess com esta partida"
        >
          <ExternalLink size={14} />
          Análise no Lichess
        </button>
      </div>
    </div>
  );
};
