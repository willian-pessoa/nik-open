import type { StudySession, GameHistoryItem } from '../types/chess';

const SESSIONS_STORAGE_KEY = 'nik_open_sessions_v1';
const ACTIVE_SESSION_KEY = 'nik_open_active_session_v1';
const HISTORY_STORAGE_KEY = 'nik_open_history_v1';
const SETTINGS_STORAGE_KEY = 'nik_open_settings_v1';

export interface UserSettings {
  lichessToken?: string;
  soundEnabled: boolean;
  soundVolume: number;
  engineDepth: number;
  boardTheme: 'emerald' | 'classic' | 'slate' | 'wood';
}

const DEFAULT_SETTINGS: UserSettings = {
  lichessToken: '',
  soundEnabled: true,
  soundVolume: 0.8,
  engineDepth: 10,
  boardTheme: 'emerald'
};

const DEFAULT_SESSIONS: StudySession[] = [
  {
    id: 'session-white-free',
    name: 'Treino Aberto de Brancas',
    description: 'Prática livre com as peças brancas. A engine escolhe as respostas mais populares do Blitz no seu nível.',
    mode: 'tutor',
    playerColor: 'w',
    tutorRating: 1600,
    hardRating: 1550,
    gamesCount: 0,
    completedCount: 0,
    blundersCount: 0,
    createdAt: Date.now() - 86400000 * 2,
    lastPlayedAt: Date.now() - 3600000,
    ratingHistory: [
      { timestamp: Date.now() - 86400000 * 2, rating: 1600, mode: 'tutor' }
    ]
  },
  {
    id: 'session-black-e4',
    name: 'Defesa de Pretas vs 1.e4',
    description: 'Prática de Pretas contra 1.e4 das brancas. Você escolhe suas defesas e a engine responde conforme o banco do Lichess.',
    mode: 'tutor',
    playerColor: 'b',
    initialWhiteMove: 'e4',
    tutorRating: 1600,
    hardRating: 1550,
    gamesCount: 0,
    completedCount: 0,
    blundersCount: 0,
    createdAt: Date.now() - 86400000 * 3,
    lastPlayedAt: Date.now() - 7200000,
    ratingHistory: [
      { timestamp: Date.now() - 86400000 * 3, rating: 1600, mode: 'tutor' }
    ]
  },
  {
    id: 'session-black-d4',
    name: 'Defesa de Pretas vs 1.d4',
    description: 'Prática de Pretas contra 1.d4 das brancas.',
    mode: 'tutor',
    playerColor: 'b',
    initialWhiteMove: 'd4',
    tutorRating: 1800,
    hardRating: 1750,
    gamesCount: 0,
    completedCount: 0,
    blundersCount: 0,
    createdAt: Date.now() - 86400000,
    lastPlayedAt: Date.now(),
    ratingHistory: [
      { timestamp: Date.now() - 86400000, rating: 1800, mode: 'tutor' }
    ]
  },
  {
    id: 'session-hard-mode',
    name: 'Desafio Difícil (Sem Tutoria)',
    description: 'Teste suas aberturas sem nenhum auxílio da engine. Erros encerram a abertura imediatamente!',
    mode: 'hard',
    playerColor: 'w',
    tutorRating: 1500,
    hardRating: 1500,
    gamesCount: 0,
    completedCount: 0,
    blundersCount: 0,
    createdAt: Date.now() - 86400000,
    lastPlayedAt: Date.now(),
    ratingHistory: [
      { timestamp: Date.now() - 86400000, rating: 1500, mode: 'hard' }
    ]
  }
];

