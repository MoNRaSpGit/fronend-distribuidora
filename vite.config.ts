import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isGithubPagesBuild = mode === "github-pages";
  return {
    // OJO: si el repo de GitHub Pages termina con otro nombre, ajustar
    // este base (tiene que matchear "https://<usuario>.github.io/<repo>/").
    base: isGithubPagesBuild ? "/fronend-distribuidora/" : "/",
    plugins: [react()]
  };
});
