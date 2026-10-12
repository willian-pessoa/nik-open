import React, { useState } from 'react';
import { X, ExternalLink, Copy, Download, History, Filter, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';
import type { GameHistoryItem, StudySession } from '../types/chess';
import { StorageService } from '../services/storage';

interface HistoryModalProps {
  isOpen: boolean;
  sessions: StudySession[];
  activeSessionId: string;
  onReplayGame: (game: GameHistoryItem) => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onReplayGame,
  onClose
}) => {
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(activeSessionId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const allHistory = StorageService.getHistory();
  const filteredHistory = allHistory.filter(item => {
    if (selectedSessionFilter === 'all') return true;
    return item.sessionId === selectedSessionFilter;
  });

  const handleCopyPgn = (game: GameHistoryItem) => {
    navigator.clipboard.writeText(game.pgn);
    setCopiedId(game.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card history-modal">
        <div className="modal-header">
          <div className="modal-header-title">
            <History size={22} className="text-emerald-400" />
            <h3>Histórico de Partidas & PGNs</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="history-filter-bar">
          <div className="filter-group">
            <Filter size={16} className="text-slate-400" />
            <span>Filtrar por Sessão:</span>
            <select
              className="filter-select"
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
            >
              <option value="all">Todas as Sessões ({allHistory.length} partidas)</option>
              {sessions.map(s => {
                const count = allHistory.filter(h => h.sessionId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} partidas)
                  </option>
                );
              })}
            </select>
          </div>
          <div className="filter-summary">
            Mostrando <strong>{filteredHistory.length}</strong> partidas
          </div>
        </div>

        {/* Games List */}
        <div className="history-list-container">
          {filteredHistory.length === 0 ? (
            <div className="empty-history-state">
              <History size={48} className="text-slate-600 mb-2" />
              <p>Nenhuma partida registrada nesta sessão ainda.</p>
              <span className="text-xs text-slate-500">
                Jogue uma partida para salvar automaticamente o PGN e registrar o progresso de rating!
              </span>
            </div>
          ) : (
            <div className="history-items-grid">
              {filteredHistory.map(game => {
                const isSuccess = game.result === 'completed';
                const delta = game.ratingDelta;

                return (
                  <div key={game.id} className="history-item-card">
                    <div className="history-card-top">
                      <div className="history-badges">
                        <span className={`result-tag ${isSuccess ? 'success' : 'blunder'}`}>
                          {isSuccess ? (
                            <>
                              <CheckCircle2 size={13} />
                              Concluída
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} />
                              Desvantagem
                            </>
                          )}
                        </span>
                        <span className="eco-tag">{game.eco}</span>
                        <span className="mode-mini-tag">{game.mode === 'tutor' ? 'Tutor' : 'Difícil'}</span>
                      </div>

                      <div className={`rating-delta-pill ${delta >= 0 ? 'pos' : 'neg'}`}>
                        {delta >= 0 ? (
                          <>
                            <ArrowUpRight size={14} />
                            +{delta}
                          </>
                        ) : (
                          <>
                            <ArrowDownRight size={14} />
                            {delta}
                          </>
                        )}
                        <span className="rating-pill-sub">({game.ratingAfter})</span>
                      </div>
                    </div>

                    <h4 className="history-opening-title">{game.targetOpening}</h4>
                    <div className="history-date-row">
                      <span>{new Date(game.timestamp).toLocaleDateString()} às {new Date(game.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{game.movesCount} lances</span>
                      <span>•</span>
                      <span>Cor: {game.playerColor === 'w' ? 'Brancas' : 'Pretas'}</span>
                    </div>

                    <p className="history-reason-text">{game.reason}</p>

                    <div className="history-card-actions">
                      <button
                        type="button"
                        className="hist-action-btn view-btn"
                        onClick={() => {
                          onReplayGame(game);
                          onClose();
                        }}
                        title="Rever esta partida no tabuleiro"
                      >
                        <Eye size={14} />
                        Rever Partida
                      </button>

                      <button
                        type="button"
                        className="hist-action-btn"
                        onClick={() => handleCopyPgn(game)}
                        title="Copiar PGN"
                      >
                        <Copy size={14} />
                        {copiedId === game.id ? 'Copiado!' : 'PGN'}
                      </button>

                      <button
                        type="button"
                        className="hist-action-btn"
                        onClick={() => StorageService.downloadPgn(game.pgn, `nik-open-${game.id}.pgn`)}
                        title="Baixar arquivo .pgn"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        className="hist-action-btn lichess"
                        onClick={() => StorageService.openInLichess(game.pgn)}
                        title="Abrir no Tabuleiro de Análise do Lichess"
                      >
                        <ExternalLink size={14} />
                        Análise Lichess
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
