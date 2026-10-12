import type { OpeningBookEntry, OpeningBookMove } from '../types/chess';

export interface TargetOpeningRepertoire {
  id: string;
  name: string;
  eco: string;
  playerColor: 'w' | 'b';
  initialMove?: string;
  description: string;
  keyMovesSan: string[];
  mainPlan: string;
  theoryDepth: number; // number of plies (half-moves) to complete opening phase
}

// Curated list of opening targets for study sessions
export const TARGET_OPENINGS: TargetOpeningRepertoire[] = [
  {
    id: 'sicilian-closed',
    name: 'Defesa Siciliana: Fechada',
    eco: 'B23',
    playerColor: 'w',
    initialMove: 'e4',
    description: 'Sistema sólido contra a Siciliana evitando a teoria afiada da Aberta, preparando f4 e expansão no flanco de rei.',
    keyMovesSan: ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'd6', 'f4', 'e6', 'Nf3', 'Nge7', 'O-O', 'O-O'],
    mainPlan: 'Controlar o centro sem abrir a coluna c. Desenvolver o bispo por fianchetto em g2 e empurrar f4 para ataque na ala do rei.',
    theoryDepth: 14
  },
  {
    id: 'sicilian-najdorf',
    name: 'Defesa Siciliana: Variante Najdorf',
    eco: 'B90',
    playerColor: 'b',
    initialMove: 'e4',
    description: 'Uma das aberturas mais lendárias e agressivas do xadrez, imortalizada por Fischer e Kasparov.',
    keyMovesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6'],
    mainPlan: 'Lutar pela iniciativa com ...a6, impedindo saltos de cavalo em b5, e preparar contra-ataque central com ...e5 e ...Be6.',
    theoryDepth: 14
  },
  {
    id: 'benoni-modern',
    name: 'Gambito Benoni Moderno',
    eco: 'A60',
    playerColor: 'b',
    initialMove: 'd4',
    description: 'Resposta hiperdinâmica contra 1.d4, cedendo espaço central em troca de atividade na ala da dama e coluna e.',
    keyMovesSan: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4', 'g6', 'Nf3', 'Bg7', 'Be2', 'O-O'],
    mainPlan: 'Fianchetto do bispo em g7, controle da coluna e semiaberta e expansão agressiva na ala da dama com ...a6 e ...b5.',
    theoryDepth: 14
  },
  {
    id: 'ruy-lopez-berlin',
    name: 'Abertura Ruy Lopez (Espanhola): Berlinesa',
    eco: 'C65',
    playerColor: 'b',
    initialMove: 'e4',
    description: 'O muro de Berlim, popularizado por Vladimir Kramnik para neutralizar Garry Kasparov no Campeonato Mundial.',
    keyMovesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5'],
    mainPlan: 'Trocar o bispo de casas claras das brancas e consolidar um final resiliente com par de bispos.',
    theoryDepth: 14
  },
  {
    id: 'italian-giuoco-piano',
    name: 'Abertura Italiana: Giuoco Piano',
    eco: 'C50',
    playerColor: 'w',
    initialMove: 'e4',
    description: 'Clássica, sólida e estratégica. Desenvolvimento harmonioso das peças visando o controle de d4 e ataque a f7.',
    keyMovesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Bb3', 'a6'],
    mainPlan: 'Construir centro forte com c3 e d3/d4, manobrar o cavalo de b1 via d2-f1-g3 para focar o rei adversário.',
    theoryDepth: 12
  },
  {
    id: 'french-advance',
    name: 'Defesa Francesa: Variante do Avanço',
    eco: 'C02',
    playerColor: 'w',
    initialMove: 'e4',
    description: 'As brancas ganham espaço no centro com 3.e5, fechando a posição e desafiando as pretas a contra-atacar a base d4.',
    keyMovesSan: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'a3', 'Nh6', 'b4', 'cxd4'],
    mainPlan: 'Sustentar a cadeia de peões d4-e5 e neutralizar a pressão preta na ala da dama.',
    theoryDepth: 12
  },
  {
    id: 'caro-kann-classical',
    name: 'Defesa Caro-Kann: Variante Clássica',
    eco: 'B18',
    playerColor: 'b',
    initialMove: 'e4',
    description: 'Estrutura extremamente sólida com peões em c6 e d5, permitindo o desenvolvimento ativo do bispo de c8 antes de ...e6.',
    keyMovesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7'],
    mainPlan: 'Recuar o bispo com segurança para g6, manter a sólida estrutura de peões e igualar sem fraquezas.',
    theoryDepth: 14
  },
  {
    id: 'queens-gambit-declined',
    name: 'Gambito da Dama Recusado',
    eco: 'D35',
    playerColor: 'w',
    initialMove: 'd4',
    description: 'A pedra fundamental do xadrez clássico. Luta ferrenha pelo controle do centro e da coluna c.',
    keyMovesSan: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'c6', 'Bd3', 'O-O'],
    mainPlan: 'Ataque das minorias na ala da dama ou formação de ataque central com f3 e e4.',
    theoryDepth: 14
  },
  {
    id: 'kings-indian-defense',
    name: 'Defesa Índia do Rei: Clássica',
    eco: 'E97',
    playerColor: 'b',
    initialMove: 'd4',
    description: 'Arma favorita de Bobby Fischer e Garry Kasparov para vencer de pretas contra 1.d4 através de violento ataque na ala do rei.',
    keyMovesSan: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
    mainPlan: 'Trancar o centro com d5 e lançar peões de f, g e h contra o rei branco.',
    theoryDepth: 14
  },
  {
    id: 'london-system',
    name: 'Sistema London',
    eco: 'D02',
    playerColor: 'w',
    initialMove: 'd4',
    description: 'Esquema universal super popular no Blitz do Lichess, com rápida ativação do bispo de casas escuras em f4.',
    keyMovesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bg3', 'O-O'],
    mainPlan: 'Pirâmide de peões em c3-d4-e3 com cavalo em e5 e bispo firme em g3.',
    theoryDepth: 12
  }
];

