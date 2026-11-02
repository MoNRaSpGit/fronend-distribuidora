import { useEffect, useRef, useState, type PointerEvent } from "react";
import { deleteProduct, fetchCatalog } from "../distribuidora.client";
import { errorMessage, formatMoney, useDebounced } from "../distribuidora.shared";
import type { Product } from "../distribuidora.types";
import { ConfirmModal } from "./ConfirmModal";
import { ProductoModal } from "./ProductoModal";

const LONG_PRESS_MS = 450;
// Si el dedo se mueve mas que esto, es un scroll de la lista y no un
// "dejar apretado".
const MOVE_TOLERANCE_PX = 10;

// Pestaña Productos de la oficina (09/10/2026, pedido explicito: "pone
// una pestaña en oficina, productos, y que cuando seleccione un producto
// se pueda agregar, editar"). Aca SI se ve el catalogo entero, incluidos
// los dados de baja -- al vendedor solo le sale lo que busca.
// 02/11/2026, pedido explicito: dejar apretado un producto muestra
// "Editar"/"Eliminar" (con confirmacion), igual que ya existe para los
// pedidos en OficinaPage.
export function ProductosPanel() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "nuevo" = alta; un producto = edicion; null = modal cerrado.
  const [editing, setEditing] = useState<Product | "nuevo" | null>(null);
  // Producto que se dejo apretado en la lista: muestra sus opciones.
  const [optionsFor, setOptionsFor] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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

  async function handleDelete(product: Product) {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setConfirmDelete(null);
      setNotice(`"${product.name}" eliminado.`);
    } catch (err) {
      setDeleteError(errorMessage(err, "No se pudo eliminar el producto."));
    } finally {
      setDeleting(false);
    }
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

      {products.length > 0 && <p className="hint">Dejá apretado un producto para ver las opciones (editar, eliminar…).</p>}

      <ul className="card-list">
        {products.map((product) => (
          <li key={product.id}>
            <ProductRow product={product} onOpen={() => setEditing(product)} onLongPress={() => setOptionsFor(product)} />
          </li>
        ))}
      </ul>

      {editing && (
        <ProductoModal product={editing === "nuevo" ? undefined : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {optionsFor && (
        <div className="modal-backdrop" onClick={() => setOptionsFor(null)}>
          <div className="modal options-modal" role="menu" onClick={(event) => event.stopPropagation()}>
            <h2>{optionsFor.name}</h2>
            <p className="confirm-message">{formatMoney(optionsFor.price)}</p>
            <button
              type="button"
              className="button button-secondary button-block"
              onClick={() => {
                const product = optionsFor;
                setOptionsFor(null);
                setEditing(product);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="button button-danger button-block"
              onClick={() => {
                const product = optionsFor;
                setOptionsFor(null);
                setDeleteError("");
                setConfirmDelete(product);
              }}
            >
              Eliminar
            </button>
            <button type="button" className="button button-secondary button-block" onClick={() => setOptionsFor(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar el producto?"
          message={`"${confirmDelete.name}" (${formatMoney(confirmDelete.price)}). No se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          busyLabel="Eliminando…"
          danger
          busy={deleting}
          error={deleteError}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

// Tarjeta de un producto: un toque lo abre para editar; dejarlo apretado
// (o click derecho en PC) muestra las opciones. Mismo criterio que
// OrderCard.tsx para los pedidos.
function ProductRow({ product, onOpen, onLongPress }: { product: Product; onOpen: () => void; onLongPress: () => void }) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const longPressedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    longPressedRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      longPressedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent) {
    const start = startRef.current;
    if (!start || timerRef.current === null) return;
    if (Math.abs(event.clientX - start.x) > MOVE_TOLERANCE_PX || Math.abs(event.clientY - start.y) > MOVE_TOLERANCE_PX) {
      clearTimer();
    }
  }

  function handleClick() {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onOpen();
  }

  return (
    <button
      type="button"
      className={`card card-button order-card${product.active ? "" : " is-inactive"}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(event) => {
        event.preventDefault();
        clearTimer();
        if (!longPressedRef.current) {
          longPressedRef.current = event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType !== "mouse";
          onLongPress();
        }
      }}
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
  );
}
