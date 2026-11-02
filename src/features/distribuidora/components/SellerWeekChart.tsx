import { formatMoney } from "../distribuidora.shared";

// Grafica de Ventas del admin (02/11/2026, pedido explicito): "el lunes
// Matías vendió 5000 y Valentina vendió 3000" -- una barra por vendedor
// y por dia, cada uno con su color (Matías azul, Valentina roja; un
// tercer vendedor que se agregue algun dia toma el siguiente color de
// la paleta).
export type SellerTotal = { name: string; color: string; total: number };
export type SellerWeekBucket = { key: string; label: string; isToday: boolean; bySeller: SellerTotal[] };

const ANCHO = 640;
const ALTO = 220;
const PADDING_X = 24;
const PADDING_SUPERIOR = 40;
const PADDING_INFERIOR = 34;

type Props = {
  buckets: SellerWeekBucket[];
  sellers: Array<{ name: string; color: string }>;
};

export function SellerWeekChart({ buckets, sellers }: Props) {
  const anchoUtil = ANCHO - PADDING_X * 2;
  const altoUtil = ALTO - PADDING_SUPERIOR - PADDING_INFERIOR;
  const anchoDia = anchoUtil / buckets.length;

  const maximo = Math.max(...buckets.flatMap((bucket) => bucket.bySeller.map((seller) => seller.total)), 1);

  const anchoBarra = Math.min(22, (anchoDia - 10) / Math.max(sellers.length, 1));
  const anchoGrupo = anchoBarra * sellers.length;

  const lineasGrilla = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="week-chart-card">
      <h3 className="week-chart-title">Ventas de esta semana</h3>

      <div className="seller-chart-legend">
        {sellers.map((seller) => (
          <span key={seller.name} className="seller-chart-legend-item">
            <span className="seller-chart-legend-dot" style={{ background: seller.color }} />
            {seller.name}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="week-chart-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Ventas por vendedor, por dia, esta semana"
      >
        {lineasGrilla.map((fraccion) => {
          const y = PADDING_SUPERIOR + altoUtil * fraccion;
          return <line key={fraccion} x1={PADDING_X} y1={y} x2={ANCHO - PADDING_X} y2={y} className="week-chart-grilla" />;
        })}

        {buckets.map((bucket, dayIndex) => {
          const centroDia = PADDING_X + anchoDia * dayIndex + anchoDia / 2;
          const inicioGrupo = centroDia - anchoGrupo / 2;

          return (
            <g key={bucket.key}>
              {sellers.map((seller, sellerIndex) => {
                const total = bucket.bySeller.find((s) => s.name === seller.name)?.total ?? 0;
                const alturaBarra = (total / maximo) * altoUtil;
                const x = inicioGrupo + sellerIndex * anchoBarra;
                const y = PADDING_SUPERIOR + altoUtil - alturaBarra;
                return (
                  <g key={seller.name}>
                    {total > 0 && (
                      <rect x={x} y={y} width={anchoBarra - 3} height={alturaBarra} fill={seller.color} rx="2">
                        <title>
                          {bucket.label} · {seller.name}: {formatMoney(total)}
                        </title>
                      </rect>
                    )}
                  </g>
                );
              })}
              <text
                x={centroDia}
                y={ALTO - 10}
                textAnchor="middle"
                className={`week-chart-etiqueta${bucket.isToday ? " is-today" : ""}`}
              >
                {bucket.isToday ? "Hoy" : bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
