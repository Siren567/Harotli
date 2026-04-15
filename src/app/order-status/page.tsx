import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "בדיקת סטטוס הזמנה | חרוטלי",
  description: "בדקו את סטטוס ההזמנה שלכם בעזרת מספר ההזמנה.",
};

export default function OrderStatusPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: "Heebo", sans-serif; background: #f7f0e8; color: #2c1b10; }
        .wrap { width: min(920px, 94vw); margin: 36px auto; background: #fff; border: 1px solid #e9d9ca; border-radius: 18px; padding: 22px; }
        h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .sub { margin: 0 0 16px; color: #6f5644; font-size: 0.92rem; }
        .row { display: flex; gap: 10px; flex-wrap: wrap; }
        input { flex: 1 1 260px; border: 1px solid #d6c2b1; border-radius: 12px; padding: 12px 14px; font-size: 0.95rem; font-family: inherit; }
        button { border: none; border-radius: 12px; background: linear-gradient(120deg,#3b2a1a,#6e4b33); color: #fff; font-weight: 700; padding: 12px 20px; font-family: inherit; cursor: pointer; }
        .msg { min-height: 22px; margin: 10px 0 0; color: #6f5644; font-size: 0.9rem; }
        .card { margin-top: 16px; border: 1px solid #eadccc; border-radius: 14px; background: #fffdfa; padding: 14px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; }
        .k { color: #8a6d57; font-size: 0.84rem; }
        .v { font-weight: 600; font-size: 0.92rem; }
        .timeline { margin-top: 10px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; position: relative; padding: 8px 0; }
        .timeline::before { content: ""; position: absolute; top: 27px; inset-inline: 8%; height: 2px; background: #e8d7c8; z-index: 0; }
        .timeline-fill { position: absolute; top: 27px; inset-inline-start: 8%; height: 2px; background: linear-gradient(90deg,#8b5e3c,#c49a6c); z-index: 1; width: 0%; transition: width 0.3s ease; }
        .timeline.timeline--delivered .timeline-fill { background: linear-gradient(90deg,#16a34a,#22c55e); }
        .timeline.timeline--cancelled .timeline-fill { background: linear-gradient(90deg,#dc2626,#ef4444); width: 84% !important; }
        .t-step { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px; }
        .t-circle { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #d9c3ad; background: #fff; color: #8a6d57; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; transition: all 0.25s ease; }
        .t-label { font-size: 0.82rem; color: #6f5644; line-height: 1.35; }
        .t-step.done .t-circle,.t-step.active .t-circle { border-color: #8b5e3c; color: #fff; background: #8b5e3c; }
        .t-step.active .t-circle { box-shadow: 0 0 0 3px rgba(196,154,108,0.25); }
        .t-step.done .t-label,.t-step.active .t-label { color: #2c1b10; font-weight: 700; }
        .timeline.timeline--delivered .t-step.done .t-circle,.timeline.timeline--delivered .t-step.active .t-circle { border-color: #16a34a; background: #16a34a; }
        .timeline.timeline--delivered .t-step.done .t-label,.timeline.timeline--delivered .t-step.active .t-label { color: #166534; }
        .timeline.timeline--cancelled .t-step .t-circle { border-color: #ef4444; background: #fff1f2; color: #dc2626; }
        .timeline.timeline--cancelled .t-step .t-label { color: #991b1b; font-weight: 700; }
        .items { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
        .item { border: 1px solid #eddccc; border-radius: 10px; padding: 8px 10px; background: #fff; }
        .item-title { font-weight: 700; font-size: 0.9rem; }
        .item-meta { color: #6f5644; font-size: 0.84rem; margin-top: 2px; }
        @media(max-width:640px){
          .grid{grid-template-columns:1fr}
          .wrap{width:min(96vw,640px);margin:14px auto;border-radius:14px;padding:14px}
          h1{font-size:1.25rem}.sub{font-size:0.85rem;margin-bottom:12px}
          input,button{width:100%;min-height:44px}
          .row{display:grid;grid-template-columns:1fr}
          .timeline{grid-template-columns:1fr;gap:10px;padding:0}
          .timeline::before,.timeline-fill{display:none}
          .t-step{flex-direction:row;justify-content:flex-start;align-items:center;text-align:right;gap:10px;padding:8px 10px;border:1px solid #eadccc;border-radius:10px;background:#fff}
          .t-label{font-size:0.86rem}.card{padding:12px}.item-meta{line-height:1.45}
        }
      `}</style>

      <main className="wrap">
        <h1>בדיקת סטטוס הזמנה</h1>
        <p className="sub">מקלידים מספר הזמנה ומקבלים סיכום מלא ומצב הזמנה עדכני.</p>
        <div className="row">
          <input id="orderLookupInput" type="text" inputMode="numeric" placeholder="מספר הזמנה (למשל 15448)" />
          <button id="orderLookupBtn" type="button">בדיקה</button>
        </div>
        <p className="msg" id="orderLookupMsg"></p>
        <section id="orderResult" hidden>
          <div className="card">
            <div className="grid" id="orderSummaryGrid"></div>
          </div>
          <div className="card">
            <div className="k">שלבי הזמנה</div>
            <div className="timeline" id="orderTimeline"></div>
          </div>
          <div className="card">
            <div className="k">פריטים</div>
            <div className="items" id="orderItems"></div>
          </div>
        </section>
      </main>

      <Script src="/order-status.js" strategy="afterInteractive" type="module" />
    </>
  );
}
