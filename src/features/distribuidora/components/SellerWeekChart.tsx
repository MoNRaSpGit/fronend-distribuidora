import { formatMoney } from "../distribuidora.shared";

// Grafica de Ventas del admin (02/11/2026, rehecha 04/11/2026 -- pedido
// explicito: "no me gusto mucho de barras... quiero algo similar a la
// grafica de Valeria, pero con dos trazos, uno azul y uno rojo"). Mismo
// estilo de linea suave + puntos que WeekChart.tsx (Valeria/vendedor),
// una curva por vendedor en vez de barras agrupadas. Matias es azul,
// Valeria roja; un tercer vendedor que se agregue algun dia toma el
// siguiente color de la paleta.
export type SellerTotal = { name: string; color: string; total: number };
export type SellerWeekBucket = { key: string; label: string; isToday: boolean; bySeller: SellerTotal[] };

const ANCHO = 640;
const ALTO = 220;
const PADDING_X = 24;
const PADDING_SUPERIOR = 40;
const PADDING_INFERIOR = 34;

function armarPathSuave(puntos: Array<{ x: number; y: number }>): string {
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;

  let path = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const actual = puntos[i];
    const siguiente = puntos[i + 1];
    const mitadX = (actual.x + siguiente.x) / 2;
    path += ` C ${mitadX} ${actual.y}, ${mitadX} ${siguiente.y}, ${siguiente.x} ${siguiente.y}`;
  }
  return path;
}

type Props = {
  buckets: SellerWeekBucket[];
  sellers: Array<{ name: string; color: string }>;
};

export function SellerWeekChart({ buckets, sellers }: Props) {
  const anchoUtil = ANCHO - PADDING_X * 2;
  const altoUtil = ALTO - PADDING_SUPERIOR - PADDING_INFERIOR;

  const maximo = Math.max(...buckets.flatMap((bucket) => bucket.bySeller.map((seller) => seller.total)), 1);

  const lineasGrilla = [0, 0.25, 0.5, 0.75, 1];

  const xDelDia = (dayIndex: number) =>
    buckets.length === 1 ? PADDING_X + anchoUtil / 2 : PADDING_X + (dayIndex / (buckets.length - 1)) * anchoUtil;

  const seriesPorVendedor = sellers.map((seller) => {
    const puntos = buckets.map((bucket, dayIndex) => {
      const total = bucket.bySeller.find((s) => s.name === seller.name)?.total ?? 0;
      return {
        x: xDelDia(dayIndex),
        y: PADDING_SUPERIOR + altoUtil - (total / maximo) * altoUtil,
        total,
        key: bucket.key,
        label: bucket.label
      };
    });
    return { seller, puntos };
  });

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

        {seriesPorVendedor.map(({ seller, puntos }) => (
          <path key={seller.name} d={armarPathSuave(puntos)} fill="none" stroke={seller.color} strokeWidth="2.5" strokeLinecap="round" />
        ))}

        {seriesPorVendedor.map(({ seller, puntos }) =>
          puntos.map((p) => (
            <circle key={`${seller.name}-${p.key}`} cx={p.x} cy={p.y} r={p.total > 0 ? 4.5 : 3.5} fill="#fff" stroke={seller.color} strokeWidth="2.5">
              <title>
                {p.label} · {seller.name}: {formatMoney(p.total)}
              </title>
            </circle>
          ))
        )}

        {buckets.map((bucket, dayIndex) => (
          <text
            key={bucket.key}
            x={xDelDia(dayIndex)}
            y={ALTO - 10}
            textAnchor="middle"
            className={`week-chart-etiqueta${bucket.isToday ? " is-today" : ""}`}
          >
            {bucket.isToday ? "Hoy" : bucket.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
