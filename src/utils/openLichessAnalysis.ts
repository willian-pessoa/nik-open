import type { Match } from "../types";

// Importa a partida no Lichess (API pública, sem token) e abre a análise
export async function openLichessAnalysis(match: Match): Promise<void> {
  // Abre a aba já no clique: depois de um await o navegador bloquearia o pop-up
  const tab = window.open("about:blank", "_blank");

  try {
    const response = await fetch("https://lichess.org/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ pgn: match.pgn }),
    });
    if (!response.ok) {
      throw new Error(`Falha ao importar no Lichess: ${response.status}`);
    }

    const { url } = (await response.json()) as { url: string };
    // Abre com o tabuleiro virado para o lado que o jogador usou
    const target = match.playerSide === "b" ? `${url}/black` : url;

    if (tab) tab.location.href = target;
    else window.open(target, "_blank");
  } catch (error) {
    tab?.close();
    throw error;
  }
}
