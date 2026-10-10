import { useCallback, useEffect, useState } from "react";
import { Boleta } from "./components/Boleta";
import { ConfirmModal } from "./components/ConfirmModal";
import { NuevoClienteModal } from "./components/NuevoClienteModal";
import { OrderCard } from "./components/OrderCard";
import { PedidoEditor } from "./components/PedidoEditor";
import { PrintSheet } from "./components/PrintSheet";
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
  // Modo "Imprimir varias" de Facturados: boletas tildadas para imprimir
  // de a dos por hoja.
  const [selecting, setSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  // Boletas mandadas a imprimir (mientras esta abierto el cuadro de impresion).
  const [printJob, setPrintJob] = useState<Order[] | null>(null);
  // Cambia en cada impresion: obliga a armar las hojas de cero aunque la
  // anterior no haya avisado que termino (algunos celulares no avisan).
  const [printRun, setPrintRun] = useState(0);
  const handlePrintDone = useCallback(() => setPrintJob(null), []);

  function startPrint(toPrint: Order[]) {
    setPrintRun((run) => run + 1);
    setPrintJob(toPrint);
  }

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

  function stopSelecting() {
    setSelecting(false);
    setCheckedIds([]);
  }

  function toggleChecked(orderId: number) {
    setCheckedIds((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));
  }

  // Se imprimen en orden de numero de boleta, sin importar el orden en
  // que se tildaron.
  function printChecked() {
    const toPrint = orders
      .filter((order) => checkedIds.includes(order.id))
      .sort((a, b) => (a.invoiceNumber ?? 0) - (b.invoiceNumber ?? 0));
    if (toPrint.length > 0) startPrint(toPrint);
  }

  function changeStatus(nextStatus: OrderStatus) {
    setShowProducts(false);
    setNotice("");
    stopSelecting();
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
            <button type="button" className="button button-primary" onClick={() => startPrint([selected])}>
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
        {printJob && <PrintSheet key={printRun} orders={printJob} onDone={handlePrintDone} />}
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
          <button
            type="button"
            className={showProducts ? "is-active" : ""}
            onClick={() => {
              stopSelecting();
              setShowProducts(true);
            }}
          >
            Productos
          </button>
        </div>
        {!showProducts && (
          <div className="toolbar-actions">
            {status === "facturado" && orders.length > 0 && !selecting && (
              <button type="button" className="button button-secondary" onClick={() => setSelecting(true)}>
                Imprimir varias
              </button>
            )}
            <button type="button" className="button button-secondary" onClick={() => setShowNewClient(true)}>
              + Cliente
            </button>
          </div>
        )}
      </div>

      {showProducts ? <ProductosPanel /> : renderOrders()}

      {renderOptionsModal()}
      {renderDeleteModal()}
      {printJob && <PrintSheet key={printRun} orders={printJob} onDone={handlePrintDone} />}

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

        {orders.length > 0 && !selecting && <p className="hint">Dejá apretado un pedido para ver las opciones (eliminar, abrir…).</p>}
        {selecting && (
          <p className="hint">Tocá las boletas que querés imprimir. Salen de a dos por hoja, una arriba y otra abajo.</p>
        )}

        <ul className="card-list">
          {orders.map((order) => (
            <li key={order.id} className="order-item">
              <OrderCard
                order={order}
                onOpen={() => setSelected(order)}
                onLongPress={() => setOptionsFor(order)}
                selecting={selecting}
                checked={checkedIds.includes(order.id)}
                onToggle={() => toggleChecked(order.id)}
              />
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

        {selecting && (
          <div className="bottom-bar">
            <div>
              <span className="card-detail">
                {checkedIds.length === 0
                  ? "Ninguna tildada"
                  : `${checkedIds.length} boleta(s) · ${Math.ceil(checkedIds.length / 2)} hoja(s) o más`}
              </span>
              <button type="button" className="link-button" onClick={() => setCheckedIds(orders.map((order) => order.id))}>
                Tildar todas
              </button>
            </div>
            <div className="toolbar-actions">
              <button type="button" className="button button-secondary" onClick={stopSelecting}>
                Cancelar
              </button>
              <button type="button" className="button button-primary" onClick={printChecked} disabled={checkedIds.length === 0}>
                Imprimir
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
}
