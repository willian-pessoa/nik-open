export const normalizeLichessUci = (uci: string): string => {
  // Correção de compatibilidade para o roque do Lichess Explorer -> chess.js
  switch (uci) {
    case "e1h1":
      return "e1g1"; // Roque curto das brancas
    case "e1a1":
      return "e1c1"; // Roque longo das brancas
    case "e8h8":
      return "e8g8"; // Roque curto das pretas
    case "e8a8":
      return "e8c8"; // Roque longo das pretas
    default:
      return uci;
  }
};
