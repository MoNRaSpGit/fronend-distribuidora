import { useEffect, useState } from "react";
import { Footer } from "./components/Footer";
import { LoginScreen } from "./components/LoginScreen";
import { UserMenu } from "./components/UserMenu";
import { OficinaPage } from "./OficinaPage";
import { VendedorPage } from "./VendedorPage";
import { login as loginRequest, logout as logoutRequest } from "./distribuidora.client";
import { EMPRESA_LOGO_URL, errorMessage } from "./distribuidora.shared";
import {
  clearRememberedUsername,
  clearSession,
  loadSession,
  saveRememberedUsername,
  saveSession,
  type Session
} from "./distribuidora.session";

type Route = "vendedor" | "oficina";

// Ruteo por hash (mismo criterio que frontend-peluqueria): GitHub Pages
// no sabe servir /oficina directo (404 al refrescar), pero #oficina
// siempre cae en el mismo index.html.
function readRoute(): Route {
  return window.location.hash === "#oficina" ? "oficina" : "vendedor";
}

// Login real desde 02/11/2026 (antes "sin login por ahora", un usuario
// solo para los dos): Matías es admin (ve todo, factura) y Valentina es
// vendedora (toma pedidos, ve pendientes y gráficas, no factura ni toca
// el catálogo). Las dos pestañas de siempre quedan igual para los dos
// roles -- es OficinaPage la que, segun el rol, esconde lo que no toca.
// Los usuarios se crean a mano con backend/scripts/create-distribuidora-user.js.
export function DistribuidoraApp() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [route, setRoute] = useState(readRoute());
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    function handleHashChange() {
      setRoute(readRoute());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Sesión vencida o invalida (dispatcheado desde distribuidora.client.ts
  // ante un 401): vuelve sola al login, sin importar en que pantalla esté.
  useEffect(() => {
    function handleUnauthorizedEvent() {
      clearSession();
      setSession(null);
    }
    window.addEventListener("distribuidora:unauthorized", handleUnauthorizedEvent);
    return () => window.removeEventListener("distribuidora:unauthorized", handleUnauthorizedEvent);
  }, []);

  async function handleLogin(username: string, password: string, rememberUsername: boolean) {
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await loginRequest(username, password);
      const newSession: Session = { token: result.token, user: result.user };
      saveSession(newSession);
      setSession(newSession);
      if (rememberUsername) {
        saveRememberedUsername(result.user.username);
      } else {
        clearRememberedUsername();
      }
    } catch (err) {
      setLoginError(errorMessage(err, "No se pudo iniciar sesión."));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await logoutRequest();
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  return (
    <div className="app">
      <header className="app-bar">
        <div className="app-bar-brand">
          <img src={EMPRESA_LOGO_URL} alt="" />
          <span>Distribuidora</span>
        </div>
        <UserMenu name={session.user.fullName ?? session.user.username} route={route} onLogout={handleLogout} />
      </header>

      <main className="app-main">
        {route === "oficina" ? (
          <OficinaPage role={session.user.role} currentUserName={session.user.fullName ?? session.user.username} />
        ) : (
          <VendedorPage />
        )}
      </main>

      <Footer />
    </div>
  );
}
