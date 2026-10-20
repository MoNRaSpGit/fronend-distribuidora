import { useEffect, useState, type FormEvent } from "react";
import { createClient, fetchClients, updateClient } from "../distribuidora.client";
import { errorMessage, useDebounced } from "../distribuidora.shared";
import type { Client } from "../distribuidora.types";

interface Props {
  onClose: () => void;
  onSaved: (client: Client) => void;
}

type Mode = "search" | "edit" | "new";

// Pedido explicito (19/10/2026): "+ Cliente" ya no abre directo el alta --
// primero se busca el cliente por nombre (para poder editarlo si ya
// existe) y "Agregar cliente" queda como una opcion aparte, al fondo del
// buscador, para el alta de uno nuevo.
export function GestionClientesModal({ onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("search");
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debouncedSearch = useDebounced(search.trim());

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!debouncedSearch) return;
    let cancelled = false;
    fetchClients(debouncedSearch)
      .then((result) => {
        if (cancelled) return;
        setClients(result);
        setSearchError("");
      })
      .catch((err) => {
        if (!cancelled) setSearchError(errorMessage(err, "No se pudieron cargar los clientes."));
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
    if (value.trim()) {
      setLoading(true);
    } else {
      setClients([]);
      setLoading(false);
    }
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setName(client.name);
    setRut(client.rut ?? "");
    setAddress(client.address ?? "");
    setPhone(client.phone ?? "");
    setFormError("");
    setMode("edit");
  }

  function openNew() {
    setEditingClient(null);
    setName(search.trim());
    setRut("");
    setAddress("");
    setPhone("");
    setFormError("");
    setMode("new");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setFormError("Ingresá el nombre del cliente.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const client =
        mode === "edit" && editingClient
          ? await updateClient(editingClient.id, { name: name.trim(), rut: rut.trim(), address: address.trim(), phone: phone.trim() })
          : await createClient({
              name: name.trim(),
              rut: rut.trim() || undefined,
              address: address.trim() || undefined,
              phone: phone.trim() || undefined
            });
      onSaved(client);
    } catch (err) {
      setFormError(errorMessage(err, "No se pudo guardar el cliente."));
      setSaving(false);
    }
  }

  const typed = search.trim();

  if (mode === "search") {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <h2>Clientes</h2>

          <input
            className="search-input"
            type="search"
            placeholder="Buscar cliente (negocio, persona o calle)"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            autoFocus
          />

          {searchError && <p className="message message-error">{searchError}</p>}

          {typed && (
            <ul className="card-list">
              {clients.map((client) => (
                <li key={client.id}>
                  <button type="button" className="card card-button" onClick={() => openEdit(client)}>
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

          {!typed && <p className="message">Escribí el nombre del negocio, de la persona o la calle para buscarlo y editarlo.</p>}
          {typed && !loading && !searchError && clients.length === 0 && (
            <p className="message">No hay clientes que coincidan con "{typed}".</p>
          )}
          {typed && loading && clients.length === 0 && <p className="message">Buscando…</p>}

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="button button-primary" onClick={openNew}>
              + Agregar cliente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{mode === "edit" ? "Editar cliente" : "Cliente nuevo"}</h2>

        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoFocus />
        </label>
        <label className="field">
          <span>RUT (opcional)</span>
          <input value={rut} onChange={(event) => setRut(event.target.value)} maxLength={20} inputMode="numeric" />
        </label>
        <label className="field">
          <span>Dirección (opcional)</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} />
        </label>
        <label className="field">
          <span>Teléfono (opcional)</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} inputMode="tel" />
        </label>

        {formError && <p className="message message-error">{formError}</p>}

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={() => setMode("search")} disabled={saving}>
            Volver
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
