import React from 'react';
import { AlertTriangle, RotateCcw, Play, ExternalLink, ArrowRight, Zap } from 'lucide-react';
import type { EngineMoveEvaluation, GameMode } from '../types/chess';
import { StorageService } from '../services/storage';

interface TutorBlunderModalProps {
  isOpen: boolean;
  mode: GameMode;
  playedMoveSan: string;
  explanation: string;
  ratingDelta: number;
  newRating: number;
  topMoves: EngineMoveEvaluation[];
  pgn: string;
  onRetry: () => void;
  onNewGame: () => void;
  onPlayRecommendedMove: (moveSan: string) => void;
}

export const TutorBlunderModal: React.FC<TutorBlunderModalProps> = ({
  isOpen,
  mode,
  playedMoveSan,
  explanation,
  ratingDelta,
  newRating,
  topMoves,
  pgn,
  onRetry,
  onNewGame,
  onPlayRecommendedMove
}) => {
  if (!isOpen) return null;

  const isTutor = mode === 'tutor';

  const formatScore = (m: EngineMoveEvaluation) => {
    if (m.mate !== null) return `M${Math.abs(m.mate)}`;
    const pawns = (m.score / 100).toFixed(1);
    return m.score > 0 ? `+${pawns}` : pawns;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card tutor-blunder-modal">
        <div className="blunder-badge-header">
          <div className="blunder-icon-wrap">
            <AlertTriangle size={28} className="blunder-icon" />
          </div>
          <div>
            <h3 className="blunder-title">
              {isTutor ? 'Lance em Desvantagem Detectado!' : 'Abertura Encerrada: Desvantagem!'}
            </h3>
            <p className="blunder-subtitle">
              {isTutor
                ? 'O Tutor da Engine identificou uma imprecisão grave na sua linha.'
                : 'No Modo Difícil, lances desfavoráveis encerram a fase de abertura imediatamente.'}
            </p>
          </div>
        </div>

        {/* Rating impact pill */}
        <div className="rating-impact-strip">
          <div className="impact-left">
            <span className="impact-label">Impacto no Rating ({isTutor ? 'Modo Tutor' : 'Modo Difícil'}):</span>
            <span className="impact-score-badge negative">
              {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta} pts
            </span>
          </div>
          <div className="impact-new-rating">
            Novo Rating: <strong>{newRating}</strong>
          </div>
        </div>

        {/* Explanation text */}
        <div className="explanation-box">
          <div className="explanation-header">
            <Zap size={16} className="text-amber-400" />
            <span>Por que o lance <strong>{playedMoveSan}</strong> foi ruim?</span>
          </div>
          <p className="explanation-body">{explanation}</p>
        </div>

        {/* Top 3 Alternative Moves */}
        <div className="top-moves-section">
          <h4 className="top-moves-title">
            Melhores opções recomendadas pela Engine (Top 3):
          </h4>
          <div className="top-moves-grid">
            {topMoves.length === 0 ? (
              <div className="text-sm text-slate-400">Calculando linhas alternativas...</div>
            ) : (
              topMoves.slice(0, 3).map((move, idx) => (
                <div key={idx} className="top-move-card">
                  <div className="top-move-left">
                    <span className="top-move-rank">#{idx + 1}</span>
                    <strong className="top-move-san">{move.san}</strong>
                    <span className="top-move-eval">{formatScore(move)}</span>
                  </div>
                  {isTutor && (
                    <button
                      type="button"
                      className="play-move-btn"
                      onClick={() => onPlayRecommendedMove(move.san)}
                      title={`Jogar ${move.san} e continuar a prática`}
                    >
                      <span>Jogar este</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions-row">
          {isTutor ? (
            <button type="button" className="action-btn retry-btn" onClick={onRetry}>
              <RotateCcw size={16} />
              Desfazer & Tentar Novamente
            </button>
          ) : (
            <button
              type="button"
              className="action-btn lichess-action-btn"
              onClick={() => StorageService.openInLichess(pgn)}
            >
              <ExternalLink size={16} />
              Analisar no Lichess
            </button>
          )}

          <button type="button" className="action-btn new-game-btn" onClick={onNewGame}>
            <Play size={16} />
            Nova Partida
          </button>
        </div>
      </div>
    </div>
  );
};
