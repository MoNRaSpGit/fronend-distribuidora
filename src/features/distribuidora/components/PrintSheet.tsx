import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Order } from "../distribuidora.types";
import { Boleta } from "./Boleta";

// Una hoja de impresion: dos boletas que entran en media hoja cada una
// (arriba y abajo), o una sola que necesita la hoja entera.
type Page = { kind: "halves"; orders: Order[] } | { kind: "full"; order: Order };

interface Props {
  orders: Order[];
  // Se llama cuando el cuadro de impresion se cierra (imprimio o cancelo).
  onDone: () => void;
}

// Arma las hojas respetando el orden: las boletas que entran en media
// hoja se van emparejando de a dos; la que no entra sale sola en una
// hoja entera.
function buildPages(orders: Order[], fitsInHalf: boolean[]): Page[] {
  const pages: Page[] = [];
  let open: { kind: "halves"; orders: Order[] } | null = null;

  orders.forEach((order, index) => {
    if (!fitsInHalf[index]) {
      pages.push({ kind: "full", order });
      return;
    }
    if (open && open.orders.length < 2) {
      open.orders.push(order);
      open = null;
      return;
    }
    open = { kind: "halves", orders: [order] };
    pages.push(open);
  });

  return pages;
}

// Impresion de boletas en A4 PARADA, de a dos por hoja (09/10/2026,
// pedido explicito: el cliente quiere ahorrar papel). Cada boleta ocupa
// media hoja -- sigue siendo horizontal, una arriba y otra abajo, con una
// linea punteada al medio para cortar. Si un pedido no entra en media
// hoja, sale solo en una hoja entera.
//
// Como funciona: primero se dibujan las boletas fuera de la pantalla, al
// mismo ancho que van a tener en el papel, y se mide el alto de cada una
// contra el alto de media hoja. Con eso se arman las hojas y recien ahi
// se abre el cuadro de impresion. Todo esto vive fuera de la app (portal
// a <body>): en pantalla no se ve y al imprimir es lo unico que sale.
export function PrintSheet({ orders, onDone }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Page[] | null>(null);

  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;
    const limit = container.querySelector<HTMLElement>(".print-half-ruler")?.offsetHeight ?? 0;
    const boletas = Array.from(container.querySelectorAll<HTMLElement>(".print-measure-item"));
    setPages(
      buildPages(
        orders,
        boletas.map((element) => element.offsetHeight <= limit)
      )
    );
  }, [orders]);

  useEffect(() => {
    if (!pages) return;

    const handleAfterPrint = () => onDone();
    window.addEventListener("afterprint", handleAfterPrint);
    // Un instante para que el navegador termine de dibujar las hojas.
    const timeoutId = window.setTimeout(() => window.print(), 80);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [pages, onDone]);

  return createPortal(
    <>
      {!pages && (
        <div ref={measureRef} className="print-measure" aria-hidden="true">
          <div className="print-half-ruler" />
          {orders.map((order) => (
            <div key={order.id} className="print-measure-item">
              <Boleta order={order} />
            </div>
          ))}
        </div>
      )}

      {pages && (
        <div className="print-sheet">
          {pages.map((page, index) =>
            page.kind === "full" ? (
              <div key={index} className="print-page print-page-full">
                <Boleta order={page.order} />
              </div>
            ) : (
              <div key={index} className="print-page">
                {page.orders.map((order) => (
                  <div key={order.id} className="print-half">
                    <Boleta order={order} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </>,
    document.body
  );
}
