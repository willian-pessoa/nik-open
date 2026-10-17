import type { BadMoveInfo } from "../types";
import { formatEval, formatLoss } from "../utils/formatEval";

export interface IBadMoveSummaryProps {
  info: BadMoveInfo;
}

// A partir daqui a diferença envolve mate forçado, e "97 peões" não ajuda
const DECISIVE_LOSS_CP = 2000;

export default function BadMoveSummary({ info }: IBadMoveSummaryProps) {
  const san = (
    <span className="font-semibold text-rose-400">{info.playedSan}</span>
  );
  const loss = (
    <span className="font-semibold tabular-nums text-slate-100">
      {formatLoss(info.lossCp)}
    </span>
  );
  const evaluation = (
    <span className="font-semibold tabular-nums text-slate-100">
      {formatEval({
        san: info.playedSan,
        score: info.evalAfterCp,
        isMate: false,
      })}
    </span>
  );
  const isDecisive = info.lossCp >= DECISIVE_LOSS_CP;

  let content;
  if (info.kind === "drift") {
    content = (
      <>
        {san} deixou sua posição pior do que o esperado nessa abertura
        (avaliação {evaluation}). Vale rever a linha.
      </>
    );
  } else if (info.kind === "missed") {
    content = isDecisive ? (
      <>{san} deixou escapar uma vitória forçada.</>
    ) : (
      <>
        {san} deixou escapar cerca de {loss} peões de vantagem.
      </>
    );
  } else {
    content = isDecisive ? (
      <>{san} leva a uma posição decisivamente pior.</>
    ) : (
      <>
        {san} piorou sua posição em cerca de {loss} peões.
      </>
    );
  }

  return <p className="text-base text-slate-300">{content}</p>;
}
