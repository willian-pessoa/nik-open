import { useCallback, useEffect, useState } from "react";
import { explainBadMove } from "../services/geminiService";
import type { BadMoveInfo } from "../types";

export type ExplanationState =
  | { status: "idle" } // sem lance ruim ou sem chave do Gemini
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

interface Settled {
  info: BadMoveInfo;
  attempt: number;
  text?: string;
  error?: string;
}

// Busca a explicação do Gemini para o lance ruim atual. Refaz a busca quando o
// lance muda ou quando `retry` é chamado, e cancela a requisição anterior.
export function useMoveExplanation(
  info: BadMoveInfo | null,
  openingName: string,
  apiKey: string | null,
) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!info || !apiKey) return;

    const controller = new AbortController();

    explainBadMove({ info, openingName, apiKey, signal: controller.signal })
      .then((text) => setSettled({ info, attempt, text }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          info,
          attempt,
          error:
            error instanceof Error
              ? error.message
              : "Não foi possível gerar a explicação.",
        });
      });

    return () => controller.abort();
  }, [info, openingName, apiKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // O estado é derivado: enquanto não houver resultado para ESTE lance e ESTA
  // tentativa, está carregando (evita setState síncrono dentro do efeito).
  let state: ExplanationState;
  if (!info || !apiKey) {
    state = { status: "idle" };
  } else if (!settled || settled.info !== info || settled.attempt !== attempt) {
    state = { status: "loading" };
  } else if (settled.error !== undefined) {
    state = { status: "error", message: settled.error };
  } else {
    state = { status: "done", text: settled.text ?? "" };
  }

  return { state, retry };
}
