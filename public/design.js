import {
  STUDIO_STEPS,
  PRODUCT_CATEGORIES,
  PRODUCT_ITEMS,
  FONT_OPTIONS,
  MATERIAL_OPTIONS,
  STUDIO_VARIANT_BY_KEY,
  ICON_OPTIONS,
  SHIPPING_METHODS,
  PAYMENT_METHOD_OPTIONS,
} from "./studio-data.js";
import { formatShekelDisplay as formatPrice } from "./price-display.js";
import { appendStudioDemoOrder, studioCustomerId, STUDIO_DEMO_ORDERS_KEY } from "./studio-demo-sync.js";
import { initMarketingBeacon, trackProductView } from "./marketing-beacon.js";

let runtimeCategories = [...PRODUCT_CATEGORIES];
let runtimeItems = [];

const DEFAULT_STUDIO_COLOR_KEYS = ["gold", "silver", "rose", "black"];

function toStudioCategoryId(rawSlug = "", rawName = "") {
  const slug = String(rawSlug).toLowerCase();
  const name = String(rawName).toLowerCase();
  if (slug.includes("bracelet") || name.includes("צמיד")) return "bracelets";
  if (slug.includes("key") || name.includes("מחזיק")) return "keychains";
  if (slug.includes("necklace") || name.includes("שרשר")) return "necklaces";
  return "other";
}

function buildVariantsFromColors(colorKeys, imageUrls, fallbackImage) {
  const keys =
    colorKeys?.length > 0
      ? colorKeys.filter((k) => STUDIO_VARIANT_BY_KEY[k])
      : [...DEFAULT_STUDIO_COLOR_KEYS];
  const urls = imageUrls?.length ? imageUrls : fallbackImage ? [fallbackImage] : [];
  const img0 = urls[0] || fallbackImage || "";
  return keys.map((k, i) => ({
    ...STUDIO_VARIANT_BY_KEY[k],
    image: urls[i % Math.max(urls.length, 1)] || img0,
  }));
}

function enrichMockCatalogItem(p) {
  const fromVariants = [...new Set(p.variants.map((v) => v.image).filter(Boolean))];
  const imageUrls = p.imageUrls?.length ? [...p.imageUrls] : fromVariants;
  return { ...p, imageUrls };
}

function buildApiBases() {
  const host = window.location.hostname || "localhost";
  const origin = window.location.origin || "";
  return [origin, "", "http://localhost:4444", `http://${host}:4444`, `http://${host}:3000`];
}

/** +972 55-943-3968 — ברירת מחדל לסטודיו; ה־API יכול לדרוס אם מוגדר בפאנל */
const DEFAULT_STUDIO_WHATSAPP = "972559433968";

