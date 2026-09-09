/**
 * Farm2Door — Server-Side Orders & Payments Store
 * Provides persistent server-side caching and fallback for orders, payments,
 * and review eligibility ensuring seamless operation across RLS boundaries.
 */

import fs from "fs";
import path from "path";

export interface StoredOrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
  farmerId?: string;
  farmName?: string;
  farmLocation?: string;
}

export interface StoredPayment {
  status: "pending" | "successful" | "failed";
  paymentReference: string;
  paystackReference?: string;
  amount: number;
  channel?: string;
  paidAt?: string;
  rawPayload?: any;
}

export interface StoredOrder {
  id: string;
  orderReference: string;
  buyerId?: string;
  buyerName: string;
  buyerEmail?: string;
  deliveryPhone: string;
  deliveryAddress: string;
  status: "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  totalAmount: number;
  transitFee: number;
  items: StoredOrderItem[];
  payment?: StoredPayment;
  createdAt: string;
  updatedAt: string;
}

// In-memory memory map backed by optional JSON persistence in .temp
const ordersMemoryStore = new Map<string, StoredOrder>();

const DATA_DIR = path.join(process.cwd(), "supabase", ".temp");
const DATA_FILE = path.join(DATA_DIR, "orders_store.json");

const INITIAL_SEED_ORDERS: StoredOrder[] = [
  {
    id: "ord-seed-1",
    orderReference: "FD-20260905-X71A9B",
    buyerName: "Mrs. Folashade Adeyeye",
    buyerEmail: "folashade@ekiti.ng",
    deliveryPhone: "08031234567",
    deliveryAddress: "Federal Housing Estate, Ado-Ekiti",
    status: "delivered",
    totalAmount: 48500,
    transitFee: 1500,
    items: [
      {
        productId: "prod-1",
        productName: "Crisp Waterleaf (Gbure)",
        unit: "bundle",
        quantity: 10,
        unitPrice: 4700,
        subtotal: 47000,
        farmerId: "f-2",
        farmName: "Agboola Organic Greenhouses",
        farmLocation: "Ado-Ekiti (Iworoko Farming Corridor)",
      },
    ],
    createdAt: "2026-09-05T14:30:00Z",
    updatedAt: "2026-09-05T18:00:00Z",
  },
  {
    id: "ord-seed-2",
    orderReference: "FD-20260906-K89C2Z",
    buyerName: "Chief Oluwole Babalola",
    buyerEmail: "oluwole.babalola@ekiti.ng",
    deliveryPhone: "08029871122",
    deliveryAddress: "GRA Extension, Ado-Ekiti",
    status: "in_transit",
    totalAmount: 92400,
    transitFee: 2400,
    items: [
      {
        productId: "prod-2",
        productName: "Ekiti New White Yam",
        unit: "tuber",
        quantity: 20,
        unitPrice: 4500,
        subtotal: 90000,
        farmerId: "f-1",
        farmName: "Babatunde Agro-Allied Enterprises",
        farmLocation: "Ikere-Ekiti South Farmlands",
      },
    ],
    createdAt: "2026-09-06T10:15:00Z",
    updatedAt: "2026-09-06T14:00:00Z",
  },
  {
    id: "ord-seed-3",
    orderReference: "FD-20260907-M34V8P",
    buyerName: "Engr. Kayode Fayemi",
    buyerEmail: "kayode@ekiticonsult.ng",
    deliveryPhone: "08055551234",
    deliveryAddress: "University Road, Oye-Ekiti",
    status: "confirmed",
    totalAmount: 76000,
    transitFee: 2000,
    items: [
      {
        productId: "prod-3",
        productName: "Stone-Free Igbemo Ofada Rice",
        unit: "50kg bag",
        quantity: 2,
        unitPrice: 37000,
        subtotal: 74000,
        farmerId: "f-3",
        farmName: "Igbemo Millers Agrarian Cluster",
        farmLocation: "Igbemo-Ekiti",
      },
    ],
    createdAt: "2026-09-07T08:00:00Z",
    updatedAt: "2026-09-07T08:30:00Z",
  },
];

