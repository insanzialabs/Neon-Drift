export class Sound {
  ctx?: AudioContext;
  engine?: OscillatorNode;
  gain?: GainNode;
  track?: HTMLAudioElement;
  private playbackWanted = false;
  musicUnavailable = false;
  onMusicError?: () => void;
  muted = false;
  musicMuted = false;
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.engine = this.ctx.createOscillator();
      this.engine.type = "sawtooth";
      this.gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      this.engine
        .connect(filter)
        .connect(this.gain)
        .connect(this.ctx.destination);
      this.gain.gain.value = 0;
      this.engine.start();
      this.track = new Audio(
        new URL(
          "../Formula 1 — Hans Zimmer (OST F1 Movie) ｜ Live by Imperial Orchestra [YxzIwX5g_eY].webm",
          import.meta.url,
        ).href,
      );
      this.track.preload = "none";
      this.track.loop = true;
      this.track.volume = 0.55;
      this.track.id = "soundtrack";
      this.track.hidden = true;
      this.track.addEventListener("error", () => this.trackFailed());
      document.body.append(this.track);
    }
    void this.ctx.resume().catch(() => {});
  }
  update(speed: number, active: boolean, boost: boolean) {
    if (!this.ctx || !this.gain || !this.engine) return;
    this.engine.frequency.setTargetAtTime(
      35 + speed * 1.8 + (boost ? 20 : 0),
      this.ctx.currentTime,
      0.15,
    );
    this.gain.gain.setTargetAtTime(
      active && !this.muted ? 0.025 : 0,
      this.ctx.currentTime,
      0.1,
    );
    this.setPlaying(active);
  }
  beginRun() {
    this.start();
    if (this.track) this.track.currentTime = 0;
    this.playbackWanted = false;
    this.setPlaying(true);
  }
  setPlaying(active: boolean) {
    const wanted = active && !this.musicMuted;
    if (!this.track || wanted === this.playbackWanted) return;
    this.playbackWanted = wanted;
    if (wanted) {
      this.musicUnavailable = false;
      void this.track.play().catch((error: unknown) => {
        // A quick pause/retry can cancel a pending play without a media failure.
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (this.playbackWanted) this.trackFailed();
      });
    } else this.track.pause();
  }
  private trackFailed() {
    this.musicUnavailable = true;
    this.onMusicError?.();
  }

  fx(kind: string) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = ["crash", "damage"].includes(kind) ? "sawtooth" : "triangle";
    o.frequency.setValueAtTime(
      ["crash", "damage"].includes(kind)
        ? 130
        : ["boost", "surge"].includes(kind)
          ? 110
          : ["goal", "finish", "charged"].includes(kind)
            ? 950
            : 700,
      this.ctx.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      ["crash", "damage"].includes(kind) ? 20 : ["boost", "surge"].includes(kind) ? 420 : 1400,
      this.ctx.currentTime + 0.25,
    );
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    o.connect(g).connect(this.ctx.destination);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(this.ctx.currentTime + 0.4);
  }
}
