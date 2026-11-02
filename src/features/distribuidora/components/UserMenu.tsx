import { useEffect, useRef, useState } from "react";

interface Props {
  name: string;
  onLogout: () => void;
}

// Quién está conectado, arriba a la derecha (02/11/2026, pedido
// explicito): un toque despliega la opción de cerrar sesión.
export function UserMenu({ name, onLogout }: Props) {
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
      <button type="button" className="user-menu-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className="user-menu-name">{name}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M3 5.5 8 11l5-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <button
            type="button"
            className="user-menu-item"
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