function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const list: StoredOrder[] = JSON.parse(content);
      for (const ord of list) {
        ordersMemoryStore.set(ord.orderReference, ord);
        ordersMemoryStore.set(ord.id, ord);
      }
    }
    if (ordersMemoryStore.size === 0) {
      for (const ord of INITIAL_SEED_ORDERS) {
        ordersMemoryStore.set(ord.orderReference, ord);
        ordersMemoryStore.set(ord.id, ord);
      }
      saveToDisk();
    }
  } catch (err) {
    console.warn("Orders store disk load notice:", err);
  }
}

function saveToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Deduplicate by orderReference
    const uniqueOrders = Array.from(new Set(Array.from(ordersMemoryStore.values())));
    fs.writeFileSync(DATA_FILE, JSON.stringify(uniqueOrders, null, 2), "utf-8");
  } catch (err) {
    console.warn("Orders store disk save notice:", err);
  }
}

// Initial load
loadFromDisk();

export function saveOrder(order: StoredOrder): StoredOrder {
  ordersMemoryStore.set(order.orderReference, order);
  ordersMemoryStore.set(order.id, order);
  saveToDisk();
  return order;
}

export function getOrderByReference(reference: string): StoredOrder | null {
  loadFromDisk();
  return ordersMemoryStore.get(reference.trim()) || null;
}

export function getOrderById(id: string): StoredOrder | null {
  loadFromDisk();
  return ordersMemoryStore.get(id.trim()) || null;
}

export function updateOrderStatus(
  refOrId: string,
  status: StoredOrder["status"]
): StoredOrder | null {
  loadFromDisk();
  const order = ordersMemoryStore.get(refOrId.trim());
  if (!order) return null;

  order.status = status;
  order.updatedAt = new Date().toISOString();
  ordersMemoryStore.set(order.orderReference, order);
  ordersMemoryStore.set(order.id, order);
  saveToDisk();
  return order;
}

export function updateOrderPayment(
  reference: string,
  payment: StoredPayment
): StoredOrder | null {
  loadFromDisk();
  const order = ordersMemoryStore.get(reference.trim());
  if (!order) return null;

  order.payment = payment;
  if (payment.status === "successful" && order.status === "pending") {
    order.status = "confirmed";
  }
  order.updatedAt = new Date().toISOString();
  ordersMemoryStore.set(order.orderReference, order);
  ordersMemoryStore.set(order.id, order);
  saveToDisk();
  return order;
}

export function getAllOrders(): StoredOrder[] {
  loadFromDisk();
  const unique = Array.from(new Set(Array.from(ordersMemoryStore.values())));
  return unique.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrdersByFarmerId(farmerId: string): StoredOrder[] {
  const all = getAllOrders();
  return all.filter((ord) =>
    ord.items.some((item) => item.farmerId === farmerId)
  );
}

export function getOrdersByBuyer(params?: {
  buyerId?: string;
  email?: string;
  phone?: string;
}): StoredOrder[] {
  const all = getAllOrders();
  if (!params || (!params.buyerId && !params.email && !params.phone)) {
    return all;
  }
  const emailLower = params.email?.toLowerCase();
  const phoneClean = params.phone?.replace(/\D/g, "");

  const filtered = all.filter((ord) => {
    if (params.buyerId && ord.buyerId === params.buyerId) return true;
    if (emailLower && ord.buyerEmail?.toLowerCase() === emailLower) return true;
    if (phoneClean && ord.deliveryPhone?.replace(/\D/g, "") === phoneClean) return true;
    return false;
  });

  // If filtered returns nothing (e.g. fresh session), return all available orders
  return filtered.length > 0 ? filtered : all;
}
