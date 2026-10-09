import { useEffect, useState } from "react";
import { fetchCatalog } from "../distribuidora.client";
import { errorMessage, formatMoney, useDebounced } from "../distribuidora.shared";
import type { Product } from "../distribuidora.types";
import { ProductoModal } from "./ProductoModal";

// Pestaña Productos de la oficina (09/10/2026, pedido explicito: "pone
// una pestaña en oficina, productos, y que cuando seleccione un producto
// se pueda agregar, editar"). Aca SI se ve el catalogo entero, incluidos
// los dados de baja -- al vendedor solo le sale lo que busca.
export function ProductosPanel() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "nuevo" = alta; un producto = edicion; null = modal cerrado.
  const [editing, setEditing] = useState<Product | "nuevo" | null>(null);
  const [notice, setNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const debouncedSearch = useDebounced(search.trim());

  useEffect(() => {
    let cancelled = false;
    fetchCatalog(debouncedSearch)
      .then((result) => {
        if (cancelled) return;
        setProducts(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "No se pudieron cargar los productos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, refreshTick]);

  function handleSaved(product: Product) {
    setNotice(`"${product.name}" guardado${product.active ? "" : " (dado de baja)"}.`);
    setEditing(null);
    setRefreshTick((tick) => tick + 1);
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="search-input toolbar-search"
          type="search"
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" className="button button-primary" onClick={() => setEditing("nuevo")}>
          + Producto
        </button>
      </div>

      {notice && <p className="message message-ok">{notice}</p>}
      {error && <p className="message message-error">{error}</p>}
      {loading && <p className="message">Cargando productos…</p>}
      {!loading && !error && products.length === 0 && (
        <p className="message">
          {debouncedSearch ? `No hay productos que coincidan con "${debouncedSearch}".` : "Todavía no hay productos cargados."}
        </p>
      )}

      <ul className="card-list">
        {products.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              className={`card card-button order-card${product.active ? "" : " is-inactive"}`}
              onClick={() => setEditing(product)}
            >
              <div>
                <strong>{product.name}</strong>
                <span className="card-detail">
                  {product.code ? `Cód. ${product.code} · ` : ""}
                  {product.active ? "Tocá para editar" : "Dado de baja · tocá para reactivar"}
                </span>
              </div>
              <strong>{formatMoney(product.price)}</strong>
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <ProductoModal product={editing === "nuevo" ? undefined : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </>
  );
}
