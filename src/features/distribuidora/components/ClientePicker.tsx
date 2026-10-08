import { useEffect, useState } from "react";
import { fetchClients } from "../distribuidora.client";
import { errorMessage, useDebounced } from "../distribuidora.shared";
import type { Client } from "../distribuidora.types";
import { NuevoClienteModal } from "./NuevoClienteModal";

interface Props {
  onSelect: (client: Client) => void;
}

// Paso 1 del vendedor: buscar el cliente (por nombre o RUT) y tocarlo.
export function ClientePicker({ onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  useEffect(() => {
    let cancelled = false;
    fetchClients(debouncedSearch)
      .then((result) => {
        if (cancelled) return;
        setClients(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "No se pudieron cargar los clientes."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  return (
    <section>
      <h1 className="page-title">¿A qué cliente le tomás el pedido?</h1>

      <input
        className="search-input"
        type="search"
        placeholder="Buscar cliente por nombre o RUT"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        autoFocus
      />

      {error && <p className="message message-error">{error}</p>}

      <ul className="card-list">
        {clients.map((client) => (
          <li key={client.id}>
            <button type="button" className="card card-button" onClick={() => onSelect(client)}>
              <strong>{client.name}</strong>
              <span className="card-detail">
                {[client.address, client.rut ? `RUT ${client.rut}` : null].filter(Boolean).join(" · ") || "Sin datos cargados"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!loading && !error && clients.length === 0 && (
        <p className="message">No hay clientes{debouncedSearch ? ` que coincidan con "${debouncedSearch}"` : ""}.</p>
      )}
      {loading && clients.length === 0 && <p className="message">Buscando…</p>}

      <button type="button" className="button button-secondary button-block" onClick={() => setShowNewClient(true)}>
        + Cliente nuevo
      </button>

      {showNewClient && (
        <NuevoClienteModal
          initialName={search.trim()}
          onClose={() => setShowNewClient(false)}
          onCreated={(client) => {
            setShowNewClient(false);
            onSelect(client);
          }}
        />
      )}
    </section>
  );
}
