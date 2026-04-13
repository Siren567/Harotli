/**
 * Application-level types built on top of DB row types.
 * These are the shapes components and services work with.
 */
import type {
  DbProduct, DbProductImage, DbInventory,
  DbCategory, DbOrder, DbOrderItem, DbOrderTimeline,
  DbCustomer, DbCoupon, DbMediaFile, DbStoreSettings,
} from "./database";

// Re-export DB types so the rest of the app can import from one place
export type {
  DbProduct, DbProductImage, DbInventory, DbCategory,
  DbOrder, DbOrderItem, DbOrderTimeline, DbCustomer,
  DbCoupon, DbMediaFile, DbStoreSettings,
};

// ─── Status unions (match DB check constraints) ─────────────────────────────
export type ProductStatus  = "active" | "hidden" | "draft" | "out_of_stock";
export type OrderStatus    = "new" | "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded";
export type PaymentStatus  = "paid" | "unpaid" | "partial" | "refunded";
export type DiscountType   = "percentage" | "fixed";

// ─── Enriched types (joins) ─────────────────────────────────────────────────

/** Product with its primary image and inventory record joined */
export interface ProductWithDetails extends DbProduct {
  primary_image: string | null;
  images: DbProductImage[];
  inventory: DbInventory | null;
  category_name: string | null;
}

/** Order with its items and timeline joined */
export interface OrderWithDetails extends DbOrder {
  items: DbOrderItem[];
  timeline: DbOrderTimeline[];
  customer: DbCustomer | null;
}

/** Customer with computed order stats */
export interface CustomerWithStats extends DbCustomer {
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

/** Inventory row joined with product info (for inventory page) */
export interface InventoryRow extends DbInventory {
  product_name: string;
  product_sku: string;
  product_status: ProductStatus;
  product_image: string | null;
  category_name: string | null;
}

// ─── Form / UI-only types ───────────────────────────────────────────────────

export interface ProductFormData {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  sku: string;
  price: number | string;
  compare_price: number | string;
  category_id: string;
  subcategory_id: string;
  status: ProductStatus;
  is_featured: boolean;
  tags: string[];
  seo_title: string;
  seo_description: string;
  images: string[];          // ordered list of URLs (first = primary)
  inventory_quantity: number | string;
  low_stock_threshold: number | string;
}

export interface OrderFormUpdate {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  admin_note?: string;
}

export interface CouponFormData {
  code: string;
  type: DiscountType;
  value: number | string;
  min_order_value: number | string;
  max_uses: number | string;
  is_active: boolean;
  expires_at: string;
}

// ─── Dashboard stats (computed server-side) ─────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalOrders: number;
  newOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  hiddenProducts: number;
  totalCustomers: number;
  revenueChart: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
}

export interface Notification {
  id: string;
  type: "low_stock" | "new_order" | "error";
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
