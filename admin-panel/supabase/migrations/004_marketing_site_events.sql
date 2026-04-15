-- אירועי גלישה לשיווק (מטא / UTM / מוצרים) — נכתבים דרך POST /api/public/marketing-events
create table if not exists marketing_site_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  event_type    text not null,
  page_path     text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  product_id    text,
  product_name  text,
  session_id    text not null,
  user_agent    text,
  language      text,
  screen_w      int,
  screen_h      int,
  meta          jsonb
);

create index if not exists marketing_site_events_created_at_idx
  on marketing_site_events (created_at desc);

create index if not exists marketing_site_events_event_type_idx
  on marketing_site_events (event_type);

create index if not exists marketing_site_events_session_idx
  on marketing_site_events (session_id);

alter table marketing_site_events enable row level security;

-- אדמין מחובר (Supabase Auth) — קריאה לדשבורד
create policy "Authenticated read marketing_site_events"
  on marketing_site_events for select
  to authenticated
  using (true);

-- אין insert לציבור — רק service role מה-API (עוקף RLS)
