/** סנכרון עם admin-panel/studio-demo-storage — אותו מפתח localStorage */
const STUDIO_DEMO_ORDERS_KEY = "harotli_studio_demo_orders_v2";
function studioCustomerId(phone, email) {
  const raw = `${String(phone || "").trim()}|${String(email || "").trim().toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `studio-${Math.abs(h).toString(36)}`;
}
function appendStudioDemoOrder(order) {
  try {
    const raw = localStorage.getItem(STUDIO_DEMO_ORDERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) {
      localStorage.setItem(STUDIO_DEMO_ORDERS_KEY, JSON.stringify([order]));
      return;
    }
    arr.unshift(order);
    while (arr.length > 200) arr.pop();
    localStorage.setItem(STUDIO_DEMO_ORDERS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("[studio-demo-sync] appendStudioDemoOrder:", e);
  }
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

function buildApiBases() {
  const host = window.location.hostname || "localhost";
  return ["http://localhost:4444", `http://${host}:4444`, `http://${host}:3000`, ""];
}
async function fetchWithTimeout(url, options = {}, ms = 8000) {
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
      /* next */
    }
  }
  return null;
}

function clearCouponOnCartChangeShopify() {
  if (state.couponApplied) {
    state.couponApplied = null;
    renderCouponBoxShopify();
  }
}

