import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fuentes autoalojadas: sin Google Fonts, la CSP del servidor sigue siendo solo 'self'.
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
// Solo el subconjunto latino (cubre á é í ó ú ñ ¿ ¡): menos @font-face que procesar.
import "@fontsource/chakra-petch/latin-400.css";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import App from "./App";
import "./styles.css";
import { initEffects } from "./utils/effects";

initEffects();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
