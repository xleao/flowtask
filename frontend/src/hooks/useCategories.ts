import { useCallback, useEffect, useState } from "react";
import type { Notify } from "../components/Toasts";
import { CategoryService } from "../services/categoryService";
import type { Category } from "../types/models";

/** Catálogo de categorías: se carga al montar y se puede recargar a mano. */
export function useCategories(notify: Notify) {
  const [categories, setCategories] = useState<Category[]>([]);

  const reloadCategories = useCallback(() => {
    CategoryService.list()
      .then(setCategories)
      .catch((err: Error) => notify("error", `Error al cargar categorías: ${err.message}`));
  }, [notify]);

  useEffect(reloadCategories, [reloadCategories]);

  return { categories, reloadCategories };
}
