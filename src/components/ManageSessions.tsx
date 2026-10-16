import { useEffect, useState, type FormEvent } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import type { Side } from "../types";
import type { NewSessionInput, Session, SessionMode } from "../types";
import { CPU_START_MOVES } from "../const/cpuSmartMoves";

export interface IManageSessionsProps {
  open: boolean;
  sessions: Session[];
  activeSessionId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (input: NewSessionInput) => void;
  onDelete: (id: string) => void;
}

const MODE_LABEL: Record<SessionMode, string> = {
  challenger: "Desafio",
  tutor: "Tutor",
};

const MIN_RATING = 400;
const MAX_RATING = 2800;
const DEFAULT_RATING = 1200;

type SideChoice = "random" | Side;

// Valor do select para "deixar o Lichess escolher"
const AUTO_MOVE = "auto";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500";

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500";

export default function ManageSessions({
  open,
  sessions,
  activeSessionId,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: IManageSessionsProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SessionMode>("tutor");
  const [rating, setRating] = useState(String(DEFAULT_RATING));
  const [sideChoice, setSideChoice] = useState<SideChoice>("random");
  const [cpuStartMove, setCpuStartMove] = useState<string>(AUTO_MOVE);
  const [error, setError] = useState<string | null>(null);
  // Exclusão em duas etapas: o primeiro clique pede confirmação
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fecha com Esc
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Limpa estados transitórios ao fechar
  useEffect(() => {
    if (!open) {
      setPendingDeleteId(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  // O seletor só existe com cor fixa; a lista depende do lado da CPU
  const cpuSide: Side | null =
    sideChoice === "random" ? null : sideChoice === "w" ? "b" : "w";

  // A lista de lances muda com o lado, então a escolha anterior deixa de valer
  function handleSideChange(value: SideChoice) {
    setSideChoice(value);
    setCpuStartMove(AUTO_MOVE);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    const parsedRating = Number(rating);

    if (!trimmed) {
      setError("Dê um nome para a sessão.");
      return;
    }
    if (sessions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Já existe uma sessão com esse nome.");
      return;
    }
    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < MIN_RATING ||
      parsedRating > MAX_RATING
    ) {
      setError(
        `O rating deve ser um inteiro entre ${MIN_RATING} e ${MAX_RATING}.`,
      );
      return;
    }

    onCreate({
      name: trimmed,
      mode,
      startRating: parsedRating,
      playerSide: sideChoice === "random" ? null : sideChoice,
      cpuStartMove:
        sideChoice === "random" || cpuStartMove === AUTO_MOVE
          ? null
          : cpuStartMove,
    });

    setName("");
    setError(null);
  }

  function handleDelete(id: string) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    onDelete(id);
    setPendingDeleteId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-sessions-title"
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2
            id="manage-sessions-title"
            className="text-base font-semibold text-slate-100"
          >
            Gerenciar sessões
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
          {/* Lista de sessões */}
          <section aria-label="Sessões existentes">
            <p className={labelClass}>Suas sessões ({sessions.length})</p>

            {sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-sm italic text-slate-500">
                Nenhuma sessão ainda. Crie a primeira abaixo.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isConfirming = pendingDeleteId === session.id;
                  const delta = session.currentRating - session.startRating;

                  return (
                    <li
                      key={session.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                        isActive
                          ? "border-rose-500/60 bg-rose-500/5"
                          : "border-slate-800 bg-slate-950/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(session.id);
                          onClose();
                        }}
                        className="min-w-0 flex-1 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md"
                        title="Selecionar sessão"
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">
                            {session.name}
                          </span>
                          {isActive && (
                            <Check
                              size={14}
                              className="shrink-0 text-rose-400"
                              aria-label="Sessão ativa"
                            />
                          )}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                            {MODE_LABEL[session.mode]}
                          </span>
                          <span className="tabular-nums">
                            Rating {session.currentRating}
                            {delta !== 0 && (
                              <span
                                className={
                                  delta > 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }
                              >
                                {" "}
                                ({delta > 0 ? "+" : ""}
                                {delta})
                              </span>
                            )}
                          </span>
                          <span>
                            {session.history.length}{" "}
                            {session.history.length === 1
                              ? "partida"
                              : "partidas"}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(session.id)}
                        onBlur={() => setPendingDeleteId(null)}
                        aria-label={
                          isConfirming
                            ? `Confirmar exclusão de ${session.name}`
                            : `Excluir ${session.name}`
                        }
                        title={
                          isConfirming ? "Clique para confirmar" : "Excluir"
                        }
                        className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                          isConfirming
                            ? "border-rose-500 bg-rose-500 text-white"
                            : "border-slate-800 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                        }`}
                      >
                        <Trash2 size={14} aria-hidden />
                        {isConfirming && <span>Confirmar</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Criar nova sessão */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 border-t border-slate-800 pt-4"
            noValidate
          >
            <p className={labelClass}>Nova sessão</p>

            <div>
              <label htmlFor="session-name" className={labelClass}>
                Nome
              </label>
              <input
                id="session-name"
                type="text"
                value={name}
                maxLength={40}
                placeholder="Ex.: Siciliana"
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="session-mode" className={labelClass}>
                  Modo
                </label>
                <select
                  id="session-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as SessionMode)}
                  className={fieldClass}
                >
                  <option value="tutor">Tutor (explica os erros)</option>
                  <option value="challenger">Desafio (erro encerra)</option>
                </select>
              </div>

              <div>
                <label htmlFor="session-rating" className={labelClass}>
                  Rating inicial
                </label>
                <input
                  id="session-rating"
                  type="number"
                  inputMode="numeric"
                  min={MIN_RATING}
                  max={MAX_RATING}
                  step={50}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="session-side" className={labelClass}>
                Cor das peças
              </label>
              <select
                id="session-side"
                value={sideChoice}
                onChange={(e) => handleSideChange(e.target.value as SideChoice)}
                className={fieldClass}
              >
                <option value="random">Escolher a cada partida</option>
                <option value="w">Sempre brancas</option>
                <option value="b">Sempre pretas</option>
              </select>
            </div>

            {cpuSide && (
              <div>
                <label htmlFor="session-cpu-move" className={labelClass}>
                  {cpuSide === "w"
                    ? "Primeiro lance da CPU (brancas)"
                    : "Resposta inicial da CPU (pretas)"}
                </label>
                <select
                  id="session-cpu-move"
                  value={cpuStartMove}
                  onChange={(e) => setCpuStartMove(e.target.value)}
                  className={fieldClass}
                >
                  <option value={AUTO_MOVE}>
                    Automático (banco do Lichess)
                  </option>
                  {CPU_START_MOVES[cpuSide].map((move) => (
                    <option key={move.uci} value={move.uci}>
                      {move.label} — {move.name}
                    </option>
                  ))}
                </select>
                {cpuSide === "b" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Jogado como resposta ao seu primeiro lance.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Plus size={16} aria-hidden />
              Criar sessão
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
