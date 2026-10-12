import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Play, ExternalLink, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storage';

interface OpeningSuccessModalProps {
  isOpen: boolean;
  sessionName: string;
  openingName: string;
  movesCount: number;
  ratingDelta: number;
  newRating: number;
  pgn: string;
  onNewGame: () => void;
  onClose: () => void;
}

export const OpeningSuccessModal: React.FC<OpeningSuccessModalProps> = ({
  isOpen,
  sessionName,
  openingName,
  movesCount,
  ratingDelta,
  newRating,
  pgn,
  onNewGame,
  onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card success-modal" style={{ position: 'relative' }}>
        <button
          type="button"
          className="close-btn"
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px' }}
          title="Fechar"
        >
          ✕
        </button>
        <div className="success-icon-wrap">
          <Trophy size={42} className="text-amber-400" />
        </div>

        <h3 className="success-title">Fase de Abertura Concluída com Sucesso!</h3>
        <p className="success-subtitle">
          Você navegou com precisão pela linha teórica de <strong>{openingName}</strong> sem cair em desvantagem contra a engine/banco do Lichess!
        </p>

        <div className="rating-impact-strip positive">
          <div className="impact-left">
            <span className="impact-label">Recompensa de Rating:</span>
            <span className="impact-score-badge positive">+{ratingDelta} pts</span>
          </div>
          <div className="impact-new-rating">
            Novo Rating: <strong>{newRating}</strong>
          </div>
        </div>

        <div className="success-details-card">
          <div className="detail-item">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>Lances jogados: <strong>{movesCount} lances</strong></span>
          </div>
          <div className="detail-item">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>Sessão: <strong>{sessionName}</strong></span>
          </div>
          <div className="detail-item">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>Status: <strong>Posição consolidada para o Meio-Jogo</strong></span>
          </div>
        </div>

        <div className="modal-actions-row">
          <button
            type="button"
            className="action-btn lichess-action-btn"
            onClick={() => StorageService.openInLichess(pgn)}
          >
            <ExternalLink size={16} />
            Analisar no Lichess
          </button>
          <button type="button" className="action-btn new-game-btn" onClick={onNewGame}>
            <Play size={16} />
            Próxima Partida
          </button>
        </div>
      </div>
    </div>
  );
};
