/**
 * Tiny synthesized sound engine. Web Audio only — no external assets.
 * Howler.js + real samples come in Phase 5 polish.
 *
 * Browsers require an AudioContext to be resumed from a user gesture;
 * call `prime()` from a click handler before relying on playback.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  enabled = true;

  prime(): void {
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    this.prime();
    return this.ctx;
  }

  /** A short whoosh that scales with swing intensity (0..1). */
  playSwing(intensity: number): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const i = Math.max(0, Math.min(1, intensity));
    const dur = 0.14 + i * 0.12;
    const t0 = ctx.currentTime;

    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let n = 0; n < data.length; n++) {
      const env = 1 - n / data.length;
      data[n] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(900 + i * 1100, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12 + i * 0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  /** A crisp slice — short triangle-wave click + noise crack. */
  playSlice(pitch = 1): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const dur = 0.2;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(170 * pitch, t0 + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.35, t0 + 0.005);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(og).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);

    const noiseDur = 0.06;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseDur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let n = 0; n < data.length; n++) {
      data[n] = (Math.random() * 2 - 1) * Math.exp(-n / (data.length * 0.25));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.28;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500;
    src.connect(hp).connect(ng).connect(ctx.destination);
    src.start(t0);
  }
}
