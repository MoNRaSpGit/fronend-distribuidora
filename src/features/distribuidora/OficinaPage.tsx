import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boleta } from "./components/Boleta";
import { ConfirmModal } from "./components/ConfirmModal";
import { NuevoClienteModal } from "./components/NuevoClienteModal";
import { OrderCard } from "./components/OrderCard";
import { PedidoEditor } from "./components/PedidoEditor";
import { PrintSheet } from "./components/PrintSheet";
import { ProductosPanel } from "./components/ProductosPanel";
import { deleteOrder, fetchAllOrders, fetchOrders, invoiceOrder } from "./distribuidora.client";
import { errorMessage, formatInvoiceNumber, formatMoney } from "./distribuidora.shared";
import type { Order, OrderStatus } from "./distribuidora.types";

const REFRESH_MS = 20000;

// Pestañas nuevas (14/10/2026, pedido explicito): "Ventas" (las de hoy, con
// el total) e "Historial" (eligiendo una fecha). Cuentan TODOS los pedidos,
// pendientes y facturados -- un pedido ya es una venta aunque la oficina
// todavia no le haya generado boleta.
type Section = OrderStatus | "productos" | "ventas" | "historial";

// Clave de fecha en el dia local del dispositivo (Montevideo en la
// practica), para agrupar pedidos por dia sin importar la hora exacta.
function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(iso: string) {
  return dateKey(new Date(iso));
}

// Mascara del input de Historial: el cliente pidio el formato "04/06/27"
// (dia/mes/año de 2 digitos), tipeado a mano -- mismo patron que el input
// de fecha de Juez, separando el texto que se ve (siempre arrancando
// vacio) del valor aplicado.
function formatHistorialDraft(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 6);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  return digits;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type DayBucket = { key: string; label: string; count: number; total: number; isToday: boolean };

// Grafica semanal de Ventas (14/10/2026, pedido explicito): de lunes a
// hoy, cuantos pedidos entraron cada dia. No proyecta los dias que
// todavia no llegaron (si hoy es miercoles, solo muestra lun/mar/mie).
function buildWeekBuckets(allOrders: Order[]): DayBucket[] {
  const today = new Date();
  const isoWeekday = (today.getDay() + 6) % 7; // lunes=0 ... domingo=6
  const monday = new Date(today);
  monday.setDate(today.getDate() - isoWeekday);
  const todayKey = dateKey(today);

  const buckets: DayBucket[] = [];
  for (let i = 0; i <= isoWeekday; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = dateKey(date);
    const dayOrders = allOrders.filter((order) => toLocalDateKey(order.createdAt) === key);
    buckets.push({
      key,
      label: WEEKDAY_LABELS[i],
      count: dayOrders.length,
      total: dayOrders.reduce((sum, order) => sum + Number(order.total), 0),
      isToday: key === todayKey
    });
  }
  return buckets;
}

