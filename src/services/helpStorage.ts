const HELP_DISMISSED_KEY = "nik-open:help-dismissed";

// localStorage pode lançar exceção (modo privado, cota cheia, dados bloqueados),
// então toda leitura/escrita é protegida com try/catch.

// true quando o jogador pediu para não abrir a ajuda automaticamente
export function loadHelpDismissed(): boolean {
  try {
    return localStorage.getItem(HELP_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHelpDismissed() {
  try {
    localStorage.setItem(HELP_DISMISSED_KEY, "1");
  } catch (error) {
    console.error("Erro ao salvar preferência da ajuda:", error);
  }
}
