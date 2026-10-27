import { GLYPHS } from "../const/glyphs";

interface IMoveNotationProps {
  san: string; // ex.: "Nf3", "Qxb1+", "exd8=Q", "O-O"
}

const PIECE_LETTERS = "KQRBN";

// Troca a letra da peça (K, Q, R, B, N) pelo símbolo. Peões, roques e demais
// símbolos (x, +, #) continuam como texto.
export function MoveNotation({ san }: IMoveNotationProps) {
  const startsWithPiece = PIECE_LETTERS.includes(san[0]);
  const rest = startsWithPiece ? san.slice(1) : san;

  // Promoção: "e8=Q" -> "e8=♛"
  const display =
    (startsWithPiece ? GLYPHS[san[0]] : "") +
    rest.replace(/=([QRBN])/, (_, letter: string) => `=${GLYPHS[letter]}`);

  return (
    <>
      {/* Leitores de tela continuam lendo a notação original */}
      <span className="sr-only">{san}</span>
      <span aria-hidden>{display}</span>
    </>
  );
}
