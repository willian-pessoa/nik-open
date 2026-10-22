import type { PlayerSetting } from "../types";

// O Lichess Explorer exige token, então sem ele o app não tem como funcionar.
// Mesma ordem do lichessApi: configurações primeiro, depois a variável de ambiente.
export function hasLichessToken(settings: PlayerSetting): boolean {
  const envToken = import.meta.env.VITE_ACCESS_TOKEN as string | undefined;
  return Boolean(settings.lichessToken || envToken?.trim());
}
