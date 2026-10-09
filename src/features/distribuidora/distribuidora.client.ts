import { API_BASE_URL } from "../../shared/config/api";
import type { Client, Order, OrderStatus, Product } from "./distribuidora.types";

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
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function fetchClients(search: string) {
  return request<Client[]>(`/clients?q=${encodeURIComponent(search)}`, "No se pudieron cargar los clientes.");
}

export function createClient(input: { name: string; rut?: string; address?: string; phone?: string }) {
  return request<Client>("/clients", "No se pudo guardar el cliente.", postJson(input));
}

export function fetchProducts(search: string) {
  return request<Product[]>(`/products?q=${encodeURIComponent(search)}`, "No se pudieron cargar los productos.");
}

// El catalogo entero para la oficina, con los dados de baja incluidos.
export function fetchCatalog(search: string) {
  return request<Product[]>(`/products?all=1&q=${encodeURIComponent(search)}`, "No se pudieron cargar los productos.");
}

export function createProduct(input: { name: string; price: number }) {
  return request<Product>("/products", "No se pudo guardar el producto.", postJson(input));
}

export function updateProduct(productId: number, input: Partial<{ name: string; price: number; active: boolean }>) {
  return request<Product>(`/products/${productId}`, "No se pudo guardar el producto.", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function fetchOrders(status: OrderStatus) {
  return request<Order[]>(`/orders?status=${status}`, "No se pudieron cargar los pedidos.");
}

export function createOrder(input: { clientId: number; items: Array<{ productId: number; quantity: number }>; note?: string }) {
  return request<Order>("/orders", "No se pudo enviar el pedido. Probá de nuevo.", postJson(input));
}

export function updateOrder(orderId: number, input: { items: Array<{ productId: number; quantity: number }>; note?: string }) {
  return request<Order>(`/orders/${orderId}`, "No se pudo guardar el pedido.", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

// includeInvoiced: hace falta para borrar un pedido que ya tiene boleta
// (el backend lo exige a proposito, para que no pase por accidente).
export function deleteOrder(orderId: number, includeInvoiced = false) {
  return request<void>(`/orders/${orderId}${includeInvoiced ? "?boleta=1" : ""}`, "No se pudo eliminar el pedido.", {
    method: "DELETE"
  });
}

export function invoiceOrder(orderId: number) {
  return request<Order>(`/orders/${orderId}/invoice`, "No se pudo generar la boleta.", { method: "PATCH" });
}
