// Mismas formas que devuelve el backend (modules/distribuidora/distribuidora.types.ts).
export type Client = {
  id: number;
  code: string | null;
  name: string;
  contactName: string | null;
  rut: string | null;
  address: string | null;
  phone: string | null;
};

export type Product = {
  id: number;
  code: string | null;
  name: string;
  category: string | null;
  price: number;
  active: boolean;
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
  // Quien tomo el pedido (02/11/2026): "Matías" o "Valentina".
  soldBy: string | null;
  status: OrderStatus;
  invoiceNumber: number | null;
  invoicedAt: string | null;
  createdAt: string;
};

export type Role = "admin" | "vendedor";

export type CurrentUser = {
  id: number;
  username: string;
  fullName: string | null;
  role: Role;
};

// Para la pestaña Comisión del admin (02/11/2026).
export type DistribuidoraUserSummary = {
  id: number;
  username: string;
  fullName: string | null;
  role: Role;
  commissionPercent: number;
};
