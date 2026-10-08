import { useState, type FormEvent } from "react";
import { createClient } from "../distribuidora.client";
import { errorMessage } from "../distribuidora.shared";
import type { Client } from "../distribuidora.types";

interface Props {
  initialName?: string;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

export function NuevoClienteModal({ initialName = "", onClose, onCreated }: Props) {
  const [name, setName] = useState(initialName);
  const [rut, setRut] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Ingresá el nombre del cliente.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const client = await createClient({
        name: name.trim(),
        rut: rut.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined
      });
      onCreated(client);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el cliente."));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Cliente nuevo</h2>

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

        {error && <p className="message message-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
