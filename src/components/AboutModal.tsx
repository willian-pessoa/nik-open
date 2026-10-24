import { useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import AppModal from "./AppModal";
import GithubIcon from "../assets/GithubIcon";
import LinkedinIcon from "../assets/LinkedinIcon";

export interface IAboutModalProps {
  open: boolean;
  onClose: () => void;
}

// Preencha com seus dados
const AUTHOR_NAME = "Willian Pessoa";
const GITHUB_URL = "https://github.com/willian-pessoa";
const REPO_URL = "https://github.com/willian-pessoa/nik-open";
const ISSUES_URL = `${REPO_URL}/issues`;
const LINKEDIN_URL = "https://www.linkedin.com/in/willian-pessoa/";
// Atualize a data sempre que mudar o texto da política
const PRIVACY_UPDATED_AT = "24/10/2026";

const linkClass =
  "text-rose-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500";

interface ILinkRowProps {
  href: string;
  label: string;
  detail: string;
  icon: ReactNode;
}

function LinkRow({ href, label, detail, icon }: ILinkRowProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-slate-100">
          {label}
        </span>
        <span className="block truncate text-sm text-slate-400">{detail}</span>
      </span>
      <ExternalLink size={16} className="shrink-0" aria-hidden />
    </a>
  );
}

function ExternalLinkText({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
}

function AboutTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-contain"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-slate-100">
            Now I Know this Opening (NIK-Open)
          </p>
          <p className="text-sm text-slate-400">
            Treine suas aberturas de xadrez contra uma CPU que joga como o
            Lichess.
          </p>
        </div>
      </div>

      <section aria-label="Autor">
        <p className="mb-2 text-sm uppercase tracking-widest text-slate-500">
          Criado por
        </p>
        <p className="mb-3 text-lg font-semibold text-rose-400">
          {AUTHOR_NAME}
        </p>
        <div className="flex flex-col gap-2">
          <LinkRow
            href={GITHUB_URL}
            label="GitHub"
            detail={GITHUB_URL.replace("https://", "")}
            icon={<GithubIcon />}
          />
          <LinkRow
            href={LINKEDIN_URL}
            label="LinkedIn"
            detail={LINKEDIN_URL.replace("https://www.", "")}
            icon={<LinkedinIcon />}
          />
        </div>
      </section>

      <p className="text-sm text-slate-400">
        Projeto de código aberto: o código está em{" "}
        <ExternalLinkText href={REPO_URL}>
          github.com/willian-pessoa/nik-open
        </ExternalLinkText>
        . Sugestões e bugs são bem-vindos em{" "}
        <ExternalLinkText href={ISSUES_URL}>Issues</ExternalLinkText>.
      </p>

      <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
        Dados de aberturas do{" "}
        <ExternalLinkText href="https://lichess.org">Lichess</ExternalLinkText>{" "}
        e análise do{" "}
        <ExternalLinkText href="https://stockfishchess.org">
          Stockfish
        </ExternalLinkText>
        .
      </p>
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

function PrivacyTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Última atualização: {PRIVACY_UPDATED_AT}
      </p>

      <PolicySection title="Resumo">
        <p>
          O nik-open não tem servidor próprio, cadastro nem contas. Eu, como
          autor, não recebo nem armazeno nenhum dado seu. Não há analytics,
          cookies de rastreamento nem anúncios.
        </p>
      </PolicySection>

      <PolicySection title="O que fica no seu navegador">
        <p>
          Suas sessões, histórico de partidas, ratings, configurações e a
          preferência de ajuda ficam salvos no <code>localStorage</code> do seu
          navegador, neste dispositivo. Isso inclui as chaves do Lichess e do
          Gemini, se você as informar. Esses dados não são enviados a mim.
        </p>
      </PolicySection>

      <PolicySection title="Serviços de terceiros">
        <p>
          <strong className="font-semibold text-slate-100">Lichess.</strong>{" "}
          Para sortear os lances da CPU, o app envia ao Lichess Explorer a
          posição atual do tabuleiro, a faixa de rating e, se configurado, o seu
          token. Veja a{" "}
          <ExternalLinkText href="https://lichess.org/privacy">
            política do Lichess
          </ExternalLinkText>
          .
        </p>
        <p>
          <strong className="font-semibold text-slate-100">
            Gemini (opcional).
          </strong>{" "}
          Só se você informar uma chave, o app envia ao Google a partida até o
          lance ruim, a posição, os lances sugeridos pelo Stockfish e a sua
          chave, para gerar a explicação. O tratamento desse conteúdo segue os{" "}
          <ExternalLinkText href="https://ai.google.dev/gemini-api/terms">
            termos da API do Gemini
          </ExternalLinkText>
          , que podem variar conforme o tipo da sua chave.
        </p>
        <p>
          <strong className="font-semibold text-slate-100">Stockfish.</strong> A
          análise roda no seu navegador e nada é enviado para fora.
        </p>
      </PolicySection>

      <PolicySection title="Hospedagem">
        <p>
          O app é hospedado no GitHub Pages. Como em qualquer site, o GitHub
          pode registrar dados técnicos de acesso, como o endereço IP, conforme
          a{" "}
          <ExternalLinkText href="https://docs.github.com/pt/site-policy/privacy-policies/github-general-privacy-statement">
            política de privacidade do GitHub
          </ExternalLinkText>
          . Eu não tenho acesso a esses registros.
        </p>
      </PolicySection>

      <PolicySection title="Seus controles">
        <p>
          Para remover uma chave, apague o campo em Configurações e salve. Para
          apagar sessões, use Gerenciar sessões. Para apagar tudo, limpe os
          dados do site no navegador. Como os dados ficam só com você, não há
          nada para eu excluir do meu lado.
        </p>
      </PolicySection>

      <PolicySection title="Contato">
        <p>
          Dúvidas ou pedidos sobre privacidade: abra uma issue em{" "}
          <ExternalLinkText href={ISSUES_URL}>
            github.com/willian-pessoa/nik-open/issues
          </ExternalLinkText>
          .
        </p>
      </PolicySection>
    </div>
  );
}

type Tab = "about" | "privacy";

const TABS: { id: Tab; label: string }[] = [
  { id: "about", label: "Sobre" },
  { id: "privacy", label: "Privacidade" },
];

// Fica dentro do AppModal: só é montado com o modal aberto, então a aba volta
// para "Sobre" a cada abertura.
function AboutContent() {
  const [tab, setTab] = useState<Tab>("about");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Seções"
        className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`about-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`about-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              tab === t.id
                ? "bg-rose-500 text-white"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`about-panel-${tab}`}
        aria-labelledby={`about-tab-${tab}`}
      >
        {tab === "about" ? <AboutTab /> : <PrivacyTab />}
      </div>
    </div>
  );
}

export default function AboutModal({ open, onClose }: IAboutModalProps) {
  return (
    <AppModal open={open} title="Sobre" onClose={onClose} widthClass="max-w-xl">
      <AboutContent />
    </AppModal>
  );
}
