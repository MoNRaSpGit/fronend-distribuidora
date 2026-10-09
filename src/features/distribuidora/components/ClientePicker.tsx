import { useEffect, useState } from "react";
import { fetchClients } from "../distribuidora.client";
import { errorMessage, useDebounced } from "../distribuidora.shared";
import type { Client } from "../distribuidora.types";
import { NuevoClienteModal } from "./NuevoClienteModal";

interface Props {
  onSelect: (client: Client) => void;
}

// Paso 1 del vendedor: buscar el cliente (por negocio, persona, calle,
// RUT o codigo) y tocarlo.
export function ClientePicker({ onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  // Los clientes NO se listan de entrada (09/10/2026, pedido explicito:
  // "que solo salgan en el buscador"), igual que los productos del
  // pedido: solo se busca cuando hay algo escrito.
  useEffect(() => {
    if (!debouncedSearch) return;
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

  function handleSearchChange(value: string) {
    setSearch(value);
    // Al borrar el buscador se vacian los resultados; al escribir, se
    // avisa que esta buscando hasta que llegue la respuesta.
    if (value.trim()) {
      setLoading(true);
    } else {
      setClients([]);
      setLoading(false);
    }
  }

  const typed = search.trim();

  return (
    <section>
      <h1 className="page-title">¿A qué cliente le tomás el pedido?</h1>

      <input
        className="search-input"
        type="search"
        placeholder="Buscar cliente (negocio, persona o calle)"
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
        autoFocus
      />

      {error && <p className="message message-error">{error}</p>}

      {typed && (
        <ul className="card-list">
          {clients.map((client) => (
            <li key={client.id}>
              <button type="button" className="card card-button" onClick={() => onSelect(client)}>
                <strong>{client.name}</strong>
                <span className="card-detail">
                  {[client.contactName, client.address, client.rut ? `RUT ${client.rut}` : null].filter(Boolean).join(" · ") ||
                    "Sin datos cargados"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!typed && <p className="message">Escribí el nombre del negocio, de la persona o la calle para buscarlo.</p>}
      {typed && !loading && !error && clients.length === 0 && (
        <p className="message">No hay clientes que coincidan con "{typed}".</p>
      )}
      {typed && loading && clients.length === 0 && <p className="message">Buscando…</p>}

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
