import React from 'react';
import { Plus, History, TrendingUp, Settings, Volume2, VolumeX, Shield, Flame, ChevronDown } from 'lucide-react';
import type { StudySession } from '../types/chess';

interface NavbarProps {
  sessions: StudySession[];
  activeSession: StudySession;
  onSelectSession: (id: string) => void;
  onOpenSessionManager: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onOpenSessionManager,
  onOpenHistory,
  onOpenStats,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  historyCount
}) => {
  const currentRating = activeSession.mode === 'tutor' ? activeSession.tutorRating : activeSession.hardRating;

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="brand-logo" onClick={onOpenSessionManager} role="button" title="NIK-Open - Gerenciar Sessões">
          <div className="logo-icon-wrap">
            <span className="logo-piece">♞</span>
          </div>
          <div className="brand-texts">
            <h1 className="brand-title">NIK-Open</h1>
            <span className="brand-sub">Now I Know This Opening</span>
          </div>
        </div>

        {/* Quick Session Switcher Dropdown */}
        <div className="session-quick-picker">
          <select
            className="session-select-input"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
          >
            {sessions.map(s => {
              const r = s.mode === 'tutor' ? s.tutorRating : s.hardRating;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} ({r} ELO - {s.mode === 'tutor' ? 'Tutor' : 'Difícil'})
                </option>
              );
            })}
          </select>
          <div className="session-picker-display">
            <span className="active-session-name">{activeSession.name}</span>
            <div className="session-badges">
              <span className={`nav-mode-badge ${activeSession.mode === 'tutor' ? 'tutor' : 'hard'}`}>
                {activeSession.mode === 'tutor' ? <Shield size={11} /> : <Flame size={11} />}
                {activeSession.mode === 'tutor' ? 'Tutor' : 'Difícil'}
              </span>
              <span className="nav-rating-badge">
                {currentRating} ELO
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="nav-btn primary-action"
          onClick={onOpenSessionManager}
          title="Criar novo repertório ou alternar desafios"
        >
          <Plus size={16} />
          <span className="hide-mobile">Novo Desafio</span>
        </button>

        <button
          type="button"
          className="nav-btn"
          onClick={onOpenHistory}
          title="Ver histórico de partidas e PGNs"
        >
          <History size={16} />
          <span className="hide-mobile">Histórico</span>
          {historyCount > 0 && <span className="nav-count-badge">{historyCount}</span>}
        </button>

        <button
          type="button"
          className="nav-btn"
          onClick={onOpenStats}
          title="Ver estatísticas e gráfico de evolução"
        >
          <TrendingUp size={16} />
          <span className="hide-mobile">Estatísticas</span>
        </button>

        <button
          type="button"
          className="nav-btn icon-only"
          onClick={onToggleSound}
          title={soundEnabled ? 'Silenciar sons' : 'Ativar sons'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <button
          type="button"
          className="nav-btn icon-only"
          onClick={onOpenSettings}
          title="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
