import { AlertTriangle, Flag, Undo2 } from "lucide-react";
import type { BadMoveInfo } from "../types";
import AppModal from "./AppModal";
import MoveSuggestionsList from "./MoveSuggestionList";
import { useEffect } from "react";
import { playSound } from "../utils/playSound";
import MoveExplanation from "./MoveExplanation";
import BadMoveSummary from "./BadMoveSummary";

export interface IBadMoveModalProps {
  open: boolean;
  info: BadMoveInfo | null;
  // Desfaz o lance ruim e devolve a vez ao jogador
  onRetry: () => void;
  // Encerra a partida (conta como derrota)
  onEnd: () => void;
  openingName: string;
  geminiApiKey: string | null;
}

export default function BadMoveModal({
  open,
  info,
  onRetry,
  onEnd,
  openingName,
  geminiApiKey,
}: IBadMoveModalProps) {
  const isOpen = open && info !== null;

  useEffect(() => {
    if (isOpen) playSound("tutor");
  }, [isOpen]);

  return (
    <AppModal
      open={isOpen}
      title="Lance ruim"
      onClose={onRetry}
      closeOnEscape={false}
      closeOnBackdropClick={false}
      widthClass="max-w-2xl"
    >
      {info && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-1 shrink-0 text-amber-400"
              aria-hidden
            />
            <BadMoveSummary info={info} />
          </div>

          <MoveExplanation
            info={info}
            openingName={openingName}
            geminiApiKey={geminiApiKey}
          />

          <section aria-label="Melhores lances">
            <p className="mb-1 text-sm uppercase tracking-widest text-slate-500">
              Melhores lances
            </p>
            <MoveSuggestionsList suggestions={info.suggestions} />
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onEnd}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Flag size={16} aria-hidden />
              Encerrar partida
            </button>
            <button
              type="button"
              onClick={onRetry}
              autoFocus
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Undo2 size={16} aria-hidden />
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </AppModal>
  );
}
