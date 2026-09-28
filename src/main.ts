import "./style.css";
import gsap from "gsap";
import type { Instrument } from "./scene";
import { createFlat, type Flat } from "./fallback";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = window.matchMedia("(max-width: 720px)").matches;

const gl = document.getElementById("gl") as HTMLCanvasElement;
const flat = document.getElementById("flat") as HTMLCanvasElement;
const veil = document.getElementById("veil")!;

const megaA = document.getElementById("megaA")!;
const megaB = document.getElementById("megaB")!;
const fragTnsn = document.getElementById("fragTnsn")!;
const fragFld = document.getElementById("fragFld")!;
const fragNum = document.getElementById("fragNum")!;
const fragDash = document.getElementById("fragDash")!;
const vertMark = document.getElementById("vertMark")!;
const slit = document.getElementById("slit")!;
const square = document.getElementById("square")!;
const endmark = document.getElementById("endmark")!;
const progressBar = document.querySelector("#progress i") as HTMLElement;
const phaseLabel = document.getElementById("phaseLabel")!;
const stepIndex = document.getElementById("stepIndex")!;
const coordLabel = document.getElementById("coordLabel")!;
const stateWord = document.querySelector(".chrome-bottom .mark.right") as HTMLElement;
const stepBack = document.getElementById("stepBack") as HTMLButtonElement;
const stepFwd = document.getElementById("stepFwd") as HTMLButtonElement;

let instrument: Instrument | null = null;
let flatFx: Flat | null = null;

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

if (webglAvailable()) {
  // Progressive init: paint chrome + typography first, load 3D after.
  void import("./scene").then((m) => {
    if (!webglAvailable()) return;
    instrument = m.createInstrument(gl, { reduced: reducedMotion, mobile });
    if (!instrument) {
      gl.hidden = true;
      flatFx ??= createFlat(flat, { reduced: reducedMotion });
    }
    instrument?.setPointer(px, py);
    instrument?.setProgress(smoothP, 0);
  });
} else {
  gl.hidden = true;
  flatFx = createFlat(flat, { reduced: reducedMotion });
}

gl.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  instrument?.dispose();
  instrument = null;
  gl.hidden = true;
  flatFx = createFlat(flat, { reduced: reducedMotion });
});

// ---- scroll state ----
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
let targetP = 0;
let smoothP = 0;
let prevP = 0;
let velocity = 0;
let velSmooth = 0;

function readScroll() {
  targetP = Math.min(1, Math.max(0, window.scrollY / maxScroll()));
}

window.addEventListener("scroll", readScroll, { passive: true });
window.addEventListener("resize", () => {
  instrument?.resize();
  flatFx?.resize();
  readScroll();
});
readScroll();

// ---- pointer / touch / drag ----
let px = 0, py = 0; // -1..1
let downPos: { x: number; y: number } | null = null;
let dirtyCoord = false;

function normFromClient(cx: number, cy: number) {
  px = (cx / window.innerWidth) * 2 - 1;
  py = -((cy / window.innerHeight) * 2 - 1);
}

window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  normFromClient(e.clientX, e.clientY);
  instrument?.setPointer(px, py);
  flatFx?.setPointer(px, py);
  dirtyCoord = true;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (!t) return;
  normFromClient(t.clientX, t.clientY);
  instrument?.setPointer(px, py);
  flatFx?.setPointer(px, py);
  dirtyCoord = true;
}, { passive: true });

window.addEventListener("pointerdown", (e) => {
  normFromClient(e.clientX, e.clientY);
  downPos = { x: e.clientX, y: e.clientY };
  instrument?.impulse(px, py, 0.85);
  flatFx?.impulse(px, py);
}, { passive: true });

window.addEventListener("pointermove", (e) => {
  if (!downPos || e.pointerType === "touch") return;
  if (e.buttons === 0) return;
  const dx = e.clientX - downPos.x;
  instrument?.addDrag(dx * 0.02);
  downPos = { x: e.clientX, y: e.clientY };
}, { passive: true });

window.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  if (!t) return;
  normFromClient(t.clientX, t.clientY);
  instrument?.impulse(px, py, 0.9);
  flatFx?.impulse(px, py);
}, { passive: true });

// keyboard: [ and ] step states (arrows keep native scroll)
window.addEventListener("keydown", (e) => {
  if (e.key === "]") stepTo(currentPhase() + 1);
  if (e.key === "[") stepTo(currentPhase() - 1);
});

// ---- stepper ----
function currentPhase() {
  return Math.round(smoothP * 4);
}
function stepTo(phase: number) {
  const p = Math.min(4, Math.max(0, phase)) / 4;
  const top = p * maxScroll();
  window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
}
stepBack.addEventListener("click", () => stepTo(currentPhase() - 1));
stepFwd.addEventListener("click", () => stepTo(currentPhase() + 1));

// ---- helpers ----
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const WORDS = ["STILL", "FOLD", "MASS", "SLIT", "QUIET"];

