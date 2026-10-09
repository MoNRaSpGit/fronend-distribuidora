import { useEffect, useState } from "react";

// Datos de la distribuidora que salen en el encabezado de la boleta.
// SON DE EJEMPLO -- cambiar aca por los reales (nombre, RUT, direccion,
// telefono) y reemplazar public/logo.svg por el logo de verdad.
export const EMPRESA = {
  name: "Distribuidora",
  rut: "21 000000 0019",
  address: "Dirección de la distribuidora",
  phone: "099 000 000"
};

const moneyFormatter = new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number) {
  return `$ ${moneyFormatter.format(value)}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatInvoiceNumber(invoiceNumber: number) {
  return `A ${String(invoiceNumber).padStart(6, "0")}`;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Para buscar mientras se tipea sin pegarle al backend en cada tecla.
export function useDebounced<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}
