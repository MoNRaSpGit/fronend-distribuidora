import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DistribuidoraApp } from "./features/distribuidora/DistribuidoraApp";
import { AppUpdateNotice } from "./shared/components/AppUpdateNotice";
import "./styles/global.css";

// PWA: solo en produccion -- en dev el service worker viejo quedaria
// cacheando contra el propio servidor de Vite y daria mas problemas que
// soluciones (mismo criterio que frontend-gym y frontend-peluqueria).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DistribuidoraApp />
    <AppUpdateNotice />
  </StrictMode>
);
