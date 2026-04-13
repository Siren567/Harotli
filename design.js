import {
  STUDIO_STEPS,
  PRODUCT_CATEGORIES,
  FONT_OPTIONS,
  MATERIAL_OPTIONS,
  SIZE_OPTIONS,
  ICON_OPTIONS,
  SHIPPING_METHODS,
} from "./studio-data.js";

const state = {
  step: 0,
  filter: "הכל",
  selectedProductId: PRODUCT_CATEGORIES[0].id,
  previewAngle: "front",
  zoom: 1,
  rotate: 0,
  processing: false,
  selectionTimer: null,
  typingTimer: null,
  draftText: "באהבה גדולה",
  customization: {
    text: "באהבה גדולה",
    fontId: FONT_OPTIONS[0].id,
    size: 28,
    position: "center",
    align: "center",
    icon: ICON_OPTIONS[0],
    materialId: MATERIAL_OPTIONS[0].id,
    sizeId: SIZE_OPTIONS[1].id,
    qty: 1,
    giftWrap: false,
    notes: "",
  },
  checkout: {
    fullName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    house: "",
    zip: "",
    deliveryNotes: "",
    shippingId: SHIPPING_METHODS[0].id,
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  },
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const steps = $$("[data-step]");

const progressEl = $("#progress");
const filtersEl = $("#filters");
const productGridEl = $("#productGrid");
const mockProductEl = $("#mockProduct");
const mockEngravingEl = $("#mockEngraving");
const priceSummaryEl = $("#priceSummary");
const orderSummaryEl = $("#orderSummary");
const finalSummaryEl = $("#finalSummary");
const flowNav = $("#flowNav");
const nextBtn = flowNav.querySelector('[data-action="next"]');
const backBtn = flowNav.querySelector('[data-action="back"]');

const engraveInput = $("#engraveInput");
const fontSelect = $("#fontSelect");
const textSize = $("#textSize");
const positionSelect = $("#positionSelect");
const alignSelect = $("#alignSelect");
const qtyInput = $("#qtyInput");
const giftWrap = $("#giftWrap");
const notesInput = $("#notesInput");

const formatPrice = (n) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const currentProduct = () => PRODUCT_CATEGORIES.find((p) => p.id === state.selectedProductId) || PRODUCT_CATEGORIES[0];
const currentMaterial = () => MATERIAL_OPTIONS.find((m) => m.id === state.customization.materialId) || MATERIAL_OPTIONS[0];
const currentSize = () => SIZE_OPTIONS.find((s) => s.id === state.customization.sizeId) || SIZE_OPTIONS[0];
const currentShipping = () => SHIPPING_METHODS.find((s) => s.id === state.checkout.shippingId) || SHIPPING_METHODS[0];
const currentFont = () => FONT_OPTIONS.find((f) => f.id === state.customization.fontId) || FONT_OPTIONS[0];

function pricing() {
  const base = currentProduct().price;
  const gift = state.customization.giftWrap ? 14 : 0;
  const subtotal = (base * currentSize().multiplier + gift) * state.customization.qty;
  const shipping = state.step >= 2 ? currentShipping().fee : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderProgress() {
  progressEl.innerHTML = STUDIO_STEPS.map((label, i) => {
    const cls = i < state.step ? "done" : i === state.step ? "active" : "";
    const status = i < state.step ? "הושלם" : i === state.step ? "פעיל" : "ממתין";
    return `<div class="step-pill ${cls}"><div class="mini">${status}</div><div class="title">${label}</div></div>`;
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
}

function renderNav() {
  flowNav.style.display = state.step === 3 ? "none" : "flex";
  backBtn.disabled = state.step === 0;
  nextBtn.textContent = state.step === 2 ? "תשלום מאובטח (דמה)" : "המשך לשלב הבא";
}

function renderFilters() {
  const filters = ["הכל", "עץ", "מתכת", "משולב"];
  filtersEl.innerHTML = filters
    .map((f) => `<button class="chip ${state.filter === f ? "active" : ""}" data-filter="${f}">${f}</button>`)
    .join("");
}

function renderProducts() {
  const items = PRODUCT_CATEGORIES.filter((p) => state.filter === "הכל" || p.material === state.filter);
  productGridEl.innerHTML = items
    .map(
      (p) => `<article class="product-card ${state.selectedProductId === p.id ? "selected" : ""}" data-product="${p.id}">
        <img src="${p.image}" alt="${p.title}" />
        <h4>${p.title}</h4>
        <p>${p.description}</p>
        <strong>החל מ־${formatPrice(p.price)}</strong>
      </article>`
    )
    .join("");
}

function updatePreview() {
  const c = state.customization;
  const tone = currentMaterial().tone;
  const rotY = state.previewAngle === "front" ? 0 : state.previewAngle === "side" ? 32 : 10;
  const rotX = state.previewAngle === "top" ? 25 : 8;
  const top = c.position === "top" ? "18%" : c.position === "center" ? "45%" : "72%";

  mockProductEl.style.background = tone;
  mockProductEl.style.transform = `perspective(900px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotate(${state.rotate}deg) scale(${state.zoom})`;
  mockEngravingEl.style.top = top;
  mockEngravingEl.style.textAlign = c.align;
  mockEngravingEl.style.fontFamily = currentFont().family;
  mockEngravingEl.style.fontSize = `${c.size}px`;
  mockEngravingEl.textContent = `${c.icon} ${c.text}`;
}

function updatePricingUI() {
  const p = pricing();
  priceSummaryEl.innerHTML = `<strong>סיכום מחיר חי</strong><br>ביניים: ${formatPrice(p.subtotal)} · סה"כ: ${formatPrice(p.total)}`;
  orderSummaryEl.innerHTML = `<h3>סיכום הזמנה</h3>
    <img src="${currentProduct().image}" alt="${currentProduct().title}" style="width:100%;border-radius:12px;aspect-ratio:16/9;object-fit:cover;">
    <div class="summary-card">
      <strong>${currentProduct().title}</strong><br>
      חריטה: ${state.customization.text}<br>
      מידה: ${currentSize().dimensions}<br>
      כמות: ${state.customization.qty}<br>
      ביניים: ${formatPrice(p.subtotal)}<br>
      משלוח: ${formatPrice(p.shipping)}<br>
      <strong>סה"כ: ${formatPrice(p.total)}</strong><br>
      הגעה משוערת: ${currentShipping().eta}
    </div>`;
  finalSummaryEl.innerHTML = `<strong>מספר הזמנה:</strong> HG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}<br>
      <strong>מוצר:</strong> ${currentProduct().title}<br>
      <strong>חריטה:</strong> ${state.customization.text}<br>
      <strong>משלוח:</strong> ${currentShipping().label}`;
}

function renderOptionRows() {
  $("#icons").innerHTML = ICON_OPTIONS.map((i) => `<button class="opt-btn ${state.customization.icon === i ? "active" : ""}" data-icon="${i}">${i}</button>`).join("");
  $("#materials").innerHTML = MATERIAL_OPTIONS.map((m) => `<button class="opt-btn ${state.customization.materialId === m.id ? "active" : ""}" data-material="${m.id}">${m.label}</button>`).join("");
  $("#sizes").innerHTML = SIZE_OPTIONS.map((s) => `<button class="opt-btn ${state.customization.sizeId === s.id ? "active" : ""}" data-size="${s.id}">${s.label} · ${s.dimensions}</button>`).join("");
}

function renderCheckoutFields() {
  const fields = [
    ["fullName", "שם מלא"], ["phone", "טלפון"], ["email", "אימייל"], ["city", "עיר"],
    ["address", "רחוב"], ["house", "מספר בית"], ["zip", "מיקוד"], ["deliveryNotes", "הערות לשליח"],
  ];
  $("#checkoutFields").innerHTML = fields
    .map(([k, l]) => `<label>${l}${k === "deliveryNotes" ? `<textarea data-checkout="${k}">${state.checkout[k]}</textarea>` : `<input data-checkout="${k}" value="${state.checkout[k]}" />`}</label>`)
    .join("");
}

function renderShippingMethods() {
  $("#shippingMethods").innerHTML = SHIPPING_METHODS.map((s) => `<button class="ship-card ${state.checkout.shippingId === s.id ? "active" : ""}" data-ship="${s.id}">
      <strong>${s.label}</strong><div>${formatPrice(s.fee)} · ${s.eta}</div></button>`).join("");
}

function syncFormDefaults() {
  engraveInput.value = state.draftText;
  fontSelect.innerHTML = FONT_OPTIONS.map((f) => `<option value="${f.id}" ${f.id === state.customization.fontId ? "selected" : ""}>${f.label}</option>`).join("");
  fontSelect.value = state.customization.fontId;
  textSize.value = String(state.customization.size);
  positionSelect.value = state.customization.position;
  alignSelect.value = state.customization.align;
  qtyInput.value = String(state.customization.qty);
  giftWrap.value = String(state.customization.giftWrap);
  notesInput.value = state.customization.notes;
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
  document.body.addEventListener("click", (e) => {
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter;
      renderFilters();
      renderProducts();
    }

    const productCard = e.target.closest("[data-product]");
    if (productCard && state.step === 0) {
      state.selectedProductId = productCard.dataset.product;
      renderProducts();
      const selected = productGridEl.querySelector(`[data-product="${state.selectedProductId}"]`);
      if (selected) selected.classList.add("picked");
      clearTimeout(state.selectionTimer);
      state.selectionTimer = setTimeout(() => goToStep(1), 280);
      updatePricingUI();
    }

    const iconBtn = e.target.closest("[data-icon]");
    if (iconBtn) { state.customization.icon = iconBtn.dataset.icon; renderOptionRows(); updatePreview(); }
    const matBtn = e.target.closest("[data-material]");
    if (matBtn) { state.customization.materialId = matBtn.dataset.material; renderOptionRows(); updatePreview(); }
    const sizeBtn = e.target.closest("[data-size]");
    if (sizeBtn) { state.customization.sizeId = sizeBtn.dataset.size; renderOptionRows(); updatePricingUI(); }
    const shipBtn = e.target.closest("[data-ship]");
    if (shipBtn) { state.checkout.shippingId = shipBtn.dataset.ship; renderShippingMethods(); updatePricingUI(); }

    const angleBtn = e.target.closest("[data-angle]");
    if (angleBtn) {
      state.previewAngle = angleBtn.dataset.angle;
      $$("[data-angle]").forEach((b) => b.classList.toggle("active", b.dataset.angle === state.previewAngle));
      updatePreview();
    }

    if (e.target.matches('[data-action="zoom-plus"]')) { state.zoom = Math.min(1.4, state.zoom + 0.08); updatePreview(); }
    if (e.target.matches('[data-action="zoom-minus"]')) { state.zoom = Math.max(0.8, state.zoom - 0.08); updatePreview(); }
    if (e.target.matches('[data-action="rotate"]')) { state.rotate += 12; updatePreview(); }
    if (e.target.matches('[data-action="back"]')) goToStep(state.step - 1);
    if (e.target.matches('[data-action="next"]')) {
      if (state.step === 2) {
        state.processing = true;
        nextBtn.disabled = true;
        nextBtn.textContent = "מעבד תשלום...";
        setTimeout(() => {
          state.processing = false;
          nextBtn.disabled = false;
          goToStep(3);
        }, 1100);
      } else {
        goToStep(state.step + 1);
      }
    }
    if (e.target.matches('[data-action="restart"]')) goToStep(0);
  });

  engraveInput.addEventListener("input", (e) => {
    state.draftText = e.target.value;
    debounceCommitText();
  });

  fontSelect.addEventListener("change", (e) => { state.customization.fontId = e.target.value; updatePreview(); });
  textSize.addEventListener("input", (e) => { state.customization.size = Number(e.target.value); updatePreview(); });
  positionSelect.addEventListener("change", (e) => { state.customization.position = e.target.value; updatePreview(); });
  alignSelect.addEventListener("change", (e) => { state.customization.align = e.target.value; updatePreview(); });
  qtyInput.addEventListener("input", (e) => { state.customization.qty = Math.max(1, Number(e.target.value) || 1); updatePricingUI(); });
  giftWrap.addEventListener("change", (e) => { state.customization.giftWrap = e.target.value === "true"; updatePricingUI(); });
  notesInput.addEventListener("input", (e) => { state.customization.notes = e.target.value; });

  document.body.addEventListener("input", (e) => {
    const field = e.target.dataset.checkout;
    if (field) state.checkout[field] = e.target.value;
  });
}

function init() {
  renderProgress();
  renderNav();
  renderFilters();
  renderProducts();
  renderOptionRows();
  renderCheckoutFields();
  renderShippingMethods();
  syncFormDefaults();
  updatePreview();
  updatePricingUI();
  setupEvents();
}

init();