function paintTypography(p: number, stretch: number) {
  // mega numerals
  const megaOut = sstep(0.58, 0.76, p);
  megaA.style.opacity = String(1 - megaOut);
  megaA.style.transform = `translate3d(${lerp(0, -14, p)}vw, ${lerp(0, -6, p)}svh, 0) scale(${lerp(1, 1.16 + stretch * 0.1, p)}, ${lerp(1, 0.9 + stretch, p)})`;

  const ghostIn = sstep(0.22, 0.34, p) * (1 - sstep(0.52, 0.66, p));
  megaB.style.opacity = String(ghostIn * 0.8);
  megaB.style.transform = `translate3d(${lerp(6, -4, p)}vw, ${lerp(4, -2, p)}svh, 0) scale(1.02)`;

  // TNSN: grows with ridge, collapses at slit, faint return
  const grow = sstep(0.1, 0.4, p);
  const collapse = sstep(0.6, 0.74, p);
  const ret = sstep(0.86, 1, p) * 0.35;
  const tScale = lerp(lerp(1, 1.55, grow), 0.06, collapse) + ret;
  fragTnsn.style.opacity = String(lerp(1, 0.12, collapse) + ret * 0.5);
  fragTnsn.style.transform = `translate3d(${lerp(0, 8, p)}vw, ${lerp(0, -10, p)}svh, 0) scale(${tScale.toFixed(3)}, ${(tScale * (1 + stretch * 0.6)).toFixed(3)})`;

  fragFld.style.opacity = String(1 - sstep(0.55, 0.8, p));
  fragFld.style.transform = `translate3d(${lerp(0, -4, p)}vw, ${lerp(0, 10, p)}svh, 0)`;

  // number chip: passes through depth
  const depth = 1 + sstep(0.3, 0.55, p) * 1.1 - sstep(0.6, 0.8, p) * 0.9;
  fragNum.style.transform = `translate3d(${lerp(0, -6, p)}vw, ${lerp(0, -14, p)}svh, 0) scale(${depth.toFixed(3)})`;
  fragNum.style.opacity = String(1 - sstep(0.78, 0.92, p) * 0.7);

  fragDash.style.opacity = String((1 - sstep(0.4, 0.62, p)) * 0.9);
  fragDash.style.transform = `translateX(-50%) rotate(${(sstep(0.3, 0.65, p) * 90).toFixed(1)}deg)`;

  vertMark.style.opacity = String(1 - sstep(0.15, 0.35, p));

  const slitA = sstep(0.58, 0.68, p) * (1 - sstep(0.74, 0.86, p));
  slit.style.opacity = String(slitA);
  slit.style.transform = `translateY(-50%) scaleX(${(0.25 + 0.75 * sstep(0.58, 0.72, p)).toFixed(3)})`;

  const sqIn = sstep(0.4, 0.5, p) * (1 - sstep(0.62, 0.78, p));
  const sqEnd = sstep(0.88, 1, p) * 0.6;
  const sq = Math.max(sqIn, sqEnd);
  square.style.transform = `translate(-50%, -50%) scale(${sq.toFixed(3)}) rotate(${(p * 90).toFixed(1)}deg)`;

  endmark.style.opacity = String(sstep(0.85, 0.97, p));
}

function paintChrome(p: number) {
  progressBar.style.transform = `scaleX(${p.toFixed(4)})`;
  const phase = Math.min(5, Math.floor(p * 5) + 1);
  const label = `0${phase} / 05`;
  if (phaseLabel.textContent !== label) phaseLabel.textContent = label;
  const idx = `0${currentPhase() + 1}`;
  if (stepIndex.textContent !== idx) stepIndex.textContent = idx;
  const word = WORDS[currentPhase()];
  const full = `60 · ${word}`;
  if (stateWord.textContent !== full) stateWord.textContent = reducedMotion ? `ST · ${word}` : full;
  if (dirtyCoord) {
    coordLabel.textContent = `${px.toFixed(2)} / ${py.toFixed(2)}`;
    dirtyCoord = false;
  }
}

// ---- main loop (typography + uniforms; WebGL renders on its own loop) ----
let lastT = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  smoothP += (targetP - smoothP) * (reducedMotion ? 0.2 : 0.09);
  if (Math.abs(targetP - smoothP) < 0.0005) smoothP = targetP;
  velocity = dt > 0 ? (smoothP - prevP) / dt : 0;
  prevP = smoothP;
  velSmooth += (Math.min(Math.abs(velocity) * 0.6, 0.4) - velSmooth) * 0.1;
  const stretch = reducedMotion ? 0 : velSmooth;

  instrument?.setProgress(smoothP, velocity);
  flatFx?.setProgress(smoothP);
  paintTypography(smoothP, stretch);
  paintChrome(smoothP);
}
requestAnimationFrame(frame);

// ---- entrance (no fake progress; veil lifts on first frames) ----
requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add("lift")));
setTimeout(() => veil.remove(), 1800);

if (!reducedMotion) {
  gsap.set([megaA, fragTnsn, fragFld, fragNum], { willChange: "transform" });
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from(".rule-top", { scaleX: 0, transformOrigin: "left center", duration: 1.1 }, 0.2)
    .from(".rule-bottom", { scaleX: 0, transformOrigin: "right center", duration: 1.1 }, 0.2)
    .from(".mega", { xPercent: 6, duration: 1.4, stagger: 0.08 }, 0.3)
    .from(".frag", { y: 26, duration: 1, stagger: 0.07 }, 0.5)
    .from(".chrome", { opacity: 0, duration: 0.9 }, 0.6)
    .from(".vert", { opacity: 0, duration: 0.9 }, 0.8);
} else {
  veil.classList.add("lift");
}

window.addEventListener("pagehide", () => {
  instrument?.dispose();
  flatFx?.dispose();
});
