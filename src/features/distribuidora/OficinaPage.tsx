import { useEffect, useState } from "react";
import { Boleta } from "./components/Boleta";
import { ConfirmModal } from "./components/ConfirmModal";
import { NuevoClienteModal } from "./components/NuevoClienteModal";
import { OrderCard } from "./components/OrderCard";
import { PedidoEditor } from "./components/PedidoEditor";
import { ProductosPanel } from "./components/ProductosPanel";
import { deleteOrder, fetchOrders, invoiceOrder } from "./distribuidora.client";
import { errorMessage, formatInvoiceNumber, formatMoney } from "./distribuidora.shared";
import type { Order, OrderStatus } from "./distribuidora.types";

const REFRESH_MS = 20000;

// La pantalla de la oficina: ve los pedidos que van mandando desde la
// calle, abre uno y lo pasa a boleta (queda numerada y lista para
// imprimir). Tambien da de alta clientes y, en la pestaña Productos,
// agrega y edita el catalogo.
export function OficinaPage() {
  const [status, setStatus] = useState<OrderStatus>("pendiente");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  // Pedido pendiente que se esta editando (pantalla aparte), si hay.
  const [editing, setEditing] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Pedido que se pidio eliminar y espera la confirmacion en el modal.
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [deleteError, setDeleteError] = useState("");
  // Pedido que se dejo apretado en la lista: muestra sus opciones.
  const [optionsFor, setOptionsFor] = useState<Order | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [notice, setNotice] = useState("");

  // Cada cambio de refreshTick vuelve a pedir la lista.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchOrders(status)
      .then((result) => {
        if (cancelled) return;
        setOrders(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "No se pudieron cargar los pedidos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, refreshTick]);

  // Se refresca solo: los pedidos de la calle van apareciendo sin que
  // la oficina tenga que recargar la pagina.
  useEffect(() => {
    const intervalId = setInterval(() => setRefreshTick((tick) => tick + 1), REFRESH_MS);
    return () => clearInterval(intervalId);
  }, []);

  function changeStatus(nextStatus: OrderStatus) {
    setShowProducts(false);
    setNotice("");
    if (nextStatus === status) return;
    setLoading(true);
    setOrders([]);
    setStatus(nextStatus);
  }

  async function handleInvoice() {
    if (!selected || invoicing) return;
    setInvoicing(true);
    setError("");
    try {
      setSelected(await invoiceOrder(selected.id));
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setError(errorMessage(err, "No se pudo generar la boleta."));
    } finally {
      setInvoicing(false);
    }
  }

  // Solo los pedidos pendientes se pueden editar o eliminar: uno ya
  // facturado tiene numero de boleta y no se toca.
  function askDelete(order: Order) {
    setDeleteError("");
    setConfirmDelete(order);
  }

  // Se llama recien cuando se confirma en el modal. Si falla, el modal
  // queda abierto mostrando el motivo.
  async function handleDelete(order: Order) {
    if (deletingId !== null) return;
    setDeletingId(order.id);
    setDeleteError("");
    try {
      await deleteOrder(order.id, order.status === "facturado");
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setSelected(null);
      setConfirmDelete(null);
      setNotice(`Pedido N.º ${order.id} eliminado.`);
    } catch (err) {
      setDeleteError(errorMessage(err, "No se pudo eliminar el pedido."));
    } finally {
      setDeletingId(null);
      setRefreshTick((tick) => tick + 1);
    }
  }

  function renderDeleteModal() {
    if (!confirmDelete) return null;
    const invoiced = confirmDelete.status === "facturado" && confirmDelete.invoiceNumber !== null;
    return (
      <ConfirmModal
        title={invoiced ? "¿Eliminar la boleta?" : "¿Eliminar el pedido?"}
        message={
          invoiced
            ? `Boleta ${formatInvoiceNumber(confirmDelete.invoiceNumber!)} de ${confirmDelete.clientName}, por ${formatMoney(confirmDelete.total)}. Ya está generada: se borra el pedido y su boleta. No se puede deshacer.`
            : `Pedido N.º ${confirmDelete.id} de ${confirmDelete.clientName}, por ${formatMoney(confirmDelete.total)}. No se puede deshacer.`
        }
        confirmLabel="Sí, eliminar"
        busyLabel="Eliminando…"
        danger
        busy={deletingId !== null}
        error={deleteError}
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    );
  }

  // Las opciones que salen al dejar apretado un pedido de la lista.
  function renderOptionsModal() {
    if (!optionsFor) return null;
    const order = optionsFor;
    const pending = order.status === "pendiente";
    const close = () => setOptionsFor(null);
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal options-modal" role="menu" onClick={(event) => event.stopPropagation()}>
          <h2>{order.clientName}</h2>
          <p className="confirm-message">
            {order.invoiceNumber !== null ? `Boleta ${formatInvoiceNumber(order.invoiceNumber)}` : `Pedido N.º ${order.id}`} ·{" "}
            {formatMoney(order.total)}
          </p>
          <button
            type="button"
            className="button button-secondary button-block"
            onClick={() => {
              close();
              setSelected(order);
            }}
          >
            {pending ? "Abrir pedido" : "Abrir boleta"}
          </button>
          {pending && (
            <button
              type="button"
              className="button button-secondary button-block"
              onClick={() => {
                close();
                setEditing(order);
              }}
            >
              Editar
            </button>
          )}
          <button
            type="button"
            className="button button-danger button-block"
            onClick={() => {
              close();
              askDelete(order);
            }}
          >
            Eliminar
          </button>
          <button type="button" className="button button-secondary button-block" onClick={close}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <PedidoEditor
        order={editing}
        onCancel={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null);
          setSelected(saved);
          setRefreshTick((tick) => tick + 1);
        }}
      />
    );
  }

  if (selected) {
    const facturado = selected.status === "facturado";
    return (
      <section>
        <div className="toolbar no-print">
          <button type="button" className="button button-secondary" onClick={() => setSelected(null)}>
            ← Volver
          </button>
          {facturado ? (
            <button type="button" className="button button-primary" onClick={() => window.print()}>
              Imprimir boleta
            </button>
          ) : (
            <div className="toolbar-actions">
              <button
                type="button"
                className="button button-danger"
                onClick={() => askDelete(selected)}
                disabled={deletingId !== null}
              >
                Eliminar
              </button>
              <button type="button" className="button button-secondary" onClick={() => setEditing(selected)}>
                Editar
              </button>
              <button type="button" className="button button-primary" onClick={handleInvoice} disabled={invoicing}>
                {invoicing ? "Generando…" : "Generar boleta"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="message message-error no-print">{error}</p>}
        <Boleta order={selected} />
        {renderDeleteModal()}
      </section>
    );
  }

  return (
    <section>
      <div className="toolbar">
        <div className="segmented">
          <button
            type="button"
            className={!showProducts && status === "pendiente" ? "is-active" : ""}
            onClick={() => changeStatus("pendiente")}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={!showProducts && status === "facturado" ? "is-active" : ""}
            onClick={() => changeStatus("facturado")}
          >
            Facturados
          </button>
          <button type="button" className={showProducts ? "is-active" : ""} onClick={() => setShowProducts(true)}>
            Productos
          </button>
        </div>
        {!showProducts && (
          <div className="toolbar-actions">
            <button type="button" className="button button-secondary" onClick={() => setShowNewClient(true)}>
              + Cliente
            </button>
          </div>
        )}
      </div>

      {showProducts ? <ProductosPanel /> : renderOrders()}

      {renderOptionsModal()}
      {renderDeleteModal()}

      {showNewClient && (
        <NuevoClienteModal
          onClose={() => setShowNewClient(false)}
          onCreated={(client) => {
            setShowNewClient(false);
            setNotice(`Cliente "${client.name}" guardado.`);
          }}
        />
      )}
    </section>
  );

  function renderOrders() {
    return (
      <>
        {notice && <p className="message message-ok">{notice}</p>}
        {error && <p className="message message-error">{error}</p>}
        {loading && <p className="message">Cargando pedidos…</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="message">
            {status === "pendiente" ? "No hay pedidos pendientes. Cuando un vendedor mande uno, aparece acá." : "Todavía no hay boletas."}
          </p>
        )}

        {orders.length > 0 && <p className="hint">Dejá apretado un pedido para ver las opciones (eliminar, abrir…).</p>}

        <ul className="card-list">
          {orders.map((order) => (
            <li key={order.id} className="order-item">
              <OrderCard order={order} onOpen={() => setSelected(order)} onLongPress={() => setOptionsFor(order)} />
              {order.status === "pendiente" && (
                <div className="order-item-actions">
                  <button type="button" className="button button-secondary" onClick={() => setEditing(order)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => askDelete(order)}
                    disabled={deletingId !== null}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  }
}
