import type { MoveSuggestion } from "../types";
import { formatEval } from "../utils/formatEval";
import { MoveNotation } from "./MoveNotation";

interface IMoveSuggestionsListProps {
  suggestions: MoveSuggestion[];
}

// Lista numerada dos melhores lances com a avaliação de cada um
export default function MoveSuggestionsList({
  suggestions,
}: IMoveSuggestionsListProps) {
  if (suggestions.length === 0) {
    return (
      <p className="text-sm italic text-slate-500">
        Nenhuma sugestão disponível para essa posição.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1">
      {suggestions.map((s, i) => (
        <li
          key={`${s.san}-${i}`}
          className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-1.5"
        >
          <span className="flex items-center gap-3">
            <span className="w-4 text-sm tabular-nums text-slate-500">
              {i + 1}.
            </span>
            <span className="font-semibold text-slate-100">
              <MoveNotation san={s.san} />
            </span>
          </span>
          <span
            className={`text-sm font-medium tabular-nums ${
              s.score >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatEval(s)}
          </span>
        </li>
      ))}
    </ol>
  );
}
