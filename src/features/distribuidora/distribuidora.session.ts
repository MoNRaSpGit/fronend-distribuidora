import type { CurrentUser } from "./distribuidora.types";

// Login real desde 02/11/2026 (antes "sin login por ahora"). Token
// opaco en sessionStorage (no localStorage), mismo criterio que
// frontend-gym: sobrevive a un F5 en la misma pestaña, pero una
// pestaña nueva o volver a abrir el navegador pide login de nuevo.
const SESSION_KEY = "frontend-distribuidora.session.v1";

export type Session = {
  token: string;
  user: CurrentUser;
};

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage puede fallar (privado, bloqueado): no es critico,
    // simplemente va a volver a pedir usuario/contraseña la proxima vez.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ver comentario de saveSession.
  }
}

export function getToken(): string | null {
  return loadSession()?.token ?? null;
}
