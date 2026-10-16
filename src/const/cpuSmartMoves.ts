import type { Side } from "../types";

export interface CpuStartMove {
  // Lance em notação UCI (origem + destino), compatível com chess.js
  uci: string;
  // Notação legível exibida no select
  label: string;
  // Nome da abertura/estrutura que o lance leva
  name: string;
}

// Lances iniciais viáveis para a CPU, indexados pelo LADO DA CPU.
//
// - CPU de brancas: é o primeiro lance da partida.
// - CPU de pretas: é a resposta ao primeiro lance do jogador. Todos os lances
//   abaixo são legais contra qualquer primeiro lance das brancas, então a
//   resposta nunca fica inválida.
export const CPU_START_MOVES: Record<Side, CpuStartMove[]> = {
  w: [
    { uci: "e2e4", label: "1.e4", name: "Peão do Rei" },
    { uci: "d2d4", label: "1.d4", name: "Peão da Dama" },
    { uci: "g1f3", label: "1.Cf3", name: "Abertura Réti" },
    { uci: "c2c4", label: "1.c4", name: "Abertura Inglesa" },
    { uci: "g2g3", label: "1.g3", name: "Fianqueto do Rei" },
    { uci: "b2b3", label: "1.b3", name: "Nimzo-Larsen" },
    { uci: "f2f4", label: "1.f4", name: "Abertura Bird" },
    { uci: "b1c3", label: "1.Cc3", name: "Abertura Dunst" },
  ],
  b: [
    { uci: "e7e5", label: "1...e5", name: "Jogo Aberto" },
    { uci: "c7c5", label: "1...c5", name: "Defesa Siciliana" },
    { uci: "e7e6", label: "1...e6", name: "Defesa Francesa" },
    { uci: "c7c6", label: "1...c6", name: "Defesa Caro-Kann" },
    { uci: "d7d5", label: "1...d5", name: "Centro com d5" },
    { uci: "g8f6", label: "1...Cf6", name: "Alekhine / Indianas" },
    { uci: "d7d6", label: "1...d6", name: "Pirc / Philidor" },
    { uci: "g7g6", label: "1...g6", name: "Defesa Moderna" },
  ],
};
