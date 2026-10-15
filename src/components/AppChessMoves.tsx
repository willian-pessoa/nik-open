import type { ChessMove } from "../types";

export interface IAppChessMovesProps {
  openingName: string;
  moves: ChessMove[];
}

export default function AppChessMoves({
  openingName,
  moves,
}: IAppChessMovesProps) {
  console.log("🚀 ~ AppChessMoves ~ openingName:", openingName);
  console.log("🚀 ~ AppChessMoves ~ moves:", moves);
  return <div className="p-2 w-60">{openingName}</div>;
}