// Rich Lichess Blitz Opening Tree mapped by position FEN key (first 4 fields of FEN)
export const LICHESS_BLITZ_BOOK: Record<string, OpeningBookEntry> = {
  // Start position
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': {
    eco: 'A00',
    name: 'Posição Inicial',
    moves: [
      { san: 'e4', uci: 'e2e4', whiteWins: 3800000, draws: 600000, blackWins: 3600000, total: 8000000, ratingFrequencies: { '1400': 0.65, '1600': 0.58, '1800': 0.52, '2000': 0.48 } },
      { san: 'd4', uci: 'd2d4', whiteWins: 2400000, draws: 450000, blackWins: 2150000, total: 5000000, ratingFrequencies: { '1400': 0.22, '1600': 0.28, '1800': 0.33, '2000': 0.35 } },
      { san: 'c4', uci: 'c2c4', whiteWins: 450000, draws: 90000, blackWins: 390000, total: 930000, ratingFrequencies: { '1400': 0.04, '1600': 0.06, '1800': 0.08, '2000': 0.09 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 410000, draws: 80000, blackWins: 360000, total: 850000, ratingFrequencies: { '1400': 0.05, '1600': 0.05, '1800': 0.05, '2000': 0.06 } }
    ]
  },

  // 1. e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': {
    eco: 'B00',
    name: 'Abertura do Peão do Rei',
    moves: [
      { san: 'c5', uci: 'c7c5', whiteWins: 2100000, draws: 400000, blackWins: 2200000, total: 4700000, ratingFrequencies: { '1400': 0.30, '1600': 0.38, '1800': 0.44, '2000': 0.48 } },
      { san: 'e5', uci: 'e7e5', whiteWins: 2400000, draws: 350000, blackWins: 2100000, total: 4850000, ratingFrequencies: { '1400': 0.45, '1600': 0.32, '1800': 0.26, '2000': 0.22 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 850000, draws: 160000, blackWins: 790000, total: 1800000, ratingFrequencies: { '1400': 0.10, '1600': 0.13, '1800': 0.14, '2000': 0.14 } },
      { san: 'c6', uci: 'c7c6', whiteWins: 720000, draws: 150000, blackWins: 680000, total: 1550000, ratingFrequencies: { '1400': 0.09, '1600': 0.11, '1800': 0.12, '2000': 0.12 } },
      { san: 'd5', uci: 'd7d5', whiteWins: 550000, draws: 70000, blackWins: 480000, total: 1100000, ratingFrequencies: { '1400': 0.06, '1600': 0.05, '1800': 0.03, '2000': 0.02 } }
    ]
  },

  // 1. e4 c5 (Sicilian)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    eco: 'B20',
    name: 'Defesa Siciliana',
    moves: [
      { san: 'Nf3', uci: 'g1f3', whiteWins: 1450000, draws: 290000, blackWins: 1360000, total: 3100000, ratingFrequencies: { '1400': 0.52, '1600': 0.62, '1800': 0.70, '2000': 0.75 } },
      { san: 'Nc3', uci: 'b1c3', whiteWins: 420000, draws: 80000, blackWins: 410000, total: 910000, ratingFrequencies: { '1400': 0.25, '1600': 0.22, '1800': 0.18, '2000': 0.14 } },
      { san: 'c3', uci: 'c2c3', whiteWins: 220000, draws: 45000, blackWins: 195000, total: 460000, ratingFrequencies: { '1400': 0.12, '1600': 0.10, '1800': 0.07, '2000': 0.06 } },
      { san: 'd4', uci: 'd2d4', whiteWins: 90000, draws: 15000, blackWins: 95000, total: 200000, ratingFrequencies: { '1400': 0.08, '1600': 0.04, '1800': 0.02, '2000': 0.01 } }
    ]
  },

  // 1. e4 c5 2. Nc3 (Closed Sicilian)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -': {
    eco: 'B23',
    name: 'Defesa Siciliana: Fechada',
    moves: [
      { san: 'Nc6', uci: 'b8c6', whiteWins: 240000, draws: 48000, blackWins: 232000, total: 520000, ratingFrequencies: { '1400': 0.55, '1600': 0.60, '1800': 0.65, '2000': 0.68 } },
      { san: 'd6', uci: 'd7d6', whiteWins: 85000, draws: 17000, blackWins: 82000, total: 184000, ratingFrequencies: { '1400': 0.20, '1600': 0.18, '1800': 0.16, '2000': 0.15 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 65000, draws: 12000, blackWins: 63000, total: 140000, ratingFrequencies: { '1400': 0.15, '1600': 0.14, '1800': 0.13, '2000': 0.12 } }
    ]
  },

  // 1. e4 c5 2. Nc3 Nc6
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq -': {
    eco: 'B23',
    name: 'Defesa Siciliana: Fechada Tradicional',
    moves: [
      { san: 'g3', uci: 'g2g3', whiteWins: 130000, draws: 28000, blackWins: 122000, total: 280000, ratingFrequencies: { '1400': 0.40, '1600': 0.50, '1800': 0.58, '2000': 0.62 } },
      { san: 'f4', uci: 'f2f4', whiteWins: 70000, draws: 12000, blackWins: 68000, total: 150000, ratingFrequencies: { '1400': 0.35, '1600': 0.28, '1800': 0.22, '2000': 0.18 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 35000, draws: 7000, blackWins: 33000, total: 75000, ratingFrequencies: { '1400': 0.18, '1600': 0.15, '1800': 0.14, '2000': 0.14 } }
    ]
  },

  // 1. e4 c5 2. Nc3 Nc6 3. g3
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/2N3P1/PPPP1P1P/R1BQKBNR b KQkq -': {
    eco: 'B24',
    name: 'Defesa Siciliana Fechada: Variante do Fianchetto',
    moves: [
      { san: 'g6', uci: 'g7g6', whiteWins: 85000, draws: 18000, blackWins: 77000, total: 180000, ratingFrequencies: { '1400': 0.60, '1600': 0.70, '1800': 0.76, '2000': 0.80 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 22000, draws: 4500, blackWins: 19500, total: 46000, ratingFrequencies: { '1400': 0.20, '1600': 0.16, '1800': 0.13, '2000': 0.11 } },
      { san: 'Nf6', uci: 'g8f6', whiteWins: 14000, draws: 2500, blackWins: 11500, total: 28000, ratingFrequencies: { '1400': 0.12, '1600': 0.08, '1800': 0.06, '2000': 0.05 } }
    ]
  },

  // 1. e4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2
  'r1bqkbnr/pp1ppp1p/2n3p1/2p5/4P3/2N3P1/PPPP1PBP/R1BQK1NR b KQkq -': {
    eco: 'B24',
    name: 'Siciliana Fechada: Bispo em Fianchetto',
    moves: [
      { san: 'Bg7', uci: 'f8g7', whiteWins: 70000, draws: 16000, blackWins: 64000, total: 150000, ratingFrequencies: { '1400': 0.85, '1600': 0.90, '1800': 0.93, '2000': 0.95 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 6000, draws: 1200, blackWins: 5800, total: 13000, ratingFrequencies: { '1400': 0.10, '1600': 0.07, '1800': 0.05, '2000': 0.03 } }
    ]
  },

  // 1. e4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. d3
  'r1bqk1nr/pp1pppbp/2n3p1/2p5/4P3/2NP2P1/PPP2PBP/R1BQK1NR b KQkq -': {
    eco: 'B25',
    name: 'Siciliana Fechada: Linha Principal',
    moves: [
      { san: 'd6', uci: 'd7d6', whiteWins: 55000, draws: 13000, blackWins: 51000, total: 119000, ratingFrequencies: { '1400': 0.65, '1600': 0.72, '1800': 0.78, '2000': 0.82 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 14000, draws: 3000, blackWins: 12000, total: 29000, ratingFrequencies: { '1400': 0.20, '1600': 0.17, '1800': 0.13, '2000': 0.11 } }
    ]
  },

  // 1. d4 (Queen's Pawn)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': {
    eco: 'A40',
    name: 'Abertura do Peão da Dama',
    moves: [
      { san: 'Nf6', uci: 'g8f6', whiteWins: 1200000, draws: 270000, blackWins: 1050000, total: 2520000, ratingFrequencies: { '1400': 0.40, '1600': 0.50, '1800': 0.58, '2000': 0.65 } },
      { san: 'd5', uci: 'd7d5', whiteWins: 1100000, draws: 220000, blackWins: 980000, total: 2300000, ratingFrequencies: { '1400': 0.45, '1600': 0.35, '1800': 0.28, '2000': 0.22 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 180000, draws: 35000, blackWins: 165000, total: 380000, ratingFrequencies: { '1400': 0.05, '1600': 0.06, '1800': 0.06, '2000': 0.06 } },
      { san: 'f5', uci: 'f7f5', whiteWins: 110000, draws: 18000, blackWins: 95000, total: 223000, ratingFrequencies: { '1400': 0.05, '1600': 0.05, '1800': 0.04, '2000': 0.04 } }
    ]
  },

  // 1. d4 Nf6 2. c4
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': {
    eco: 'A50',
    name: 'Índia das Brancas',
    moves: [
      { san: 'g6', uci: 'g7g6', whiteWins: 420000, draws: 95000, blackWins: 385000, total: 900000, ratingFrequencies: { '1400': 0.35, '1600': 0.40, '1800': 0.44, '2000': 0.46 } },
      { san: 'e6', uci: 'e7e6', whiteWins: 390000, draws: 90000, blackWins: 360000, total: 840000, ratingFrequencies: { '1400': 0.30, '1600': 0.32, '1800': 0.34, '2000': 0.36 } },
      { san: 'c5', uci: 'c7c5', whiteWins: 180000, draws: 32000, blackWins: 168000, total: 380000, ratingFrequencies: { '1400': 0.20, '1600': 0.17, '1800': 0.13, '2000': 0.11 } }
    ]
  },

  // 1. d4 Nf6 2. c4 c5 (Benoni)
  'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'A56',
    name: 'Defesa Benoni',
    moves: [
      { san: 'd5', uci: 'd4d5', whiteWins: 120000, draws: 22000, blackWins: 110000, total: 252000, ratingFrequencies: { '1400': 0.65, '1600': 0.75, '1800': 0.82, '2000': 0.88 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 35000, draws: 7000, blackWins: 32000, total: 74000, ratingFrequencies: { '1400': 0.20, '1600': 0.15, '1800': 0.12, '2000': 0.08 } },
      { san: 'dxc5', uci: 'd4c5', whiteWins: 16000, draws: 2500, blackWins: 15500, total: 34000, ratingFrequencies: { '1400': 0.15, '1600': 0.10, '1800': 0.06, '2000': 0.04 } }
    ]
  },

  // 1. d4 Nf6 2. c4 c5 3. d5 e6 (Modern Benoni)
  'rnbqkb1r/pp1p1ppp/4pn2/2pP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'A60',
    name: 'Gambito Benoni Moderno',
    moves: [
      { san: 'Nc3', uci: 'b1c3', whiteWins: 85000, draws: 16000, blackWins: 79000, total: 180000, ratingFrequencies: { '1400': 0.80, '1600': 0.86, '1800': 0.90, '2000': 0.94 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 10000, draws: 2000, blackWins: 9000, total: 21000, ratingFrequencies: { '1400': 0.12, '1600': 0.08, '1800': 0.06, '2000': 0.04 } }
    ]
  },

  // 1. d4 Nf6 2. c4 c5 3. d5 e6 4. Nc3 exd5
  'rnbqkb1r/pp1p1ppp/5n2/2pp4/2P5/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    eco: 'A60',
    name: 'Gambito Benoni: Troca em d5',
    moves: [
      { san: 'cxd5', uci: 'c4d5', whiteWins: 78000, draws: 15000, blackWins: 73000, total: 166000, ratingFrequencies: { '1400': 0.92, '1600': 0.95, '1800': 0.97, '2000': 0.98 } },
      { san: 'Nxd5', uci: 'c3d5', whiteWins: 4000, draws: 600, blackWins: 4400, total: 9000, ratingFrequencies: { '1400': 0.08, '1600': 0.05, '1800': 0.03, '2000': 0.02 } }
    ]
  },

  // 1. d4 Nf6 2. c4 c5 3. d5 e6 4. Nc3 exd5 5. cxd5 d6
  'rnbqkb1r/pp3ppp/3p1n2/2pP4/8/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    eco: 'A60',
    name: 'Benoni Moderno: Estrutura Estabelecida',
    moves: [
      { san: 'e4', uci: 'e2e4', whiteWins: 65000, draws: 13000, blackWins: 62000, total: 140000, ratingFrequencies: { '1400': 0.70, '1600': 0.78, '1800': 0.84, '2000': 0.88 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 14000, draws: 3000, blackWins: 13000, total: 30000, ratingFrequencies: { '1400': 0.25, '1600': 0.18, '1800': 0.13, '2000': 0.10 } }
    ]
  },

  // 1. e4 e5 (Open Game)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    eco: 'C20',
    name: 'Partida Aberta',
    moves: [
      { san: 'Nf3', uci: 'g1f3', whiteWins: 1800000, draws: 260000, blackWins: 1550000, total: 3610000, ratingFrequencies: { '1400': 0.75, '1600': 0.82, '1800': 0.88, '2000': 0.90 } },
      { san: 'Bc4', uci: 'f1c4', whiteWins: 280000, draws: 35000, blackWins: 265000, total: 580000, ratingFrequencies: { '1400': 0.14, '1600': 0.09, '1800': 0.06, '2000': 0.04 } },
      { san: 'Nc3', uci: 'b1c3', whiteWins: 180000, draws: 24000, blackWins: 176000, total: 380000, ratingFrequencies: { '1400': 0.07, '1600': 0.06, '1800': 0.04, '2000': 0.04 } }
    ]
  },

  // 1. e4 e5 2. Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    eco: 'C40',
    name: 'Abertura do Cavalo do Rei',
    moves: [
      { san: 'Bc4', uci: 'f1c4', whiteWins: 850000, draws: 120000, blackWins: 730000, total: 1700000, ratingFrequencies: { '1400': 0.55, '1600': 0.46, '1800': 0.40, '2000': 0.35 } },
      { san: 'Bb5', uci: 'f1b5', whiteWins: 720000, draws: 130000, blackWins: 650000, total: 1500000, ratingFrequencies: { '1400': 0.30, '1600': 0.40, '1800': 0.48, '2000': 0.54 } },
      { san: 'd4', uci: 'd2d4', whiteWins: 210000, draws: 32000, blackWins: 198000, total: 440000, ratingFrequencies: { '1400': 0.10, '1600': 0.09, '1800': 0.08, '2000': 0.07 } }
    ]
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 (Ruy Lopez)
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    eco: 'C60',
    name: 'Abertura Ruy Lopez (Espanhola)',
    moves: [
      { san: 'a6', uci: 'a7a6', whiteWins: 420000, draws: 85000, blackWins: 395000, total: 900000, ratingFrequencies: { '1400': 0.65, '1600': 0.68, '1800': 0.70, '2000': 0.72 } },
      { san: 'Nf6', uci: 'g8f6', whiteWins: 180000, draws: 36000, blackWins: 164000, total: 380000, ratingFrequencies: { '1400': 0.20, '1600': 0.22, '1800': 0.23, '2000': 0.22 } }
    ]
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 (Italian)
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    eco: 'C50',
    name: 'Abertura Italiana',
    moves: [
      { san: 'Bc5', uci: 'f8c5', whiteWins: 450000, draws: 65000, blackWins: 405000, total: 920000, ratingFrequencies: { '1400': 0.58, '1600': 0.54, '1800': 0.50, '2000': 0.46 } },
      { san: 'Nf6', uci: 'g8f6', whiteWins: 320000, draws: 45000, blackWins: 295000, total: 660000, ratingFrequencies: { '1400': 0.32, '1600': 0.38, '1800': 0.42, '2000': 0.46 } }
    ]
  },

  // 1. d4 d5 (Closed Game)
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': {
    eco: 'D00',
    name: 'Partida Fechada',
    moves: [
      { san: 'c4', uci: 'c2c4', whiteWins: 580000, draws: 130000, blackWins: 490000, total: 1200000, ratingFrequencies: { '1400': 0.42, '1600': 0.52, '1800': 0.62, '2000': 0.70 } },
      { san: 'Bf4', uci: 'c1f4', whiteWins: 320000, draws: 65000, blackWins: 295000, total: 680000, ratingFrequencies: { '1400': 0.32, '1600': 0.28, '1800': 0.22, '2000': 0.16 } },
      { san: 'Nf3', uci: 'g1f3', whiteWins: 180000, draws: 35000, blackWins: 165000, total: 380000, ratingFrequencies: { '1400': 0.18, '1600': 0.14, '1800': 0.11, '2000': 0.09 } }
    ]
  },

  // 1. d4 d5 2. Bf4 (London System)
  'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -': {
    eco: 'D02',
    name: 'Sistema London',
    moves: [
      { san: 'Nf6', uci: 'g8f6', whiteWins: 170000, draws: 35000, blackWins: 155000, total: 360000, ratingFrequencies: { '1400': 0.60, '1600': 0.68, '1800': 0.74, '2000': 0.78 } },
      { san: 'c5', uci: 'c7c5', whiteWins: 55000, draws: 11000, blackWins: 54000, total: 120000, ratingFrequencies: { '1400': 0.18, '1600': 0.18, '1800': 0.16, '2000': 0.14 } }
    ]
  }
};

