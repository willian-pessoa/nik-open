import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { Match } from "../types";
import { getMatchResult } from "../utils/calculateRating";
import AppModal from "./AppModal";
import { getLichessAnalysisUrl } from "../utils/getLichessAnalysisUrl";

export interface IHistoryModalProps {
  open: boolean;
  sessionName: string;
  history: Match[];
  onClose: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function HistoryModal({
  open,
  sessionName,
  history,
  onClose,
}: IHistoryModalProps) {
  // Mais recentes primeiro, mantendo o número real da partida
  const rows = history.map((match, index) => ({ match, index })).reverse();

  return (
    <AppModal
      open={open}
      title={`Histórico — ${sessionName}`}
      onClose={onClose}
      widthClass="max-w-xl"
    >
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-sm italic text-slate-500">
          Nenhuma partida jogada nesta sessão ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ match, index }) => {
            const isWin = getMatchResult(match) === "win";
            const analysisUrl = getLichessAnalysisUrl(match);
            const helps = match.helpsUsed ?? 0;
            const playedAtLabel = match.playedAt
              ? dateFormatter.format(match.playedAt)
              : null;

            return (
              <li
                key={index}
                className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <span className="w-8 shrink-0 text-right text-sm tabular-nums text-slate-500">
                  #{index + 1}
                </span>

                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <p
                    className="truncate text-base font-semibold text-slate-100"
                    title={match.opening ?? undefined}
                  >
                    {match.opening || "Abertura sem nome"}
                  </p>
                  {playedAtLabel && (
                    <p className="text-xs tabular-nums text-slate-500">
                      {playedAtLabel}
                    </p>
                  )}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        isWin
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {isWin ? "Vitória" : "Derrota"}
                    </span>
                    <span>
                      {match.playerSide === "w" ? "Brancas" : "Pretas"}
                    </span>
                    <span className="tabular-nums">
                      Rating {match.playerRating}
                      <span
                        className={
                          match.ratingEarned >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {" "}
                        ({match.ratingEarned >= 0 ? "+" : ""}
                        {match.ratingEarned})
                      </span>
                    </span>
                    {helps > 0 && (
                      <span className="text-amber-400">
                        {helps} {helps === 1 ? "ajuda" : "ajudas"}
                      </span>
                    )}
                  </p>
                </div>

                {analysisUrl ? (
                  <a
                    href={analysisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <ExternalLink size={16} aria-hidden />
                    Analisar
                  </a>
                ) : (
                  <span className="shrink-0 text-sm italic text-slate-600">
                    Sem análise
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppModal>
  );
}
