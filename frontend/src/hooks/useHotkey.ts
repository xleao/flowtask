import { useEffect, useRef } from "react";

/**
 * Atajo de una sola tecla (sin modificadores). No se dispara mientras se escribe
 * en un campo ni con un modal abierto, para no robarle la tecla al usuario.
 */
export function useHotkey(key: string, handler: () => void) {
  // La última versión del handler sin re-suscribir el listener en cada render.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      const modalOpen = document.querySelector("dialog[open]");
      if (e.key.toLowerCase() !== key || typing || modalOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      handlerRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
