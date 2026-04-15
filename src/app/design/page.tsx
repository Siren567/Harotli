import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "סטודיו לעיצוב מתנה | חרוטלי",
  description: "עצבו את המתנה המושלמת — חריטה אישית על צמידים, תליונים ומחזיקי מפתחות.",
};

export default function DesignPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Heebo:wght@300;400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/design.css" />

      <main className="app-shell">
        <header className="studio-topbar">
          <div className="topbar-row">
            <button type="button" className="btn secondary topbar-prev" data-action="back">חזרה לשלב הקודם</button>
            <button type="button" className="btn primary topbar-next" data-action="next">המשך לשלב הבא</button>
          </div>
          <div className="progress" id="progress"></div>
        </header>

        <section className="step active" data-step="0">
          <h2>בחירת קטגוריית מוצר</h2>
          <p className="step-sub">בחרו קטגוריה וצפו בקטלוג מוצרים אופקי בסגנון פרימיום.</p>
          <div className="chip-row" id="categoryChips"></div>
          <div id="catalogSections"></div>
        </section>

        <section className="step" data-step="1">
          <div className="custom-layout">
            <div className="viewer">
              <h3>תצוגת סטודיו</h3>
              <div className="viewer-stage-stack">
                <div className="stage">
                  <div className="mock-product" id="mockProduct">
                    <div className="mock-engrave-surface" id="mockEngraveSurface"></div>
                  </div>
                </div>
                <div className="preview-gallery" id="previewGallery" hidden aria-label="גלריית תמונות מוצר"></div>
              </div>
            </div>
            <aside className="panel">
              <div className="panel-title-row">
                <h4>עמוד עיצוב</h4>
              </div>
              <div className="engrave-header">
                <label className="engrave-main-label">טקסט לחריטה</label>
                <button className="add-text-btn" type="button" id="addTextBlock" aria-label="הוספת שורת טקסט">+</button>
              </div>
              <div id="textBlocks"></div>
              <div className="form-grid form-grid-studio">
                <label>פונט<select id="fontSelect"></select></label>
                <label>גודל<input id="textSize" type="range" min="16" max="50" /></label>
              </div>
              <div className="field-group">
                <div className="engrave-header">
                  <span className="field-title engrave-inline-title">אימוג׳ים וסימנים</span>
                  <button className="add-text-btn" type="button" id="addEmojiBlock" aria-label="הוספת סימן">+</button>
                </div>
                <div id="emojiBlocks"></div>
                <div id="emojiPicker" className="emoji-picker"></div>
                <p className="field-hint">בחרו סימן לכל שורה או פתחו את בוחר האימוג׳י; בתצוגה אפשר לגרור כל סימן בנפרד.</p>
              </div>
              <div className="field-group">
                <span className="field-title">בחירת צבעים</span>
                <div className="opt-row colors-row" id="materials"></div>
              </div>
              <div className="field-group field-group-qty">
                <label>כמות<input id="qtyInput" type="number" min="1" /></label>
              </div>
              <div className="field-group" id="customerUploadBox" hidden></div>
              <label>הערות מיוחדות<textarea id="notesInput" rows={2}></textarea></label>
            </aside>
          </div>
        </section>

        <section className="step" data-step="2">
          <div className="checkout-layout">
            <div className="panel">
              <h3>משלוח ותשלום</h3>
              <div className="form-grid" id="checkoutFields"></div>
              <h4>קופון</h4>
              <div id="couponBox" className="coupon-box"></div>
              <h4>שיטת משלוח</h4>
              <div className="ship-row" id="shippingMethods"></div>
              <h4>תשלום (דמה)</h4>
              <div className="wallet-menu-wrap">
                <button type="button" className="wallet-menu-trigger" id="walletMenuTrigger" aria-haspopup="listbox" aria-expanded="false">
                  <span className="wallet-trigger-inner" id="walletTriggerInner"></span>
                  <span className="wallet-chevron" aria-hidden="true">▾</span>
                </button>
                <div className="wallet-menu" id="walletMenu" role="listbox" hidden></div>
              </div>
              <p className="wallet-mock-hint" id="walletMockHint" hidden>בדמו: ההמשך יתבצע דרך הארנק שנבחר.</p>
              <div className="form-grid" id="cardFieldsGrid">
                <label>שם בעל הכרטיס<input data-checkout="cardName" /></label>
                <label>מספר כרטיס<input data-checkout="cardNumber" placeholder="4580 0000 0000 0000" /></label>
                <label>תוקף<input data-checkout="expiry" placeholder="12/29" /></label>
                <label>CVV<input data-checkout="cvv" /></label>
              </div>
            </div>
            <aside className="panel" id="orderSummary"></aside>
          </div>
        </section>

        <section className="step" data-step="3">
          <div className="success">
            <div className="success-icon">✓</div>
            <h2>התשלום התקבל בהצלחה</h2>
            <p>הזמנתך נקלטה ותעבור לייצור בקרוב.</p>
            <div className="summary-card" id="finalSummary"></div>
            <div className="status-lookup-box">
              <div className="status-lookup-panel" id="orderStatusLookupPanel" hidden>
                <label htmlFor="orderStatusLookupInput">מספר הזמנה (5 ספרות)</label>
                <div className="status-lookup-row">
                  <input id="orderStatusLookupInput" type="text" inputMode="numeric" maxLength={20} placeholder="לדוגמה: 15448" />
                  <button className="btn primary" type="button" id="orderStatusLookupBtn">בדוק</button>
                </div>
                <p className="status-lookup-msg" id="orderStatusLookupMsg"></p>
                <ul className="timeline timeline-stepper" id="orderStatusLookupTimeline" hidden></ul>
              </div>
            </div>
            <ul className="timeline timeline-stepper" role="list" aria-label="סטטוס הזמנה">
              <li className="timeline-step timeline-step--done">
                <div className="timeline-track">
                  <span className="timeline-marker timeline-marker--check" aria-hidden="true">✓</span>
                </div>
                <span className="timeline-label">התקבלה הזמנה</span>
              </li>
              <li className="timeline-step">
                <div className="timeline-track">
                  <span className="timeline-marker timeline-marker--dot" aria-hidden="true"></span>
                </div>
                <span className="timeline-label">עוברת לבדיקה</span>
              </li>
              <li className="timeline-step">
                <div className="timeline-track">
                  <span className="timeline-marker timeline-marker--dot" aria-hidden="true"></span>
                </div>
                <span className="timeline-label">בייצור</span>
              </li>
              <li className="timeline-step">
                <div className="timeline-track">
                  <span className="timeline-marker timeline-marker--dot" aria-hidden="true"></span>
                </div>
                <span className="timeline-label">מוכנה למשלוח</span>
              </li>
            </ul>
            <div className="nav-actions">
              <a className="back-link back-link--footer" href="/">
                <span className="back-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                </span>
                <span className="back-link-text">חזרה לאתר</span>
              </a>
              <button className="btn secondary" data-action="restart">עצב מוצר נוסף</button>
            </div>
          </div>
        </section>

        <footer className="nav-footer" id="flowNav">
          <a className="back-link nav-footer-site" href="/">
            <span className="back-link-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
            </span>
            <span className="back-link-text">חזרה לאתר</span>
          </a>
          <a
            className="studio-whatsapp-nav"
            id="studioWhatsappBtn"
            href="https://wa.me/972559433968"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="שליחת הודעה בווצאפ"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span>WhatsApp</span>
          </a>
        </footer>
      </main>

      {/* design.js is an ES module; it imports studio-data.js, price-display.js etc. automatically */}
      <Script src="/design.js" strategy="afterInteractive" type="module" />
    </>
  );
}
