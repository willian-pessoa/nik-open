import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadSessions,
  loadActiveSessionId,
  saveSessions,
  saveActiveSessionId,
  appendMatch,
} from "../services/sessionStorage";
import type { NewSessionInput, Match, Session } from "../types";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [storedActiveId, setStoredActiveId] = useState<string | null>(() =>
    loadActiveSessionId(),
  );

  // Se o id guardado não existir mais, cai para a primeira sessão (ou null)
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === storedActiveId) ?? sessions[0] ?? null,
    [sessions, storedActiveId],
  );

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSessionId(activeSession?.id ?? null);
  }, [activeSession?.id]);

  const createSession = useCallback((input: NewSessionInput) => {
    const session: Session = {
      id: createId(),
      name: input.name.trim(),
      createdAt: Date.now(),
      playerSide: input.playerSide,
      startRating: input.startRating,
      currentRating: input.startRating,
      cpuStartMove: input.playerSide ? input.cpuStartMove : null,
      history: [],
      mode: input.mode,
    };
    setSessions((prev) => [...prev, session]);
    setStoredActiveId(session.id); // a sessão recém-criada vira a ativa
    return session;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const selectSession = useCallback((id: string) => {
    setStoredActiveId(id);
  }, []);

  // Será usado quando a partida terminar (desafio/tutor)
  const addMatch = useCallback((sessionId: string, match: Match) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? appendMatch(s, match) : s)),
    );
  }, []);

  return {
    sessions,
    activeSession,
    createSession,
    deleteSession,
    selectSession,
    addMatch,
  };
}
