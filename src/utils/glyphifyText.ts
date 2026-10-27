import { GLYPHS } from "../const/glyphs";

// Troca lances citados dentro de um texto corrido: "Qh5" -> "♛h5", "Nxe5+" -> "♞xe5+".
// Exige letra de peça + casa (ex.: h5), então palavras comuns não são afetadas.
export function glyphifyText(text: string): string {
  return text.replace(
    /\b([KQRBN])([a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g,
    (_, letter: string, rest: string) => `${GLYPHS[letter]}${rest}`,
  );
}