// Normalize FEN to match book key (pieces, active color, castling, en passant)
export function getFenKey(fen: string): string {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}

// Find closest rating bracket key
function getRatingBracket(rating: number): string {
  if (rating < 1500) return '1400';
  if (rating < 1700) return '1600';
  if (rating < 1900) return '1800';
  return '2000';
}

// Select move from opening book weighted by Lichess Blitz frequencies for the user's rating
export function pickBookMove(fen: string, playerRating: number): OpeningBookMove | null {
  const key = getFenKey(fen);
  const entry = LICHESS_BLITZ_BOOK[key];
  if (!entry || entry.moves.length === 0) return null;

  const bracket = getRatingBracket(playerRating);

  // Compute weights based on player rating bracket frequencies
  const weights = entry.moves.map(m => {
    const freq = m.ratingFrequencies?.[bracket];
    if (typeof freq === 'number') return Math.max(freq, 0.05);
    return Math.max(m.total, 1);
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < entry.moves.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return entry.moves[i];
    }
  }

  return entry.moves[0];
}

// Online Lichess Explorer fallback if user provides personal token or if reachable
export async function fetchLichessExplorerOnline(fen: string, token?: string): Promise<OpeningBookMove[] | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz&ratings=1600,1800,2000&fen=${encodeURIComponent(fen)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.moves || !Array.isArray(data.moves)) return null;

    return data.moves.map((m: { san: string; uci: string; white: number; draws: number; black: number }) => ({
      san: m.san,
      uci: m.uci,
      whiteWins: m.white,
      draws: m.draws,
      blackWins: m.black,
      total: m.white + m.draws + m.black
    }));
  } catch {
    return null;
  }
}
