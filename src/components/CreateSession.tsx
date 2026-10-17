import { useState } from "react";
import { Plus } from "lucide-react";
import type { Side } from "../types";
import type { NewSessionInput, SessionMode } from "../types";

import AppModal from "./AppModal";
import { CPU_START_MOVES } from "../const/cpuSmartMoves";

export interface ICreateSessionProps {
  open: boolean;
  // Nomes já usados, para impedir duplicados
  existingNames: string[];
  onClose: () => void;
  onCreate: (input: NewSessionInput) => void;
}

const MIN_RATING = 400;
const MAX_RATING = 2800;
const DEFAULT_RATING = 1200;

type SideChoice = "random" | Side;

// Valor do select para "deixar o Lichess escolher"
const AUTO_MOVE = "auto";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500";

const labelClass =
  "mb-1 block text-sm font-semibold uppercase tracking-widest text-slate-500";

interface ICreateSessionFormProps {
  existingNames: string[];
  onCancel: () => void;
  onSubmit: (input: NewSessionInput) => void;
}

// Fica dentro do AppModal: só é montado com o modal aberto, então os campos
// voltam ao padrão a cada abertura.
function CreateSessionForm({
  existingNames,
  onCancel,
  onSubmit,
}: ICreateSessionFormProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SessionMode>("tutor");
  const [rating, setRating] = useState(String(DEFAULT_RATING));
  const [sideChoice, setSideChoice] = useState<SideChoice>("random");
  const [cpuStartMove, setCpuStartMove] = useState<string>(AUTO_MOVE);
  const [error, setError] = useState<string | null>(null);

  // O seletor de lance só existe com cor fixa; a lista depende do lado da CPU
  const cpuSide: Side | null =
    sideChoice === "random" ? null : sideChoice === "w" ? "b" : "w";

  // A lista de lances muda com o lado, então a escolha anterior deixa de valer
  function handleSideChange(value: SideChoice) {
    setSideChoice(value);
    setCpuStartMove(AUTO_MOVE);
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    const parsedRating = Number(rating);

    if (!trimmed) {
      setError("Dê um nome para a sessão.");
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
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

    onSubmit({
      name: trimmed,
      mode,
      startRating: parsedRating,
      playerSide: sideChoice === "random" ? null : sideChoice,
      cpuStartMove:
        sideChoice === "random" || cpuStartMove === AUTO_MOVE
          ? null
          : cpuStartMove,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
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
          autoFocus
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
            <option value={AUTO_MOVE}>Automático (banco do Lichess)</option>
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

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <Plus size={16} aria-hidden />
          Criar sessão
        </button>
      </div>
    </form>
  );
}

export default function CreateSession({
  open,
  existingNames,
  onClose,
  onCreate,
}: ICreateSessionProps) {
  return (
    <AppModal
      open={open}
      title="Nova sessão"
      onClose={onClose}
      closeOnBackdropClick={false}
    >
      <CreateSessionForm
        existingNames={existingNames}
        onCancel={onClose}
        onSubmit={onCreate}
      />
    </AppModal>
  );
}
