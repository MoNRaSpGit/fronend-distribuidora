import { useEffect, useRef, useState } from "react";

interface Props {
  name: string;
  route: "vendedor" | "oficina";
  onLogout: () => void;
}

// Icono de usuario arriba a la derecha (02/11/2026, pedido explicito): un
// toque despliega Vendedor / Oficina, quien esta conectado y Cerrar
// sesión -- antes esas dos pestañas estaban sueltas en la barra.
export function UserMenu({ name, route, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className="user-menu" ref={containerRef}>
      <button type="button" className="user-menu-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Menú de usuario">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-current">Conectado: {name}</div>

          <a href="#vendedor" className={`user-menu-item${route === "vendedor" ? " is-active" : ""}`} onClick={() => setOpen(false)}>
            Vendedor
          </a>
          <a href="#oficina" className={`user-menu-item${route === "oficina" ? " is-active" : ""}`} onClick={() => setOpen(false)}>
            Oficina
          </a>

          <div className="user-menu-divider" />

          <button
            type="button"
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path
                d="M7.5 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2.5M13 14l4-4-4-4M17 10H7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
