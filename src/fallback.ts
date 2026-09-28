/* Lightweight 2D fallback: same compositional logic, no WebGL. */

export interface Flat {
  setProgress: (p: number) => void;
  setPointer: (nx: number, ny: number) => void;
  impulse: (nx: number, ny: number) => void;
  resize: () => void;
  dispose: () => void;
}

export function createFlat(canvas: HTMLCanvasElement, opts: { reduced: boolean }): Flat | null {
  const raw = canvas.getContext("2d");
  if (!raw) return null;
  const ctx: CanvasRenderingContext2D = raw;
  canvas.hidden = false;
  let w = 0, h = 0, dpr = 1;
  let progress = 0, target = 0;
  const pointer = { x: 0, y: 0, active: false };
  const ripples: { x: number; y: number; t: number }[] = [];
  let time = 0, last = performance.now(), dead = false, raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();

  function ridgeY(baseY: number, x: number, p: number): number {
    const rise = smooth(0.1, 0.36, p);
    const fall = 1 - smooth(0.6, 0.78, p);
    const amp = rise * fall * h * 0.16;
    const foldY = h * (0.56 - 0.14 * smooth(0.1, 0.62, p));
    const d = (baseY - foldY) / (h * 0.22);
    let y = baseY - Math.exp(-d * d) * amp * Math.sin((x / w) * Math.PI);
    if (pointer.active) {
      const dx = (x - (pointer.x * 0.5 + 0.5) * w) / (w * 0.3);
      const dy = (baseY - (0.5 - pointer.y * 0.5) * h) / (h * 0.3);
      y += Math.exp(-(dx * dx + dy * dy) * 2.2) * -26;
    }
    for (const r of ripples) {
      const age = time - r.t;
      if (age < 0 || age > 3) continue;
      const rx = (x - r.x * w) / w;
      const ry = (baseY - r.y * h) / h;
      const dist = Math.hypot(rx, ry);
      y += Math.sin(dist * 22 - age * 9) * Math.exp(-dist * 4) * Math.exp(-age * 1.6) * 22;
    }
    if (!opts.reduced) y += Math.sin(x * 0.012 + time * 0.5 + baseY * 0.01) * 2;
    return y;
  }

  function smooth(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function tick(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += opts.reduced ? dt * 0.15 : dt;
    progress += (target - progress) * 0.09;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#e8e5dd";
    ctx.fillRect(0, 0, w, h);

    const lines = w < 720 ? 44 : 72;
    for (let i = 0; i < lines; i++) {
      const baseY = (i / (lines - 1)) * h;
      ctx.beginPath();
      const steps = w < 720 ? 40 : 72;
      for (let s = 0; s <= steps; s++) {
        const x = (s / steps) * w;
        const y = ridgeY(baseY, x, progress);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const isThread = i === Math.round(lines * 0.37);
      const threadA = smooth(0.3, 0.42, progress) * (1 - smooth(0.66, 0.8, progress));
      if (isThread && threadA > 0.02) {
        ctx.strokeStyle = `rgba(188,63,22,${0.9 * threadA})`;
        ctx.lineWidth = 1.6;
      } else {
        ctx.strokeStyle = "rgba(25,23,18,0.20)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // masses as flat bars
    const eA = smooth(0.3, 0.48, progress) * (1 - smooth(0.62, 0.8, progress));
    if (eA > 0.01) {
      ctx.fillStyle = "#191712";
      const bw = w * 0.5 * eA;
      ctx.fillRect(w * 0.5 - bw / 2 - w * 0.05, h * 0.36, bw, 10);
      ctx.fillStyle = "#bc3f16";
      ctx.fillRect(w * 0.5 + bw / 2 - w * 0.05, h * 0.36, 4, 10);
      ctx.fillStyle = "#191712";
      const bw2 = w * 0.36 * eA;
      ctx.fillRect(w * 0.5 - bw2 / 2 + w * 0.04, h * 0.62, bw2, 8);
    }
    // slit
    const slitA = smooth(0.6, 0.68, progress) * (1 - smooth(0.74, 0.84, progress));
    if (slitA > 0.01) {
      ctx.fillStyle = `rgba(25,23,18,${slitA})`;
      ctx.fillRect(w * 0.08, h * 0.5, w * 0.84 * (0.3 + 0.7 * slitA), 2);
    }
  }
  raf = requestAnimationFrame(tick);

  return {
    setProgress: (p: number) => { target = Math.min(1, Math.max(0, p)); },
    setPointer: (nx: number, ny: number) => { pointer.x = nx; pointer.y = ny; pointer.active = true; },
    impulse: (nx: number, ny: number) => {
      ripples.push({ x: nx * 0.5 + 0.5, y: 0.5 - ny * 0.5, t: time });
      if (ripples.length > 6) ripples.shift();
    },
    resize,
    dispose() { dead = true; cancelAnimationFrame(raf); },
  };
}
