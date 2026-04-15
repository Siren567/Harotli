function apiBases() {
  const host = window.location.hostname || "localhost";
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const candidates = [
    "",
    window.location.origin || "",
    `${protocol}//${host}:4444`,
    `${protocol}//${host}:3000`,
    `http://${host}:4444`,
    `https://${host}:4444`,
    `http://${host}:3000`,
    `https://${host}:3000`,
    "http://localhost:4444",
    "http://localhost:3000",
  ];
  return [...new Set(candidates.filter(Boolean))];
}

function fmtMoney(v) {
  return `${Number(v || 0).toFixed(2)} ₪`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status) {
  const m = {
    new: "התקבלה הזמנה",
    pending: "התקבלה הזמנה",
    processing: "בייצור",
    shipped: "נשלחה",
    completed: "נמסרה",
    cancelled: "בוטלה",
    refunded: "בוטלה",
  };
  return m[status] || status || "לא ידוע";
}

function statusStepIndex(status) {
  const key = String(status || "").toLowerCase();
  if (key === "new") return 0;
  if (key === "pending") return 0;
  if (key === "processing") return 1;
  if (key === "shipped") return 2;
  if (key === "completed") return 3;
  if (key === "cancelled" || key === "refunded") return 0;
  return 0;
}

function normalizeInput(v) {
  const src = String(v || "").trim();
  if (!src) return "";
  if (/^HG-\d{4}-\d{5}$/i.test(src)) return src.toUpperCase();
  const digits = src.replace(/\D/g, "");
  if (digits.length >= 5) return digits;
  return src.toUpperCase();
}

async function fetchOrder(orderNumber) {
  for (const base of apiBases()) {
    try {
      const res = await fetch(`${base}/api/public/order-status?order_number=${encodeURIComponent(orderNumber)}`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.order) return json.order;
    } catch {
      // try next base
    }
  }
  return null;
}

function renderOrder(order) {
  const result = document.getElementById("orderResult");
  const summary = document.getElementById("orderSummaryGrid");
  const timeline = document.getElementById("orderTimeline");
  const items = document.getElementById("orderItems");
  if (!result || !summary || !timeline || !items) return;

  summary.innerHTML = [
    ["מספר הזמנה", order.order_number],
    ["סטטוס", statusLabel(order.status)],
    ["לקוח", order.customer_name || "—"],
    ["טלפון", order.customer_phone || "—"],
    ["תשלום", order.payment_method || "—"],
    ["משלוח", order.shipping_method || "—"],
    ["סכום ביניים", fmtMoney(order.subtotal)],
    ["משלוח", fmtMoney(order.shipping_cost)],
    ["הנחה", fmtMoney(order.discount_amount)],
    ["סה״כ", fmtMoney(order.total)],
  ]
    .map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`)
    .join("");

  const normalizedStatus = String(order.status || "").toLowerCase();
  const isDelivered = normalizedStatus === "completed";
  const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === "refunded";
  const steps = ["התקבלה", "בייצור", "נשלחה", isCancelled ? "בוטלה" : "נמסרה"];
  const active = isCancelled ? steps.length - 1 : statusStepIndex(order.status);
  const fillPercent = (active / Math.max(steps.length - 1, 1)) * 84;
  timeline.innerHTML = `
    <div class="timeline-fill" style="width:${fillPercent}%;"></div>
    ${steps
      .map((label, i) => {
        const stateClass = i < active ? "done" : i === active ? "active" : "";
        return `<div class="t-step ${stateClass}">
          <div class="t-circle">${i + 1}</div>
          <div class="t-label">${esc(label)}</div>
        </div>`;
      })
      .join("")}
  `;
  timeline.classList.toggle("timeline--delivered", isDelivered);
  timeline.classList.toggle("timeline--cancelled", isCancelled);
  timeline.classList.toggle("timeline--normal", !isDelivered && !isCancelled);
  const doneIcon = timeline.querySelector(".t-step:last-child .t-circle");
  if (doneIcon && isDelivered) doneIcon.textContent = "✓";
  if (doneIcon && isCancelled) doneIcon.textContent = "✕";

  const list = Array.isArray(order.items) ? order.items : [];
  items.innerHTML = list.length
    ? list
        .map(
          (it) => `<div class="item">
            <div class="item-title">${esc(it.product_name || "פריט")}</div>
            <div class="item-meta">כמות: ${esc(it.quantity)} · מחיר יחידה: ${esc(fmtMoney(it.unit_price))} · סה"כ: ${esc(fmtMoney(it.total_price))}</div>
            ${it.customization ? `<div class="item-meta">התאמה: ${esc(it.customization)}</div>` : ""}
          </div>`
        )
        .join("")
    : `<div class="item"><div class="item-meta">לא נמצאו פריטים להזמנה זו.</div></div>`;

  result.hidden = false;
}

async function runLookup() {
  const input = document.getElementById("orderLookupInput");
  const msg = document.getElementById("orderLookupMsg");
  const btn = document.getElementById("orderLookupBtn");
  const result = document.getElementById("orderResult");
  if (!input || !msg || !btn || !result) return;

  const number = normalizeInput(input.value);
  if (!number) {
    msg.textContent = "יש להזין מספר הזמנה.";
    result.hidden = true;
    return;
  }

  btn.setAttribute("disabled", "disabled");
  msg.textContent = "מחפש הזמנה...";
  result.hidden = true;
  const order = await fetchOrder(number);
  btn.removeAttribute("disabled");

  if (!order) {
    msg.textContent = "לא נמצאה הזמנה עם המספר הזה.";
    return;
  }
  msg.textContent = "הזמנה נמצאה.";
  renderOrder(order);
}

function init() {
  const input = document.getElementById("orderLookupInput");
  const btn = document.getElementById("orderLookupBtn");
  btn?.addEventListener("click", runLookup);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runLookup();
    }
  });
}

init();
