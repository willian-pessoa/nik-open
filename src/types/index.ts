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
