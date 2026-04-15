import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import type { Database, Json } from "@/types/database";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_EVENTS = 25;
const ALLOWED_TYPES = new Set(["page_view", "product_view", "studio_step", "custom"]);

type InsertRow = Database["public"]["Tables"]["marketing_site_events"]["Insert"];

function trim(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function parseEvent(raw: unknown): InsertRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const eventType = trim(o.event_type, 64);
  if (!eventType || !ALLOWED_TYPES.has(eventType)) return null;
  const session_id = trim(o.session_id, 80);
  if (!session_id) return null;

  return {
    event_type: eventType,
    page_path: trim(o.page_path, 2000),
    referrer: trim(o.referrer, 2000),
    utm_source: trim(o.utm_source, 256),
    utm_medium: trim(o.utm_medium, 256),
    utm_campaign: trim(o.utm_campaign, 512),
    utm_content: trim(o.utm_content, 512),
    utm_term: trim(o.utm_term, 256),
    fbclid: trim(o.fbclid, 256),
    gclid: trim(o.gclid, 256),
    product_id: trim(o.product_id, 128),
    product_name: trim(o.product_name, 500),
    session_id,
    user_agent: trim(o.user_agent, 500),
    language: trim(o.language, 32),
    screen_w: typeof o.screen_w === "number" && Number.isFinite(o.screen_w) ? Math.round(o.screen_w) : null,
    screen_h: typeof o.screen_h === "number" && Number.isFinite(o.screen_h) ? Math.round(o.screen_h) : null,
    meta: o.meta != null && typeof o.meta === "object" ? (o.meta as Json) : null,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, skipped: true }, { headers: CORS_HEADERS });
    }

    const body = (await request.json()) as { events?: unknown[] };
    const list = Array.isArray(body?.events) ? body.events : [];
    if (list.length === 0) {
      return NextResponse.json({ ok: false, error: "ריק" }, { status: 400, headers: CORS_HEADERS });
    }
    if (list.length > MAX_EVENTS) {
      return NextResponse.json({ ok: false, error: "יותר מדי אירועים" }, { status: 400, headers: CORS_HEADERS });
    }

    const rows: InsertRow[] = [];
    for (const raw of list) {
      const row = parseEvent(raw);
      if (row) rows.push(row);
    }
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "אין אירועים תקינים" }, { status: 400, headers: CORS_HEADERS });
    }

    const sb = createServiceClient();
    const { error } = await sb.from("marketing_site_events").insert(rows);
    if (error) {
      console.error("[marketing-events]", error.message);
      return NextResponse.json(
        { ok: false, error: "שמירה נכשלה — ודא שהרצת את מיגרציית marketing_site_events" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ ok: true, inserted: rows.length }, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("[marketing-events]", e);
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500, headers: CORS_HEADERS });
  }
}
