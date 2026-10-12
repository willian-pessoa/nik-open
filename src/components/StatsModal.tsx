import React from 'react';
import { X, TrendingUp, Award, Target, Flame, Shield } from 'lucide-react';
import type { StudySession } from '../types/chess';
import { StorageService } from '../services/storage';

interface StatsModalProps {
  isOpen: boolean;
  session: StudySession;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  session,
  onClose
}) => {
  if (!isOpen) return null;

  const history = StorageService.getHistory(session.id);
  const total = session.gamesCount || history.length;
  const completed = session.completedCount;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build points for SVG Rating chart
  const ratingPoints = session.ratingHistory || [];
  const minRating = ratingPoints.length > 0 ? Math.min(...ratingPoints.map(p => p.rating)) - 40 : 1400;
  const maxRating = ratingPoints.length > 0 ? Math.max(...ratingPoints.map(p => p.rating)) + 40 : 1800;
  const ratingRange = Math.max(1, maxRating - minRating);

  const chartWidth = 500;
  const chartHeight = 160;

  const pointsString = ratingPoints.map((p, idx) => {
    const x = ratingPoints.length === 1 ? chartWidth / 2 : (idx / (ratingPoints.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - 20 - ((p.rating - minRating) / ratingRange) * (chartHeight - 40);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="modal-backdrop">
      <div className="modal-card stats-modal">
        <div className="modal-header">
          <div className="modal-header-title">
            <TrendingUp size={22} className="text-emerald-400" />
            <h3>Estatísticas & Evolução da Sessão</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="stats-session-banner">
          <div>
            <span className="stats-session-label">Sessão Ativa:</span>
            <h4 className="stats-session-title">{session.name}</h4>
          </div>
          <div className="stats-current-rating">
            <span>Rating Atual:</span>
            <strong className="rating-big">
              {session.mode === 'tutor' ? session.tutorRating : session.hardRating} ELO
            </strong>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="stats-metrics-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap emerald">
              <Target size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Taxa de Conclusão</span>
              <strong className="stat-value">{successRate}%</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap blue">
              <Award size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total de Partidas</span>
              <strong className="stat-value">{total}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap amber">
              <Shield size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Rating Modo Tutor</span>
              <strong className="stat-value">{session.tutorRating}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap purple">
              <Flame size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Rating Modo Difícil</span>
              <strong className="stat-value">{session.hardRating}</strong>
            </div>
          </div>
        </div>

        {/* Rating Progression Chart */}
        <div className="chart-section">
          <h4 className="chart-title">Evolução do Rating ao Longo das Partidas</h4>
          {ratingPoints.length <= 1 ? (
            <div className="chart-empty-state">
              Jogue mais partidas nesta sessão para gerar o gráfico de progressão de rating!
            </div>
          ) : (
            <div className="chart-wrapper">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="rating-svg">
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="20" y1="30" x2={chartWidth - 20} y2="30" stroke="#334155" strokeDasharray="4 4" />
                <line x1="20" y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} stroke="#334155" strokeDasharray="4 4" />
                <line x1="20" y1={chartHeight - 30} x2={chartWidth - 20} y2={chartHeight - 30} stroke="#334155" strokeDasharray="4 4" />

                {/* Line graph */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  points={pointsString}
                />

                {/* Data point dots */}
                {ratingPoints.map((p, idx) => {
                  const x = (idx / (ratingPoints.length - 1)) * (chartWidth - 40) + 20;
                  const y = chartHeight - 20 - ((p.rating - minRating) / ratingRange) * (chartHeight - 40);
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#34d399"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
              <div className="chart-axis-labels">
                <span>Início ({ratingPoints[0]?.rating})</span>
                <span>Última Partida ({ratingPoints[ratingPoints.length - 1]?.rating})</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