function renderCouponBoxShopify() {
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

async function applyCouponFromUiShopify() {
  const input = document.getElementById("couponCodeInput");
  const errEl = document.getElementById("couponErr");
  const code = (input?.value || "").trim();
  if (!code) {
    if (errEl) errEl.textContent = "הזן קוד קופון";
    return;
  }
  const product = currentProduct();
  if (!product) return;
  const gift = state.customization.giftWrap ? 14 : 0;
  const addon = state.customization.extraAddon === "priority" ? 19 : state.customization.extraAddon === "doubleEngrave" ? 29 : 0;
  const subtotal = (product.price * currentSize().multiplier + gift + addon) * state.customization.qty;
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
  renderCouponBoxShopify();
  updatePricingUI();
}

function removeCouponShopify() {
  state.couponApplied = null;
  renderCouponBoxShopify();
  updatePricingUI();
}

const STUDIO_STEPS = ["בחירת מוצר", "התאמה אישית", "משלוח ותשלום", "אישור"];

const PRODUCT_CATEGORIES = [
  {
    id: "necklaces",
    title: "שרשראות",
    useSubcategories: true,
  },
  {
    id: "bracelets",
    title: "צמידים",
    useSubcategories: true,
  },
  {
    id: "keychains",
    title: "מחזיקי מפתחות",
    useSubcategories: false,
  },
  {
    id: "other",
    title: "אחר",
    useSubcategories: false,
  },
];

const SWATCH_MAP = {
  gold: { color: "זהב", swatch: "#D4AF37" },
  silver: { color: "כסוף", swatch: "#C0C0C0" },
  black: { color: "שחור", swatch: "#2B2B2B" },
  rose: { color: "רוז גולד", swatch: "#B76E79" },
  white: { color: "לבן", swatch: "#F7F7F5" },
  beige: { color: "בז׳", swatch: "#DCC8AA" },
};

const IMAGE_BANK = {
  necklacesMen: {
    silver: ["https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    black: ["https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    gold: ["https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
  necklacesWomen: {
    gold: ["https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    rose: ["https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    silver: ["https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
  braceletsMen: {
    black: ["https://images.pexels.com/photos/9428789/pexels-photo-9428789.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    silver: ["https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    gold: ["https://images.pexels.com/photos/10983790/pexels-photo-10983790.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
  braceletsWomen: {
    gold: ["https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    rose: ["https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    silver: ["https://images.pexels.com/photos/5370698/pexels-photo-5370698.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
  keychains: {
    silver: ["https://images.pexels.com/photos/2079451/pexels-photo-2079451.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    black: ["https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    gold: ["https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
  other: {
    white: ["https://images.pexels.com/photos/9826127/pexels-photo-9826127.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    black: ["https://images.pexels.com/photos/585750/pexels-photo-585750.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
    beige: ["https://images.pexels.com/photos/6164042/pexels-photo-6164042.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop"],
  },
};

function makeVariants(imageSet, variantKeys, offset = 0) {
  return variantKeys.map((key, idx) => {
    const images = imageSet[key] || imageSet.silver || imageSet.gold || Object.values(imageSet)[0];
    return {
      ...SWATCH_MAP[key],
      image: images[(offset + idx) % images.length],
    };
  });
}

function buildSeries({ prefix, category, subcategory, titleBase, description, startPrice, imageSet, variantKeys }, count = 8) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `${prefix}-${idx + 1}`,
    category,
    subcategory,
    title: `${titleBase} ${idx + 1}`,
    description,
    price: startPrice + (idx % 4) * 15,
    variants: makeVariants(imageSet, variantKeys, idx),
  }));
}

const PRODUCT_ITEMS = [
  ...buildSeries({
    prefix: "n-men",
    category: "necklaces",
    subcategory: "שרשראות לגבר",
    titleBase: "שרשרת גבר קלאסית",
    description: "שרשרת נקייה במראה גברי יוקרתי.",
    startPrice: 189,
    imageSet: IMAGE_BANK.necklacesMen,
    variantKeys: ["silver", "black", "gold"],
  }),
  ...buildSeries({
    prefix: "n-women",
    category: "necklaces",
    subcategory: "שרשראות לאישה",
    titleBase: "שרשרת נשית עדינה",
    description: "שרשרת אלגנטית עם נגיעה אישית.",
    startPrice: 199,
    imageSet: IMAGE_BANK.necklacesWomen,
    variantKeys: ["gold", "rose", "silver"],
  }),
  ...buildSeries({
    prefix: "b-men",
    category: "bracelets",
    subcategory: "צמידים לגבר",
    titleBase: "צמיד גבר מינימל",
    description: "צמיד גברי בגימור נקי ומדויק.",
    startPrice: 169,
    imageSet: IMAGE_BANK.braceletsMen,
    variantKeys: ["black", "silver", "gold"],
  }),
  ...buildSeries({
    prefix: "b-women",
    category: "bracelets",
    subcategory: "צמידים לאישה",
    titleBase: "צמיד נשי מעודן",
    description: "צמיד עדין עם אפשרות חריטה אישית.",
    startPrice: 179,
    imageSet: IMAGE_BANK.braceletsWomen,
    variantKeys: ["gold", "rose", "silver"],
  }),
  ...buildSeries({
    prefix: "k",
    category: "keychains",
    subcategory: null,
    titleBase: "מחזיק מפתחות חריטה",
    description: "מחזיק קומפקטי בעיצוב אישי.",
    startPrice: 89,
    imageSet: IMAGE_BANK.keychains,
    variantKeys: ["silver", "black", "gold"],
  }),
  ...buildSeries({
    prefix: "o",
    category: "other",
    subcategory: null,
    titleBase: "מתנת חריטה מיוחדת",
    description: "מוצר מתנה ייחודי בקטגוריית אחר.",
    startPrice: 149,
    imageSet: IMAGE_BANK.other,
    variantKeys: ["white", "black", "beige"],
  }).map((item, idx) => ({
    ...item,
    title: idx < 4 ? `סט ספלים ${idx + 1}` : idx < 7 ? `סט סכום ${idx - 3}` : `מוצר חריטה נוסף ${idx - 6}`,
  })),
];

const FONT_OPTIONS = [
  { id: "heebo", label: "Heebo קלאסי", family: "'Heebo', sans-serif" },
  { id: "serif", label: "אלגנט סריף", family: "'Times New Roman', serif" },
  { id: "mono", label: "מודרני נקי", family: "'Courier New', monospace" },
  { id: "script", label: "כתב רך", family: "'Brush Script MT', cursive" },
  { id: "assistant", label: "Assistant נקי", family: "'Assistant', sans-serif" },
  { id: "rubik", label: "Rubik מודרני", family: "'Rubik', sans-serif" },
  { id: "david", label: "David קלאסי", family: "'David', serif" },
  { id: "arial", label: "Arial נגיש", family: "Arial, sans-serif" },
];

const MATERIAL_OPTIONS = [
  { id: "gold", label: "זהב", tone: "linear-gradient(150deg, #f2e6b8 0%, #d4af37 42%, #9a7224 100%)" },
  { id: "silver", label: "כסף", tone: "linear-gradient(150deg, #f7f7f7 0%, #c8c8c8 48%, #8e8e8e 100%)" },
  { id: "black-matte", label: "שחור מאט", tone: "linear-gradient(155deg, #3a3a3a 0%, #1a1a1a 55%, #0f0f0f 100%)" },
  { id: "rose-gold", label: "רוז גולד", tone: "linear-gradient(150deg, #fce4e6 0%, #e8b4b8 45%, #b76e79 100%)" },
];

const SIZE_OPTIONS = [
  { id: "s", label: "קטן", dimensions: "20x12 ס\"מ", multiplier: 1 },
  { id: "m", label: "בינוני", dimensions: "28x18 ס\"מ", multiplier: 1.15 },
  { id: "l", label: "גדול", dimensions: "35x24 ס\"מ", multiplier: 1.35 },
];

const ICON_OPTIONS = ["❤", "✦", "∞", "☼", "✿", "✶"];

const SHIPPING_METHODS = [
  { id: "home", label: "משלוח עד הבית", fee: 0, eta: "עד 7 ימי עסקים" },
  { id: "express", label: "משלוח אקספרס", fee: 50, eta: "עד 2 ימי עסקים" },
  { id: "pickup", label: "איסוף עצמי — תשלום מראש", fee: 0, eta: "תוך 24 שעות" },
  { id: "pickup-cash", label: "איסוף עצמי — תשלום במזומן", fee: 0, eta: "תוך 24 שעות" },
];

/** אפשרויות תשלום לתפריט הארנקים (UI דמה בלבד). */
const PAYMENT_METHOD_OPTIONS = [
  { id: "card", label: "כרטיס אשראי", brand: null },
  { id: "google_pay", label: "Google Pay", brand: "google" },
  { id: "apple_pay", label: "Apple Pay", brand: "apple" },
  { id: "bit", label: "ביט", brand: "bit" },
  { id: "paypal", label: "PayPal", brand: "paypal" },
];

const state = {
  step: 0,
  placedOrderNumber: null,
  couponApplied: null,
  selectedProductId: PRODUCT_ITEMS[0].id,
  activeCategoryId: PRODUCT_CATEGORIES[0].id,
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
    sizeId: SIZE_OPTIONS[1].id,
    qty: 1,
    giftWrap: false,
    extraAddon: "none",
    notes: "",
    previewOffsets: { e1: { xPct: 26, yPct: 26 }, t1: { xPct: 50, yPct: 50 } },
  },
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
  selectedVariantByProduct: Object.fromEntries(PRODUCT_ITEMS.map((p) => [p.id, 0])),
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
const positionSelect = $("#positionSelect");
const alignSelect = $("#alignSelect");
const qtyInput = $("#qtyInput");
const giftWrap = $("#giftWrap");
const notesInput = $("#notesInput");
const stageEl = document.querySelector(".stage");
const textBlocksEl = $("#textBlocks");
const emojiBlocksEl = $("#emojiBlocks");
const addTextBlockBtn = $("#addTextBlock");
const addEmojiBlockBtn = $("#addEmojiBlock");
const extraAddonEl = $("#extraAddon");
const emojiPickerEl = $("#emojiPicker");
const walletMenuTrigger = $("#walletMenuTrigger");
const walletMenu = $("#walletMenu");
const walletTriggerInner = $("#walletTriggerInner");
const cardFieldsGrid = $("#cardFieldsGrid");
const walletMockHint = $("#walletMockHint");
const couponBoxEl = $("#couponBox");

/** תצוגת מחיר (כמו price-display.js): שלם עם ספרת אחדות 0 או 4 → (N−1).90, אחרת N.90; לא שלם → שתי ספרות כרגיל. */
function formatPrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "₪0.00";
  if (num < 0) return "₪0.00";
  const agorot = Math.round(num * 100);
  if (agorot === 0) return "₪0.00";
  if (agorot % 100 !== 0) {
    return `₪${(agorot / 100).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const shekels = agorot / 100;
  const last = shekels % 10;
  const base = last === 0 || last === 4 ? shekels - 1 : shekels;
  const displayAgorot = base * 100 + 90;
  return `₪${(displayAgorot / 100).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
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
const categoryTitleById = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c.id, c.title]));
const currentProduct = () => PRODUCT_ITEMS.find((p) => p.id === state.selectedProductId) || PRODUCT_ITEMS[0];
const currentVariant = (product) => {
  const idx = state.selectedVariantByProduct[product.id] || 0;
  return product.variants[idx] || product.variants[0];
};
const productIconByCategory = {
  necklaces: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a7.5 7.5 0 0 0-7.5 7.5c0 3 2.1 5.8 5 7.5l2.5 1.5 2.5-1.5c2.9-1.7 5-4.5 5-7.5A7.5 7.5 0 0 0 12 4Zm0 4.2a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z"/></svg>`,
  bracelets: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5c-4.2 0-7.5 2.9-7.5 6.5s3.3 6.5 7.5 6.5 7.5-2.9 7.5-6.5-3.3-6.5-7.5-6.5Zm0 3.2c2.3 0 4.1 1.5 4.1 3.3S14.3 15.3 12 15.3 7.9 13.8 7.9 12 9.7 8.7 12 8.7Z"/></svg>`,
  keychains: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 4.5-3.1H20v-2.1h-2v-2h-2.2v2h-2.3A4.8 4.8 0 0 0 9 6.2Zm0 2.3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>`,
  other: `<svg class="product-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8h15v10.5h-15V8Zm2-3h11l1.5 3h-14L6.5 5Zm5.5 6.2h0c-1.2 0-2.1.9-2.1 2.1s.9 2.1 2.1 2.1 2.1-.9 2.1-2.1-.9-2.1-2.1-2.1Z"/></svg>`,
};
const currentMaterial = () => MATERIAL_OPTIONS.find((m) => m.id === state.customization.materialId) || MATERIAL_OPTIONS[0];
const currentSize = () => SIZE_OPTIONS.find((s) => s.id === state.customization.sizeId) || SIZE_OPTIONS[0];
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

function pricing() {
  const base = currentProduct().price;
  const gift = state.customization.giftWrap ? 14 : 0;
  const addon = state.customization.extraAddon === "priority" ? 19 : state.customization.extraAddon === "doubleEngrave" ? 29 : 0;
  const subtotal = (base * currentSize().multiplier + gift + addon) * state.customization.qty;
  const shipping = state.step >= 2 ? currentShipping().fee : 0;
  const discount = state.couponApplied?.discount ?? 0;
  const subAfter = Math.max(0, subtotal - discount);
  const preVat = subAfter + shipping;
  const vat = preVat * 0.17;
  return { subtotal, discount, shipping, addon, vat, total: preVat + vat };
}

function buildShopifyDemoStreetLine() {
  const c = state.checkout;
  const parts = [c.address, c.house].filter(Boolean);
  return parts.join(" ") || "—";
}

function buildStudioDemoOrderPayloadShopify() {
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
  const extras = [];
  if (state.customization.giftWrap) extras.push("אריזת מתנה");
  if (state.customization.extraAddon === "priority") extras.push("תיעדוף ייצור");
  if (state.customization.extraAddon === "doubleEngrave") extras.push("חריטה כפולה");
  const custBody = [
    `טקסט: ${textLines || state.customization.text || "—"}`,
    `סימנים: ${emojiSummaryText()}`,
    `צבע: ${variant.color || "ברירת מחדל"}`,
    `גימור: ${currentMaterial().label}`,
    `מידה: ${currentSize().dimensions}`,
    `כמות: ${state.customization.qty}`,
    extras.length ? `תוספות: ${extras.join(", ")}` : null,
  ].filter(Boolean);
  if (state.customization.notes) custBody.push(`הערות מוצר: ${state.customization.notes}`);
  const notesParts = [];
  if (c.deliveryNotes) notesParts.push(`הגעה למשלוח: ${c.deliveryNotes}`);
  if (c.aptFloor) notesParts.push(`דירה/קומה: ${c.aptFloor}`);
  const street = buildShopifyDemoStreetLine();
  const payLabel = paymentOptionById(state.checkout.paymentMethod).label;
  const qty = Math.max(1, state.customization.qty || 1);
  const cop = state.couponApplied;
  const lineNet = Math.max(0, p.subtotal - (p.discount ?? 0));
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
    discount: p.discount ?? 0,
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
        price: lineNet / qty,
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
}

function goToStep(target) {
  if (target < 0 || target > 3 || target === state.step) return;
  steps[state.step].classList.remove("active");
  state.step = target;
  steps[state.step].classList.add("active");
  renderProgress();
  renderNav();
  updatePricingUI();
  if (target === 2) renderCouponBoxShopify();
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
  categoryChipsEl.innerHTML = PRODUCT_CATEGORIES.map(
    (p) =>
      `<button class="chip ${state.activeCategoryId === p.id ? "active" : ""}" data-category-chip="${p.id}">${p.title}</button>`
  ).join("");
}

function renderCatalogSections() {
  const category = PRODUCT_CATEGORIES.find((c) => c.id === state.activeCategoryId) || PRODUCT_CATEGORIES[0];
  const items = PRODUCT_ITEMS.filter((p) => p.category === category.id);
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
                        <span class="product-category-label">${categoryTitleById[p.category] || "קטגוריה"}</span>
                        <div class="product-image product-icon-stage" style="--product-bg:${currentVariant(p).swatch || "#f3eee7"}">
                          ${productIconByCategory[p.category] || productIconByCategory.other}
                        </div>
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
                      <span class="product-category-label">${categoryTitleById[p.category] || "קטגוריה"}</span>
                      <div class="product-image product-icon-stage" style="--product-bg:${currentVariant(p).swatch || "#f3eee7"}">
                        ${productIconByCategory[p.category] || productIconByCategory.other}
                      </div>
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
      rowsMarkup = subcategories
        .map((sub) => {
          const rowItems = items.filter((p) => p.subcategory === sub);
          return rowRenderer(rowItems, sub);
        })
        .join("");
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

function updatePreview() {
  const c = state.customization;
  const mat = currentMaterial();
  ensurePreviewOffsets();
  const o = c.previewOffsets;
  const rotY = state.previewAngle === "front" ? 0 : state.previewAngle === "side" ? 32 : 10;
  const rotX = state.previewAngle === "top" ? 25 : 8;

  mockProductEl.dataset.finish = mat.id;
  mockProductEl.style.background = mat.tone;
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
}

function updatePricingUI() {
  const p = pricing();
  const selectedProduct = currentProduct();
  const selectedVariant = currentVariant(selectedProduct);
  const addonsText =
    state.customization.giftWrap || state.customization.extraAddon !== "none"
      ? `אריזת מתנה: ${state.customization.giftWrap ? "₪14" : "₪0"}<br>
         תוספת מיוחדת: ${
           state.customization.extraAddon === "priority"
             ? "תיעדוף ייצור ₪19"
             : state.customization.extraAddon === "doubleEngrave"
             ? "חריטה כפולה ₪29"
             : "ללא ₪0"
         }`
      : "תוספות: ללא ₪0";
  orderSummaryEl.innerHTML = `<h3>סיכום הזמנה</h3>
    <div class="selected-product-card">
      <div class="selected-product-image-wrap">
        <div class="selected-product-image product-icon-stage" style="--product-bg:${selectedVariant.swatch || "#f3eee7"}">
          ${productIconByCategory[selectedProduct.category] || productIconByCategory.other}
        </div>
      </div>
      <div class="selected-product-details">
        <strong class="selected-title">${selectedProduct.title}</strong>
        <span class="selected-desc">${selectedProduct.description || ""}</span>
        <span>צבע נבחר: ${selectedVariant.color}</span>
        <span>גימור: ${currentMaterial().label}</span>
        <span>סימנים: ${emojiSummaryText()}</span>
        <span>חריטה: "${state.customization.text || "ללא טקסט"}"</span>
        <span>מידה: ${currentSize().dimensions} · כמות: ${state.customization.qty}</span>
        <span class="selected-status">סטטוס: זמין להתאמה אישית</span>
      </div>
    </div>
    <div class="summary-card">
      <strong>סיכום מחיר</strong><br>
      מחיר בסיס: ${formatPrice(selectedProduct.price)}<br>
      ביניים: ${formatPrice(p.subtotal)}<br>
      ${addonsText}<br>
      ${p.discount > 0 ? `קופון (${escHtml(state.couponApplied?.code || "")}): −${formatPrice(p.discount)}<br>` : ""}
      משלוח (${currentShipping().label}): ${formatShippingFeeDisplay(p.shipping)}<br>
      מע"מ (17%): ${formatPrice(p.vat)}<br>
      אמצעי תשלום: ${paymentOptionById(state.checkout.paymentMethod).label}<br>
      <strong>סה"כ לתשלום: ${formatPrice(p.total)}</strong><br>
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
  $("#sizes").innerHTML = SIZE_OPTIONS.map((s, idx) => `<button class="opt-btn size-btn size-${idx + 1} ${state.customization.sizeId === s.id ? "active" : ""}" data-size="${s.id}">${s.label} · ${s.dimensions}</button>`).join("");
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
  if (positionSelect) positionSelect.value = state.customization.position;
  alignSelect.value = state.customization.align;
  qtyInput.value = String(state.customization.qty);
  giftWrap.value = String(state.customization.giftWrap);
  extraAddonEl.value = state.customization.extraAddon;
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

  document.body.addEventListener("click", (e) => {
    if (!e.target.closest(".wallet-menu-wrap")) setWalletMenuOpen(false);

    const chip = e.target.closest("[data-category-chip]");
    if (chip && state.step === 0) {
      clearCouponOnCartChangeShopify();
      state.activeCategoryId = chip.dataset.categoryChip;
      renderCategoryChips();
      const firstInCategory = PRODUCT_ITEMS.find((p) => p.category === state.activeCategoryId);
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
      if (state.selectedProductId === productId) updatePricingUI();
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
      clearCouponOnCartChangeShopify();
      state.selectedProductId = productCard.dataset.product;
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

    const matBtn = e.target.closest("[data-material]");
    if (matBtn) {
      clearCouponOnCartChangeShopify();
      state.customization.materialId = matBtn.dataset.material;
      renderOptionRows();
      updatePreview();
    }
    const sizeBtn = e.target.closest("[data-size]");
    if (sizeBtn) {
      clearCouponOnCartChangeShopify();
      state.customization.sizeId = sizeBtn.dataset.size;
      renderOptionRows();
      updatePricingUI();
    }
    const shipBtn = e.target.closest("[data-ship]");
    if (shipBtn) {
      clearCouponOnCartChangeShopify();
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
          const payload = buildStudioDemoOrderPayloadShopify();
          if (payload) {
            appendStudioDemoOrder(payload);
            state.placedOrderNumber = payload.orderNumber;
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
      renderCouponBoxShopify();
      goToStep(0);
    }
    if (e.target.matches('[data-action="apply-coupon"]')) {
      e.preventDefault();
      applyCouponFromUiShopify();
    }
    if (e.target.matches('[data-action="remove-coupon"]')) {
      e.preventDefault();
      removeCouponShopify();
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
  positionSelect?.addEventListener("change", (e) => {
    state.customization.position = e.target.value;
    redistributeTextLinesVertical();
    updatePreview();
  });
  alignSelect.addEventListener("change", (e) => { state.customization.align = e.target.value; updatePreview(); });
  qtyInput.addEventListener("input", (e) => {
    clearCouponOnCartChangeShopify();
    state.customization.qty = Math.max(1, Number(e.target.value) || 1);
    updatePricingUI();
  });
  giftWrap.addEventListener("change", (e) => {
    clearCouponOnCartChangeShopify();
    state.customization.giftWrap = e.target.value === "true";
    updatePricingUI();
  });
  extraAddonEl.addEventListener("change", (e) => {
    clearCouponOnCartChangeShopify();
    state.customization.extraAddon = e.target.value;
    updatePricingUI();
  });
  notesInput.addEventListener("input", (e) => { state.customization.notes = e.target.value; });

  document.body.addEventListener("input", (e) => {
    const field = e.target.dataset.checkout;
    if (field) state.checkout[field] = e.target.value;
  });
}

function init() {
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
  ensurePreviewOffsets();
  redistributeTextLinesVertical();
  updatePreview();
  updatePricingUI();
  setupEvents();
  renderCouponBoxShopify();
}

init();
