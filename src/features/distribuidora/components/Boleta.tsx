import { EMPRESA, IVA_RATE, formatDateTime, formatInvoiceNumber, formatMoney } from "../distribuidora.shared";
import type { Order } from "../distribuidora.types";

interface Props {
  order: Order;
}

// La hoja de la boleta: es lo unico que sale al imprimir (ver @media
// print en global.css). Mientras el pedido no este facturado se muestra
// igual, pero titulada como pedido y sin numero de boleta.
export function Boleta({ order }: Props) {
  const facturado = order.status === "facturado" && order.invoiceNumber !== null;
  // Precios con IVA incluido: el total se desglosa hacia atras.
  const subtotalSinIva = Math.round((order.total / (1 + IVA_RATE)) * 100) / 100;
  const iva = Math.round((order.total - subtotalSinIva) * 100) / 100;

  return (
    <article className="boleta">
      <header className="boleta-header">
        <div className="boleta-empresa">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <div>
            <strong>{EMPRESA.name}</strong>
            <span>RUT {EMPRESA.rut}</span>
            <span>{EMPRESA.address}</span>
            <span>Tel. {EMPRESA.phone}</span>
          </div>
        </div>
        <div className="boleta-numero">
          <strong>{facturado ? "BOLETA" : "PEDIDO"}</strong>
          <span>{facturado ? formatInvoiceNumber(order.invoiceNumber!) : `N.º ${order.id} · sin facturar`}</span>
          <span>{formatDateTime(facturado && order.invoicedAt ? order.invoicedAt : order.createdAt)}</span>
        </div>
      </header>

      <section className="boleta-cliente">
        <div>
          <span className="boleta-label">Cliente</span>
          <strong>{order.clientName}</strong>
        </div>
        <div>
          <span className="boleta-label">RUT</span>
          <span>{order.clientRut || "Consumidor final"}</span>
        </div>
        <div>
          <span className="boleta-label">Dirección</span>
          <span>{order.clientAddress || "—"}</span>
        </div>
      </section>

      <table className="boleta-tabla">
        <thead>
          <tr>
            <th className="num">Cant.</th>
            <th>Descripción</th>
            <th className="num">P. unit.</th>
            <th className="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td className="num">{item.quantity}</td>
              <td>{item.name}</td>
              <td className="num">{formatMoney(item.price)}</td>
              <td className="num">{formatMoney(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="boleta-pie">
        {order.note && (
          <p className="boleta-nota">
            <span className="boleta-label">Nota</span> {order.note}
          </p>
        )}
        <dl className="boleta-totales">
          <div>
            <dt>Subtotal (sin IVA)</dt>
            <dd>{formatMoney(subtotalSinIva)}</dd>
          </div>
          <div>
            <dt>IVA {Math.round(IVA_RATE * 100)}%</dt>
            <dd>{formatMoney(iva)}</dd>
          </div>
          <div className="boleta-total">
            <dt>TOTAL</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}
