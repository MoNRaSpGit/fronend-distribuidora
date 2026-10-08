import { useEffect, useState } from "react";
import { OficinaPage } from "./OficinaPage";
import { VendedorPage } from "./VendedorPage";
import { EMPRESA } from "./distribuidora.shared";

type Route = "vendedor" | "oficina";

// Ruteo por hash (mismo criterio que frontend-peluqueria): GitHub Pages
// no sabe servir /oficina directo (404 al refrescar), pero #oficina
// siempre cae en el mismo index.html.
function readRoute(): Route {
  return window.location.hash === "#oficina" ? "oficina" : "vendedor";
}

// Sin login por ahora (08/10/2026, pedido explicito: "capaz que hacemos
// un usuario solo, despues vemos como dividirlo"): las dos pantallas
// estan a un toque de distancia. Cuando se separen los usuarios, esta
// barra es lo que pasa a depender de quien entro.
export function DistribuidoraApp() {
  const [route, setRoute] = useState(readRoute());

  useEffect(() => {
    function handleHashChange() {
      setRoute(readRoute());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="app">
      <header className="app-bar">
        <div className="app-bar-brand">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <span>{EMPRESA.name}</span>
        </div>
        <nav className="app-bar-tabs">
          <a href="#vendedor" className={route === "vendedor" ? "is-active" : ""}>
            Vendedor
          </a>
          <a href="#oficina" className={route === "oficina" ? "is-active" : ""}>
            Oficina
          </a>
        </nav>
      </header>

      <main className="app-main">{route === "oficina" ? <OficinaPage /> : <VendedorPage />}</main>
    </div>
  );
}
