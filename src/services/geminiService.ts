import { Chess } from "chess.js";
import type { BadMoveInfo } from "../types";
import { formatEval, formatLoss } from "../utils/formatEval";

// Modelo estável, rápido e barato. Para explicações mais elaboradas, troque
// por "gemini-3.8-flash".
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 20_000;
// Folga para modelos que gastam parte do limite "pensando" antes de responder
const MAX_OUTPUT_TOKENS = 2048;

const SYSTEM_INSTRUCTION = `Você é um treinador de xadrez paciente e didático, conversando em português do Brasil com um jogador amador que está treinando aberturas.

Regras:
- Explique de forma humana e simples, como um professor ao lado do tabuleiro. Não use jargão de engine (nada de "centipawns").
- As avaliações do Stockfish que vierem no pedido são a verdade absoluta. Baseie a explicação nelas e nas posições dadas.
- Não invente variantes, táticas ou lances que não estejam nos dados. Se não souber o motivo exato, diga o que a avaliação indica, sem inventar.
- Use a notação algébrica dos dados (ex.: Nf3, Qh5) e cite as casas/peças em palavras quando ajudar.
- Responda em texto corrido, sem markdown, sem listas e sem títulos, com no máximo 5 frases curtas.`;

export interface ExplainBadMoveInput {
  info: BadMoveInfo;
  openingName: string;
  apiKey: string;
  signal?: AbortSignal;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

// Reconstrói a partida a partir do PGN (que já inclui o lance ruim como último
// lance) para obter o lado do jogador e a posição ANTES do lance.
function describePosition(pgn: string) {
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    const playerIsWhite = game.history().length % 2 === 1;
    game.undo();
    return {
      playerIsWhite,
      pgnBefore: game.pgn(),
      fenBefore: game.fen(),
    };
  } catch {
    return null;
  }
}

function buildPrompt(info: BadMoveInfo, openingName: string): string {
  const position = describePosition(info.pgn);

  const lines: string[] = [`Abertura: ${openingName || "não identificada"}`];

  if (position) {
    lines.push(
      `O jogador está de ${position.playerIsWhite ? "brancas" : "pretas"}.`,
      `Lances antes do erro (PGN): ${position.pgnBefore || "(início da partida)"}`,
      `Posição antes do lance (FEN): ${position.fenBefore}`,
    );
  } else {
    lines.push(`Partida até o erro (PGN): ${info.pgn}`);
  }

  lines.push(`Lance jogado: ${info.playedSan}`, describeImpact(info));

  if (info.bestReply) {
    lines.push(
      `Melhor resposta do adversário a esse lance, segundo o Stockfish: ${info.bestReply}`,
    );
  }

  if (info.suggestions.length > 0) {
    lines.push(
      "Melhores lances que o jogador tinha naquela posição, com a avaliação do Stockfish do ponto de vista do jogador (positivo = bom para ele; #N = mate em N a favor, #-N = mate contra):",
      ...info.suggestions.map(
        (s, i) => `${i + 1}. ${s.san} (${formatEval(s)})`,
      ),
    );
  }

  lines.push(
    "",
    "Explique em poucas frases: (1) qual problema o lance jogado criou ou o que ele deixou de fazer; (2) por que o primeiro lance sugerido é melhor; (3) uma ideia simples para o jogador lembrar nessa abertura.",
  );

  return lines.join("\n");
}

function messageForStatus(status: number): string {
  if (status === 400 || status === 401 || status === 403) {
    return "O Gemini recusou a chave. Confira-a em Configurações.";
  }
  if (status === 429) {
    return "Limite de uso do Gemini atingido. Tente de novo em instantes.";
  }
  if (status >= 500) {
    return "O Gemini está indisponível no momento. Tente de novo em instantes.";
  }
  return `Erro ao consultar o Gemini (código ${status}).`;
}

// Gera a explicação "humana" de um lance ruim. Lança Error com mensagem pronta
// para exibir; se o `signal` for abortado, repassa o erro original (o chamador
// deve ignorá-lo).
export async function explainBadMove({
  info,
  openingName,
  apiKey,
  signal,
}: ExplainBadMoveInput): Promise<string> {
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (signal) signals.push(signal);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Chave no header (e não na URL) para não vazar em logs/histórico
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          { role: "user", parts: [{ text: buildPrompt(info, openingName) }] },
        ],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      signal: AbortSignal.any(signals),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("O Gemini demorou demais para responder.");
    }
    console.error("Erro de rede ao consultar o Gemini:", error);
    throw new Error(
      "Não foi possível falar com o Gemini. Verifique a conexão.",
    );
  }

  const data: GeminiResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Erro da API do Gemini:", response.status, data?.error);
    throw new Error(messageForStatus(response.status));
  }

  if (data?.promptFeedback?.blockReason) {
    throw new Error("O Gemini bloqueou esse pedido. Tente de novo.");
  }

  // Ignora partes de "raciocínio" (thought) e junta o texto final
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    console.error("Resposta vazia do Gemini:", data);
    throw new Error("O Gemini não retornou uma explicação. Tente de novo.");
  }

  return text;
}

function describeImpact(info: BadMoveInfo): string {
  const decisive = info.lossCp >= 2000;
  const size = decisive
    ? "uma diferença decisiva (envolve xeque-mate forçado)"
    : `cerca de ${formatLoss(info.lossCp)} peões`;

  if (info.kind === "drift") {
    const evalText = formatEval({
      san: info.playedSan,
      score: info.evalAfterCp,
      isMate: false,
    });
    return `Esse lance deixou a posição do jogador pior do que o esperado numa abertura (avaliação do Stockfish do ponto de vista do jogador: ${evalText}).`;
  }
  if (info.kind === "missed") {
    return `Esse lance deixou escapar ${size} de vantagem que o jogador tinha, segundo o Stockfish.`;
  }
  return `Esse lance piorou a posição do jogador em ${size}, segundo o Stockfish.`;
}
