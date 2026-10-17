// Efeitos sonoros sintetizados com a Web Audio API (sem arquivos de áudio).
// O AudioContext só é criado no primeiro som e retomado se o navegador o
// tiver suspendido (política de autoplay: exige um gesto prévio do usuário,
// o que sempre acontece antes do primeiro lance).

export type SoundName = "move" | "capture" | "tutor" | "win" | "loss";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  start?: number; // atraso em segundos
  duration: number;
  type?: OscillatorType;
  volume?: number;
  endFreq?: number; // glissando até esta frequência
}

function tone(
  ctx: AudioContext,
  {
    freq,
    start = 0,
    duration,
    type = "sine",
    volume = 0.2,
    endFreq,
  }: ToneOptions,
) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  }

  // Ataque rápido e decaimento exponencial (evita estalos)
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSound(name: SoundName) {
  const ctx = getContext();
  if (!ctx) return;

  switch (name) {
    case "move": // "toc" curto de peça de madeira
      tone(ctx, {
        freq: 320,
        endFreq: 140,
        duration: 0.09,
        type: "triangle",
        volume: 0.3,
      });
      break;
    case "capture": // toc mais grave e pesado, com um estalo
      tone(ctx, {
        freq: 240,
        endFreq: 90,
        duration: 0.14,
        type: "triangle",
        volume: 0.4,
      });
      tone(ctx, {
        freq: 900,
        endFreq: 300,
        duration: 0.05,
        type: "square",
        volume: 0.08,
      });
      break;
    case "tutor": // aviso: duas notas descendentes
      tone(ctx, { freq: 660, duration: 0.14, volume: 0.22 });
      tone(ctx, { freq: 494, start: 0.14, duration: 0.22, volume: 0.22 });
      break;
    case "win": // arpejo ascendente (Dó maior)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
        tone(ctx, { freq, start: i * 0.11, duration: 0.3, volume: 0.2 }),
      );
      break;
    case "loss": // sequência descendente grave
      [392, 329.63, 261.63].forEach((freq, i) =>
        tone(ctx, {
          freq,
          start: i * 0.16,
          duration: 0.32,
          type: "triangle",
          volume: 0.25,
        }),
      );
      break;
  }
}
