import React, { useState } from 'react';
import { X, Settings, Volume2, VolumeX, Cpu, Key, Save } from 'lucide-react';
import { StorageService, type UserSettings } from '../services/storage';
import { SoundService } from '../services/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved
}) => {
  const currentSettings = StorageService.getSettings();
  const [token, setToken] = useState(currentSettings.lichessToken || '');
  const [soundEnabled, setSoundEnabled] = useState(currentSettings.soundEnabled);
  const [engineDepth, setEngineDepth] = useState(currentSettings.engineDepth);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: UserSettings = {
      ...currentSettings,
      lichessToken: token.trim(),
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
            <h3>Configurações do NIK-Open</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {/* Lichess Token */}
          <div className="setting-block">
            <div className="setting-label-row">
              <Key size={18} className="text-amber-400" />
              <strong>Token Pessoal do Lichess (Opcional)</strong>
            </div>
            <p className="setting-desc">
              O NIK-Open já inclui uma árvore local completa baseada em milhões de partidas de Blitz do Lichess. Caso queira consultar a API ao vivo diretamente da sua conta, insira um token com permissão de leitura.
            </p>
            <input
              type="password"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="lip_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <span className="setting-hint">
              Pode ser gerado gratuitamente em <a href="https://lichess.org/account/oauth/token" target="_blank" rel="noreferrer">lichess.org/account/oauth/token</a>.
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
          <button type="button" className="action-btn retry-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="action-btn new-game-btn" onClick={handleSave}>
            <Save size={16} />
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
};
