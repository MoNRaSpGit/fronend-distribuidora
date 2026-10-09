import { useEffect, useRef, useState } from "react";
import { fetchProducts, updateOrder } from "../distribuidora.client";
import { errorMessage, formatMoney, useDebounced } from "../distribuidora.shared";
import type { Order, Product } from "../distribuidora.types";
import { QuantityStepper } from "./QuantityStepper";

type Line = { productId: number; name: string; price: number; quantity: number };

interface Props {
  order: Order;
  onCancel: () => void;
  onSaved: (order: Order) => void;
}

// Edicion de un pedido pendiente desde la oficina (09/10/2026, pedido
// explicito): cambiar cantidades, sacar renglones, sumar productos y
// tocar la nota. El cliente no se cambia -- para eso se elimina el
// pedido y se toma de nuevo.
export function PedidoEditor({ order, onCancel, onSaved }: Props) {
  const [lines, setLines] = useState<Line[]>(() =>
    order.items.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity }))
  );
  const [note, setNote] = useState(order.note ?? "");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounced(search.trim());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debouncedSearch) return;
    let cancelled = false;
    fetchProducts(debouncedSearch)
      .then((result) => {
        if (cancelled) return;
        setProducts(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "No se pudieron cargar los productos."));
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim()) {
      setLoadingProducts(true);
    } else {
      setProducts([]);
      setLoadingProducts(false);
    }
  }

  // Llegar a 0 saca el renglon del pedido.
  function setQuantity(productId: number, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) => (line.productId === productId ? { ...line, quantity } : line))
    );
  }

  function handleAdd(product: Product) {
    setLines((current) => [...current, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
    handleSearchChange("");
    searchInputRef.current?.focus();
  }

  async function handleSave() {
    if (lines.length === 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = await updateOrder(order.id, {
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        note: note.trim() || undefined
      });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el pedido."));
      setSaving(false);
    }
  }

  return (
    <section className="pedido">
      <div className="card pedido-cliente">
        <div>
          <span className="card-detail">Editando el pedido N.º {order.id} de</span>
          <strong>{order.clientName}</strong>
        </div>
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>

      <input
        ref={searchInputRef}
        className="search-input"
        type="search"
        placeholder="Buscar un producto para agregar"
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
      />

      {search.trim() && (
        <ul className="card-list">
          {products.map((product) => (
            <li key={product.id} className="card product-row">
              <div className="product-row-info">
                <strong>{product.name}</strong>
                <span className="card-detail">
                  {formatMoney(product.price)}
                  {product.code ? ` · Cód. ${product.code}` : ""}
                </span>
              </div>
              {lines.some((line) => line.productId === product.id) ? (
                <span className="in-order-tag">✓ En el pedido</span>
              ) : (
                <button type="button" className="button button-primary" onClick={() => handleAdd(product)}>
                  Agregar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {search.trim() && loadingProducts && products.length === 0 && <p className="message">Buscando…</p>}
      {search.trim() && !loadingProducts && !error && products.length === 0 && (
        <p className="message">No hay productos que coincidan con "{search.trim()}".</p>
      )}

      <h2 className="section-title">En el pedido</h2>
      {lines.length === 0 && (
        <p className="message">El pedido quedó sin productos. Agregá alguno, o cancelá y eliminá el pedido.</p>
      )}
      <ul className="card-list">
        {lines.map((line) => (
          <li key={line.productId} className="card product-row">
            <div className="product-row-info">
              <strong>{line.name}</strong>
              <span className="card-detail">
                {formatMoney(line.price)} c/u · {formatMoney(line.price * line.quantity)}
              </span>
            </div>
            <QuantityStepper quantity={line.quantity} onChange={(quantity) => setQuantity(line.productId, quantity)} />
          </li>
        ))}
      </ul>
      <input
        className="search-input"
        placeholder="Nota (opcional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={300}
      />

      {error && <p className="message message-error">{error}</p>}

      <div className="bottom-bar">
        <div>
          <span className="card-detail">Total</span>
          <strong className="bottom-bar-total">{formatMoney(total)}</strong>
        </div>
        <button type="button" className="button button-primary" onClick={handleSave} disabled={lines.length === 0 || saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}
