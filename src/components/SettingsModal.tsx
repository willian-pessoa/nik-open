import React, { useState } from 'react';
import { X, Settings, Volume2, VolumeX, Cpu, Key, Save } from 'lucide-react';
import { StorageService, type UserSettings } from '../services/storage';
import { SoundService } from '../services/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: UserSettings) => void;
  isRequired?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  isRequired = false
}) => {
  const currentSettings = StorageService.getSettings();
  const [token, setToken] = useState(currentSettings.lichessToken || '');
  const [soundEnabled, setSoundEnabled] = useState(currentSettings.soundEnabled);
  const [engineDepth, setEngineDepth] = useState(currentSettings.engineDepth);
  const [tokenError, setTokenError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setTokenError('O token de acesso do Lichess é obrigatório para consultar as aberturas ao vivo.');
      return;
    }
    setTokenError('');
    const updated: UserSettings = {
      ...currentSettings,
      lichessToken: trimmed,
      soundEnabled,
      engineDepth
    };
    StorageService.saveSettings(updated);
    SoundService.setMuted(!soundEnabled);
    onSettingsSaved(updated);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card settings-modal">
        <div className="modal-header">
          <div className="modal-header-title">
            <Settings size={22} className="text-emerald-400" />
            <h3>{isRequired ? 'Configuração Obrigatória do Lichess' : 'Configurações do NIK-Open'}</h3>
          </div>
          {!isRequired && (
            <button type="button" className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <div className="settings-content">
          {isRequired && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.45
            }}>
              <strong>Atenção:</strong> Para utilizar o NIK-Open com consultas oficiais em tempo real (todas as velocidades: UltraBullet, Bullet, Blitz, Rapid, Classical e Correspondence), é necessário informar seu <strong>Personal API Access Token</strong> do Lichess.
            </div>
          )}

          {/* Lichess Token */}
          <div className="setting-block">
            <div className="setting-label-row">
              <Key size={18} className="text-amber-400" />
              <strong>Token Pessoal de Acesso do Lichess {isRequired ? '(Obrigatório)' : ''}</strong>
            </div>
            <p className="setting-desc">
              Todas as aberturas são pesquisadas ao vivo na base de dados global do Lichess Opening Explorer. Insira o seu token pessoal para liberar o aplicativo.
            </p>
            <input
              type="password"
              className="form-input"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (tokenError) setTokenError('');
              }}
              placeholder="lip_xxxxxxxxxxxxxxxxxxxxxxxx"
              autoFocus={isRequired}
            />
            {tokenError && (
              <span style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {tokenError}
              </span>
            )}
            <span className="setting-hint">
              Crie o seu token gratuitamente em <a href="https://lichess.org/account/oauth/token" target="_blank" rel="noreferrer">lichess.org/account/oauth/token</a> (não é necessário marcar permissões especiais de escrita).
            </span>
          </div>

          {/* Engine Depth */}
          <div className="setting-block">
            <div className="setting-label-row">
              <Cpu size={18} className="text-blue-400" />
              <strong>Profundidade da Engine Stockfish</strong>
            </div>
            <p className="setting-desc">
              Profundidade de cálculo para avaliação posicional e geração de linhas alternativas.
            </p>
            <div className="range-row">
              <input
                type="range"
                min="6"
                max="14"
                step="1"
                value={engineDepth}
                onChange={(e) => setEngineDepth(parseInt(e.target.value, 10))}
                className="slider"
              />
              <span className="slider-val">Profundidade {engineDepth}</span>
            </div>
          </div>

          {/* Sound */}
          <div className="setting-block">
            <div className="setting-label-row">
              {soundEnabled ? <Volume2 size={18} className="text-emerald-400" /> : <VolumeX size={18} className="text-rose-400" />}
              <strong>Efeitos Sonoros de Tabuleiro</strong>
            </div>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span>Ativar sons sintetizados de lances, capturas e alertas de erro</span>
            </label>
          </div>
        </div>

        <div className="modal-actions-row">
          {!isRequired && (
            <button type="button" className="action-btn retry-btn" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button type="button" className="action-btn new-game-btn" onClick={handleSave} style={{ width: isRequired ? '100%' : undefined }}>
            <Save size={16} />
            {isRequired ? 'Salvar Token e Liberar Aplicação' : 'Salvar Preferências'}
          </button>
        </div>
      </div>
    </div>
  );
};
