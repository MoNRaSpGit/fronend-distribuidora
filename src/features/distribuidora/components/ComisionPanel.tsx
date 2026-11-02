import { useEffect, useMemo, useState } from "react";
import { fetchUsers, updateCommission } from "../distribuidora.client";
import { errorMessage, formatDateTime, formatMoney } from "../distribuidora.shared";
import type { DistribuidoraUserSummary, Order } from "../distribuidora.types";

interface Props {
  allOrders: Order[];
  loading: boolean;
  error: string;
}

// Mascara dd/mm/aa, mismo criterio que el input de Historial.
function formatDateDraft(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 6);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  return digits;
}

function digitsToDate(digits: string): Date | null {
  if (digits.length !== 6) return null;
  const day = Number(digits.slice(0, 2));
  const month = Math.min(Math.max(Number(digits.slice(2, 4)), 1), 12);
  const year = 2000 + Number(digits.slice(4, 6));
  const daysInMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth);
  return new Date(year, month - 1, clampedDay);
}

function dateToDigits(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Pestaña Comisión del admin (02/11/2026, pedido explicito): cuanto
// vendio cada vendedor en un periodo y cuanto se le paga, segun un
// porcentaje que el admin puede regular por persona.
export function ComisionPanel({ allOrders, loading, error }: Props) {
  const [users, setUsers] = useState<DistribuidoraUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [desdeDigits, setDesdeDigits] = useState(dateToDigits(startOfMonth()));
  const [hastaDigits, setHastaDigits] = useState(dateToDigits(new Date()));
  const [percentDrafts, setPercentDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<Record<number, string>>({});
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((result) => {
        if (cancelled) return;
        setUsers(result);
        setUsersError("");
      })
      .catch((err) => {
        if (!cancelled) setUsersError(errorMessage(err, "No se pudieron cargar los usuarios."));
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const desde = digitsToDate(desdeDigits);
  const hasta = digitsToDate(hastaDigits);

  const vendedores = useMemo(() => users.filter((user) => user.role === "vendedor"), [users]);

  const porVendedor = useMemo(() => {
    if (!desde || !hasta) return [];
    const desdeStart = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
    const hastaEnd = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23, 59, 59, 999).getTime();
    return vendedores.map((vendedor) => {
      const name = vendedor.fullName ?? vendedor.username;
      const orders = allOrders
        .filter((order) => order.soldBy === name)
        .filter((order) => {
          const createdAt = new Date(order.createdAt).getTime();
          return createdAt >= desdeStart && createdAt <= hastaEnd;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const commission = Math.round(total * (vendedor.commissionPercent / 100) * 100) / 100;
      return { vendedor, orders, total, commission };
    });
  }, [vendedores, allOrders, desde, hasta]);

  function percentValue(user: DistribuidoraUserSummary) {
    return percentDrafts[user.id] ?? String(user.commissionPercent);
  }

  async function handleSavePercent(user: DistribuidoraUserSummary) {
    const raw = percentValue(user).replace(",", ".");
    const percent = Number(raw);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setSaveError((current) => ({ ...current, [user.id]: "Tiene que ser un número entre 0 y 100." }));
      return;
    }
    setSavingId(user.id);
    setSaveError((current) => ({ ...current, [user.id]: "" }));
    try {
      await updateCommission(user.id, percent);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setSaveError((current) => ({ ...current, [user.id]: errorMessage(err, "No se pudo guardar.") }));
    } finally {
      setSavingId(null);
    }
  }

  const rangeInvalid = desdeDigits.length === 6 && hastaDigits.length === 6 && desde && hasta && desde.getTime() > hasta.getTime();

  return (
    <>
      <div className="comision-range">
        <label className="field">
          <span>Desde</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aa"
            value={formatDateDraft(desdeDigits)}
            onChange={(event) => setDesdeDigits(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aa"
            value={formatDateDraft(hastaDigits)}
            onChange={(event) => setHastaDigits(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </label>
      </div>

      {rangeInvalid && <p className="message message-error">"Desde" no puede ser después de "Hasta".</p>}
      {error && <p className="message message-error">{error}</p>}
      {usersError && <p className="message message-error">{usersError}</p>}
      {(loading || usersLoading) && <p className="message">Cargando…</p>}

      {!loading && !usersLoading && !error && !usersError && vendedores.length === 0 && (
        <p className="message">Todavía no hay vendedores (solo admin).</p>
      )}

      {!loading && !usersLoading && !rangeInvalid && !error && !usersError && (
        <ul className="card-list">
          {porVendedor.map(({ vendedor, orders, total, commission }) => (
            <li key={vendedor.id} className="card comision-card">
              <div className="comision-card-header">
                <strong>{vendedor.fullName ?? vendedor.username}</strong>
                <span className="card-detail">
                  {orders.length} pedido(s) · Vendió {formatMoney(total)}
                </span>
              </div>

              <div className="comision-percent-row">
                <label className="field comision-percent-field">
                  <span>Porcentaje</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={percentValue(vendedor)}
                    onChange={(event) =>
                      setPercentDrafts((current) => ({ ...current, [vendedor.id]: event.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleSavePercent(vendedor)}
                  disabled={savingId === vendedor.id}
                >
                  {savingId === vendedor.id ? "Guardando…" : "Guardar %"}
                </button>
              </div>
              {saveError[vendedor.id] && <p className="message message-error">{saveError[vendedor.id]}</p>}

              <p className="comision-pay">
                Se le paga: <strong>{formatMoney(commission)}</strong>
              </p>

              {orders.length > 0 && (
                <details className="comision-details">
                  <summary>Ver pedidos</summary>
                  <ul className="card-list">
                    {orders.map((order) => (
                      <li key={order.id} className="card-detail comision-order-row">
                        {formatDateTime(order.createdAt)} · {order.clientName} · {formatMoney(order.total)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
