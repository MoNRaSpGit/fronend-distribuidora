import { EMPRESA, formatDateTime, formatInvoiceNumber, formatMoney } from "../distribuidora.shared";
import type { Order } from "../distribuidora.types";

interface Props {
  order: Order;
}

// La hoja de la boleta: es lo unico que sale al imprimir (ver @media
// print en global.css). Mientras el pedido no este facturado se muestra
// igual, pero titulada como pedido y sin numero de boleta.
export function Boleta({ order }: Props) {
  const facturado = order.status === "facturado" && order.invoiceNumber !== null;

  return (
    <article className="boleta">
      <header className="boleta-header">
        <div className="boleta-empresa">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <div>
            <strong>{EMPRESA.name}</strong>
            <span>{EMPRESA.legend}</span>
            {EMPRESA.address && <span>{EMPRESA.address}</span>}
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
        {/* Uso interno: el RUT del cliente solo sale si lo tiene cargado. */}
        {order.clientRut && (
          <div>
            <span className="boleta-label">RUT</span>
            <span>{order.clientRut}</span>
          </div>
        )}
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
        {/* Sin desglose de IVA (09/10/2026, pedido explicito: "el precio es
            el que esta en el producto nomas, si dice 100 es 100"). */}
        <dl className="boleta-totales">
          <div className="boleta-total">
            <dt>TOTAL</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}
