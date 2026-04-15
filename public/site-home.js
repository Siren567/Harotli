import { formatShekelDisplay as formatPrice } from "./price-display.js";
import { initMarketingBeacon } from "./marketing-beacon.js";

function apiBases() {
  const host = window.location.hostname || "localhost";
  const origin = window.location.origin || "";
  return [origin, "", `http://${host}:4444`, `http://localhost:4444`, `http://${host}:3000`];
}

async function fetchJson(path) {
  for (const base of apiBases()) {
    try {
      const url = `${base}${path}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) return await res.json();
    } catch {
      /* try next */
    }
  }
  return null;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

const DEFAULT_WHATSAPP = "972559433968";

function waDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("972")) return d;
  if (d.startsWith("0")) return "972" + d.slice(1);
  if (d.length >= 9) return "972" + d;
  return d;
}

async function renderFeatured() {
  const grid = document.getElementById("featuredProductsGrid");
  const loading = document.getElementById("featuredLoading");
  if (!grid) return;
  if (loading) loading.hidden = false;
  const data = await fetchJson("/api/public/featured");
  const items = Array.isArray(data?.items) ? data.items : [];
  if (loading) loading.hidden = true;
  if (!items.length) {
    grid.innerHTML = `<p class="featured-empty">בקרוב יתעדכן כאן — ניתן לבחור מוצרים מומלצים בפאנל הניהול.</p>`;
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `
      <div class="product-card fade-up visible">
        <div class="product-image">
          <div class="product-image-inner">
            ${
              it.image
                ? `<img src="${esc(it.image)}" alt="${esc(it.name)}" width="640" height="384" loading="lazy" decoding="async" />`
                : `<div class="product-image-placeholder"></div>`
            }
          </div>
        </div>
        <div class="product-info">
          <h3>${esc(it.name)}</h3>
          <div class="price">החל מ־${formatPrice(it.price)}</div>
          <a href="./design.html" class="btn-secondary">
            <i data-lucide="shopping-bag"></i>
            לעיצוב
          </a>
        </div>
      </div>`
    )
    .join("");
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function mountWhatsappFab(phoneDigits) {
  const digits = phoneDigits || DEFAULT_WHATSAPP;
  const existing = document.getElementById("siteWhatsappFab");
  if (existing) existing.remove();
  const a = document.createElement("a");
  a.id = "siteWhatsappFab";
  a.className = "site-whatsapp-fab";
  a.href = `https://wa.me/${digits}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", "שליחת הודעה בווצאפ");
  a.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  document.body.appendChild(a);
}

async function main() {
  initMarketingBeacon({ context: "landing" });
  const site = await fetchJson("/api/public/site");
  const wa = waDigits(site?.whatsapp) || DEFAULT_WHATSAPP;
  mountWhatsappFab(wa);
  await renderFeatured();
}

main();
