import type { OpeningBookMove } from '../types/chess';

// Normalize FEN to match book key (pieces, active color, castling, en passant)
export function getFenKey(fen: string): string {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}

// Convert player ELO rating to Lichess rating bracket
export function getRatingBracket(rating: number): string {
  if (rating < 1500) return '1400';
  if (rating < 1700) return '1600';
  if (rating < 1900) return '1800';
  return '2000';
}

// Check opening book status and games count for the current position
export interface OpeningStatus {
  inBook: boolean;
  totalGames: number;
  eco: string;
  name: string;
  candidateMoves: OpeningBookMove[];
}

export function getPositionOpeningStatus(_fen: string): OpeningStatus {
  return {
    inBook: false,
    totalGames: 0,
    eco: '',
    name: 'Consultando Lichess...',
    candidateMoves: []
  };
}

// In-memory cache for live Lichess queries
const lichessLiveCache = new Map<string, OpeningStatus>();

// Online Lichess Explorer query (used if token is available)
export async function fetchLichessExplorerOnline(
  fen: string,
  token?: string,
  playerRating = 1600
): Promise<OpeningStatus | null> {
  if (!token) return null;

  const cacheKey = `${getFenKey(fen)}_${Math.round(playerRating / 200)}`;
  if (lichessLiveCache.has(cacheKey)) {
    return lichessLiveCache.get(cacheKey)!;
  }

  // Adjust ratings bracket
  let ratingsParam = '1600,1800,2000';
  if (playerRating < 1500) ratingsParam = '1200,1400,1600';
  else if (playerRating < 1700) ratingsParam = '1400,1600,1800';
  else if (playerRating < 1900) ratingsParam = '1600,1800,2000';
  else ratingsParam = '1800,2000,2200';

  try {
    const speeds = 'ultraBullet,bullet,blitz,rapid,classical,correspondence';
    const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=${speeds}&ratings=${ratingsParam}&fen=${encodeURIComponent(fen)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.moves || !Array.isArray(data.moves)) return null;

    const moves: OpeningBookMove[] = data.moves.map((m: { san: string; uci: string; white: number; draws: number; black: number }) => ({
      san: m.san,
      uci: m.uci,
      whiteWins: m.white,
      draws: m.draws,
      blackWins: m.black,
      total: m.white + m.draws + m.black
    }));

    const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
    const openingObj = data.opening || {};

    const result: OpeningStatus = {
      inBook: totalGames > 25 && moves.length > 0,
      totalGames,
      eco: openingObj.eco || 'A00',
      name: openingObj.name || (totalGames > 0 ? "Abertura Lichess" : "Linha Rara / Meio-Jogo"),
      candidateMoves: moves
    };

    lichessLiveCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Failed to fetch from Lichess Explorer:', err);
    return null;
  }
}

// Select a weighted move from candidate moves list
export function pickWeightedMove(candidateMoves: OpeningBookMove[]): OpeningBookMove | null {
  if (!candidateMoves || candidateMoves.length === 0) return null;

  const weights = candidateMoves.map((m, idx) => {
    const rawTotal = Math.max(1, m.total);
    const rankMultiplier = idx === 0 ? 1.5 : idx === 1 ? 1.2 : 1.0;
    return rawTotal * rankMultiplier;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < candidateMoves.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return candidateMoves[i];
    }
  }

  return candidateMoves[0];
}
