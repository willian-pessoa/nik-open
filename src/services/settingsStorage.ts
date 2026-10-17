import type { PlayerSetting } from "../types";

const SETTINGS_KEY = "nik-open:settings";

export const DEFAULT_SETTINGS: PlayerSetting = {
  lichessToken: null,
  geminiApiKey: null,
};

// Texto vazio (ou só espaços) vira null: "sem chave configurada"
function cleanKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// localStorage pode lançar exceção (modo privado, cota cheia, dados bloqueados),
// então toda leitura/escrita é protegida com try/catch.
export function loadSettings(): PlayerSetting {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;
    const s = parsed as Partial<Record<keyof PlayerSetting, unknown>>;
    return {
      lichessToken: cleanKey(s.lichessToken),
      geminiApiKey: cleanKey(s.geminiApiKey),
    };
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PlayerSetting) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
  }
}
