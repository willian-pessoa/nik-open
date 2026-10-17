import { AlertTriangle, Flag, RotateCcw } from "lucide-react";
import type { RatingChange } from "../utils/calculateRating";
import AppModal from "./AppModal";
import type { BadMoveInfo } from "../types";
import { formatLoss } from "../utils/formatEval";
import MoveSuggestionsList from "./MoveSuggestionList";

export interface IOpeningFinishedModalProps {
  open: boolean;
  openingName: string;
  // null quando não há sessão ativa (nada foi salvo)
  ratingChange: RatingChange | null;
  onNewMatch: () => void;
  // "opening": chegou ao fim da linha; "mistake": partida encerrada por lance ruim
  reason: "opening" | "mistake";
  // Lance que encerrou a partida (só no motivo "mistake")
  badMove?: BadMoveInfo | null;
}

export default function OpeningFinishedModal({
  open,
  openingName,
  ratingChange,
  onNewMatch,
  reason,
  badMove,
}: IOpeningFinishedModalProps) {
  const isMistake = reason === "mistake" && badMove !== null;

  return (
    // Só se sai daqui pelo botão: o tabuleiro fica travado até a nova partida
    <AppModal
      open={open}
      title={isMistake ? "Partida encerrada" : "Abertura concluída"}
      onClose={onNewMatch}
      closeOnEscape={false}
      closeOnBackdropClick={false}
      widthClass="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {isMistake ? (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-1 shrink-0 text-amber-400"
                aria-hidden
              />
              <p className="text-base text-slate-300">
                Você jogou{" "}
                <span className="font-semibold text-rose-400">
                  {badMove?.playedSan}
                </span>
                , que piorou a posição em cerca de{" "}
                <span className="font-semibold tabular-nums text-slate-100">
                  {formatLoss(badMove?.lossCp ?? 0)}
                </span>{" "}
                peões.
              </p>
            </div>
            <section aria-label="Melhores lances">
              <p className="mb-1 text-sm uppercase tracking-widest text-slate-500">
                Melhores lances
              </p>
              <MoveSuggestionsList suggestions={badMove?.suggestions ?? []} />
            </section>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <Flag
              size={20}
              className="mt-1 shrink-0 text-rose-400"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-widest text-slate-500">
                Abertura
              </p>
              <p className="text-lg font-semibold leading-snug text-rose-400">
                {openingName || "Abertura sem nome"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Você chegou ao fim dessa linha baseada nos lances mais populares
                no Lichess.
              </p>
            </div>
          </div>
        )}
        {ratingChange && <RatingSummary change={ratingChange} />}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNewMatch}
            autoFocus
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <RotateCcw size={16} aria-hidden />
            Nova partida
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function RatingSummary({ change }: { change: RatingChange }) {
  const isGain = change.delta >= 0;
  const sign = isGain ? "+" : "";

  return (
    <section
      aria-label="Resumo do rating"
      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
    >
      <p className="text-sm uppercase tracking-widest text-slate-500">Rating</p>
      <p className="mt-1 flex items-baseline gap-2 tabular-nums">
        <span className="text-slate-400">{change.ratingBefore}</span>
        <span className="text-slate-600" aria-hidden>
          →
        </span>
        <span className="text-2xl font-bold text-slate-50">
          {change.ratingAfter}
        </span>
        <span
          className={`text-base font-semibold ${
            isGain ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          ({sign}
          {change.delta})
        </span>
      </p>

      <ul className="mt-2 flex flex-col gap-0.5 text-sm text-slate-400">
        <li>Base: {change.base}</li>
        {change.streakBonus > 0 && (
          <li className="text-emerald-400">
            Bônus de sequência ({change.streak} seguidas): +{change.streakBonus}
          </li>
        )}
        {change.helpPenalty > 0 && (
          <li className="text-amber-400">
            Ajudas do tutor: −{change.helpPenalty}
          </li>
        )}
      </ul>
    </section>
  );
}
