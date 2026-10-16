import type { Match, Session } from "../types";

const SESSIONS_KEY = "nik-open:sessions";
const ACTIVE_SESSION_KEY = "nik-open:active-session";

// localStorage pode lançar exceção (modo privado, cota cheia, dados bloqueados),
// então toda leitura/escrita é protegida com try/catch.

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Session>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.startRating === "number" &&
    typeof s.currentRating === "number" &&
    Array.isArray(s.history) &&
    (s.mode === "challenger" || s.mode === "tutor")
  );
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession);
  } catch (error) {
    console.error("Erro ao carregar sessões:", error);
    return [];
  }
}

export function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Erro ao salvar sessões:", error);
  }
}

export function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    console.error("Erro ao salvar sessão ativa:", error);
  }
}

export function appendMatch(session: Session, match: Match): Session {
  return {
    ...session,
    history: [...session.history, match],
    currentRating: session.currentRating + match.ratingEarned,
  };
}
