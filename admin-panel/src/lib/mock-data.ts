import type { DashboardStats, Notification } from "@/types";

// Local types matching the mock data shape (camelCase, pre-DB-migration)
interface Product { id: string; name: string; sku: string; description: string; shortDescription: string; price: number; comparePrice?: number; categoryId: string; subcategoryId?: string; status: "active"|"hidden"|"draft"|"out_of_stock"; inventory: number; lowStockThreshold: number; images: string[]; tags: string[]; createdAt: string; updatedAt: string; featured: boolean; seoTitle?: string; seoDescription?: string; }
interface Category { id: string; name: string; slug: string; description?: string; image?: string; parentId?: string; order: number; productCount: number; createdAt: string; }
interface Customer { id: string; name: string; email: string; phone: string; city: string; ordersCount: number; totalSpent: number; lastOrderAt?: string; createdAt: string; notes?: string; }
interface OrderItem { productId: string; productName: string; productImage: string; sku: string; quantity: number; price: number; customization?: string; }
interface Order { id: string; orderNumber: string; customerId: string; customerName: string; customerEmail: string; customerPhone: string; status: "new"|"pending"|"processing"|"shipped"|"completed"|"cancelled"|"refunded"; paymentStatus: "paid"|"unpaid"|"partial"|"refunded"; items: OrderItem[]; subtotal: number; shippingCost: number; discount: number; total: number; shippingAddress: { street: string; city: string; zip: string }; shippingMethod: string; paymentMethod: string; notes?: string; adminNotes?: string; timeline: { status: string; timestamp: string; note?: string }[]; createdAt: string; updatedAt: string; }
interface Coupon { id: string; code: string; type: "percentage"|"fixed"; value: number; minOrderValue?: number; maxUses?: number; usedCount: number; active: boolean; expiresAt?: string; createdAt: string; }
interface MediaFile { id: string; url: string; name: string; size: number; type: string; uploadedAt: string; }
interface StoreSettings { storeName: string; storeEmail: string; storePhone: string; storeAddress: string; currency: string; logo?: string; favicon?: string; freeShippingThreshold: number; defaultShippingCost: number; seoTitle: string; seoDescription: string; instagram?: string; facebook?: string; whatsapp?: string; }

