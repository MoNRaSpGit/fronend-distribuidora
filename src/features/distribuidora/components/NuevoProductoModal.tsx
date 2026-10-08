import { useState, type FormEvent } from "react";
import { createProduct } from "../distribuidora.client";
import { errorMessage } from "../distribuidora.shared";

interface Props {
  onClose: () => void;
  onCreated: (productName: string) => void;
}

export function NuevoProductoModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Se redondea a 2 decimales antes de mandar: el backend rechaza mas.
    const priceNumber = Math.round(parseFloat(price.replace(",", ".")) * 100) / 100;
    if (name.trim().length < 2) {
      setError("Ingresá el nombre del producto.");
      return;
    }
    if (!priceNumber || priceNumber <= 0) {
      setError("Ingresá un precio válido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const product = await createProduct({ name: name.trim(), price: priceNumber });
      onCreated(product.name);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el producto."));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Producto nuevo</h2>

        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoFocus />
        </label>
        <label className="field">
          <span>Precio (IVA incluido)</span>
          <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="0,00" />
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
