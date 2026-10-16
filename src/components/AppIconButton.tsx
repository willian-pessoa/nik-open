import type { ReactNode } from "react";

interface IAppIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

// Botão de ícone do header (acessível via aria-label e tooltip nativo)

export default function AppIconButton({
  label,
  onClick,
  children,
}: IAppIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-rose-500/50 cursor-pointer hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      {children}
    </button>
  );
}
