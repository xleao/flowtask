import { useState, type FormEvent } from "react";
import type { Category } from "../types/models";
import { Icon } from "./Icon";

interface Props {
  category: Category | undefined; // a dónde va la tarea (se muestra en el placeholder)
  onCreate: (title: string, category: Category) => Promise<void>;
  onNoCategory: () => void;
}

/** Barra de captura rápida con estado propio: escribir aquí no re-renderiza el tablero. */
export function QuickCapture({ category, onCreate, onNoCategory }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    if (!category) {
      onNoCategory();
      return;
    }
    setBusy(true);
    try {
      await onCreate(clean, category);
      setTitle("");
    } catch {
      // el padre ya mostró el error; se conserva el texto para reintentar
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tron-quick-wrap" aria-label="Captura rápida">
      <form className="tron-quick-form" id="quickCaptureForm" onSubmit={handleSubmit}>
        <div className="tron-quick-form__left" aria-hidden="true">
          <Icon name="add_circle" size={19} className="tron-quick-form__icon" />
        </div>
        <input
          id="quickTitleInput"
          type="text"
          autoComplete="off"
          maxLength={120}
          className="tron-quick-form__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          // Se dice explícitamente a qué categoría y fecha va: nada queda asignado "en silencio".
          placeholder={`Tarea rápida en "${category?.name ?? "…"}", vence hoy (Enter)`}
          aria-label={`Añadir tarea rápida en la categoría ${category?.name ?? ""} con fecha límite hoy`}
        />
        <button type="submit" className="tron-quick-form__right" disabled={busy}>
          <span className="tron-quick-form__exec">{busy ? "Guardando..." : "Añadir ↵"}</span>
        </button>
      </form>
    </section>
  );
}
