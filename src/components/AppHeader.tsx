import { History, Layers, Settings } from "lucide-react";
import AppIconButton from "./AppIconButton";

export interface IAppHeaderProps {
  sessionName: string;
  onOpenSettings: () => void;
  onOpenSessions: () => void;
  onOpenHistory: () => void;
}

export default function AppHeader({
  sessionName,
  onOpenSettings,
  onOpenSessions,
  onOpenHistory,
}: IAppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 sm:gap-4">
      {/* Logo + sessão atual */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Logo"
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
        <div className="h-6 w-px shrink-0 bg-slate-700" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] uppercase leading-none tracking-widest text-slate-500">
            Sessão
          </p>
          <p
            className="mt-1 truncate text-sm font-semibold leading-none text-rose-400"
            title={sessionName}
          >
            {sessionName}
          </p>
        </div>
      </div>

      {/* Ações */}
      <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Histórico de partidas da sessão atual */}
        <AppIconButton label="Histórico de partidas" onClick={onOpenHistory}>
          <History size={24} aria-hidden />
        </AppIconButton>
        {/* Gerenciar sessões: selecionar, criar ou deletar */}
        <AppIconButton label="Gerenciar sessões" onClick={onOpenSessions}>
          <Layers size={24} aria-hidden />
        </AppIconButton>
        {/* Configurações da aplicação */}
        <AppIconButton label="Configurações" onClick={onOpenSettings}>
          <Settings size={24} aria-hidden />
        </AppIconButton>
      </nav>
    </header>
  );
}