async function fetchWithTimeout(url, options = {}, ms = 5000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function postJsonBases(path, jsonBody) {
  for (const base of buildApiBases()) {
    try {
      const res = await fetchWithTimeout(
        `${base}${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(jsonBody),
        },
        8000
      );
      const j = await res.json().catch(() => ({}));
      if (res.ok) return j;
      return { ok: false, error: j.error || String(res.status) };
    } catch {
      /* try next base */
    }
  }
  return null;
}

function clearCouponOnCartChange() {
  if (state.couponApplied) {
    state.couponApplied = null;
    renderCouponBox();
  }
}

function renderCouponBox() {
  if (!couponBoxEl) return;
  const a = state.couponApplied;
  if (a) {
    couponBoxEl.innerHTML = `<div class="coupon-row-inner coupon-applied">
      <span>קופון <strong>${escHtml(a.code)}</strong> · הנחה ${formatPrice(a.discount)}</span>
      <button type="button" class="btn secondary" data-action="remove-coupon">הסר</button>
    </div>`;
  } else {
    couponBoxEl.innerHTML = `<div class="coupon-row-inner">
      <input type="text" id="couponCodeInput" placeholder="הזן קוד קופון" dir="ltr" autocomplete="off" style="text-transform:uppercase" />
      <button type="button" class="btn primary" data-action="apply-coupon">החל קופון</button>
    </div>
    <p id="couponErr" style="font-size:11px;margin-top:6px;color:#b91c1c;min-height:14px"></p>`;
  }
}

async function applyCouponFromUi() {
  const input = document.getElementById("couponCodeInput");
  const errEl = document.getElementById("couponErr");
  const code = (input?.value || "").trim();
  if (!code) {
    if (errEl) errEl.textContent = "הזן קוד קופון";
    return;
  }
  const product = currentProduct();
  if (!product) return;
  const subtotal = product.price * state.customization.qty;
  const res = await postJsonBases("/api/public/validate-coupon", { code, subtotal });
  if (!res?.ok) {
    if (errEl) errEl.textContent = res?.error || "לא ניתן לאמת את הקופון";
    return;
  }
  if (errEl) errEl.textContent = "";
  state.couponApplied = {
    id: res.coupon_id,
    code: res.coupon_code,
    discount: Number(res.discount_amount) || 0,
  };
  renderCouponBox();
  updatePricingUI();
}

function removeCoupon() {
  state.couponApplied = null;
  renderCouponBox();
  updatePricingUI();
}

async function loadProductsFromDatabase() {
  const bases = buildApiBases();
  let rows = [];

  for (const base of bases) {
    try {
      const res = await fetchWithTimeout(`${base}/api/public/products`, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const json = await res.json();
      rows = Array.isArray(json?.products) ? json.products : [];
      if (rows.length > 0) break;
    } catch {
      // try next candidate
    }
  }

  if (!rows.length) {
    runtimeItems = [];
    runtimeCategories = [...PRODUCT_CATEGORIES];
    return;
  }

  const mapped = rows
    .filter((p) => p?.id && p?.name)
    .map((p) => {
      const category = p.studioCategory || toStudioCategoryId(p.categorySlug || "", p.categoryName || "");
      const imgs = Array.isArray(p.images) && p.images.length ? p.images : p.image ? [p.image] : [];
      const fallback =
        p.image ||
        "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop";
      const variants = buildVariantsFromColors(p.studioColors, imgs, fallback);
      return {
        id: p.id,
        category,
        subcategory: p.subcategoryLabel ?? p.subcategoryName ?? p.categoryName ?? null,
        title: p.name,
        description: p.description || "",
        price: Number(p.price) || 0,
        allowCustomerImageUpload: !!p.allowCustomerImageUpload,
        imageUrls: imgs.length ? imgs : [fallback],
        variants: variants.length ? variants : [{ color: "ברירת מחדל", swatch: "#D4AF37", image: fallback }],
      };
    });

  runtimeItems = mapped;

  const existingCategories = new Set(runtimeItems.map((p) => p.category));
  runtimeCategories = PRODUCT_CATEGORIES.filter((c) => existingCategories.has(c.id));
  if (!runtimeCategories.length) runtimeCategories = [...PRODUCT_CATEGORIES];
}

const state = {
  step: 0,
  selectedProductId: "",
  activeCategoryId: "",
  previewGalleryIndex: 0,
  whatsappPhone: "",
  previewAngle: "front",
  zoom: 1,
  rotate: 0,
  dragRotateY: 0,
  dragRotateX: 0,
  processing: false,
  selectionTimer: null,
  typingTimer: null,
  emojiPickerTargetId: null,
  draftText: "באהבה גדולה",
  customization: {
    text: "באהבה גדולה",
    textBlocks: [{ id: "t1", text: "באהבה גדולה" }],
    emojiBlocks: [{ id: "e1", symbol: ICON_OPTIONS[0] }],
    fontId: FONT_OPTIONS[0].id,
    size: 28,
    position: "center",
    align: "center",
    materialId: MATERIAL_OPTIONS[0].id,
    qty: 1,
    notes: "",
    customerUpload: null,
    previewOffsets: { e1: { xPct: 26, yPct: 26 }, t1: { xPct: 50, yPct: 50 } },
  },
  /** מספר הזמנה קבוע אחרי תשלום דמה — לתצוגה ול־localStorage */
  placedOrderNumber: null,
  /** { id, code, discount } אחרי אימות מול השרת */
  couponApplied: null,
  checkout: {
    fullName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    house: "",
    aptFloor: "",
    zip: "",
    deliveryNotes: "",
    shippingId: SHIPPING_METHODS[0].id,
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    paymentMethod: "card",
  },
  selectedVariantByProduct: Object.fromEntries(runtimeItems.map((p) => [p.id, 0])),
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const steps = $$("[data-step]");

const progressEl = $("#progress");
const categoryChipsEl = $("#categoryChips");
const catalogSectionsEl = $("#catalogSections");
const mockProductEl = $("#mockProduct");
const mockEngraveSurfaceEl = $("#mockEngraveSurface");
const orderSummaryEl = $("#orderSummary");
const finalSummaryEl = $("#finalSummary");
const flowNav = $("#flowNav");
const nextBtn = document.querySelector('.app-shell [data-action="next"]');
const backBtn = document.querySelector('.app-shell [data-action="back"]');

const fontSelect = $("#fontSelect");
const textSize = $("#textSize");
const qtyInput = $("#qtyInput");
const notesInput = $("#notesInput");
const customerUploadBoxEl = $("#customerUploadBox");
const previewGalleryEl = $("#previewGallery");
const studioWhatsappBtn = $("#studioWhatsappBtn");
const stageEl = document.querySelector(".stage");
const textBlocksEl = $("#textBlocks");
const emojiBlocksEl = $("#emojiBlocks");
const addTextBlockBtn = $("#addTextBlock");
const addEmojiBlockBtn = $("#addEmojiBlock");
const emojiPickerEl = $("#emojiPicker");
const walletMenuTrigger = $("#walletMenuTrigger");
const walletMenu = $("#walletMenu");
const walletTriggerInner = $("#walletTriggerInner");
const cardFieldsGrid = $("#cardFieldsGrid");
const walletMockHint = $("#walletMockHint");
const couponBoxEl = $("#couponBox");
const orderStatusLookupToggleBtn = $("#orderStatusLookupToggle");
const orderStatusLookupFooterBtn = $("#orderStatusLookupFooterBtn");
const orderStatusLookupPanel = $("#orderStatusLookupPanel");
const orderStatusLookupInput = $("#orderStatusLookupInput");
const orderStatusLookupBtn = $("#orderStatusLookupBtn");
const orderStatusLookupMsg = $("#orderStatusLookupMsg");
const orderStatusLookupTimeline = $("#orderStatusLookupTimeline");

const formatShippingFeeDisplay = (fee) => (fee <= 0 ? "חינם" : formatPrice(fee));

function paymentOptionById(id) {
  return PAYMENT_METHOD_OPTIONS.find((p) => p.id === id) || PAYMENT_METHOD_OPTIONS[0];
}

function brandMarkHtml(brand) {
  if (!brand) return `<span class="wallet-card-ico" aria-hidden="true">💳</span>`;
  if (brand === "google") {
    return `<svg class="wallet-svg" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;
  }
  if (brand === "apple") {
    return `<span class="pay-badge-apple" aria-hidden="true"><svg class="wallet-svg" width="11" height="13" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.3 40.8-165.9 40.8s-105.6-57-155.5-127C46.6 791.8 0 663 0 541.5c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.5zM554.1 159.4c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 84-55.1 136.5 0 7.8 1.3 15.6 2.6 18.1 3.2.6 8.5 1.3 13.6 1.3 45.4 0 102.5-30.4 135.8-71.3z"/></svg><span>Pay</span></span>`;
  }
  if (brand === "bit") {
    return `<span class="pay-badge-bit" aria-hidden="true">ביט</span>`;
  }
  if (brand === "paypal") {
    return `<span class="pay-badge-paypal" aria-hidden="true"><span class="pp-p">Pay</span><span class="pp-pal">Pal</span></span>`;
  }
  return "";
}

function paymentOptionRowMarkup(opt) {
  return `<span class="wallet-row">${brandMarkHtml(opt.brand)}<span class="wallet-row-label">${opt.label}</span></span>`;
}

function setWalletMenuOpen(open) {
  if (!walletMenu || !walletMenuTrigger) return;
  walletMenu.hidden = !open;
  walletMenuTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function renderWalletMenuList() {
  if (!walletMenu) return;
  const cur = state.checkout.paymentMethod;
  walletMenu.innerHTML = PAYMENT_METHOD_OPTIONS.map(
    (opt) =>
      `<button type="button" class="wallet-menu-item ${cur === opt.id ? "is-selected" : ""}" data-pay-method="${opt.id}" role="option" aria-selected="${cur === opt.id ? "true" : "false"}">${paymentOptionRowMarkup(opt)}</button>`
  ).join("");
}

function renderWalletPaymentUI() {
  if (!walletTriggerInner) return;
  const opt = paymentOptionById(state.checkout.paymentMethod);
  walletTriggerInner.innerHTML = paymentOptionRowMarkup(opt);
  renderWalletMenuList();
  const isCard = state.checkout.paymentMethod === "card";
  if (cardFieldsGrid) cardFieldsGrid.hidden = !isCard;
  if (walletMockHint) walletMockHint.hidden = isCard;
}
const categoryTitleById = () => Object.fromEntries(runtimeCategories.map((c) => [c.id, c.title]));
const currentProduct = () => runtimeItems.find((p) => p.id === state.selectedProductId) || null;
const currentProductSupportsCustomerUpload = () => !!currentProduct()?.allowCustomerImageUpload;
const currentVariant = (product) => {
  if (!product) return { color: "", swatch: "#f3eee7", image: "" };
  const idx = state.selectedVariantByProduct[product.id] || 0;
  return product.variants[idx] || product.variants[0];
};

function galleryUrlsForProduct(p) {
  if (!p) return [];
  if (Array.isArray(p.imageUrls) && p.imageUrls.length) return [...p.imageUrls];
  const urls = [];
  const seen = new Set();
  for (const v of p.variants || []) {
    if (v.image && !seen.has(v.image)) {
      seen.add(v.image);
      urls.push(v.image);
    }
  }
  return urls;
}

function syncPreviewGalleryFromSelectedVariant() {
  const p = currentProduct();
  if (!p?.variants?.length) {
    state.previewGalleryIndex = 0;
    return;
  }
  const urls = galleryUrlsForProduct(p);
  if (!urls.length) {
    state.previewGalleryIndex = 0;
    return;
  }
  const vIdx = Math.min(state.selectedVariantByProduct[p.id] ?? 0, p.variants.length - 1);
  const v = p.variants[vIdx];
  let idx = v?.image ? urls.indexOf(v.image) : -1;
  if (idx < 0) idx = Math.min(vIdx, urls.length - 1);
  state.previewGalleryIndex = ((idx % urls.length) + urls.length) % urls.length;
}

function syncVariantFromGallerySelection() {
  const p = currentProduct();
  if (!p?.variants?.length) return;
  const urls = galleryUrlsForProduct(p);
  if (!urls.length) return;
  const n = urls.length;
  const gi = ((state.previewGalleryIndex % n) + n) % n;
  const url = urls[gi];
  const vIdx = p.variants.findIndex((vv) => vv.image === url);
  if (vIdx >= 0) state.selectedVariantByProduct[p.id] = vIdx;
  else state.selectedVariantByProduct[p.id] = gi % p.variants.length;
}
const productIconByCategory = {
  necklaces: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a7.5 7.5 0 0 0-7.5 7.5c0 3 2.1 5.8 5 7.5l2.5 1.5 2.5-1.5c2.9-1.7 5-4.5 5-7.5A7.5 7.5 0 0 0 12 4Zm0 4.2a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z"/></svg>`,
  bracelets: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5c-4.2 0-7.5 2.9-7.5 6.5s3.3 6.5 7.5 6.5 7.5-2.9 7.5-6.5-3.3-6.5-7.5-6.5Zm0 3.2c2.3 0 4.1 1.5 4.1 3.3S14.3 15.3 12 15.3 7.9 13.8 7.9 12 9.7 8.7 12 8.7Z"/></svg>`,
  keychains: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 4.5-3.1H20v-2.1h-2v-2h-2.2v2h-2.3A4.8 4.8 0 0 0 9 6.2Zm0 2.3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>`,
  other: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8h15v10.5h-15V8Zm2-3h11l1.5 3h-14L6.5 5Zm5.5 6.2h0c-1.2 0-2.1.9-2.1 2.1s.9 2.1 2.1 2.1 2.1-.9 2.1-2.1-.9-2.1-2.1-2.1Z"/></svg>`,
};
const currentMaterial = () => MATERIAL_OPTIONS.find((m) => m.id === state.customization.materialId) || MATERIAL_OPTIONS[0];
const currentShipping = () => SHIPPING_METHODS.find((s) => s.id === state.checkout.shippingId) || SHIPPING_METHODS[0];
const currentFont = () => FONT_OPTIONS.find((f) => f.id === state.customization.fontId) || FONT_OPTIONS[0];

const PCT_LO = 3;
const PCT_HI = 97;

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function readLocalDemoOrdersSafe() {
  try {
    const raw = localStorage.getItem(STUDIO_DEMO_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function generateFiveDigitOrderNumber() {
  const used = new Set(readLocalDemoOrdersSafe().map((o) => String(o?.orderNumber || "")));
  for (let i = 0; i < 24; i++) {
    const candidate = String(10000 + Math.floor(Math.random() * 90000));
    if (!used.has(candidate)) return candidate;
  }
  return String(10000 + Math.floor(Math.random() * 90000));
}

function normalizeOrderLookupInput(raw) {
  const src = String(raw || "").trim();
  if (!src) return "";
  if (/^HG-\d{4}-\d{5}$/i.test(src)) return src.toUpperCase();
  const digits = src.replace(/\D/g, "");
  if (digits.length === 5) return digits;
  if (digits.length > 5) return digits.slice(-5);
  return src.toUpperCase();
}

function statusLabelForCustomer(status) {
  const map = {
    new: "התקבלה הזמנה",
    pending: "התקבלה הזמנה",
    processing: "בייצור",
    shipped: "נשלחה",
    completed: "נמסרה",
    cancelled: "ההזמנה בוטלה",
    refunded: "ההזמנה בוטלה",
  };
  return map[status] || status || "לא ידוע";
}

function renderStatusStepper(status) {
  if (!orderStatusLookupTimeline) return;
  const normalized = String(status || "new");
  if (normalized === "cancelled" || normalized === "refunded") {
    orderStatusLookupTimeline.innerHTML = `<li class="timeline-step timeline-step--done">
      <div class="timeline-track"><span class="timeline-marker timeline-marker--check" aria-hidden="true">✓</span></div>
      <span class="timeline-label">${statusLabelForCustomer(normalized)}</span>
    </li>`;
    orderStatusLookupTimeline.hidden = false;
    return;
  }
  const stepsByStatus = { new: 0, pending: 0, processing: 1, shipped: 2, completed: 3 };
  const activeIdx = stepsByStatus[normalized] ?? 0;
  const labels = ["התקבלה", "בייצור", "נשלחה", normalized === "cancelled" || normalized === "refunded" ? "בוטלה" : "נמסרה"];
  orderStatusLookupTimeline.innerHTML = labels
    .map((label, i) => {
      const done = i <= activeIdx;
      return `<li class="timeline-step ${done ? "timeline-step--done" : ""}">
        <div class="timeline-track">
          <span class="timeline-marker ${done ? "timeline-marker--check" : "timeline-marker--dot"}" aria-hidden="true">${done ? "✓" : ""}</span>
        </div>
        <span class="timeline-label">${label}</span>
      </li>`;
    })
    .join("");
  orderStatusLookupTimeline.hidden = false;
}

function findLocalOrderByNumber(orderNumber) {
  if (!orderNumber) return null;
  return readLocalDemoOrdersSafe().find((o) => normalizeOrderLookupInput(o?.orderNumber) === orderNumber) || null;
}

async function fetchOrderStatusLookup(orderNumber) {
  for (const base of buildApiBases()) {
    try {
      const url = `${base}/api/public/order-status?order_number=${encodeURIComponent(orderNumber)}`;
      const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 7000);
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (data?.order) return data.order;
    } catch {
      // try next base
    }
  }
  return null;
}

async function runOrderStatusLookup() {
  if (!orderStatusLookupInput || !orderStatusLookupMsg || !orderStatusLookupTimeline) return;
  const orderNumber = normalizeOrderLookupInput(orderStatusLookupInput.value);
  if (!orderNumber) {
    orderStatusLookupMsg.textContent = "הקלד מספר הזמנה תקין.";
    orderStatusLookupTimeline.hidden = true;
    return;
  }
  orderStatusLookupBtn?.setAttribute("disabled", "disabled");
  orderStatusLookupMsg.textContent = "מחפש הזמנה...";
  orderStatusLookupTimeline.hidden = true;

  let order = await fetchOrderStatusLookup(orderNumber);
  if (!order) {
    const local = findLocalOrderByNumber(orderNumber);
    if (local) {
      order = {
        order_number: local.orderNumber,
        status: local.status || "new",
        updated_at: local.updatedAt || local.createdAt || new Date().toISOString(),
      };
    }
  }

  orderStatusLookupBtn?.removeAttribute("disabled");
  if (!order) {
    orderStatusLookupMsg.textContent = "לא נמצאה הזמנה עם המספר הזה.";
    return;
  }
  orderStatusLookupMsg.textContent = `הזמנה ${order.order_number} · סטטוס נוכחי: ${statusLabelForCustomer(order.status)}`;
  renderStatusStepper(order.status);
}

function openOrderStatusLookup(prefillOrderNumber = "") {
  if (!orderStatusLookupPanel) return;
  orderStatusLookupPanel.hidden = false;
  if (orderStatusLookupInput && prefillOrderNumber) {
    orderStatusLookupInput.value = prefillOrderNumber;
  }
  orderStatusLookupInput?.focus();
}

function clampPctVal(v) {
  return Math.max(PCT_LO, Math.min(PCT_HI, v));
}

function normalizeOff(entry) {
  if (entry == null) return { xPct: 50, yPct: 50 };
  if (typeof entry.xPct === "number" && typeof entry.yPct === "number") {
    return { xPct: clampPctVal(entry.xPct), yPct: clampPctVal(entry.yPct) };
  }
  if (typeof entry.x === "number" && typeof entry.y === "number") {
    return {
      xPct: clampPctVal(50 + entry.x * 0.14),
      yPct: clampPctVal(50 + entry.y * 0.14),
    };
  }
  return { xPct: 50, yPct: 50 };
}

function defaultEmojiPct(i) {
  return { xPct: 22 + (i % 3) * 28, yPct: 20 + Math.floor(i / 3) * 22 };
}

function defaultTextBandY(i, n, position) {
  const base = position === "top" ? 22 : position === "bottom" ? 78 : 50;
  const spread = n > 1 ? Math.min(15, 42 / (n - 1)) : 0;
  return clampPctVal(base + (i - (n - 1) / 2) * spread);
}

/** מסדר מחדש את גובה כל שורות הטקסט לפי «מיקום» גלובלי — שומר x (גרירה אופקית). */
function redistributeTextLinesVertical() {
  const c = state.customization;
  const withText = c.textBlocks.filter((b) => String(b.text).trim());
  const n = Math.max(withText.length, 1);
  withText.forEach((b, idx) => {
    const o = (c.previewOffsets[b.id] ||= { xPct: 50, yPct: 50 });
    const norm = normalizeOff(o);
    o.xPct = norm.xPct;
    o.yPct = defaultTextBandY(idx, n, c.position);
  });
}

function migrateCustomizationLayout() {
  const c = state.customization;
  for (const b of c.textBlocks) {
    if (b.position != null) {
      if (c.textBlocks.length === 1) c.position = b.position;
      delete b.position;
    }
  }
  const o = c.previewOffsets;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v.x === "number" && typeof v.xPct !== "number") {
      o[k] = normalizeOff(v);
    }
  }
}

function nextEmojiBlockId() {
  let max = 0;
  for (const eb of state.customization.emojiBlocks) {
    const m = Number(/^e(\d+)$/.exec(eb.id)?.[1]);
    if (!Number.isNaN(m) && m > max) max = m;
  }
  return `e${max + 1}`;
}

function ensurePreviewOffsets() {
  const o = (state.customization.previewOffsets ||= {});
  state.customization.emojiBlocks.forEach((eb, i) => {
    if (o[eb.id] == null) {
      const d = defaultEmojiPct(i);
      o[eb.id] = { xPct: d.xPct, yPct: d.yPct };
    } else {
      o[eb.id] = normalizeOff(o[eb.id]);
    }
  });
  state.customization.textBlocks.forEach((b) => {
    if (o[b.id] == null) {
      const texts = state.customization.textBlocks.filter((x) => String(x.text).trim());
      const n = Math.max(texts.length, 1);
      const idx = texts.findIndex((x) => x.id === b.id);
      const yPct = idx >= 0 ? defaultTextBandY(idx, n, state.customization.position) : 50;
      o[b.id] = { xPct: 50, yPct };
    } else {
      o[b.id] = normalizeOff(o[b.id]);
    }
  });
}

function emojiSummaryText() {
  const parts = state.customization.emojiBlocks.map((e) => e.symbol).filter(Boolean);
  return parts.length ? parts.join(" ") : "ללא";
}

function openCustomerUploadPicker() {
  const input = document.getElementById("customerUploadInput");
  input?.click();
}

function setCustomerUploadFile(file) {
  if (!file) return;
  const safeName = String(file.name || "image").slice(0, 120);
  const reader = new FileReader();
  reader.onload = () => {
    state.customization.customerUpload = {
      name: safeName,
      type: String(file.type || ""),
      size: Number(file.size || 0),
      previewUrl: typeof reader.result === "string" ? reader.result : "",
    };
    renderCustomerUploadBox();
  };
  reader.readAsDataURL(file);
}

function renderCustomerUploadBox() {
  if (!customerUploadBoxEl) return;
  if (!currentProductSupportsCustomerUpload()) {
    customerUploadBoxEl.hidden = true;
    customerUploadBoxEl.innerHTML = "";
    state.customization.customerUpload = null;
    return;
  }
  customerUploadBoxEl.hidden = false;
  const up = state.customization.customerUpload;
  customerUploadBoxEl.innerHTML = `
    <label>העלאת תמונה אישית</label>
    <div class="customer-upload-dropzone" id="customerUploadDropzone" role="button" tabindex="0" aria-label="העלאת תמונה אישית">
      <strong>Drop here או לחצו להעלאה</strong>
      <span>JPG / PNG / WEBP</span>
      <input id="customerUploadInput" type="file" accept="image/*" hidden />
    </div>
    ${
      up
        ? `<div class="customer-upload-preview">
            ${up.previewUrl ? `<img src="${escHtml(up.previewUrl)}" alt="קובץ שהועלה" />` : ""}
            <p>${escHtml(up.name || "קובץ הועלה")}</p>
          </div>`
        : ""
    }
  `;
  const input = document.getElementById("customerUploadInput");
  const zone = document.getElementById("customerUploadDropzone");
  zone?.addEventListener("click", openCustomerUploadPicker);
  zone?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCustomerUploadPicker();
    }
  });
  input?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setCustomerUploadFile(file);
  });
  zone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("is-over");
  });
  zone?.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone?.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-over");
    const file = e.dataTransfer?.files?.[0];
    if (file) setCustomerUploadFile(file);
  });
}

