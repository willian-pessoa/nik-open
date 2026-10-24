import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Crown,
  GraduationCap,
  History,
  KeyRound,
  Layers,
  MousePointerClick,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import AppModal from "./AppModal";

export interface IHelpModalProps {
  open: boolean;
  // Mostra o botão "Não mostrar mais" (some depois que já foi desativado)
  showDismiss: boolean;
  onClose: () => void;
  // Fecha e desativa a abertura automática nas próximas visitas
  onDismiss: () => void;
}

interface HelpStep {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const strong = (text: string) => (
  <strong className="font-semibold text-slate-100">{text}</strong>
);

const STEPS: HelpStep[] = [
  {
    icon: Crown,
    title: "Bem-vindo ao nik-open",
    body: (
      <>
        <p>
          Aqui você treina suas aberturas de xadrez contra uma CPU que joga como
          os jogadores reais do Lichess.
        </p>
        <p>
          Os lances do adversário vêm do banco de partidas do Lichess, filtrados
          pelo seu rating e sorteados pela popularidade. Cada lance seu é
          avaliado pelo Stockfish, direto no seu navegador.
        </p>
      </>
    ),
  },
  {
    icon: KeyRound,
    title: "1. Configure o token do Lichess",
    body: (
      <>
        <p>
          O app precisa de um {strong("token do Lichess")} para consultar o
          banco de aberturas. Ele é gratuito e não exige nenhuma permissão
          (scope).
        </p>
        <p>
          Abra {strong("Configurações")} (ícone de engrenagem), cole o token e
          salve. Ele fica guardado só no seu navegador.
        </p>
        <p>
          Opcional: com uma chave do {strong("Gemini")}, o tutor também explica
          seus erros em linguagem natural.
        </p>
      </>
    ),
  },
  {
    icon: Layers,
    title: "2. Crie uma sessão",
    body: (
      <>
        <p>
          Uma sessão é um treino com objetivo próprio, por exemplo "Siciliana"
          ou "Defesa Francesa". Cada uma guarda seu rating e seu histórico.
        </p>
        <p>
          Em {strong("Gerenciar sessões")}, escolha o nome, o modo, o rating
          inicial e a cor das peças. Com cor fixa, você ainda pode escolher o
          lance inicial da CPU para forçar a linha que quer treinar.
        </p>
      </>
    ),
  },
  {
    icon: MousePointerClick,
    title: "3. Jogue a partida",
    body: (
      <>
        <p>
          {strong("Clique")} na peça e depois na casa de destino. Os lances
          legais ficam destacados.
        </p>
        <p>
          Enquanto a CPU pensa, você pode enfileirar {strong("premoves")}: basta
          clicar nos próximos lances. Use o clique direito (ou o botão com o
          número, no celular) para limpar a fila.
        </p>
        <p>
          O nome da abertura e a lista de lances aparecem ao lado do tabuleiro.
        </p>
      </>
    ),
  },
  {
    icon: GraduationCap,
    title: "4. Escolha o modo de treino",
    body: (
      <>
        <p>
          {strong("Tutor:")} quando você erra, o app mostra os melhores lances e
          a explicação. Você pode tentar de novo (cada ajuda reduz o ganho de
          rating) ou encerrar a partida.
        </p>
        <p>
          {strong("Desafio:")} um lance ruim encerra a partida na hora, com
          tolerância maior. Ideal para testar se você já domina a linha.
        </p>
      </>
    ),
  },
  {
    icon: Trophy,
    title: "5. Fim da partida e rating",
    body: (
      <>
        <p>
          Você vence ao chegar ao fim da linha, quando a posição sai do "livro"
          do Lichess. Um lance ruim sem volta vale derrota.
        </p>
        <p>
          Cada partida vale {strong("±15 pontos")}, com bônus de sequência a
          partir da 3ª partida seguida. O rating vai de 400 a 2800 e sobe junto
          com o nível da CPU.
        </p>
      </>
    ),
  },
  {
    icon: History,
    title: "6. Revise suas partidas",
    body: (
      <>
        <p>
          O {strong("Histórico")} lista todas as partidas da sessão e permite
          abrir qualquer uma na análise do Lichess.
        </p>
        <p>
          Tudo fica salvo no seu navegador. Para rever este guia depois, use o
          ícone de ajuda no topo da tela. Bom treino!
        </p>
      </>
    ),
  },
];

interface IHelpWizardProps {
  showDismiss: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

const secondaryButtonClass =
  "flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300";

const primaryButtonClass =
  "flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300";

// Fica dentro do AppModal: só é montado com o modal aberto, então o wizard
// volta ao primeiro passo a cada abertura.
function HelpWizard({ showDismiss, onClose, onDismiss }: IHelpWizardProps) {
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const Icon = step.icon;
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
          <Icon size={22} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Passo {index + 1} de {STEPS.length}
          </p>
          <h3 className="text-lg font-semibold leading-snug text-slate-100">
            {step.title}
          </h3>
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-48 flex-col gap-3 text-base leading-relaxed text-slate-300"
      >
        {step.body}
      </div>

      {/* Indicador de progresso: clique para pular para um passo */}
      <div
        role="group"
        aria-label="Passos da ajuda"
        className="flex items-center justify-center gap-1.5"
      >
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para o passo ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            className={`h-2 cursor-pointer rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              i === index
                ? "w-6 bg-rose-500"
                : "w-2 bg-slate-700 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {showDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer rounded-lg px-2 py-2 text-sm text-slate-500 underline-offset-2 transition-colors hover:text-slate-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Não mostrar mais
          </button>
        ) : (
          <span />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={isFirst}
            className={secondaryButtonClass}
          >
            <ChevronLeft size={16} aria-hidden />
            Voltar
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className={primaryButtonClass}
            >
              <Check size={16} aria-hidden />
              Concluir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              autoFocus
              className={primaryButtonClass}
            >
              Próximo
              <ChevronRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HelpModal({
  open,
  showDismiss,
  onClose,
  onDismiss,
}: IHelpModalProps) {
  return (
    <AppModal
      open={open}
      title="Como usar o nik-open"
      onClose={onClose}
      closeOnBackdropClick={false}
      widthClass="max-w-xl"
    >
      <HelpWizard
        showDismiss={showDismiss}
        onClose={onClose}
        onDismiss={onDismiss}
      />
    </AppModal>
  );
}
