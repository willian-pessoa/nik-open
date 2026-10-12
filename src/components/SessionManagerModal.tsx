import React, { useState } from 'react';
import { X, Plus, Trash2, Check, BookOpen, Shield, Flame, ArrowRight } from 'lucide-react';
import type { StudySession, GameMode, PlayerColor } from '../types/chess';

interface SessionManagerModalProps {
  isOpen: boolean;
  sessions: StudySession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (session: Omit<StudySession, 'id' | 'createdAt' | 'lastPlayedAt' | 'gamesCount' | 'completedCount' | 'blundersCount' | 'ratingHistory'>) => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onClose
}) => {
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<GameMode>('tutor');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [initialWhiteMove, setInitialWhiteMove] = useState('any');
  const [initialRating, setInitialRating] = useState(1600);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateSession({
      name: name.trim(),
      description: description.trim() || 'Treino livre de aberturas com base no banco do Lichess',
      mode,
      playerColor,
      initialWhiteMove: playerColor === 'b' ? initialWhiteMove : undefined,
      tutorRating: mode === 'tutor' ? initialRating : 1500,
      hardRating: mode === 'hard' ? initialRating : 1500
    });

    setIsCreating(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card session-modal">
        <div className="modal-header">
          <div className="modal-header-title">
            <BookOpen size={22} className="text-emerald-400" />
            <h3>Gerenciador de Sessões & Desafios</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!isCreating ? (
          <div className="sessions-list-view">
            <div className="sessions-intro">
              <p>
                Crie desafios livres e independentes. Você tem total liberdade de lances: a engine responderá com as jogadas mais frequentes no Lichess Blitz no seu nível de rating. Cada sessão tem seu próprio <strong>Rating</strong> e <strong>Histórico</strong>.
              </p>
              <button
                type="button"
                className="create-new-session-btn"
                onClick={() => {
                  setName('Novo Repertório');
                  setIsCreating(true);
                }}
              >
                <Plus size={16} />
                Novo Desafio / Sessão
              </button>
            </div>

            <div className="sessions-grid">
              {sessions.map(s => {
                const isActive = s.id === activeSessionId;
                const currentRating = s.mode === 'tutor' ? s.tutorRating : s.hardRating;

                return (
                  <div key={s.id} className={`session-card ${isActive ? 'active' : ''}`}>
                    <div className="session-card-header">
                      <div className="session-color-mode-row">
                        <span className={`color-pill ${s.playerColor === 'w' ? 'white' : 'black'}`}>
                          {s.playerColor === 'w' ? '♔ Jogando de Brancas' : '♚ Jogando de Pretas'}
                        </span>
                        <span className={`mode-badge ${s.mode === 'tutor' ? 'tutor' : 'hard'}`}>
                          {s.mode === 'tutor' ? (
                            <>
                              <Shield size={12} />
                              Modo Tutor
                            </>
                          ) : (
                            <>
                              <Flame size={12} />
                              Modo Difícil
                            </>
                          )}
                        </span>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          type="button"
                          className="delete-session-btn"
                          onClick={() => onDeleteSession(s.id)}
                          title="Excluir esta sessão"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <h4 className="session-card-name">{s.name}</h4>
                    <p className="session-card-desc">{s.description}</p>

                    {s.playerColor === 'b' && s.initialWhiteMove && s.initialWhiteMove !== 'any' && (
                      <div className="session-first-move-note">
                        Lance inicial configurado das Brancas: <strong>1. {s.initialWhiteMove}</strong>
                      </div>
                    )}

                    <div className="session-metrics-row">
                      <div className="session-metric">
                        <span className="metric-label">Rating Atual</span>
                        <strong className="metric-val rating-highlight">{currentRating}</strong>
                      </div>
                      <div className="session-metric">
                        <span className="metric-label">Partidas</span>
                        <strong className="metric-val">{s.gamesCount}</strong>
                      </div>
                      <div className="session-metric">
                        <span className="metric-label">Concluídas</span>
                        <strong className="metric-val text-emerald-400">{s.completedCount}</strong>
                      </div>
                    </div>

                    <div className="session-card-actions">
                      {isActive ? (
                        <div className="active-session-indicator">
                          <Check size={16} />
                          Sessão Ativa Agora
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="switch-session-btn"
                          onClick={() => {
                            onSelectSession(s.id);
                            onClose();
                          }}
                        >
                          Ativar esta Sessão
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="session-create-form">
            <h4 className="form-section-title">Configurar Nova Sessão de Abertura</h4>

            {/* Custom Name */}
            <div className="form-group">
              <label>Nome do Desafio / Sessão:</label>
              <input
                type="text"
                className="form-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Treino de Brancas, Siciliana Aberta, Defesa contra 1.d4..."
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Descrição ou Objetivo:</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Prática livre simulando partidas reais de Blitz"
              />
            </div>

            <div className="form-row-2col">
              {/* Mode */}
              <div className="form-group">
                <label>Modo de Jogo:</label>
                <div className="radio-cards-row">
                  <label className={`radio-card ${mode === 'tutor' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="mode"
                      value="tutor"
                      checked={mode === 'tutor'}
                      onChange={() => setMode('tutor')}
                    />
                    <div className="radio-card-content">
                      <strong>Modo Tutor</strong>
                      <span>Com dicas e recomendação dos 3 melhores lances ao errar.</span>
                    </div>
                  </label>
                  <label className={`radio-card ${mode === 'hard' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="mode"
                      value="hard"
                      checked={mode === 'hard'}
                      onChange={() => setMode('hard')}
                    />
                    <div className="radio-card-content">
                      <strong>Modo Difícil</strong>
                      <span>Sem tutoria. Erro desfavorável encerra a abertura imediatamente!</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Player Color */}
              <div className="form-group">
                <label>Sua Cor:</label>
                <div className="radio-cards-row">
                  <label className={`radio-card ${playerColor === 'w' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="playerColor"
                      value="w"
                      checked={playerColor === 'w'}
                      onChange={() => setPlayerColor('w')}
                    />
                    <div className="radio-card-content">
                      <strong>♔ Brancas</strong>
                      <span>Você joga o primeiro lance</span>
                    </div>
                  </label>
                  <label className={`radio-card ${playerColor === 'b' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="playerColor"
                      value="b"
                      checked={playerColor === 'b'}
                      onChange={() => setPlayerColor('b')}
                    />
                    <div className="radio-card-content">
                      <strong>♚ Pretas</strong>
                      <span>A engine abre a partida</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* If Black: Initial White move selection */}
            {playerColor === 'b' && (
              <div className="form-group">
                <label>Lance Inicial da Engine (Brancas):</label>
                <select
                  className="form-select"
                  value={initialWhiteMove}
                  onChange={(e) => setInitialWhiteMove(e.target.value)}
                >
                  <option value="any">Livre / Sorteado pelo Banco do Lichess no seu ELO</option>
                  <option value="e4">1. e4 (Abertura do Peão do Rei)</option>
                  <option value="d4">1. d4 (Abertura do Peão da Dama)</option>
                  <option value="c4">1. c4 (Abertura Inglesa)</option>
                  <option value="Nf3">1. Nf3 (Abertura Réti / Cavalo do Rei)</option>
                </select>
              </div>
            )}

            {/* Initial Rating */}
            <div className="form-group">
              <label>Rating Inicial para este Desafio:</label>
              <div className="rating-slider-wrap">
                <input
                  type="range"
                  min="1000"
                  max="2400"
                  step="50"
                  value={initialRating}
                  onChange={(e) => setInitialRating(parseInt(e.target.value, 10))}
                  className="slider"
                />
                <span className="slider-val">{initialRating} ELO</span>
              </div>
            </div>

            <div className="form-buttons-row">
              <button
                type="button"
                className="cancel-form-btn"
                onClick={() => setIsCreating(false)}
              >
                Voltar
              </button>
              <button type="submit" className="submit-form-btn">
                Criar e Começar Prática
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