function pricing() {
  const product = currentProduct();
  if (!product) return { subtotal: 0, shipping: 0, discount: 0, total: 0 };
  const subtotal = product.price * state.customization.qty;
  const shipping = state.step >= 2 ? currentShipping().fee : 0;
  const discount = state.couponApplied?.discount ?? 0;
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, shipping, discount, total };
}

function buildDemoStreetLine() {
  const c = state.checkout;
  const parts = [c.address, c.house].filter(Boolean);
  return parts.join(" ") || "—";
}

/** מבנה כמו `StudioDemoOrderJson` בפאנל — נשמר ב-localStorage */
function buildStudioDemoOrderPayload() {
  const product = currentProduct();
  if (!product) return null;
  const variant = currentVariant(product);
  const p = pricing();
  const now = new Date().toISOString();
  const orderNumber = generateFiveDigitOrderNumber();
  const id = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const c = state.checkout;
  const custId = studioCustomerId(c.phone, c.email);
  const textLines = state.customization.textBlocks.map((b) => String(b.text).trim()).filter(Boolean).join(" | ");
  const custBody = [
    `טקסט: ${textLines || state.customization.text || "—"}`,
    `סימנים: ${emojiSummaryText()}`,
    `צבע: ${variant.color || "ברירת מחדל"}`,
    `גימור: ${currentMaterial().label}`,
    `כמות: ${state.customization.qty}`,
  ];
  if (state.customization.notes) custBody.push(`הערות מוצר: ${state.customization.notes}`);
  if (state.customization.customerUpload?.name) {
    custBody.push(`קובץ שהלקוח העלה: ${state.customization.customerUpload.name}`);
  }
  const notesParts = [];
  if (c.deliveryNotes) notesParts.push(`הגעה למשלוח: ${c.deliveryNotes}`);
  if (c.aptFloor) notesParts.push(`דירה/קומה: ${c.aptFloor}`);
  const street = buildDemoStreetLine();
  const payLabel = paymentOptionById(state.checkout.paymentMethod).label;
  const qty = Math.max(1, state.customization.qty || 1);
  const cop = state.couponApplied;
  return {
    id,
    orderNumber,
    customerId: custId,
    customerName: (c.fullName || "").trim() || "לקוח",
    customerEmail: (c.email || "").trim() || undefined,
    customerPhone: (c.phone || "").trim() || undefined,
    status: "new",
    paymentStatus: "paid",
    paymentMethod: payLabel,
    shippingMethod: currentShipping().label,
    subtotal: p.subtotal,
    shippingCost: p.shipping,
    discount: p.discount,
    total: p.total,
    ...(cop ? { couponId: cop.id, couponCode: cop.code } : {}),
    shippingAddress: { street, city: (c.city || "").trim() || "—", zip: (c.zip || "").trim() || "—" },
    items: [
      {
        productId: product.id,
        productName: product.title,
        productImage: variant.image || "",
        sku: String(product.id).slice(0, 48),
        quantity: qty,
        price: p.subtotal / qty,
        customization: custBody.join(" · "),
      },
    ],
    notes: notesParts.length ? notesParts.join(" | ") : undefined,
    timeline: [{ status: "new", timestamp: now, note: "הזמנה מהסטודיו (דמה)" }],
    createdAt: now,
    updatedAt: now,
  };
}

