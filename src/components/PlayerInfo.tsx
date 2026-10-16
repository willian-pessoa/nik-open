import type { Side } from "../types";

interface IPlayerInfoProps {
  name: string;
  side: Side;
  rating: string;
  isPlayer?: boolean;
  reverse?: boolean;
}

// Bloco com a cor das peças, o nome e o rating de um dos lados da partida
export function PlayerInfo({
  name,
  side,
  rating,
  isPlayer = false,
  reverse = false,
}: IPlayerInfoProps) {
  return (
    <div
      className={`flex items-center gap-3 min-w-0 ${
        reverse ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span
        aria-label={side === "w" ? "Peças brancas" : "Peças pretas"}
        className={`h-4 w-4 shrink-0 rounded-full border ${
          side === "w"
            ? "bg-slate-50 border-slate-300"
            : "bg-slate-950 border-slate-600"
        }`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-slate-200">
          {name}
        </p>
        <p
          className={`text-xs font-medium tabular-nums ${
            isPlayer ? "text-rose-400" : "text-slate-400"
          }`}
        >
          <span className="uppercase tracking-widest text-slate-500">
            Rating{" "}
          </span>
          {rating}
        </p>
      </div>
    </div>
  );
}
