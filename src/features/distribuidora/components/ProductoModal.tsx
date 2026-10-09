import { useState, type FormEvent } from "react";
import { createProduct, updateProduct } from "../distribuidora.client";
import { errorMessage } from "../distribuidora.shared";
import type { Product } from "../distribuidora.types";

interface Props {
  // Sin producto = alta; con producto = edicion.
  product?: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export function ProductoModal({ product, onClose, onSaved }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(action: () => Promise<Product>, fallback: string) {
    setSaving(true);
    setError("");
    try {
      onSaved(await action());
    } catch (err) {
      setError(errorMessage(err, fallback));
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
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
    const input = { name: name.trim(), price: priceNumber };
    save(() => (product ? updateProduct(product.id, input) : createProduct(input)), "No se pudo guardar el producto.");
  }

  // Dar de baja no borra: el producto deja de salirle al vendedor, pero
  // los pedidos viejos lo siguen mostrando. Se puede reactivar.
  function handleToggleActive() {
    if (!product) return;
    save(() => updateProduct(product.id, { active: !product.active }), "No se pudo cambiar el estado del producto.");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{product ? "Editar producto" : "Producto nuevo"}</h2>

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

        {product && (
          <button type="button" className="button button-secondary button-block" onClick={handleToggleActive} disabled={saving}>
            {product.active ? "Dar de baja (no le sale más al vendedor)" : "Reactivar producto"}
          </button>
        )}
      </form>
    </div>
  );
}
