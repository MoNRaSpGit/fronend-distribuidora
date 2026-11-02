import { API_BASE_URL } from "../../shared/config/api";
import { getToken } from "./distribuidora.session";
import type { Client, CurrentUser, Order, OrderStatus, Product } from "./distribuidora.types";

// Sesion vencida o invalida -- la app vuelve a la pantalla de login.
export class DistribuidoraUnauthorizedError extends Error {}

// Id de este dispositivo para la auditoria interna del backend (quien
// vendio ya lo sabe el login; esto es ADEMAS, para saber desde que
// celular/PC): se genera solo la primera vez y queda guardado en el navegador.
// Viaja UNICAMENTE en las operaciones que modifican algo -- mandarlo
// tambien en las busquedas obligaria al navegador a hacer una consulta
// previa (preflight) por cada letra que se tipea.
const DEVICE_KEY = "distribuidora-device-id";

function resolveDeviceId() {
  const fresh = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  try {
    let deviceId = window.localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = fresh();
      window.localStorage.setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // Navegacion privada / storage bloqueado: sirve igual, pero cambia en cada carga.
    return fresh();
  }
}

const DEVICE_ID = resolveDeviceId();

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function writeHeaders(json = true): Record<string, string> {
  const base = json ? { "Content-Type": "application/json", "X-Device-Id": DEVICE_ID } : { "X-Device-Id": DEVICE_ID };
  return { ...base, ...authHeader() };
}

function buildUrl(path: string) {
  return `${API_BASE_URL}/api/v1/distribuidora${path}`;
}

async function request<T>(path: string, errorMessage: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch {
    // Sin señal en la calle es el caso esperable, no una rareza.
    throw new Error("Sin conexión. Revisá la señal y probá de nuevo.");
  }
  if (response.status === 401) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    // La app escucha este evento (DistribuidoraApp) para volver sola al
    // login sin tener que pasar un "onUnauthorized" por cada pantalla.
    window.dispatchEvent(new CustomEvent("distribuidora:unauthorized"));
    throw new DistribuidoraUnauthorizedError(body?.message || "Sesión inválida o vencida. Volvé a iniciar sesión.");
  }
  if (response.status === 409) {
    // El backend explica el motivo (ej: el pedido ya tiene boleta).
    const conflict = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(conflict?.message || errorMessage);
  }
  if (!response.ok) throw new Error(errorMessage);
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function postJson(body: unknown): RequestInit {
  return { method: "POST", headers: writeHeaders(), body: JSON.stringify(body) };
}

export function login(username: string, password: string) {
  return request<{ user: CurrentUser; token: string }>("/auth/login", "No se pudo iniciar sesión.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

export function logout() {
  return request<{ ok: boolean }>("/auth/logout", "", { method: "POST", headers: authHeader() }).catch(() => undefined);
}

export function fetchClients(search: string) {
  return request<Client[]>(`/clients?q=${encodeURIComponent(search)}`, "No se pudieron cargar los clientes.", {
    headers: authHeader()
  });
}

export function createClient(input: { name: string; rut?: string; address?: string; phone?: string }) {
  return request<Client>("/clients", "No se pudo guardar el cliente.", postJson(input));
}

export function updateClient(clientId: number, input: Partial<{ name: string; rut: string; address: string; phone: string }>) {
  return request<Client>(`/clients/${clientId}`, "No se pudo guardar el cliente.", {
    method: "PATCH",
    headers: writeHeaders(),
    body: JSON.stringify(input)
  });
}

export function fetchProducts(search: string) {
  return request<Product[]>(`/products?q=${encodeURIComponent(search)}`, "No se pudieron cargar los productos.", {
    headers: authHeader()
  });
}

// El catalogo entero para la oficina, con los dados de baja incluidos.
export function fetchCatalog(search: string) {
  return request<Product[]>(`/products?all=1&q=${encodeURIComponent(search)}`, "No se pudieron cargar los productos.", {
    headers: authHeader()
  });
}

export function createProduct(input: { name: string; price: number }) {
  return request<Product>("/products", "No se pudo guardar el producto.", postJson(input));
}

export function updateProduct(productId: number, input: Partial<{ name: string; price: number; active: boolean }>) {
  return request<Product>(`/products/${productId}`, "No se pudo guardar el producto.", {
    method: "PATCH",
    headers: writeHeaders(),
    body: JSON.stringify(input)
  });
}

// Eliminar de verdad (02/11/2026, pedido explicito), a diferencia de
// "dar de baja". Solo admin.
export function deleteProduct(productId: number) {
  return request<void>(`/products/${productId}`, "No se pudo eliminar el producto.", {
    method: "DELETE",
    headers: writeHeaders(false)
  });
}

export function fetchOrders(status: OrderStatus) {
  return request<Order[]>(`/orders?status=${status}`, "No se pudieron cargar los pedidos.", { headers: authHeader() });
}

// Todos los pedidos, pendientes y facturados, sin filtrar -- para Ventas
// e Historial (14/10/2026, pedido explicito): ahi un pedido ya cuenta como
// venta aunque la oficina todavia no le haya generado el numero de boleta.
export function fetchAllOrders() {
  return request<Order[]>(`/orders`, "No se pudieron cargar las ventas.", { headers: authHeader() });
}

export function createOrder(input: { clientId: number; items: Array<{ productId: number; quantity: number }>; note?: string }) {
  return request<Order>("/orders", "No se pudo enviar el pedido. Probá de nuevo.", postJson(input));
}

export function updateOrder(orderId: number, input: { items: Array<{ productId: number; quantity: number }>; note?: string }) {
  return request<Order>(`/orders/${orderId}`, "No se pudo guardar el pedido.", {
    method: "PATCH",
    headers: writeHeaders(),
    body: JSON.stringify(input)
  });
}

// includeInvoiced: hace falta para borrar un pedido que ya tiene boleta
// (el backend lo exige a proposito, para que no pase por accidente).
export function deleteOrder(orderId: number, includeInvoiced = false) {
  return request<void>(`/orders/${orderId}${includeInvoiced ? "?boleta=1" : ""}`, "No se pudo eliminar el pedido.", {
    method: "DELETE",
    headers: writeHeaders(false)
  });
}

export function invoiceOrder(orderId: number) {
  return request<Order>(`/orders/${orderId}/invoice`, "No se pudo generar la boleta.", {
    method: "PATCH",
    headers: writeHeaders(false)
  });
}
