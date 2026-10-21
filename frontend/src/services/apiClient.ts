// Cliente HTTP único: timeout, parseo de errores de FastAPI y mensajes amigables.
// Los componentes nunca llaman a fetch directamente.

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8010").replace(/\/$/, "");
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number, // 0 = sin respuesta (red caída / timeout)
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface PydanticError {
  loc: (string | number)[];
  msg: string;
}

function parseError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return new ApiError(detail, status);

  // 422 de Pydantic: lista de errores por campo.
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const err of detail as PydanticError[]) {
      const field = String(err.loc.at(-1) ?? "general");
      fieldErrors[field] ??= err.msg.replace(/^Value error, /, "");
    }
    return new ApiError("Revisa los datos ingresados.", status, fieldErrors);
  }

  if (status === 429) return new ApiError("Demasiadas solicitudes. Espera un momento.", status);
  if (status >= 500) return new ApiError("El servidor tuvo un problema. Inténtalo más tarde.", status);
  return new ApiError(`Error inesperado (${status}).`, status);
}

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // Content-Type solo con body: un GET simple no necesita preflight CORS.
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.", 0);
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw parseError(res.status, body);
  return { data: body as T, headers: res.headers };
}
