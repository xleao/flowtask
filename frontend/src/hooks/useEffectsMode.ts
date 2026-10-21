import { useCallback, useEffect, useState } from "react";
import type { Notify } from "../components/Toasts";
import { applyEffects, currentEffects, onAutoLite, saveEffects, type EffectsMode } from "../utils/effects";

/** Modo de efectos visuales (completo / ligero) con su botón y el aviso de activación automática. */
export function useEffectsMode(notify: Notify) {
  const [mode, setMode] = useState<EffectsMode>(currentEffects);

  // Si la medición inicial detectó un equipo lento, se avisa una vez y cómo revertirlo.
  useEffect(
    () =>
      onAutoLite(() => {
        setMode("lite");
        notify("success", "Modo ligero activado para este equipo. Puedes cambiarlo con el ícono ⚡ del menú.");
      }),
    [notify],
  );

  const toggle = useCallback(() => {
    const next: EffectsMode = mode === "lite" ? "full" : "lite";
    applyEffects(next);
    saveEffects(next);
    setMode(next);
  }, [mode]);

  return { lite: mode === "lite", toggle };
}
