import { Loader2, RotateCw, Sparkles } from "lucide-react";
import { useMoveExplanation } from "../hooks/useMoveExplanation";
import type { BadMoveInfo } from "../types";
import { glyphifyText } from "../utils/glyphifyText";

export interface IMoveExplanationProps {
  info: BadMoveInfo;
  openingName: string;
  // null quando o jogador ainda não configurou a chave do Gemini
  geminiApiKey: string | null;
}

// Explicação em linguagem natural (Gemini) do lance ruim, exibida no tutor
export default function MoveExplanation({
  info,
  openingName,
  geminiApiKey,
}: IMoveExplanationProps) {
  const { state, retry } = useMoveExplanation(info, openingName, geminiApiKey);

  return (
    <section
      aria-label="Explicação do tutor"
      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-sm uppercase tracking-widest text-slate-500">
        <Sparkles size={14} className="text-rose-400" aria-hidden />
        Explicação do tutor
      </p>

      {state.status === "idle" && (
        <p className="text-sm text-slate-400">
          Adicione sua chave do Gemini em{" "}
          <span className="font-semibold text-slate-300">Configurações</span>{" "}
          para receber uma explicação em linguagem natural.
        </p>
      )}

      {state.status === "loading" && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm italic text-slate-400"
        >
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Analisando o lance...
        </p>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-amber-400">
            {state.message}
          </p>
          <button
            type="button"
            onClick={retry}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RotateCw size={14} aria-hidden />
            Tentar de novo
          </button>
        </div>
      )}

      {state.status === "done" && (
        <p
          aria-live="polite"
          className="whitespace-pre-line text-base leading-relaxed text-slate-200"
        >
          {glyphifyText(state.text)}
        </p>
      )}
    </section>
  );
}
