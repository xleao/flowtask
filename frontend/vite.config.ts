import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 5180 evita los puertos por defecto de otros proyectos. Si está ocupado, Vite usa
  // el siguiente: en desarrollo la API acepta cualquier puerto de localhost (CORS).
  server: { port: 5180 },
  preview: { port: 5180 },
});