function renderProgress() {
  progressEl.innerHTML = STUDIO_STEPS.map((label, i) => {
    const cls = i < state.step ? "done" : i === state.step ? "active" : "";
    return `<div class="step-pill ${cls}">
      <div class="step-pill-top">
        <span class="step-index">${i + 1}</span>
      </div>
      <div class="title">${label}</div>
    </div>`;
  }).join("");
  requestAnimationFrame(() => {
    const active = progressEl.querySelector(".step-pill.active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
}

function goToStep(target) {
  if (target < 0 || target > 3 || target === state.step) return;
  steps[state.step].classList.remove("active");
  state.step = target;
  steps[state.step].classList.add("active");
  renderProgress();
  renderNav();
  updatePricingUI();
  if (target === 2) renderCouponBox();
  if (target === 1) {
    syncPreviewGalleryFromSelectedVariant();
    updatePreview();
  }
}

function renderNav() {
  flowNav.style.display = state.step === 3 ? "none" : "flex";
  if (nextBtn) nextBtn.style.display = state.step === 3 ? "none" : "";
  if (backBtn) {
    backBtn.style.display = state.step === 3 ? "none" : "";
    backBtn.disabled = state.step === 0;
  }
  if (nextBtn) nextBtn.textContent = state.step === 2 ? "תשלום מאובטח (דמה)" : "המשך לשלב הבא";
}

function renderCategoryChips() {
  categoryChipsEl.innerHTML = runtimeCategories.map(
    (p) =>
      `<button class="chip ${state.activeCategoryId === p.id ? "active" : ""}" data-category-chip="${p.id}">${p.title}</button>`
  ).join("");
  requestAnimationFrame(() => {
    const active = categoryChipsEl.querySelector(".chip.active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
}

function renderCatalogSections() {
  if (!runtimeCategories.length) {
    catalogSectionsEl.innerHTML = `<section class="catalog-section"><p class="step-sub">אין כרגע מוצרים זמינים בקטלוג.</p></section>`;
    return;
  }
  let category = runtimeCategories.find((c) => c.id === state.activeCategoryId) || runtimeCategories[0];
  let items = runtimeItems.filter((p) => p.category === category.id);
  if (!items.length) {
    const firstCategoryWithItems = runtimeCategories.find((c) => runtimeItems.some((p) => p.category === c.id));
    if (firstCategoryWithItems) {
      category = firstCategoryWithItems;
      state.activeCategoryId = firstCategoryWithItems.id;
      items = runtimeItems.filter((p) => p.category === category.id);
      renderCategoryChips();
    }
  }
  if (!items.length) {
    catalogSectionsEl.innerHTML = `<section class="catalog-section" id="catalog-${category.id}">
      <h3 class="catalog-title">${category.title}</h3>
      <p class="step-sub">אין כרגע מוצרים זמינים בקטגוריה זו.</p>
    </section>`;
    return;
  }
    const rowRenderer = (rowItems, subTitle = "", scrollable = true) => `
      <div class="catalog-row-wrap">
        ${subTitle ? `<h4 class="catalog-subtitle">${subTitle}</h4>` : ""}
        ${
          scrollable
            ? `<div class="catalog-row-shell">
                <button class="row-nav-btn" type="button" data-row-nav="next" aria-label="המוצר הבא">‹</button>
                <div class="catalog-row">
                  ${rowItems
                    .map(
                      (p) => `<article class="product-card ${state.selectedProductId === p.id ? "selected" : ""}" data-product="${p.id}">
                        <span class="product-category-label">${categoryTitleById()[p.category] || "קטגוריה"}</span>
                        ${
                          currentVariant(p).image
                            ? `<img class="product-image" src="${currentVariant(p).image}" alt="${escHtml(p.title)}" loading="lazy" />`
                            : `<div class="product-image product-icon-stage" style="--product-bg:${currentVariant(p).swatch || "#f3eee7"}">
                                 ${productIconByCategory[p.category] || productIconByCategory.other}
                               </div>`
                        }
                        <h4 class="product-title">${p.title}</h4>
                        <strong class="product-price">${formatPrice(p.price)}</strong>
                        <div class="swatch-row">
                          ${p.variants
                            .map(
                              (v, index) =>
                                `<button class="color-swatch ${index === (state.selectedVariantByProduct[p.id] || 0) ? "active" : ""}" data-swatch-product="${p.id}" data-swatch-index="${index}" aria-label="${v.color}" style="--swatch:${v.swatch};"></button>`
                            )
                            .join("")}
                        </div>
                        <button class="select-btn" type="button" data-product="${p.id}">בחר</button>
                      </article>`
                    )
                    .join("")}
                </div>
                <button class="row-nav-btn" type="button" data-row-nav="prev" aria-label="המוצר הקודם">›</button>
              </div>`
            : `<div class="catalog-grid-static">
                ${rowItems
                  .map(
                    (p) => `<article class="product-card ${state.selectedProductId === p.id ? "selected" : ""}" data-product="${p.id}">
                      <span class="product-category-label">${categoryTitleById()[p.category] || "קטגוריה"}</span>
                      ${
                        currentVariant(p).image
                          ? `<img class="product-image" src="${currentVariant(p).image}" alt="${escHtml(p.title)}" loading="lazy" />`
                          : `<div class="product-image product-icon-stage" style="--product-bg:${currentVariant(p).swatch || "#f3eee7"}">
                               ${productIconByCategory[p.category] || productIconByCategory.other}
                             </div>`
                      }
                      <h4 class="product-title">${p.title}</h4>
                      <strong class="product-price">${formatPrice(p.price)}</strong>
                      <div class="swatch-row">
                        ${p.variants
                          .map(
                            (v, index) =>
                              `<button class="color-swatch ${index === (state.selectedVariantByProduct[p.id] || 0) ? "active" : ""}" data-swatch-product="${p.id}" data-swatch-index="${index}" aria-label="${v.color}" style="--swatch:${v.swatch};"></button>`
                          )
                          .join("")}
                      </div>
                      <button class="select-btn" type="button" data-product="${p.id}">בחר</button>
                    </article>`
                  )
                  .join("")}
              </div>`
        }
      </div>
    `;

    let rowsMarkup = "";
    if (category.useSubcategories) {
      const subcategories = [...new Set(items.map((p) => p.subcategory).filter(Boolean))];
      if (subcategories.length) {
        rowsMarkup = subcategories
          .map((sub) => {
            const rowItems = items.filter((p) => p.subcategory === sub);
            return rowRenderer(rowItems, sub);
          })
          .join("");
      } else {
        rowsMarkup = rowRenderer(items, "", true);
      }
    } else {
      const shouldBeStaticGrid = category.id === "keychains" || category.id === "other";
      rowsMarkup = rowRenderer(items, "", !shouldBeStaticGrid);
    }

  catalogSectionsEl.innerHTML = `
    <section class="catalog-section" id="catalog-${category.id}">
      <h3 class="catalog-title">${category.title}</h3>
      ${rowsMarkup}
    </section>
  `;
}

function currentProductGalleryUrls() {
  return galleryUrlsForProduct(currentProduct());
}

const GALLERY_THUMB_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect fill="#ede4dc" width="56" height="56" rx="10"/><path fill="none" stroke="#a08068" stroke-width="1.6" stroke-linecap="round" d="M20 34 L28 24 L36 34"/></svg>'
  );

function renderPreviewGallery() {
  if (!previewGalleryEl) return;
  const urls = currentProductGalleryUrls();
  if (!urls.length) {
    previewGalleryEl.hidden = true;
    previewGalleryEl.innerHTML = "";
    return;
  }
  previewGalleryEl.hidden = false;
  const n = urls.length;
  const idx = ((state.previewGalleryIndex % n) + n) % n;
  const navDisabled = n <= 1 ? "disabled" : "";
  previewGalleryEl.innerHTML = `<div class="preview-gallery-inner" dir="ltr">
    <button type="button" class="gal-nav gal-nav--prev" data-gallery-nav="prev" aria-label="\u05d4\u05e7\u05d5\u05d3\u05dd" ${navDisabled}>\u2039</button>
    <div class="gal-thumbs" role="list">
      ${urls
        .map(
          (u, i) =>
            `<button type="button" class="gal-thumb ${i === idx ? "active" : ""}" data-gallery-index="${i}" aria-label="\u05ea\u05de\u05d5\u05e0\u05d4 ${i + 1} \u05de-${n}">
              <img src="${String(u).replace(/"/g, "&quot;")}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${GALLERY_THUMB_FALLBACK}'" />
            </button>`
        )
        .join("")}
    </div>
    <button type="button" class="gal-nav gal-nav--next" data-gallery-nav="next" aria-label="\u05d4\u05d1\u05d0" ${navDisabled}>\u203a</button>
  </div>`;
  requestAnimationFrame(() => {
    const active = previewGalleryEl.querySelector(".gal-thumb.active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
}

function updatePreview() {
  const c = state.customization;
  const mat = currentMaterial();
  ensurePreviewOffsets();
  const o = c.previewOffsets;
  const rotY = state.previewAngle === "front" ? 0 : state.previewAngle === "side" ? 32 : 10;
  const rotX = state.previewAngle === "top" ? 25 : 8;

  const product = currentProduct();
  mockProductEl.classList.remove(
    "mock-product--necklaces",
    "mock-product--bracelets",
    "mock-product--keychains",
    "mock-product--other"
  );
  if (product) mockProductEl.classList.add(`mock-product--${product.category}`);

  mockProductEl.dataset.finish = mat.id;
  const urls = currentProductGalleryUrls();
  const n = urls.length;
  const gi = n ? ((state.previewGalleryIndex % n) + n) % n : 0;
  const bgUrl = n ? urls[gi] : "";
  if (bgUrl) {
    mockProductEl.style.backgroundImage = `url("${String(bgUrl).replace(/"/g, "")}")`;
    mockProductEl.style.backgroundSize = "cover";
    mockProductEl.style.backgroundPosition = "center";
    mockProductEl.style.backgroundColor = "#f3eee7";
  } else {
    mockProductEl.style.backgroundImage = "";
    mockProductEl.style.background = mat.tone;
  }

  const finalRotateY = rotY + state.dragRotateY;
  const finalRotateX = rotX + state.dragRotateX;
  mockProductEl.style.transform = `perspective(900px) rotateY(${finalRotateY}deg) rotateX(${finalRotateX}deg) rotate(${state.rotate}deg) scale(${state.zoom})`;

  if (!mockEngraveSurfaceEl) return;

  const fam = currentFont().family;
  const fs = c.size;
  const iconSize = Math.max(Math.round(fs * 0.95), 20);

  const emojiHtml = c.emojiBlocks
    .map((eb) => {
      const off = normalizeOff(o[eb.id]);
      return `<span class="mock-drag mock-drag-icon" data-drag-id="${eb.id}" style="left:${off.xPct}%;top:${off.yPct}%;transform:translate(-50%,-50%);font-size:${iconSize}px;line-height:1">${escHtml(eb.symbol)}</span>`;
    })
    .join("");

  const blocksHtml = c.textBlocks
    .map((b) => {
      if (!String(b.text).trim()) return "";
      const off = normalizeOff(o[b.id]);
      return `<span class="mock-drag mock-drag-text" data-drag-id="${b.id}" style="left:${off.xPct}%;top:${off.yPct}%;transform:translate(-50%,-50%)"><span class="mock-text-inner" style="font-family:${fam};font-size:${fs}px;text-align:${c.align}">${escHtml(b.text)}</span></span>`;
    })
    .join("");

  mockEngraveSurfaceEl.innerHTML = emojiHtml + blocksHtml;
  renderPreviewGallery();
}

function updatePricingUI() {
  const p = pricing();
  const selectedProduct = currentProduct();
  if (!selectedProduct) {
    orderSummaryEl.innerHTML = `<h3>סיכום הזמנה</h3><div class="summary-card">אין כרגע מוצר זמין להזמנה.</div>`;
    finalSummaryEl.innerHTML = `<strong>אין מוצר נבחר</strong>`;
    return;
  }
  const selectedVariant = currentVariant(selectedProduct);
  orderSummaryEl.innerHTML = `<h3>סיכום הזמנה</h3>
    <div class="selected-product-card">
      <div class="selected-product-image-wrap">
        ${
          selectedVariant.image
            ? `<img class="selected-product-image" src="${selectedVariant.image}" alt="${escHtml(selectedProduct.title)}" />`
            : `<div class="selected-product-image product-icon-stage" style="--product-bg:${selectedVariant.swatch || "#f3eee7"}">
                 ${productIconByCategory[selectedProduct.category] || productIconByCategory.other}
               </div>`
        }
      </div>
      <div class="selected-product-details">
        <strong class="selected-title">${selectedProduct.title}</strong>
        <span class="selected-desc">${selectedProduct.description || ""}</span>
        <span>צבע נבחר: ${selectedVariant.color}</span>
        <span>גימור: ${currentMaterial().label}</span>
        <span>סימנים: ${emojiSummaryText()}</span>
        <span>חריטה: "${state.customization.text || "ללא טקסט"}"</span>
        <span>כמות: ${state.customization.qty}</span>
        <span class="selected-status">סטטוס: זמין להתאמה אישית</span>
      </div>
    </div>
    <div class="summary-card">
      <strong>סיכום מחיר</strong><br>
      מחיר בסיס: ${formatPrice(selectedProduct.price)}<br>
      ביניים: ${formatPrice(p.subtotal)}<br>
      ${p.discount > 0 ? `קופון (${escHtml(state.couponApplied?.code || "")}): −${formatPrice(p.discount)}<br>` : ""}
      משלוח (${currentShipping().label}): ${formatShippingFeeDisplay(p.shipping)}<br>
      אמצעי תשלום: ${paymentOptionById(state.checkout.paymentMethod).label}<br>
      <strong>סה"כ לתשלום: ${formatPrice(p.total)}</strong><br>
      <span style="font-size:11px;color:#7f6653">ללא מעמ — המחיר כפי שמוצג</span><br>
      זמן אספקה: ${currentShipping().eta}
    </div>`;
  const orderNo =
    state.step === 3 && state.placedOrderNumber
      ? state.placedOrderNumber
      : "-----";
  finalSummaryEl.innerHTML = `<strong>מספר הזמנה:</strong> ${orderNo}<br>
      <strong>מוצר:</strong> ${selectedProduct.title}<br>
      <strong>סטטוס:</strong> התקבלה הזמנה<br>
      <strong>משלוח:</strong> ${currentShipping().label}<br>
      <strong>סה"כ:</strong> ${formatPrice(p.total)}`;
}

function renderOptionRows() {
  $("#materials").innerHTML = MATERIAL_OPTIONS.map((m) => {
    const swatch = m.id === "gold" ? "#d4af37" : m.id === "silver" ? "#c0c0c0" : m.id === "black-matte" ? "#2a2a2a" : "#d4a5a0";
    const dark = m.id === "black-matte";
    return `<button class="opt-btn material-btn ${dark ? "material-btn--dark" : ""} ${state.customization.materialId === m.id ? "active" : ""}" data-material="${m.id}" style="--mat:${swatch}">${m.label}</button>`;
  }).join("");
}

function renderEmojiBlocks() {
  const pickerWasOpen = emojiPickerEl.classList.contains("open");
  const pickerTarget = state.emojiPickerTargetId;
  const pickerEmojis = ["😀", "😍", "🎁", "✨", "💖", "🔥", "🙏", "💍"];
  emojiPickerEl.innerHTML = pickerEmojis
    .map((em) => `<button type="button" class="opt-btn emoji-btn" data-emoji="${em}">${em}</button>`)
    .join("");
  if (!emojiBlocksEl) return;
  const c = state.customization;
  emojiBlocksEl.innerHTML = c.emojiBlocks
    .map(
      (eb, index) => `
      <div class="emoji-block-card" data-emoji-row="${eb.id}">
        <div class="emoji-block-head">
          <span>סימן ${index + 1}</span>
          <button type="button" class="remove-block-btn" data-remove-emoji-block="${eb.id}" aria-label="מחק סימן">×</button>
        </div>
        <div class="emoji-block-current">${escHtml(eb.symbol)}</div>
        <div class="emoji-symbol-row">
          ${ICON_OPTIONS.map(
            (sym) =>
              `<button type="button" class="opt-btn emoji-symbol-btn ${eb.symbol === sym ? "active" : ""}" data-pick-symbol-for="${eb.id}">${escHtml(sym)}</button>`
          ).join("")}
          <button type="button" class="opt-btn emoji-symbol-btn" data-open-emoji-picker-for="${eb.id}" aria-label="בחר אימוג׳י">🙂</button>
        </div>
      </div>`
    )
    .join("");
  const targetStillExists = pickerTarget && c.emojiBlocks.some((e) => e.id === pickerTarget);
  if (pickerWasOpen && targetStillExists) {
    emojiPickerEl.classList.add("open");
  } else {
    emojiPickerEl.classList.remove("open");
    if (!targetStillExists) state.emojiPickerTargetId = null;
  }
}

function renderTextBlocks() {
  const canRemoveText = state.customization.textBlocks.length > 1;
  textBlocksEl.innerHTML = state.customization.textBlocks
    .map(
      (b, index) => `
      <div class="text-block-card">
        <div class="text-block-head">
          <span>טקסט ${index + 1}</span>
          ${
            canRemoveText
              ? `<button type="button" class="remove-block-btn" data-remove-text-block="${b.id}" aria-label="מחק שורת טקסט">×</button>`
              : ""
          }
        </div>
        <div class="form-grid text-block-fields">
          <label class="text-block-content-label">תוכן
            <input data-text-block-id="${b.id}" data-field="text" maxlength="40" value="${b.text}" />
          </label>
        </div>
      </div>`
    )
    .join("");
}

function renderCheckoutFields() {
  const fields = [
    ["fullName", "שם מלא"], ["phone", "טלפון"], ["email", "אימייל"], ["city", "עיר"],
    ["address", "רחוב"], ["house", "מספר בית"], ["aptFloor", "קומה / דירה"], ["zip", "מיקוד"], ["deliveryNotes", "הערות לשליח"],
  ];
  $("#checkoutFields").innerHTML = fields
    .map(([k, l]) => `<label>${l}${k === "deliveryNotes" ? `<textarea data-checkout="${k}">${state.checkout[k]}</textarea>` : `<input data-checkout="${k}" value="${state.checkout[k]}" />`}</label>`)
    .join("");
}

function renderShippingMethods() {
  $("#shippingMethods").innerHTML = SHIPPING_METHODS.map(
    (s) => `<button type="button" class="ship-card ${state.checkout.shippingId === s.id ? "active" : ""}" data-ship="${s.id}">
      <strong>${s.label}</strong><div class="ship-card-meta">${formatShippingFeeDisplay(s.fee)} · ${s.eta}</div></button>`
  ).join("");
}

function syncFormDefaults() {
  fontSelect.innerHTML = FONT_OPTIONS.map((f) => `<option value="${f.id}" ${f.id === state.customization.fontId ? "selected" : ""}>${f.label}</option>`).join("");
  fontSelect.value = state.customization.fontId;
  textSize.value = String(state.customization.size);
  qtyInput.value = String(state.customization.qty);
  notesInput.value = state.customization.notes;
  renderTextBlocks();
  renderEmojiBlocks();
}

function debounceCommitText() {
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => {
    state.customization.text = state.draftText;
    updatePreview();
    updatePricingUI();
  }, 220);
}

function setupEvents() {
  const dragState = { active: false, x: 0, y: 0 };
  const previewDrag = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    origXPct: 50,
    origYPct: 50,
    pointerId: null,
  };
  let recenterTimer = null;
  const scheduleRecenter = () => {
    clearTimeout(recenterTimer);
    recenterTimer = setTimeout(() => {
      state.dragRotateY = 0;
      state.dragRotateX = 0;
      updatePreview();
    }, 2000);
  };

  stageEl?.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".mock-drag")) return;
    dragState.active = true;
    dragState.x = e.clientX;
    dragState.y = e.clientY;
    stageEl.classList.add("is-dragging");
    stageEl.setPointerCapture?.(e.pointerId);
  });

  mockProductEl?.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".mock-drag");
    if (!el) return;
    e.stopPropagation();
    dragState.active = false;
    stageEl?.classList.remove("is-dragging");

    previewDrag.active = true;
    previewDrag.id = el.dataset.dragId;
    previewDrag.startX = e.clientX;
    previewDrag.startY = e.clientY;
    ensurePreviewOffsets();
    const key = previewDrag.id;
    const cur = normalizeOff(state.customization.previewOffsets[key]);
    state.customization.previewOffsets[key] = cur;
    previewDrag.origXPct = cur.xPct;
    previewDrag.origYPct = cur.yPct;
    previewDrag.pointerId = e.pointerId;
    el.setPointerCapture(e.pointerId);
  });

  window.addEventListener("pointermove", (e) => {
    if (previewDrag.active && e.pointerId === previewDrag.pointerId) {
      const rect = mockEngraveSurfaceEl?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return;
      const dx = e.clientX - previewDrag.startX;
      const dy = e.clientY - previewDrag.startY;
      const key = previewDrag.id;
      const dXPct = (dx / rect.width) * 100;
      const dYPct = (dy / rect.height) * 100;
      const xPct = clampPctVal(previewDrag.origXPct + dXPct);
      const yPct = clampPctVal(previewDrag.origYPct + dYPct);
      state.customization.previewOffsets[key] = { xPct, yPct };
      const target = mockEngraveSurfaceEl?.querySelector(`[data-drag-id="${key}"]`);
      if (target) {
        target.style.left = `${xPct}%`;
        target.style.top = `${yPct}%`;
        target.style.transform = "translate(-50%, -50%)";
      }
      return;
    }
    if (!dragState.active) return;
    const dx = e.clientX - dragState.x;
    const dy = e.clientY - dragState.y;
    dragState.x = e.clientX;
    dragState.y = e.clientY;
    state.dragRotateY = Math.max(-28, Math.min(28, state.dragRotateY + dx * 0.18));
    state.dragRotateX = Math.max(-18, Math.min(18, state.dragRotateX - dy * 0.12));
    updatePreview();
    scheduleRecenter();
  });

  const endPreviewDrag = (e) => {
    if (!previewDrag.active || e.pointerId !== previewDrag.pointerId) return;
    previewDrag.active = false;
    previewDrag.id = null;
    previewDrag.pointerId = null;
    updatePreview();
  };

  window.addEventListener("pointerup", (e) => {
    if (previewDrag.active && e.pointerId === previewDrag.pointerId) {
      endPreviewDrag(e);
      return;
    }
    if (!dragState.active) return;
    dragState.active = false;
    stageEl?.classList.remove("is-dragging");
    scheduleRecenter();
  });

  window.addEventListener("pointercancel", (e) => {
    endPreviewDrag(e);
    if (dragState.active) {
      dragState.active = false;
      stageEl?.classList.remove("is-dragging");
      scheduleRecenter();
    }
  });

  walletMenuTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = Boolean(walletMenu?.hidden);
    setWalletMenuOpen(willOpen);
    if (willOpen) renderWalletMenuList();
  });

  walletMenu?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pay-method]");
    if (!btn) return;
    e.stopPropagation();
    state.checkout.paymentMethod = btn.dataset.payMethod;
    renderWalletPaymentUI();
    setWalletMenuOpen(false);
    updatePricingUI();
  });

  orderStatusLookupToggleBtn?.addEventListener("click", () => openOrderStatusLookup(state.placedOrderNumber || ""));
  orderStatusLookupFooterBtn?.addEventListener("click", () => openOrderStatusLookup(state.placedOrderNumber || ""));
  orderStatusLookupBtn?.addEventListener("click", () => {
    runOrderStatusLookup();
  });
  orderStatusLookupInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runOrderStatusLookup();
    }
  });

  document.body.addEventListener("click", (e) => {
    if (!e.target.closest(".wallet-menu-wrap")) setWalletMenuOpen(false);

    const chip = e.target.closest("[data-category-chip]");
    if (chip && state.step === 0) {
      clearCouponOnCartChange();
      state.activeCategoryId = chip.dataset.categoryChip;
      renderCategoryChips();
      const firstInCategory = runtimeItems.find((p) => p.category === state.activeCategoryId);
      if (firstInCategory) state.selectedProductId = firstInCategory.id;
      renderCatalogSections();
      updatePricingUI();
      return;
    }

    const swatchBtn = e.target.closest("[data-swatch-product]");
    if (swatchBtn && state.step === 0) {
      const productId = swatchBtn.dataset.swatchProduct;
      const variantIndex = Number(swatchBtn.dataset.swatchIndex);
      state.selectedVariantByProduct[productId] = variantIndex;
      renderCatalogSections();
      if (state.selectedProductId === productId) {
        renderCustomerUploadBox();
        syncPreviewGalleryFromSelectedVariant();
        updatePricingUI();
        if (state.step === 1) updatePreview();
      }
      return;
    }

    const navBtn = e.target.closest("[data-row-nav]");
    if (navBtn) {
      const direction = navBtn.dataset.rowNav;
      const row = navBtn.parentElement?.querySelector(".catalog-row");
      if (!row) return;
      const cards = [...row.querySelectorAll(".product-card")];
      const cardsCount = cards.length;
      if (!cardsCount) return;
      const firstCard = cards[0];
      const step = firstCard ? firstCard.getBoundingClientRect().width + 12 : 240;
      const visibleCount = Math.max(1, Math.floor(row.clientWidth / step));
      const maxIndex = Math.max(0, cardsCount - visibleCount);
      let currentIndex = Number(row.dataset.index || "0");

      if (direction === "next") {
        currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      } else {
        currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      }

      row.dataset.index = String(currentIndex);
      cards[currentIndex].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      return;
    }

    const productCard = e.target.closest("[data-product]");
    if (productCard && state.step === 0) {
      clearCouponOnCartChange();
      state.selectedProductId = productCard.dataset.product;
      const pv = runtimeItems.find((x) => x.id === state.selectedProductId);
      if (pv) trackProductView(pv.id, pv.title);
      if (!pv?.allowCustomerImageUpload) state.customization.customerUpload = null;
      renderCustomerUploadBox();
      renderCatalogSections();
      const selected = catalogSectionsEl.querySelector(`[data-product="${state.selectedProductId}"]`);
      if (selected) selected.classList.add("picked");
      clearTimeout(state.selectionTimer);
      state.selectionTimer = setTimeout(() => goToStep(1), 280);
      updatePricingUI();
    }

    const rmText = e.target.closest("[data-remove-text-block]");
    if (rmText) {
      if (state.customization.textBlocks.length > 1) {
        const tid = rmText.dataset.removeTextBlock;
        state.customization.textBlocks = state.customization.textBlocks.filter((b) => b.id !== tid);
        delete state.customization.previewOffsets[tid];
        state.draftText = state.customization.textBlocks[0]?.text || "";
        state.customization.text = state.customization.textBlocks[0]?.text || "";
        renderTextBlocks();
        redistributeTextLinesVertical();
        updatePreview();
        updatePricingUI();
      }
      return;
    }

    const rmEmoji = e.target.closest("[data-remove-emoji-block]");
    if (rmEmoji) {
      const eid = rmEmoji.dataset.removeEmojiBlock;
      state.customization.emojiBlocks = state.customization.emojiBlocks.filter((x) => x.id !== eid);
      delete state.customization.previewOffsets[eid];
      if (state.emojiPickerTargetId === eid) {
        state.emojiPickerTargetId = null;
        emojiPickerEl.classList.remove("open");
      }
      renderEmojiBlocks();
      updatePreview();
      return;
    }

    const pickSym = e.target.closest("[data-pick-symbol-for]");
    if (pickSym) {
      const bid = pickSym.dataset.pickSymbolFor;
      const blk = state.customization.emojiBlocks.find((x) => x.id === bid);
      if (blk) blk.symbol = pickSym.textContent.trim() || blk.symbol;
      renderEmojiBlocks();
      updatePreview();
      return;
    }

    const openEmojiFor = e.target.closest("[data-open-emoji-picker-for]");
    if (openEmojiFor) {
      const bid = openEmojiFor.dataset.openEmojiPickerFor;
      if (emojiPickerEl.classList.contains("open") && state.emojiPickerTargetId === bid) {
        emojiPickerEl.classList.remove("open");
        state.emojiPickerTargetId = null;
      } else {
        state.emojiPickerTargetId = bid;
        emojiPickerEl.classList.add("open");
      }
      return;
    }

    const emojiPickBtn = e.target.closest("[data-emoji]");
    if (emojiPickBtn && emojiPickerEl.contains(emojiPickBtn)) {
      const targetId = state.emojiPickerTargetId;
      if (targetId) {
        const blk = state.customization.emojiBlocks.find((x) => x.id === targetId);
        if (blk) blk.symbol = emojiPickBtn.dataset.emoji || blk.symbol;
      }
      emojiPickerEl.classList.remove("open");
      state.emojiPickerTargetId = null;
      renderEmojiBlocks();
      updatePreview();
      return;
    }

    const galThumb = e.target.closest("[data-gallery-index]");
    if (galThumb && previewGalleryEl?.contains(galThumb)) {
      state.previewGalleryIndex = Number(galThumb.dataset.galleryIndex) || 0;
      syncVariantFromGallerySelection();
      updatePreview();
      updatePricingUI();
      return;
    }
    const galNav = e.target.closest("[data-gallery-nav]");
    if (galNav && previewGalleryEl?.contains(galNav)) {
      if (galNav.disabled) return;
      const urls = currentProductGalleryUrls();
      if (urls.length <= 1) return;
      const n = urls.length;
      if (galNav.dataset.galleryNav === "next") state.previewGalleryIndex += 1;
      else state.previewGalleryIndex -= 1;
      state.previewGalleryIndex = ((state.previewGalleryIndex % n) + n) % n;
      syncVariantFromGallerySelection();
      updatePreview();
      updatePricingUI();
      return;
    }

    const matBtn = e.target.closest("[data-material]");
    if (matBtn) { state.customization.materialId = matBtn.dataset.material; renderOptionRows(); updatePreview(); }
    const shipBtn = e.target.closest("[data-ship]");
    if (shipBtn) {
      clearCouponOnCartChange();
      state.checkout.shippingId = shipBtn.dataset.ship;
      renderShippingMethods();
      updatePricingUI();
    }

    if (e.target.matches('[data-action="back"]')) goToStep(state.step - 1);
    if (e.target.matches('[data-action="next"]')) {
      if (state.step === 2) {
        state.processing = true;
        nextBtn.disabled = true;
        nextBtn.textContent = "מעבד תשלום...";
        setTimeout(() => {
          const payload = buildStudioDemoOrderPayload();
          if (payload) {
            appendStudioDemoOrder(payload);
            state.placedOrderNumber = payload.orderNumber;
            if (orderStatusLookupInput) orderStatusLookupInput.value = payload.orderNumber;
            if (payload.couponId) {
              postJsonBases("/api/public/redeem-coupon", { coupon_id: payload.couponId });
            }
          }
          state.processing = false;
          nextBtn.disabled = false;
          goToStep(3);
        }, 1100);
      } else {
        goToStep(state.step + 1);
      }
    }
    if (e.target.matches('[data-action="restart"]')) {
      state.placedOrderNumber = null;
      state.couponApplied = null;
      renderCouponBox();
      goToStep(0);
    }

    if (e.target.matches('[data-action="apply-coupon"]')) {
      e.preventDefault();
      applyCouponFromUi();
    }
    if (e.target.matches('[data-action="remove-coupon"]')) {
      e.preventDefault();
      removeCoupon();
    }
  });

  addTextBlockBtn?.addEventListener("click", () => {
    const id = `t${state.customization.textBlocks.length + 1}`;
    state.customization.textBlocks.push({ id, text: "" });
    ensurePreviewOffsets();
    renderTextBlocks();
    updatePreview();
  });

  addEmojiBlockBtn?.addEventListener("click", () => {
    const id = nextEmojiBlockId();
    const i = state.customization.emojiBlocks.length;
    state.customization.emojiBlocks.push({ id, symbol: ICON_OPTIONS[0] });
    const d = defaultEmojiPct(i);
    state.customization.previewOffsets[id] = { xPct: d.xPct, yPct: d.yPct };
    renderEmojiBlocks();
    updatePreview();
  });

  textBlocksEl?.addEventListener("input", (e) => {
    const id = e.target.dataset.textBlockId;
    const field = e.target.dataset.field;
    if (!id || !field) return;
    const block = state.customization.textBlocks.find((b) => b.id === id);
    if (!block) return;
    const prevVal = block[field];
    block[field] = e.target.value;
    if (field === "text") {
      const had = String(prevVal).trim();
      const has = String(block.text).trim();
      if (had !== has) redistributeTextLinesVertical();
    }
    state.draftText = state.customization.textBlocks[0]?.text || "";
    state.customization.text = state.customization.textBlocks[0]?.text || "";
    debounceCommitText();
  });

  textBlocksEl?.addEventListener("change", (e) => {
    const id = e.target.dataset.textBlockId;
    const field = e.target.dataset.field;
    if (!id || !field) return;
    const block = state.customization.textBlocks.find((b) => b.id === id);
    if (!block) return;
    block[field] = e.target.value;
    updatePreview();
  });

  fontSelect.addEventListener("change", (e) => { state.customization.fontId = e.target.value; updatePreview(); });
  textSize.addEventListener("input", (e) => { state.customization.size = Number(e.target.value); updatePreview(); });
  qtyInput.addEventListener("input", (e) => {
    clearCouponOnCartChange();
    state.customization.qty = Math.max(1, Number(e.target.value) || 1);
    updatePricingUI();
  });
  notesInput.addEventListener("input", (e) => { state.customization.notes = e.target.value; });

  document.body.addEventListener("input", (e) => {
    const field = e.target.dataset.checkout;
    if (field) state.checkout[field] = e.target.value;
  });
}

