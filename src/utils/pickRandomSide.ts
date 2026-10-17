import type { Side } from "../types";

export function pickRandomSide(): Side {
  return Math.random() < 0.5 ? "w" : "b";
}
