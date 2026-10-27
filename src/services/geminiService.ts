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

const SYSTEM_INSTRUCTION = `Você é um treinador de xadrez objetivo e didático, escrevendo em português do Brasil para um jogador amador que treina aberturas.

Regras:
- Comece direto pelo lance jogado. Nada de saudação, apelido ("meu amigo"), elogio ou "vamos olhar com calma".
- Fale com o jogador na 2ª pessoa ("você"). Nunca use "nós"/"nossa".
- Use os fatos e avaliações fornecidos como verdade absoluta e ligue-os às consequências óbvias (peça capturada = perda de material; roque = rei mais seguro; desenvolver = trazer peça para o jogo). Não invente variantes, ameaças ou lances que não estejam nos dados.
- Explique o motivo, não só o resultado: diga o que aconteceu no tabuleiro por causa do lance, em linguagem de professor.
- Nunca critique o lance sugerido nem contradiga a avaliação do Stockfish. Se o motivo exato do lance sugerido não estiver nos dados, diga só que ele mantém a posição melhor, sem inventar justificativa.
- Não cite números de avaliação nem "peões de diferença"; use palavras (equilibrada, desvantagem clara, decisiva). Sem jargão de engine (nada de "centipawns").
- Não dê dicas finais nem conselhos genéricos ("controle o centro", "desenvolva as peças antes da dama"). Só explique este lance.
- Use a notação dos dados (ex.: Nf3, Qh5).
- Texto corrido, sem markdown, sem listas, com exatamente 3 frases curtas (cerca de 50 a 60 palavras no total), nesta ordem: (1) o problema do lance jogado; (2) a consequência concreta para o jogador; (3) o que o primeiro lance sugerido faz de melhor.
`;

const PIECE_NAMES: Record<string, string> = {
  p: "peão",
  n: "cavalo",
  b: "bispo",
  r: "torre",
  q: "dama",
  k: "rei",
};

const HOME_RANK = { w: "1", b: "8" } as const;

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

// Traduz a avaliação em palavras, para o modelo não ficar repetindo números
function evalInWords(score: number, isMate: boolean): string {
  if (isMate)
    return score > 0
      ? "mate forçado a favor do jogador"
      : "mate forçado contra o jogador";
  const a = Math.abs(score);
  if (a < 30) return "posição equilibrada";
  const who = score > 0 ? "do jogador" : "do adversário";
  if (a < 100) return `leve vantagem ${who}`;
  if (a < 300) return `vantagem clara ${who}`;
  return `vantagem decisiva ${who}`;
}

// Consequências concretas do lance, calculadas (não deduzidas pelo modelo)
function deriveFacts(
  fenBefore: string,
  fenAfter: string,
  playedSan: string,
  bestReply?: string | null,
): string[] {
  const facts: string[] = [];
  try {
    const played = new Chess(fenBefore).move(playedSan);

    if (bestReply) {
      const reply = new Chess(fenAfter).move(bestReply);
      if (reply.isCapture() && reply.to === played.to) {
        facts.push(
          `A resposta do adversário captura justamente a peça que o jogador acabou de mover (${PIECE_NAMES[played.piece]}).`,
        );
      } else if (reply.isCapture()) {
        facts.push(
          `A resposta do adversário captura ${PIECE_NAMES[reply.captured!]} do jogador.`,
        );
      }
    }
    if (played.isCapture()) {
      facts.push(`O lance jogado capturou ${PIECE_NAMES[played.captured!]}.`);
    }
  } catch {
    // sem fatos extras
  }
  return facts;
}

// Descreve um lance em fatos verificáveis (calculados pelo chess.js)
function describeMove(fen: string, san: string): string {
  try {
    const game = new Chess(fen);
    const m = game.move(san);

    if (m.isKingsideCastle()) return `${san}: roque curto`;
    if (m.isQueensideCastle()) return `${san}: roque longo`;

    let text = `${san}: ${PIECE_NAMES[m.piece]} de ${m.from} para ${m.to}`;
    if (m.isCapture()) text += `, capturando ${PIECE_NAMES[m.captured!]}`;
    if (
      (m.piece === "n" || m.piece === "b") &&
      m.from[1] === HOME_RANK[m.color]
    ) {
      text += " (desenvolvendo a peça)";
    }
    if (m.isEnPassant()) text += " (en passant)";
    if (m.isPromotion()) text += `, promovendo a ${PIECE_NAMES[m.promotion!]}`;

    if (m.san.endsWith("#")) text += ", xeque-mate";
    else if (m.san.endsWith("+")) text += ", dando xeque";

    return text;
  } catch {
    return san;
  }
}

// Reconstrói a partida a partir do PGN (que já inclui o lance ruim como último
// lance) para obter o lado do jogador e a posição ANTES do lance.
function describePosition(pgn: string) {
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    const playerIsWhite = game.history().length % 2 === 1;
    const fenAfter = game.fen(); // posição depois do lance ruim
    game.undo();
    return {
      playerIsWhite,
      pgnBefore: game.pgn(),
      fenBefore: game.fen(),
      fenAfter,
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
      `Lance jogado (fato): ${describeMove(position.fenBefore, info.playedSan)}`,
      describeImpact(info),
    );

    if (info.bestReply) {
      lines.push(
        `Melhor resposta do adversário (fato): ${describeMove(position.fenAfter, info.bestReply)}`,
      );
    }

    lines.push(
      ...deriveFacts(
        position.fenBefore,
        position.fenAfter,
        info.playedSan,
        info.bestReply,
      ),
    );

    if (info.suggestions.length > 0) {
      lines.push(
        "Melhores lances que o jogador tinha, com a situação da posição depois de cada um:",
        ...info.suggestions
          .slice(0, 3)
          .map(
            (s, i) =>
              `${i + 1}. ${describeMove(position.fenBefore, s.san)} → ${evalInWords(s.score, s.isMate)}`,
          ),
      );
    }
  } else {
    lines.push(
      `Partida até o erro (PGN): ${info.pgn}`,
      `Lance jogado: ${info.playedSan}`,
      describeImpact(info),
    );
  }

  lines.push(
    "",
    "Responda em 3 frases curtas: (1) o problema do lance jogado; (2) a consequência concreta para o jogador (peça perdida, iniciativa cedida, posição que piorou), usando os fatos acima; (3) o que o primeiro lance sugerido faz de melhor. Sem dica final.",
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