function historialDigitsToDateKey(digits: string): string | null {
  if (digits.length !== 6) return null;
  const day = Number(digits.slice(0, 2));
  const month = Math.min(Math.max(Number(digits.slice(2, 4)), 1), 12);
  const year = 2000 + Number(digits.slice(4, 6));
  const daysInMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth);
  return `${year}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

// La pantalla de la oficina: ve los pedidos que van mandando desde la
// calle, abre uno y lo pasa a boleta (queda numerada y lista para
// imprimir). Tambien da de alta clientes y, en la pestaña Productos,
// agrega y edita el catalogo.
export function OficinaPage() {
  const [section, setSection] = useState<Section>("pendiente");
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
  const [showNewClient, setShowNewClient] = useState(false);
  const [notice, setNotice] = useState("");

  // Ventas / Historial (14/10/2026): todos los pedidos, sin filtrar por
  // estado, para calcular el total del dia o de la fecha elegida.
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);
  const [allOrdersError, setAllOrdersError] = useState("");
  // Fecha de Historial: arranca vacia a proposito (pedido explicito: "al
  // principio sale en blanco, el tiene que poner la fecha").
  const [historialDigits, setHistorialDigits] = useState("");

  const todayOrders = useMemo(() => {
    const todayKey = toLocalDateKey(new Date().toISOString());
    return allOrders.filter((order) => toLocalDateKey(order.createdAt) === todayKey);
  }, [allOrders]);
  const todayTotal = useMemo(() => todayOrders.reduce((sum, order) => sum + Number(order.total), 0), [todayOrders]);
  const weekBuckets = useMemo(() => buildWeekBuckets(allOrders), [allOrders]);

  const historialDateKey = historialDigitsToDateKey(historialDigits);
  const historialOrders = useMemo(
    () => (historialDateKey ? allOrders.filter((order) => toLocalDateKey(order.createdAt) === historialDateKey) : null),
    [allOrders, historialDateKey]
  );
  const historialTotal = useMemo(
    () => (historialOrders ? historialOrders.reduce((sum, order) => sum + Number(order.total), 0) : 0),
    [historialOrders]
  );

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
    if (section !== "pendiente" && section !== "facturado") return;
    let cancelled = false;
    fetchOrders(section)
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
  }, [section, refreshTick]);

  // Ventas e Historial comparten la misma lista completa de pedidos.
  // Solo se muestra "Cargando..." la primera vez: antes el refresco
  // automatico (cada REFRESH_MS) volvia a poner loading=true y la lista
  // entera desaparecia y reaparecia cada 20 segundos (pedido explicito,
  // 14/10/2026, reportado como "se refresca la pantalla cada tanto").
  const loadedAllOrdersOnceRef = useRef(false);
  useEffect(() => {
    if (section !== "ventas" && section !== "historial") return;
    let cancelled = false;
    if (!loadedAllOrdersOnceRef.current) setAllOrdersLoading(true);
    fetchAllOrders()
      .then((result) => {
        if (cancelled) return;
        setAllOrders(result);
        setAllOrdersError("");
      })
      .catch((err) => {
        if (!cancelled) setAllOrdersError(errorMessage(err, "No se pudieron cargar las ventas."));
      })
      .finally(() => {
        if (!cancelled) {
          setAllOrdersLoading(false);
          loadedAllOrdersOnceRef.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section, refreshTick]);

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

  function changeSection(nextSection: Section) {
    setNotice("");
    stopSelecting();
    if (nextSection === section) return;
    if (nextSection === "pendiente" || nextSection === "facturado") {
      setLoading(true);
      setOrders([]);
    }
    setSection(nextSection);
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
          <button type="button" className={section === "pendiente" ? "is-active" : ""} onClick={() => changeSection("pendiente")}>
            Pendientes
          </button>
          <button type="button" className={section === "facturado" ? "is-active" : ""} onClick={() => changeSection("facturado")}>
            Facturados
          </button>
          <button type="button" className={section === "ventas" ? "is-active" : ""} onClick={() => changeSection("ventas")}>
            Ventas
          </button>
          <button type="button" className={section === "historial" ? "is-active" : ""} onClick={() => changeSection("historial")}>
            Historial
          </button>
          <button type="button" className={section === "productos" ? "is-active" : ""} onClick={() => changeSection("productos")}>
            Productos
          </button>
        </div>
        {(section === "pendiente" || section === "facturado") && (
          <div className="toolbar-actions">
            {section === "facturado" && orders.length > 0 && !selecting && (
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

      {section === "productos" && <ProductosPanel />}
      {section === "ventas" && renderVentas()}
      {section === "historial" && renderHistorial()}
      {(section === "pendiente" || section === "facturado") && renderOrders()}

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
            {section === "pendiente" ? "No hay pedidos pendientes. Cuando un vendedor mande uno, aparece acá." : "Todavía no hay boletas."}
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

  function renderOrderList(list: Order[]) {
    return (
      <ul className="card-list">
        {list.map((order) => (
          <li key={order.id} className="order-item">
            <OrderCard order={order} onOpen={() => setSelected(order)} onLongPress={() => {}} />
          </li>
        ))}
      </ul>
    );
  }

  function renderWeekChart() {
    const maxCount = Math.max(1, ...weekBuckets.map((bucket) => bucket.count));
    return (
      <div className="week-chart-wrap">
        <h3 className="week-chart-title">Pedidos de esta semana</h3>
        <div className="week-chart">
          {weekBuckets.map((bucket) => (
            <div
              key={bucket.key}
              className={`week-chart-bar${bucket.isToday ? " is-today" : ""}`}
              title={`${bucket.label}: ${bucket.count} pedido(s) · ${formatMoney(bucket.total)}`}
            >
              <span className="week-chart-value">{bucket.count}</span>
              <div className="week-chart-track">
                <div className="week-chart-fill" style={{ height: `${(bucket.count / maxCount) * 100}%` }} />
              </div>
              <span className="week-chart-label">{bucket.isToday ? "Hoy" : bucket.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderVentas() {
    return (
      <>
        {allOrdersError && <p className="message message-error">{allOrdersError}</p>}
        {allOrdersLoading && <p className="message">Cargando ventas…</p>}
        {!allOrdersLoading && !allOrdersError && (
          <>
            {renderWeekChart()}
            <p className="message message-ok">
              {todayOrders.length === 0
                ? "Todavía no hay ventas hoy."
                : `${todayOrders.length} pedido(s) · Total ${formatMoney(todayTotal)}`}
            </p>
            {renderOrderList(todayOrders)}
          </>
        )}
      </>
    );
  }

  function renderHistorial() {
    return (
      <>
        <label className="field">
          <span>Fecha</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aa"
            value={formatHistorialDraft(historialDigits)}
            onChange={(event) => setHistorialDigits(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </label>

        {allOrdersError && <p className="message message-error">{allOrdersError}</p>}
        {allOrdersLoading && <p className="message">Cargando…</p>}
        {!allOrdersLoading && !allOrdersError && historialOrders !== null && (
          <>
            <p className="message message-ok">
              {historialOrders.length === 0
                ? "No hay ventas esa fecha."
                : `${historialOrders.length} pedido(s) · Total ${formatMoney(historialTotal)}`}
            </p>
            {renderOrderList(historialOrders)}
          </>
        )}
      </>
    );
  }
}
