import { useEffect, useRef, useState } from "react";
import { SEARCH_SHORTCUT } from "../utils/platform";
import { Icon } from "./Icon";

interface Props {
  onSearch: (q: string) => void;
}

const DEBOUNCE_MS = 300;

/**
 * Buscador con estado propio: cada tecla re-renderiza solo este componente, no
 * el tablero completo (importa en equipos lentos). Avisa al padre 300 ms después
 * de la última tecla, así no se dispara una petición por cada letra.
 * Para limpiarlo desde afuera, el padre lo remonta con otra `key`.
 */
export function SearchBox({ onSearch }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(value.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, onSearch]);

  // Ctrl+K / ⌘K enfoca el buscador desde cualquier parte.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="tron-search">
      <div className="tron-search__inner">
        <Icon name="search" size={17} className="tron-search__icon" />
        <input
          ref={inputRef}
          id="searchInput"
          type="text"
          className="tron-search__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Buscar por título o descripción (${SEARCH_SHORTCUT})`}
          aria-label="Buscar tareas"
        />
        {value ? (
          <button
            type="button"
            className="tron-search__clear"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
          >
            <Icon name="x" size={14} />
          </button>
        ) : (
          <div className="tron-search__kbd-wrap" aria-hidden="true">
            <kbd className="tron-kbd">{SEARCH_SHORTCUT}</kbd>
          </div>
        )}
      </div>
    </div>
  );
}
