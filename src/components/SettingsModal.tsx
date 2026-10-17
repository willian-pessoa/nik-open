import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import type { PlayerSetting } from "../types";
import AppModal from "./AppModal";

export interface ISettingsModalProps {
  open: boolean;
  settings: PlayerSetting;
  onClose: () => void;
  onSave: (settings: PlayerSetting) => void;
}

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500";

const labelClass =
  "mb-1 block text-sm font-semibold uppercase tracking-widest text-slate-500";

const linkClass =
  "text-rose-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500";

interface ISecretFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

// Campo de chave: escondido por padrão, com botão para mostrar/ocultar
function SecretField({
  id,
  label,
  value,
  placeholder,
  onChange,
  children,
}: ISecretFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} pr-10`}
        />
        <button
          type="button"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          title={visible ? "Ocultar" : "Mostrar"}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {visible ? (
            <EyeOff size={18} aria-hidden />
          ) : (
            <Eye size={18} aria-hidden />
          )}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">{children}</p>
    </div>
  );
}

interface ISettingsFormProps {
  settings: PlayerSetting;
  onCancel: () => void;
  onSubmit: (settings: PlayerSetting) => void;
}

// Fica dentro do AppModal: só é montado com o modal aberto, então os campos
// voltam aos valores salvos a cada abertura (alterações canceladas somem).
function SettingsForm({ settings, onCancel, onSubmit }: ISettingsFormProps) {
  const [lichessToken, setLichessToken] = useState(settings.lichessToken ?? "");
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey ?? "");

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    // Campo vazio remove a chave
    onSubmit({
      lichessToken: lichessToken.trim() || null,
      geminiApiKey: geminiApiKey.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <SecretField
        id="settings-lichess-token"
        label="Token do Lichess"
        value={lichessToken}
        placeholder="lip_..."
        onChange={setLichessToken}
      >
        Usado nas consultas ao banco de aberturas. Não precisa de nenhuma
        permissão (scope). Crie em{" "}
        <a
          href="https://lichess.org/account/oauth/token"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          lichess.org/account/oauth/token
        </a>
        .
      </SecretField>

      <SecretField
        id="settings-gemini-key"
        label="Chave de API do Gemini"
        value={geminiApiKey}
        placeholder="AIza..."
        onChange={setGeminiApiKey}
      >
        Será usada para gerar explicações mais humanas sobre os erros no modo
        tutor. Crie em{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          aistudio.google.com/apikey
        </a>
        .
      </SecretField>

      <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
        As chaves ficam salvas apenas neste navegador (localStorage) e são
        enviadas somente ao Lichess e ao Google. Deixe um campo vazio para
        remover a chave.
      </p>

      <div className="flex justify-end gap-2">
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
          <Save size={16} aria-hidden />
          Salvar
        </button>
      </div>
    </form>
  );
}

export default function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: ISettingsModalProps) {
  function handleSubmit(next: PlayerSetting) {
    onSave(next);
    onClose();
  }

  return (
    <AppModal
      open={open}
      title="Configurações"
      onClose={onClose}
      closeOnBackdropClick={false}
    >
      <SettingsForm
        settings={settings}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </AppModal>
  );
}
