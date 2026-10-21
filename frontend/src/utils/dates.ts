// "2026-11-02" se interpreta como fecha LOCAL. new Date("2026-11-02") la toma
// como medianoche UTC y en Lima (UTC-5) se mostraría como 1 de noviembre.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

const shortFormatter = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });

export function formatDate(iso: string): string {
  return shortFormatter.format(parseLocalDate(iso)).replace(".", "");
}

/** Fecha local "YYYY-MM-DD" desplazada n días desde hoy (n = 0 → hoy). */
export function addDaysISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return addDaysISO(0);
}

/** Días hasta la fecha límite (negativo = vencida). */
export function daysUntil(iso: string): number {
  const ms = parseLocalDate(iso).getTime() - parseLocalDate(todayISO()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Texto corto y humano para la fecha límite: "Hoy", "Mañana", "Hace 3 días", "En 5 días". */
export function relativeDue(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  if (days < 0) return `Hace ${-days} días`;
  if (days <= 7) return `En ${days} días`;
  return formatDate(iso);
}
