import React from 'react';

interface EvalBarProps {
  score: number; // Centipawns (+ for White, - for Black)
  mate: number | null;
  orientation?: 'white' | 'black';
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, mate, orientation = 'white' }) => {
  // Convert centipawns or mate into a percentage 0% to 100% for White
  let whitePercent = 50;

  if (mate !== null) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    // Sigmoid or clamped scale: 0 cp = 50%, +500 cp = ~90%, -500 cp = ~10%
    const cappedScore = Math.max(-1000, Math.min(1000, score));
    whitePercent = 50 + (cappedScore / 1000) * 45;
    whitePercent = Math.max(5, Math.min(95, whitePercent));
  }

  // Display text
  let displayText = '0.0';
  if (mate !== null) {
    displayText = `M${Math.abs(mate)}`;
  } else {
    const pawns = (score / 100).toFixed(1);
    displayText = score > 0 ? `+${pawns}` : pawns;
  }

  const isWhiteAdvantage = mate !== null ? mate > 0 : score >= 0;

  return (
    <div className="eval-bar-container" title={`Avaliação da Engine: ${displayText}`}>
      <div className="eval-bar-track">
        <div
          className="eval-bar-fill-white"
          style={{
            height: orientation === 'white' ? `${whitePercent}%` : `${100 - whitePercent}%`
          }}
        />
      </div>
      <div className={`eval-bar-badge ${isWhiteAdvantage ? 'white-lead' : 'black-lead'}`}>
        {displayText}
      </div>
    </div>
  );
};
