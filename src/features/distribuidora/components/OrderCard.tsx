import { useRef, type PointerEvent } from "react";
import { formatDateTime, formatInvoiceNumber, formatMoney } from "../distribuidora.shared";
import type { Order } from "../distribuidora.types";

const LONG_PRESS_MS = 450;
// Si el dedo se mueve mas que esto, es un scroll de la lista y no un
// "dejar apretado".
const MOVE_TOLERANCE_PX = 10;

interface Props {
  order: Order;
  onOpen: () => void;
  // Dejar apretado (o click derecho en la PC): abre las opciones.
  onLongPress: () => void;
  // Modo "Imprimir varias": un toque tilda o destilda la boleta en vez
  // de abrirla, y dejar apretado no hace nada.
  selecting?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}

// La tarjeta de un pedido en la lista de la oficina. Un toque lo abre;
// dejarlo apretado muestra las opciones (09/10/2026, pedido explicito:
// "la clasica opcion que dejas apretado y te salen opciones").
export function OrderCard({ order, onOpen, onLongPress, selecting = false, checked = false, onToggle }: Props) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  // Despues de un "apretado largo", al soltar el navegador igual dispara
  // un click: se lo ignora para no abrir el pedido atras de las opciones.
  const longPressedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (selecting) return;
    // Solo el boton principal del mouse; el derecho va por onContextMenu.
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
    if (selecting) {
      onToggle?.();
      return;
    }
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onOpen();
  }

  return (
    <button
      type="button"
      className={`card card-button order-card${selecting && checked ? " is-checked" : ""}`}
      aria-pressed={selecting ? checked : undefined}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(event) => {
        // En el celular el "apretado largo" tambien dispara este evento:
        // se frena el menu del navegador y, si las opciones todavia no se
        // abrieron por el temporizador, se abren aca (click derecho en PC).
        event.preventDefault();
        clearTimer();
        if (selecting) return;
        if (!longPressedRef.current) {
          longPressedRef.current = event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType !== "mouse";
          onLongPress();
        }
      }}
    >
      {selecting && <span className="order-check" aria-hidden="true">{checked ? "✓" : ""}</span>}
      <div className="order-card-main">
        <strong>{order.clientName}</strong>
        <span className="card-detail">
          {order.invoiceNumber !== null ? `Boleta ${formatInvoiceNumber(order.invoiceNumber)}` : `Pedido N.º ${order.id}`} ·{" "}
          {formatDateTime(order.createdAt)} · {order.items.length} producto(s)
        </span>
      </div>
      <strong>{formatMoney(order.total)}</strong>
    </button>
  );
}
