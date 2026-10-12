export type GameMode = 'tutor' | 'hard';
export type PlayerColor = 'w' | 'b';

export interface StudySession {
  id: string;
  name: string;
  description: string;
  mode: GameMode;
  playerColor: PlayerColor;
  initialWhiteMove?: string; // e.g. "e4", "d4", "c4", "Nf3", or "any"
  tutorRating: number;
  hardRating: number;
  gamesCount: number;
  completedCount: number;
  blundersCount: number;
  createdAt: number;
  lastPlayedAt: number;
  ratingHistory: { timestamp: number; rating: number; mode: GameMode }[];
}

export interface GameHistoryItem {
  id: string;
  sessionId: string;
  sessionName: string;
  mode: GameMode;
  playerColor: PlayerColor;
  openingName: string;
  eco: string;
  pgn: string;
  fen: string;
  result: 'completed' | 'blunder' | 'abandoned';
  movesCount: number;
  date: string;
  timestamp: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  reason: string;
  finalEval: number;
}

export interface EngineMoveEvaluation {
  san: string;
  uci: string;
  score: number; // Centipawns from White's perspective
  mate: number | null;
  depth: number;
  pv: string[];
  explanation?: string;
}

export interface OpeningBookMove {
  san: string;
  uci: string;
  whiteWins: number;
  draws: number;
  blackWins: number;
  total: number;
  ratingFrequencies?: Record<string, number>; // e.g. "1600": 0.42
}

export interface OpeningBookEntry {
  eco: string;
  name: string;
  totalGames: number;
  moves: OpeningBookMove[];
  plan?: string;
}