// ─── Categories ───────────────────────────────────────────────────
export const mockCategories: Category[] = [
  { id: "cat1", name: "שרשראות", slug: "necklaces", description: "שרשראות עם חריטה אישית", image: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=400", parentId: undefined, order: 1, productCount: 24, createdAt: "2024-01-01T10:00:00Z" },
  { id: "cat2", name: "צמידים", slug: "bracelets", description: "צמידים מעוצבים", image: "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=400", parentId: undefined, order: 2, productCount: 18, createdAt: "2024-01-01T10:00:00Z" },
  { id: "cat3", name: "מחזיקי מפתחות", slug: "keychains", description: "מחזיקי מפתחות מיוחדים", image: "https://images.pexels.com/photos/1191541/pexels-photo-1191541.jpeg?w=400", parentId: undefined, order: 3, productCount: 12, createdAt: "2024-01-01T10:00:00Z" },
  { id: "cat4", name: "עגילים", slug: "earrings", image: undefined, description: "עגילים בעיצוב אישי", parentId: undefined, order: 4, productCount: 8, createdAt: "2024-02-01T10:00:00Z" },
  { id: "cat5", name: "שרשראות זהב", slug: "gold-necklaces", image: undefined, description: "שרשראות זהב עם חריטה", parentId: "cat1", order: 1, productCount: 10, createdAt: "2024-01-15T10:00:00Z" },
  { id: "cat6", name: "שרשראות כסף", slug: "silver-necklaces", image: undefined, description: "שרשראות כסף עם חריטה", parentId: "cat1", order: 2, productCount: 14, createdAt: "2024-01-15T10:00:00Z" },
];

// ─── Products ─────────────────────────────────────────────────────
export const mockProducts: Product[] = [
  { id: "p1", name: "שרשרת לב עם חריטה", sku: "NL-001", description: "שרשרת לב זהב 14 קראט עם חריטה אישית. מושלמת לאוהבים ולמי שרוצה לשמור מישהו קרוב ללב.", shortDescription: "שרשרת לב זהב עם חריטה אישית", price: 280, comparePrice: 350, categoryId: "cat1", subcategoryId: "cat5", status: "active", inventory: 15, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600", "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=600"], tags: ["לב", "זהב", "חריטה", "מתנה"], createdAt: "2024-01-10T10:00:00Z", updatedAt: "2024-03-15T14:30:00Z", featured: true },
  { id: "p2", name: "צמיד שמות - זהב", sku: "BR-001", description: "צמיד זהב עם שם או מספר חריוט. ניתן לחרות עד 12 תווים.", shortDescription: "צמיד זהב עם חריטת שם", price: 220, comparePrice: undefined, categoryId: "cat2", status: "active", inventory: 8, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=600"], tags: ["שמות", "זהב", "צמיד"], createdAt: "2024-01-12T10:00:00Z", updatedAt: "2024-03-10T09:00:00Z", featured: true },
  { id: "p3", name: "מחזיק מפתחות אישי", sku: "KC-001", description: "מחזיק מפתחות מנירוסטה עם חריטה אישית של עד 20 תווים.", shortDescription: "מחזיק מפתחות עם חריטה", price: 89, comparePrice: 110, categoryId: "cat3", status: "active", inventory: 45, lowStockThreshold: 10, images: ["https://images.pexels.com/photos/1191541/pexels-photo-1191541.jpeg?w=600"], tags: ["מחזיק", "חריטה", "מתנה"], createdAt: "2024-01-15T10:00:00Z", updatedAt: "2024-02-20T11:00:00Z", featured: false },
  { id: "p4", name: "שרשרת כוכב כסף", sku: "NL-002", description: "שרשרת כסף 925 בצורת כוכב עם חריטת מספר.", shortDescription: "שרשרת כסף עם כוכב", price: 195, comparePrice: undefined, categoryId: "cat1", subcategoryId: "cat6", status: "active", inventory: 3, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600"], tags: ["כסף", "כוכב", "שרשרת"], createdAt: "2024-02-01T10:00:00Z", updatedAt: "2024-03-01T10:00:00Z", featured: false },
  { id: "p5", name: "צמיד אינפיניטי", sku: "BR-002", description: "צמיד אינפיניטי זהב ורד עם חריטת שם.", shortDescription: "צמיד אינפיניטי זהב ורד", price: 245, comparePrice: 290, categoryId: "cat2", status: "hidden", inventory: 12, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=600"], tags: ["אינפיניטי", "זהב ורד"], createdAt: "2024-02-10T10:00:00Z", updatedAt: "2024-02-28T10:00:00Z", featured: false },
  { id: "p6", name: "שרשרת עוגן", sku: "NL-003", description: "שרשרת עוגן לגבר מנירוסטה שחורה.", shortDescription: "שרשרת עוגן לגבר", price: 155, comparePrice: undefined, categoryId: "cat1", status: "active", inventory: 0, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600"], tags: ["גבר", "עוגן", "שחור"], createdAt: "2024-02-15T10:00:00Z", updatedAt: "2024-03-05T10:00:00Z", featured: false },
  { id: "p7", name: "עגילים עם ראשי אות", sku: "ER-001", description: "עגילי סטוד בצורת האות הראשונה שלך.", shortDescription: "עגילי אות אישיים", price: 175, comparePrice: 200, categoryId: "cat4", status: "active", inventory: 20, lowStockThreshold: 8, images: ["https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600"], tags: ["עגילים", "אות", "זהב"], createdAt: "2024-03-01T10:00:00Z", updatedAt: "2024-03-20T10:00:00Z", featured: true },
  { id: "p8", name: "שרשרת שם בערבית", sku: "NL-004", description: "שרשרת עם שמך בכתב ערבי בזהב.", shortDescription: "שרשרת שם בערבית", price: 260, comparePrice: undefined, categoryId: "cat1", status: "draft", inventory: 6, lowStockThreshold: 5, images: ["https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600"], tags: ["ערבית", "שם", "זהב"], createdAt: "2024-03-10T10:00:00Z", updatedAt: "2024-03-10T10:00:00Z", featured: false },
];

// ─── Customers ────────────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  { id: "c1", name: "שרה לוי", email: "sarah@example.com", phone: "050-1234567", city: "תל אביב", ordersCount: 5, totalSpent: 1240, lastOrderAt: "2024-03-18T14:00:00Z", createdAt: "2023-11-01T10:00:00Z", notes: "לקוחה נאמנה, מעדיפה יצירת קשר בוואטסאפ" },
  { id: "c2", name: "דוד כהן", email: "david@example.com", phone: "052-9876543", city: "ירושלים", ordersCount: 2, totalSpent: 465, lastOrderAt: "2024-03-15T10:00:00Z", createdAt: "2024-01-10T10:00:00Z" },
  { id: "c3", name: "מיכל אברהם", email: "michal@example.com", phone: "054-5556789", city: "חיפה", ordersCount: 8, totalSpent: 2890, lastOrderAt: "2024-03-20T09:00:00Z", createdAt: "2023-08-15T10:00:00Z", notes: "מזמינה לעתים קרובות כמתנות לאירועים" },
  { id: "c4", name: "יוסף אלי", email: "yosef@example.com", phone: "053-3334444", city: "באר שבע", ordersCount: 1, totalSpent: 89, lastOrderAt: "2024-03-12T16:00:00Z", createdAt: "2024-03-12T10:00:00Z" },
  { id: "c5", name: "רחל בן דוד", email: "rachel@example.com", phone: "055-7778888", city: "רמת גן", ordersCount: 3, totalSpent: 718, lastOrderAt: "2024-03-19T11:00:00Z", createdAt: "2023-12-20T10:00:00Z" },
  { id: "c6", name: "אמיר שמואל", email: "amir@example.com", phone: "058-2223333", city: "פתח תקווה", ordersCount: 4, totalSpent: 920, lastOrderAt: "2024-03-17T13:00:00Z", createdAt: "2024-02-01T10:00:00Z" },
];

// ─── Orders ───────────────────────────────────────────────────────
export const mockOrders: Order[] = [
  {
    id: "o1", orderNumber: "#1042", customerId: "c1", customerName: "שרה לוי", customerEmail: "sarah@example.com", customerPhone: "050-1234567",
    status: "completed", paymentStatus: "paid",
    items: [{ productId: "p1", productName: "שרשרת לב עם חריטה", productImage: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=200", sku: "NL-001", quantity: 1, price: 280, customization: "Sarah ❤️" }],
    subtotal: 280, shippingCost: 35, discount: 0, total: 315,
    shippingAddress: { street: "רחוב דיזנגוף 45", city: "תל אביב", zip: "6433106" },
    shippingMethod: "משלוח רגיל", paymentMethod: "כרטיס אשראי",
    notes: "בבקשה לעטוף מתנה", adminNotes: undefined,
    timeline: [
      { status: "new", timestamp: "2024-03-10T09:00:00Z" },
      { status: "processing", timestamp: "2024-03-10T10:00:00Z" },
      { status: "shipped", timestamp: "2024-03-12T14:00:00Z", note: "נשלח עם HFD" },
      { status: "completed", timestamp: "2024-03-14T11:00:00Z" },
    ],
    createdAt: "2024-03-10T09:00:00Z", updatedAt: "2024-03-14T11:00:00Z",
  },
  {
    id: "o2", orderNumber: "#1043", customerId: "c2", customerName: "דוד כהן", customerEmail: "david@example.com", customerPhone: "052-9876543",
    status: "shipped", paymentStatus: "paid",
    items: [
      { productId: "p3", productName: "מחזיק מפתחות אישי", productImage: "https://images.pexels.com/photos/1191541/pexels-photo-1191541.jpeg?w=200", sku: "KC-001", quantity: 2, price: 89, customization: "דוד 2024" },
    ],
    subtotal: 178, shippingCost: 35, discount: 30, total: 183,
    shippingAddress: { street: "רחוב יפו 120", city: "ירושלים", zip: "9423013" },
    shippingMethod: "משלוח מהיר", paymentMethod: "PayPal",
    notes: undefined, adminNotes: "בדוק עם יצרן על מלאי",
    timeline: [
      { status: "new", timestamp: "2024-03-15T08:00:00Z" },
      { status: "processing", timestamp: "2024-03-15T09:30:00Z" },
      { status: "shipped", timestamp: "2024-03-16T11:00:00Z" },
    ],
    createdAt: "2024-03-15T08:00:00Z", updatedAt: "2024-03-16T11:00:00Z",
  },
  {
    id: "o3", orderNumber: "#1044", customerId: "c3", customerName: "מיכל אברהם", customerEmail: "michal@example.com", customerPhone: "054-5556789",
    status: "processing", paymentStatus: "paid",
    items: [
      { productId: "p1", productName: "שרשרת לב עם חריטה", productImage: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=200", sku: "NL-001", quantity: 1, price: 280, customization: "Michal ❤️" },
      { productId: "p7", productName: "עגילים עם ראשי אות", productImage: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=200", sku: "ER-001", quantity: 1, price: 175 },
    ],
    subtotal: 455, shippingCost: 0, discount: 0, total: 455,
    shippingAddress: { street: "שדרות הנשיא 5", city: "חיפה", zip: "3303328" },
    shippingMethod: "משלוח חינם", paymentMethod: "ביט",
    notes: undefined, adminNotes: undefined,
    timeline: [
      { status: "new", timestamp: "2024-03-19T12:00:00Z" },
      { status: "processing", timestamp: "2024-03-19T13:00:00Z" },
    ],
    createdAt: "2024-03-19T12:00:00Z", updatedAt: "2024-03-19T13:00:00Z",
  },
  {
    id: "o4", orderNumber: "#1045", customerId: "c4", customerName: "יוסף אלי", customerEmail: "yosef@example.com", customerPhone: "053-3334444",
    status: "new", paymentStatus: "unpaid",
    items: [{ productId: "p3", productName: "מחזיק מפתחות אישי", productImage: "https://images.pexels.com/photos/1191541/pexels-photo-1191541.jpeg?w=200", sku: "KC-001", quantity: 1, price: 89 }],
    subtotal: 89, shippingCost: 35, discount: 0, total: 124,
    shippingAddress: { street: "שדרות בן גוריון 10", city: "באר שבע", zip: "8410501" },
    shippingMethod: "משלוח רגיל", paymentMethod: "כרטיס אשראי",
    notes: undefined, adminNotes: undefined,
    timeline: [{ status: "new", timestamp: "2024-03-20T08:00:00Z" }],
    createdAt: "2024-03-20T08:00:00Z", updatedAt: "2024-03-20T08:00:00Z",
  },
  {
    id: "o5", orderNumber: "#1046", customerId: "c5", customerName: "רחל בן דוד", customerEmail: "rachel@example.com", customerPhone: "055-7778888",
    status: "cancelled", paymentStatus: "refunded",
    items: [{ productId: "p2", productName: "צמיד שמות - זהב", productImage: "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=200", sku: "BR-001", quantity: 1, price: 220 }],
    subtotal: 220, shippingCost: 35, discount: 0, total: 255,
    shippingAddress: { street: "רחוב ביאליק 30", city: "רמת גן", zip: "5252048" },
    shippingMethod: "משלוח רגיל", paymentMethod: "כרטיס אשראי",
    notes: "ביטול - טעות בחריטה", adminNotes: "הוחזר ביום 19/3",
    timeline: [
      { status: "new", timestamp: "2024-03-17T10:00:00Z" },
      { status: "cancelled", timestamp: "2024-03-18T09:00:00Z", note: "בקשת ביטול של הלקוחה" },
    ],
    createdAt: "2024-03-17T10:00:00Z", updatedAt: "2024-03-18T09:00:00Z",
  },
  {
    id: "o6", orderNumber: "#1047", customerId: "c6", customerName: "אמיר שמואל", customerEmail: "amir@example.com", customerPhone: "058-2223333",
    status: "pending", paymentStatus: "paid",
    items: [{ productId: "p4", productName: "שרשרת כוכב כסף", productImage: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=200", sku: "NL-002", quantity: 1, price: 195, customization: "777" }],
    subtotal: 195, shippingCost: 35, discount: 20, total: 210,
    shippingAddress: { street: "רחוב אחוזה 80", city: "פתח תקווה", zip: "4954351" },
    shippingMethod: "משלוח רגיל", paymentMethod: "Apple Pay",
    notes: undefined, adminNotes: undefined,
    timeline: [{ status: "new", timestamp: "2024-03-19T17:00:00Z" }, { status: "pending", timestamp: "2024-03-19T17:30:00Z" }],
    createdAt: "2024-03-19T17:00:00Z", updatedAt: "2024-03-19T17:30:00Z",
  },
];

// ─── Coupons ──────────────────────────────────────────────────────
export const mockCoupons: Coupon[] = [
  { id: "coup1", code: "WELCOME10", type: "percentage", value: 10, minOrderValue: 100, maxUses: 100, usedCount: 34, active: true, expiresAt: "2024-06-30T23:59:59Z", createdAt: "2024-01-01T10:00:00Z" },
  { id: "coup2", code: "SAVE30", type: "fixed", value: 30, minOrderValue: 200, maxUses: 50, usedCount: 12, active: true, expiresAt: "2024-05-31T23:59:59Z", createdAt: "2024-02-01T10:00:00Z" },
  { id: "coup3", code: "SPRING20", type: "percentage", value: 20, minOrderValue: 150, maxUses: undefined, usedCount: 8, active: false, expiresAt: "2024-04-01T23:59:59Z", createdAt: "2024-03-01T10:00:00Z" },
  { id: "coup4", code: "VIP15", type: "percentage", value: 15, minOrderValue: undefined, maxUses: 20, usedCount: 7, active: true, expiresAt: undefined, createdAt: "2024-01-15T10:00:00Z" },
];

// ─── Media ────────────────────────────────────────────────────────
export const mockMedia: MediaFile[] = [
  { id: "m1", url: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=600", name: "necklace-heart.jpg", size: 245000, type: "image/jpeg", uploadedAt: "2024-01-10T10:00:00Z" },
  { id: "m2", url: "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?w=600", name: "bracelet-gold.jpg", size: 312000, type: "image/jpeg", uploadedAt: "2024-01-12T10:00:00Z" },
  { id: "m3", url: "https://images.pexels.com/photos/1191541/pexels-photo-1191541.jpeg?w=600", name: "keychain-custom.jpg", size: 198000, type: "image/jpeg", uploadedAt: "2024-01-15T10:00:00Z" },
  { id: "m4", url: "https://images.pexels.com/photos/2735970/pexels-photo-2735970.jpeg?w=600", name: "studio-hero.jpg", size: 480000, type: "image/jpeg", uploadedAt: "2024-02-01T10:00:00Z" },
  { id: "m5", url: "https://images.pexels.com/photos/2853200/pexels-photo-2853200.jpeg?w=600", name: "jewelry-banner.jpg", size: 356000, type: "image/jpeg", uploadedAt: "2024-02-10T10:00:00Z" },
  { id: "m6", url: "https://images.pexels.com/photos/1449667/pexels-photo-1449667.jpeg?w=600", name: "gift-wrap.jpg", size: 290000, type: "image/jpeg", uploadedAt: "2024-02-15T10:00:00Z" },
];

// ─── Store Settings ───────────────────────────────────────────────
export const mockSettings: StoreSettings = {
  storeName: "חרוטלי",
  storeEmail: "hello@harotli.co.il",
  storePhone: "03-1234567",
  storeAddress: "תל אביב, ישראל",
  currency: "ILS",
  freeShippingThreshold: 350,
  defaultShippingCost: 35,
  seoTitle: "חרוטלי | תכשיטים עם חריטה אישית",
  seoDescription: "עיצוב תכשיטים אישיים עם חריטה - שרשראות, צמידים, עגילים ומחזיקי מפתחות",
  instagram: "harotli",
  facebook: "harotli",
  whatsapp: "972501234567",
};

// ─── Dashboard Stats ──────────────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  totalRevenue: 28450,
  todayRevenue: 455,
  weekRevenue: 2890,
  monthRevenue: 11340,
  totalOrders: 6,
  newOrders: 1,
  pendingOrders: 1,
  completedOrders: 2,
  cancelledOrders: 1,
  totalProducts: 8,
  lowStockProducts: 2,
  hiddenProducts: 1,
  totalCustomers: 6,
  revenueChart: [
    { date: "1/3", revenue: 890, orders: 3 },
    { date: "3/3", revenue: 1240, orders: 4 },
    { date: "5/3", revenue: 680, orders: 2 },
    { date: "7/3", revenue: 1890, orders: 6 },
    { date: "9/3", revenue: 450, orders: 1 },
    { date: "11/3", revenue: 2100, orders: 7 },
    { date: "13/3", revenue: 780, orders: 3 },
    { date: "15/3", revenue: 1320, orders: 5 },
    { date: "17/3", revenue: 920, orders: 3 },
    { date: "19/3", revenue: 1650, orders: 5 },
    { date: "20/3", revenue: 455, orders: 2 },
  ],
  topProducts: [
    { name: "שרשרת לב עם חריטה", sales: 42, revenue: 11760 },
    { name: "צמיד שמות - זהב", sales: 28, revenue: 6160 },
    { name: "מחזיק מפתחות אישי", sales: 65, revenue: 5785 },
    { name: "שרשרת כוכב כסף", sales: 19, revenue: 3705 },
    { name: "עגילים עם ראשי אות", sales: 14, revenue: 2450 },
  ],
};

// ─── Notifications ────────────────────────────────────────────────
export const mockNotifications: Notification[] = [
  { id: "n1", type: "new_order", message: "הזמנה חדשה #1047 מאמיר שמואל", read: false, createdAt: "2024-03-19T17:00:00Z", link: "/admin/orders/o6" },
  { id: "n2", type: "low_stock", message: "שרשרת כוכב כסף - נותרו 3 יחידות בלבד", read: false, createdAt: "2024-03-19T10:00:00Z", link: "/admin/inventory" },
  { id: "n3", type: "low_stock", message: "צמיד שמות - זהב - נותרו 8 יחידות (מתחת לסף)", read: false, createdAt: "2024-03-18T14:00:00Z", link: "/admin/inventory" },
  { id: "n4", type: "new_order", message: "הזמנה חדשה #1046 מרחל בן דוד", read: true, createdAt: "2024-03-17T10:00:00Z", link: "/admin/orders/o5" },
  { id: "n5", type: "new_order", message: "הזמנה חדשה #1044 ממיכל אברהם", read: true, createdAt: "2024-03-19T12:00:00Z", link: "/admin/orders/o3" },
];