function normalizeStudioWhatsappDigits(value) {
  let raw = String(value || "").replace(/\D/g, "");
  if (!raw) return null;
  if (raw.startsWith("972")) return raw;
  if (raw.startsWith("0")) return "972" + raw.slice(1);
  if (raw.length >= 9) return "972" + raw;
  return raw;
}

function applyStudioWhatsappButton(digits) {
  const d = digits || DEFAULT_STUDIO_WHATSAPP;
  state.whatsappPhone = d;
  if (studioWhatsappBtn) {
    studioWhatsappBtn.href = `https://wa.me/${d}`;
    studioWhatsappBtn.hidden = false;
  }
}

async function loadSiteMeta() {
  let fromApi = null;
  const bases = buildApiBases();
  for (const base of bases) {
    try {
      const res = await fetchWithTimeout(`${base}/api/public/site`, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const j = await res.json();
      fromApi = normalizeStudioWhatsappDigits(j.whatsapp);
      if (fromApi) break;
    } catch {
      /* next base */
    }
  }
  applyStudioWhatsappButton(fromApi || DEFAULT_STUDIO_WHATSAPP);
}

async function init() {
  const qs = new URLSearchParams(window.location.search);
  const openStatusLookupFromLanding = qs.get("status") === "1";
  initMarketingBeacon({ context: "studio" });
  await Promise.all([loadProductsFromDatabase(), loadSiteMeta()]);
  state.selectedVariantByProduct = Object.fromEntries(runtimeItems.map((p) => [p.id, 0]));
  state.activeCategoryId = runtimeCategories[0]?.id || state.activeCategoryId;
  state.selectedProductId =
    runtimeItems.find((p) => p.category === state.activeCategoryId)?.id || runtimeItems[0]?.id || state.selectedProductId;

  migrateCustomizationLayout();
  renderProgress();
  renderNav();
  renderCategoryChips();
  renderCatalogSections();
  renderOptionRows();
  renderCheckoutFields();
  renderShippingMethods();
  renderWalletPaymentUI();
  syncFormDefaults();
  renderCustomerUploadBox();
  ensurePreviewOffsets();
  redistributeTextLinesVertical();
  updatePreview();
  updatePricingUI();
  setupEvents();
  renderCouponBox();
  if (openStatusLookupFromLanding) {
    goToStep(3);
    openOrderStatusLookup("");
  }
}

init();
