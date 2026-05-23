import { getAudioContext } from "./audioContext";

/** Very short, subtle sine ping (~150ms) — signals word was caught. */
export function playPing(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.16);
  } catch {
    // Fail silently — ping is non-critical feedback.
  }
}
