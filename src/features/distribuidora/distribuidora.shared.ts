import { useEffect, useState } from "react";

// Datos de la distribuidora que salen en el encabezado de la boleta
// (09/10/2026, pasados por el cliente). La boleta es de USO INTERNO: no
// es un comprobante fiscal, por eso no lleva RUT. La direccion queda
// vacia "por ahora" (pedido explicito) -- al completarla aparece sola.
// El logo es el del cliente (public/logo-cliente.jpg, recortado del
// original que paso, LogoClienteMA.jpg). El camioncito (logo.svg) queda
// solo como icono de la PWA y del navegador.
export const EMPRESA_LOGO_URL = `${import.meta.env.BASE_URL}logo-cliente.jpg`;

export const EMPRESA = {
  name: "M. A. Distribuciones",
  legend: "Uso interno",
  address: "",
  phone: "096 481 826"
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
    minute: "2-digit",
    // Hora en 24 hs ("15:06", no "03:06 p. m.") -- pedido explicito.
    hourCycle: "h23"
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
