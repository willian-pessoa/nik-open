export interface LichessMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
  opening: { eco: string; name: string };
}

export interface ChessMove {
  move: string;
  number: number;
}

export type Side = "w" | "b";

export type SessionMode = "challenger" | "tutor";

export type MatchResult = "win" | "loss";

export interface PlayerSetting {
  lichessToken: string | null;
}

export interface Match {
  pgn: string;
  playerSide: Side;
  playerRating: number;
  opening: string | null;
  ratingEarned: number;
  result: MatchResult;
  helpsUsed?: number;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  playerSide: Side | null;
  cpuStartMove: string | null;
  startRating: number;
  currentRating: number;
  history: Match[];
  mode: SessionMode;
  currentStreak: number;
}

export interface NewSessionInput {
  name: string;
  mode: SessionMode;
  startRating: number;
  playerSide: Side | null;
  cpuStartMove: string | null;
}
