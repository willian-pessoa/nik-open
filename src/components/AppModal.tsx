import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

export interface IAppModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  // Desative quando outro modal estiver aberto por cima, para o Esc fechar só o do topo
  closeOnEscape?: boolean;
  // Desative para que clicar fora do modal não o feche (ex.: formulários longos)
  closeOnBackdropClick?: boolean;
  widthClass?: string;
  children: ReactNode;
}

// Casca padrão dos modais: fundo escurecido, cabeçalho com título + fechar e
// corpo com rolagem. Os filhos só são montados enquanto o modal está aberto,
// então o estado interno deles é reiniciado a cada abertura.
export default function AppModal({
  open,
  title,
  onClose,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  widthClass = "max-w-lg",
  children,
}: IAppModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-full w-full ${widthClass} flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
