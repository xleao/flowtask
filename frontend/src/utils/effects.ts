// Modo de efectos visuales: "full" (TRON completo) o "lite" (misma estética, sin
// animaciones de fondo). Se decide así: preferencia guardada > señales del equipo
// > medición real de FPS. Aplica la clase `perf-lite` en <html> (ver styles.css).

export type EffectsMode = "full" | "lite";

const STORAGE_KEY = "flowtask:effects";
const AUTO_LITE_EVENT = "flowtask:auto-lite";
const MIN_FPS = 40;

function readSaved(): EffectsMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "full" || value === "lite" ? value : null;
  } catch {
    return null; // modo privado / storage bloqueado: se decide automáticamente
  }
}

export function saveEffects(mode: EffectsMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // sin storage la preferencia vale solo para esta sesión
  }
}

export function applyEffects(mode: EffectsMode): void {
  document.documentElement.classList.toggle("perf-lite", mode === "lite");
}

export function currentEffects(): EffectsMode {
  return document.documentElement.classList.contains("perf-lite") ? "lite" : "full";
}

/** Avisa (una vez) si la medición de FPS bajó a modo ligero, para mostrarlo en la UI. */
export function onAutoLite(listener: () => void): () => void {
  window.addEventListener(AUTO_LITE_EVENT, listener);
  return () => window.removeEventListener(AUTO_LITE_EVENT, listener);
}

function looksLikeWeakDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true
  );
}

function measureFps(done: (fps: number) => void): void {
  // Se mide pasada la carga inicial (fuentes, primeras peticiones) y solo con la
  // pestaña visible: una pestaña en segundo plano no dibuja y daría un falso "lento".
  window.setTimeout(() => {
    if (document.hidden) return;
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (document.hidden) return;
      frames++;
      if (now - start < 2000) requestAnimationFrame(tick);
      else done((frames * 1000) / (now - start));
    };
    requestAnimationFrame(tick);
  }, 1500);
}

/** Se llama una vez antes del primer render (main.tsx) para no mostrar un parpadeo. */
export function initEffects(): void {
  const saved = readSaved();
  if (saved) {
    applyEffects(saved);
    return;
  }
  if (looksLikeWeakDevice()) {
    applyEffects("lite");
    return;
  }
  applyEffects("full");
  measureFps((fps) => {
    if (fps < MIN_FPS) {
      applyEffects("lite");
      window.dispatchEvent(new Event(AUTO_LITE_EVENT));
    }
  });
}