export const StorageService = {
  getSessions(): StudySession[] {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!data) {
        this.saveSessions(DEFAULT_SESSIONS);
        return DEFAULT_SESSIONS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SESSIONS;
    }
  },

  saveSessions(sessions: StudySession[]) {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Failed to save sessions:', err);
    }
  },

  getActiveSessionId(): string {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) return stored;
    const sessions = this.getSessions();
    const firstId = sessions[0]?.id || 'session-white-free';
    this.setActiveSessionId(firstId);
    return firstId;
  },

  setActiveSessionId(id: string) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  },

  getActiveSession(): StudySession {
    const sessions = this.getSessions();
    const activeId = this.getActiveSessionId();
    return sessions.find(s => s.id === activeId) || sessions[0] || DEFAULT_SESSIONS[0];
  },

  updateSession(session: StudySession) {
    const sessions = this.getSessions().map(s => s.id === session.id ? session : s);
    this.saveSessions(sessions);
  },

  createSession(newSession: Omit<StudySession, 'id' | 'createdAt' | 'lastPlayedAt' | 'gamesCount' | 'completedCount' | 'blundersCount' | 'ratingHistory'>): StudySession {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const session: StudySession = {
      ...newSession,
      id,
      gamesCount: 0,
      completedCount: 0,
      blundersCount: 0,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      ratingHistory: [
        {
          timestamp: Date.now(),
          rating: newSession.mode === 'tutor' ? newSession.tutorRating : newSession.hardRating,
          mode: newSession.mode
        }
      ]
    };

    const sessions = [session, ...this.getSessions()];
    this.saveSessions(sessions);
    this.setActiveSessionId(id);
    return session;
  },

  deleteSession(id: string) {
    const sessions = this.getSessions().filter(s => s.id !== id);
    this.saveSessions(sessions);
    if (this.getActiveSessionId() === id && sessions.length > 0) {
      this.setActiveSessionId(sessions[0].id);
    }
  },

  // Game History
  getHistory(sessionId?: string): GameHistoryItem[] {
    try {
      const data = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!data) return [];
      const items: GameHistoryItem[] = JSON.parse(data);
      if (sessionId) {
        return items.filter(i => i.sessionId === sessionId);
      }
      return items;
    } catch {
      return [];
    }
  },

  saveGameResult(game: GameHistoryItem) {
    try {
      const history = [game, ...this.getHistory()];
      // Keep up to 200 past games
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 200)));

      // Update session statistics & rating
      const sessions = this.getSessions();
      const session = sessions.find(s => s.id === game.sessionId);
      if (session) {
        session.gamesCount += 1;
        session.lastPlayedAt = Date.now();

        if (game.result === 'completed') {
          session.completedCount += 1;
        } else if (game.result === 'blunder') {
          session.blundersCount += 1;
        }

        if (game.mode === 'tutor') {
          session.tutorRating = game.ratingAfter;
        } else {
          session.hardRating = game.ratingAfter;
        }

        session.ratingHistory.push({
          timestamp: Date.now(),
          rating: game.ratingAfter,
          mode: game.mode
        });

        this.saveSessions(sessions);
      }
    } catch (err) {
      console.error('Failed to save game result:', err);
    }
  },

  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        lichessToken: parsed.lichessToken ?? ''
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },

  // Generate full PGN string with rich headers
  generatePgn(params: {
    eventName?: string;
    white: string;
    black: string;
    date?: string;
    result: string;
    eco?: string;
    openingName?: string;
    movesSan: string[];
  }): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const headers = [
      `[Event "${params.eventName || 'NIK-Open Training'}"]`,
      `[Site "NIK-Open (Now I Know This Opening)"]`,
      `[Date "${params.date || today}"]`,
      `[Round "1"]`,
      `[White "${params.white}"]`,
      `[Black "${params.black}"]`,
      `[Result "${params.result}"]`,
      `[ECO "${params.eco || 'A00'}"]`,
      `[Opening "${params.openingName || 'Chess Opening'}"]`,
      `[PlyCount "${params.movesSan.length}"]`
    ];

    let moveText = '';
    for (let i = 0; i < params.movesSan.length; i++) {
      if (i % 2 === 0) {
        const moveNum = Math.floor(i / 2) + 1;
        moveText += `${moveNum}. ${params.movesSan[i]} `;
      } else {
        moveText += `${params.movesSan[i]} `;
      }
    }
    moveText += params.result;

    return `${headers.join('\n')}\n\n${moveText.trim()}`;
  },

  // Open in Lichess Analysis Board via URL
  openInLichess(pgn: string) {
    // Lichess allows opening analysis board with encoded PGN in hash or import
    const cleanPgn = pgn.trim();
    // Using https://lichess.org/analysis/pgn/... or URL query
    const url = `https://lichess.org/analysis/pgn/${encodeURIComponent(cleanPgn)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // Download PGN as a file
  downloadPgn(pgn: string, filename = 'nik-open-game.pgn') {
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
