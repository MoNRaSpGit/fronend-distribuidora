import { useEffect, useRef, useState } from "react";
import { ClientePicker } from "./components/ClientePicker";
import { ConfirmModal } from "./components/ConfirmModal";
import { QuantityStepper } from "./components/QuantityStepper";
import { createOrder, fetchProducts } from "./distribuidora.client";
import { errorMessage, formatMoney, useDebounced } from "./distribuidora.shared";
import type { Client, Order, Product } from "./distribuidora.types";

type Line = { product: Product; quantity: number };

// La pantalla del vendedor de la calle, pensada para el celular:
// 1) elige el cliente, 2) busca productos y los suma al pedido que se
// va armando abajo, 3) lo manda.
// El pedido queda "pendiente" para que la oficina lo pase a boleta.
export function VendedorPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOrder, setSentOrder] = useState<Order | null>(null);
  const [confirmChangeClient, setConfirmChangeClient] = useState(false);
  const debouncedSearch = useDebounced(search.trim());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Los productos NO se listan de entrada (09/10/2026, pedido explicito:
  // "que no salga nada, lo que escriba en el buscador ahi va saliendo"):
  // solo se busca cuando hay algo escrito.
  useEffect(() => {
    if (!client || !debouncedSearch) return;
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
  }, [client, debouncedSearch]);

  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);

  function isInOrder(productId: number) {
    return lines.some((line) => line.product.id === productId);
  }

  // Al agregar se limpia el buscador: los resultados se van, el pedido
  // queda a la vista justo abajo y el cursor vuelve al buscador, listo
  // para el producto siguiente.
  function handleAdd(product: Product) {
    setQuantity(product, 1);
    handleSearchChange("");
    searchInputRef.current?.focus();
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    // Al borrar el buscador se vacian los resultados; al escribir, se
    // avisa que esta buscando hasta que llegue la respuesta.
    if (value.trim()) {
      setLoadingProducts(true);
    } else {
      setProducts([]);
      setLoadingProducts(false);
    }
  }

  // Llegar a 0 saca el producto del pedido.
  function setQuantity(product: Product, quantity: number) {
    setLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.product.id !== product.id);
      const exists = current.some((line) => line.product.id === product.id);
      return exists
        ? current.map((line) => (line.product.id === product.id ? { ...line, quantity } : line))
        : [...current, { product, quantity }];
    });
  }

  function resetOrder() {
    setClient(null);
    setLines([]);
    setNote("");
    setSearch("");
    setError("");
    setSentOrder(null);
    setConfirmChangeClient(false);
  }

  function handleChangeClient() {
    // Con productos ya cargados se pide confirmacion: cambiar de cliente
    // descarta el pedido que se estaba armando.
    if (lines.length > 0) {
      setConfirmChangeClient(true);
      return;
    }
    resetOrder();
  }

  async function handleSend() {
    if (!client || lines.length === 0 || sending) return;
    setSending(true);
    setError("");
    try {
      const order = await createOrder({
        clientId: client.id,
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        note: note.trim() || undefined
      });
      setSentOrder(order);
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar el pedido. Probá de nuevo."));
    } finally {
      setSending(false);
    }
  }

  if (sentOrder) {
    return (
      <section className="sent">
        <div className="sent-check">✓</div>
        <h1 className="page-title">Pedido N.º {sentOrder.id} enviado</h1>
        <p>
          {sentOrder.clientName} · {sentOrder.items.length} producto(s) · <strong>{formatMoney(sentOrder.total)}</strong>
        </p>
        <p className="message">Ya le llegó a la oficina para hacer la boleta.</p>
        <button type="button" className="button button-primary button-block" onClick={resetOrder}>
          Tomar otro pedido
        </button>
      </section>
    );
  }

  if (!client) {
    return <ClientePicker onSelect={setClient} />;
  }

  return (
    <section className="pedido">
      <div className="card pedido-cliente">
        <div>
          <span className="card-detail">Pedido para</span>
          <strong>{client.name}</strong>
          {(client.contactName || client.address) && (
            <span className="card-detail">{[client.contactName, client.address].filter(Boolean).join(" · ")}</span>
          )}
        </div>
        <button type="button" className="button button-secondary" onClick={handleChangeClient}>
          Cambiar
        </button>
      </div>

      {/* Orden pedido explicitamente (09/10/2026): cliente, buscador de
          productos y, abajo, el pedido que se va armando. */}
      <input
        ref={searchInputRef}
        className="search-input"
        type="search"
        placeholder="Buscar producto (Fideos, Yerba, Detergente…)"
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
      />

      {/* La cantidad se maneja en un solo lugar: abajo, "En el pedido".
          Aca el resultado solo se agrega (o avisa que ya esta). */}
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
              {isInOrder(product.id) ? (
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

      {!search.trim() && lines.length === 0 && <p className="message">Escribí el nombre del producto para buscarlo.</p>}
      {search.trim() && loadingProducts && products.length === 0 && <p className="message">Buscando…</p>}
      {search.trim() && !loadingProducts && !error && products.length === 0 && (
        <p className="message">No hay productos que coincidan con "{search.trim()}".</p>
      )}
      {error && <p className="message message-error">{error}</p>}

      {lines.length > 0 && (
        <>
          <h2 className="section-title">En el pedido</h2>
          <ul className="card-list">
            {lines.map((line) => (
              <li key={line.product.id} className="card product-row">
                <div className="product-row-info">
                  <strong>{line.product.name}</strong>
                  <span className="card-detail">
                    {formatMoney(line.product.price)} c/u · {formatMoney(line.product.price * line.quantity)}
                  </span>
                </div>
                <QuantityStepper quantity={line.quantity} onChange={(quantity) => setQuantity(line.product, quantity)} />
              </li>
            ))}
          </ul>
          <input
            className="search-input"
            placeholder="Nota para la oficina (opcional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
          />
        </>
      )}

      {confirmChangeClient && (
        <ConfirmModal
          title="¿Cambiar de cliente?"
          message="Se pierde el pedido que estabas armando."
          confirmLabel="Sí, cambiar"
          danger
          onConfirm={resetOrder}
          onCancel={() => setConfirmChangeClient(false)}
        />
      )}

      <div className="bottom-bar">
        <div>
          <span className="card-detail">{units} unidad(es)</span>
          <strong className="bottom-bar-total">{formatMoney(total)}</strong>
        </div>
        <button type="button" className="button button-primary" onClick={handleSend} disabled={lines.length === 0 || sending}>
          {sending ? "Enviando…" : "Confirmar pedido"}
        </button>
      </div>
    </section>
  );
}
