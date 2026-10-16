import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { NewSessionInput, Session, SessionMode } from "../types";
import AppModal from "./AppModal";
import CreateSession from "./CreateSession";

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

export default function ManageSessions({
  open,
  sessions,
  activeSessionId,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: IManageSessionsProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Exclusão em duas etapas: o primeiro clique pede confirmação
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Limpa estados transitórios ao fechar
  useEffect(() => {
    if (!open) {
      setPendingDeleteId(null);
      setIsCreateOpen(false);
    }
  }, [open]);

  function handleDelete(id: string) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    onDelete(id);
    setPendingDeleteId(null);
  }

  // A sessão criada vira a ativa (useSessions), então já fecha os dois modais
  function handleCreate(input: NewSessionInput) {
    onCreate(input);
    setIsCreateOpen(false);
    onClose();
  }

  return (
    <>
      <AppModal
        open={open}
        title="Gerenciar sessões"
        onClose={onClose}
        // Com o modal de criação por cima, o Esc deve fechar só ele
        closeOnEscape={!isCreateOpen}
        closeOnBackdropClick={false}
      >
        <section aria-label="Sessões existentes">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Suas sessões ({sessions.length})
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Plus size={16} aria-hidden />
              Nova sessão
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-sm italic text-slate-500">
              Nenhuma sessão ainda. Crie a primeira em “Nova sessão”.
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
                      className="min-w-0 flex-1 cursor-pointer rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Selecionar sessão"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-semibold text-slate-100">
                          {session.name}
                        </span>
                        {isActive && (
                          <Check
                            size={16}
                            className="shrink-0 text-rose-400"
                            aria-label="Sessão ativa"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs uppercase tracking-wider text-slate-300">
                          {MODE_LABEL[session.mode]}
                        </span>
                        <span className="tabular-nums">
                          Rating {session.currentRating}
                          {delta !== 0 && (
                            <span
                              className={
                                delta > 0 ? "text-emerald-400" : "text-rose-400"
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
                      title={isConfirming ? "Clique para confirmar" : "Excluir"}
                      className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                        isConfirming
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-slate-800 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                      }`}
                    >
                      <Trash2 size={18} aria-hidden />
                      {isConfirming && <span>Confirmar</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </AppModal>

      {/* Irmão (e não filho) do modal acima: assim o clique no fundo e o Esc
          do modal de criação não se propagam para o de gerenciamento */}
      <CreateSession
        open={open && isCreateOpen}
        existingNames={sessions.map((s) => s.name)}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
