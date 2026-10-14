import { formatMoney } from "../distribuidora.shared";

// Mismo estilo que el grafico mensual de frontend-joker (linea suave +
// area + puntos), adaptado a 7 dias en vez de meses (14/10/2026, pedido
// explicito: "quiero esa igual, de puntos que se ve un subi baja").
// La altura de la linea representa la CANTIDAD de pedidos (un solo eje);
// el total en pesos de ese dia va como texto debajo del numero, en cada
// punto -- no es un segundo eje, es una etiqueta.
export type WeekChartBucket = {
  key: string;
  label: string;
  count: number;
  total: number;
  isToday: boolean;
};

const ANCHO = 640;
const ALTO = 220;
const PADDING_X = 24;
const PADDING_SUPERIOR = 46;
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

type WeekChartProps = {
  buckets: WeekChartBucket[];
};

export function WeekChart({ buckets }: WeekChartProps) {
  const maximo = Math.max(...buckets.map((b) => b.count), 1);
  const anchoUtil = ANCHO - PADDING_X * 2;
  const altoUtil = ALTO - PADDING_SUPERIOR - PADDING_INFERIOR;

  const puntos = buckets.map((bucket, i) => {
    const x = buckets.length === 1 ? PADDING_X + anchoUtil / 2 : PADDING_X + (i / (buckets.length - 1)) * anchoUtil;
    const y = PADDING_SUPERIOR + altoUtil - (bucket.count / maximo) * altoUtil;
    return { x, y, ...bucket };
  });

  const pathLinea = armarPathSuave(puntos);
  const pathArea = `${pathLinea} L ${puntos[puntos.length - 1].x} ${PADDING_SUPERIOR + altoUtil} L ${puntos[0].x} ${PADDING_SUPERIOR + altoUtil} Z`;

  const lineasGrilla = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="week-chart-card">
      <h3 className="week-chart-title">Pedidos de esta semana</h3>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="week-chart-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Cantidad de pedidos por dia, esta semana"
      >
        <defs>
          <linearGradient id="week-chart-relleno" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </linearGradient>
        </defs>

        {lineasGrilla.map((fraccion) => {
          const y = PADDING_SUPERIOR + altoUtil * fraccion;
          return <line key={fraccion} x1={PADDING_X} y1={y} x2={ANCHO - PADDING_X} y2={y} className="week-chart-grilla" />;
        })}

        <path d={pathArea} fill="url(#week-chart-relleno)" stroke="none" />
        <path d={pathLinea} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />

        {puntos.map((p) => (
          <g key={p.key}>
            {p.count > 0 ? (
              <>
                <text x={p.x} y={p.y - 22} textAnchor="middle" className="week-chart-valor">
                  {p.count} pedido{p.count === 1 ? "" : "s"}
                </text>
                <text x={p.x} y={p.y - 10} textAnchor="middle" className="week-chart-valor-plata">
                  {formatMoney(p.total)}
                </text>
              </>
            ) : null}
            <circle cx={p.x} cy={p.y} r={p.isToday ? 5 : 4} fill="#fff" stroke="#15803d" strokeWidth="2.5" />
            <title>
              {p.label}: {p.count} pedido(s) · {formatMoney(p.total)}
            </title>
            <text x={p.x} y={ALTO - 10} textAnchor="middle" className={`week-chart-etiqueta${p.isToday ? " is-today" : ""}`}>
              {p.isToday ? "Hoy" : p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
