import { useEffect, useMemo, useRef } from "react";
import type { ChessMove } from "../types";
import { MoveNotation } from "./MoveNotation";

export interface IAppChessMovesProps {
  openingName: string;
  moves: ChessMove[];
}

interface MovePair {
  number: number;
  white?: string;
  black?: string;
  whiteIndex: number;
  blackIndex: number;
}

// Agrupa a lista linear de lances em pares (Brancas + Pretas) por número de lance
function groupMoves(moves: ChessMove[]): MovePair[] {
  const pairs: MovePair[] = [];

  moves.forEach((item, index) => {
    const isWhite = index % 2 === 0;

    if (isWhite) {
      pairs.push({
        number: item.number,
        white: item.move,
        whiteIndex: index,
        blackIndex: index + 1,
      });
    } else {
      const last = pairs[pairs.length - 1];
      if (last) {
        last.black = item.move;
      } else {
        // Caso a partida comece com lance das Pretas
        pairs.push({
          number: item.number,
          black: item.move,
          whiteIndex: index - 1,
          blackIndex: index,
        });
      }
    }
  });

  return pairs;
}

export default function AppChessMoves({
  openingName,
  moves,
}: IAppChessMovesProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const pairs = useMemo(() => groupMoves(moves), [moves]);
  const lastMoveIndex = moves.length - 1;

  // Rola a própria lista até o último lance. Não usa scrollIntoView: no
  // celular ele pode rolar a página inteira junto.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [moves.length]);

  const moveCellClass = (index: number) =>
    `flex items-center px-2 py-0.5 md:py-1 rounded-md font-medium transition-colors ${
      index === lastMoveIndex
        ? "bg-rose-500 text-white shadow shadow-rose-500/30"
        : "text-slate-200"
    }`;

  return (
    // Celular: painel embaixo do tabuleiro, altura fixa (h-44 = 11rem, ligada a
    // --bottom-panel-h no App) e largura esticada pelo pai.
    // md+: painel ao lado (w-72, ligado a --side-panel-w no App), com a altura
    // vinda do card do tabuleiro (stretch). O conteúdo fica em posição absoluta
    // para que uma lista longa role em vez de esticar o painel.
    <aside className="relative h-44 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 md:h-auto md:w-72">
      <div className="absolute inset-0 flex flex-col">
        {/* Abertura */}
        <div className="p-2 md:p-3 border-b border-slate-800 bg-slate-900">
          <p className="text-[10px] md:text-base uppercase tracking-widest text-slate-500">
            Abertura
          </p>
          {openingName ? (
            <p className="mt-0.5 md:mt-1 truncate md:whitespace-normal text-sm md:text-lg font-semibold leading-snug text-rose-400">
              {openingName}
            </p>
          ) : (
            <p className="mt-0.5 md:mt-1 text-sm md:text-lg italic text-slate-500">
              Aguardando a abertura...
            </p>
          )}
        </div>

        {/* Lista de lances */}
        <div className="flex items-center justify-between px-3 py-1 md:py-2 border-b border-slate-800">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Lances
          </p>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">
            {moves.length}
          </span>
        </div>

        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1 md:p-2 scrollbar-thin [scrollbar-color:var(--color-slate-700)_transparent]"
        >
          {pairs.length === 0 ? (
            <p className="p-2 md:p-4 text-center text-sm italic text-slate-500">
              Nenhum lance realizado ainda.
            </p>
          ) : (
            <ol className="flex flex-col">
              {pairs.map((pair, i) => (
                <li
                  key={`${pair.number}-${i}`}
                  className={`grid grid-cols-[2.5rem_1fr_1fr] items-center gap-1 px-1 py-0.5 rounded-md text-sm md:text-base ${
                    i % 2 === 0 ? "bg-slate-900" : "bg-slate-950/60"
                  }`}
                >
                  <span className="text-sm text-slate-500 text-right pr-2 tabular-nums">
                    {pair.number}.
                  </span>
                  {pair.white ? (
                    <span className={moveCellClass(pair.whiteIndex)}>
                      <MoveNotation san={pair.white} />
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-slate-600">…</span>
                  )}
                  {pair.black ? (
                    <span className={moveCellClass(pair.blackIndex)}>
                      <MoveNotation san={pair.black} />
                    </span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </aside>
  );
}
