// Mismas formas que devuelve el backend (modules/distribuidora/distribuidora.types.ts).
export type Client = {
  id: number;
  name: string;
  rut: string | null;
  address: string | null;
  phone: string | null;
};

export type Product = {
  id: number;
  name: string;
  price: number;
};

export type OrderItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type OrderStatus = "pendiente" | "facturado";

export type Order = {
  id: number;
  clientId: number | null;
  clientName: string;
  clientRut: string | null;
  clientAddress: string | null;
  items: OrderItem[];
  total: number;
  note: string | null;
  status: OrderStatus;
  invoiceNumber: number | null;
  invoicedAt: string | null;
  createdAt: string;
};
