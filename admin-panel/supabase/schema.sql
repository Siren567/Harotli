-- ============================================================
-- Harotli Admin Panel — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  parent_id   uuid references categories(id) on delete set null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on categories(parent_id);
create index on categories(slug);

-- ─────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────
create table if not exists products (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text not null unique,
  short_description    text,
  description          text,
  sku                  text not null unique,
  price                numeric(10,2) not null check (price >= 0),
  compare_price        numeric(10,2) check (compare_price >= 0),
  category_id          uuid references categories(id) on delete set null,
  subcategory_id       uuid references categories(id) on delete set null,
  status               text not null default 'draft'
                         check (status in ('active','hidden','draft','out_of_stock')),
  is_featured          boolean not null default false,
  tags                 text[] not null default '{}',
  seo_title            text,
  seo_description      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index on products(category_id);
create index on products(status);
create index on products(sku);

-- ─────────────────────────────────────────────────────────────
-- PRODUCT IMAGES
-- ─────────────────────────────────────────────────────────────
create table if not exists product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  alt_text    text,
  sort_order  int  not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on product_images(product_id);

-- ─────────────────────────────────────────────────────────────
-- INVENTORY
-- ─────────────────────────────────────────────────────────────
create table if not exists inventory (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null unique references products(id) on delete cascade,
  quantity            int  not null default 0 check (quantity >= 0),
  low_stock_threshold int  not null default 5,
  updated_at          timestamptz not null default now()
);

-- History log for inventory changes
create table if not exists inventory_log (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  delta       int  not null,   -- positive = restock, negative = sale/adjustment
  reason      text,            -- 'sale' | 'restock' | 'adjustment' | 'manual'
  note        text,
  created_at  timestamptz not null default now()
);

create index on inventory_log(product_id);

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text unique,
  phone        text,
  city         text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on customers(email);

-- ─────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  customer_id      uuid references customers(id) on delete set null,
  -- Snapshot of customer at time of order (denormalized for history)
  customer_name    text not null,
  customer_email   text,
  customer_phone   text,
  status           text not null default 'new'
                     check (status in ('new','pending','processing','shipped','completed','cancelled','refunded')),
  payment_status   text not null default 'unpaid'
                     check (payment_status in ('paid','unpaid','partial','refunded')),
  payment_method   text,
  shipping_method  text,
  -- Pricing
  subtotal         numeric(10,2) not null default 0,
  shipping_cost    numeric(10,2) not null default 0,
  discount_amount  numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  -- Shipping address (embedded JSON for simplicity)
  shipping_street  text,
  shipping_city    text,
  shipping_zip     text,
  -- Notes
  customer_note    text,
  admin_note       text,
  -- Coupon applied
  coupon_id        uuid,
  coupon_code      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on orders(status);
create index on orders(customer_id);
create index on orders(created_at desc);
create index on orders(order_number);

-- ─────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────
create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid references products(id) on delete set null,
  -- Snapshot at time of order
  product_name    text not null,
  product_image   text,
  sku             text,
  customization   text,          -- engraving text / options selected
  quantity        int  not null check (quantity > 0),
  unit_price      numeric(10,2) not null,
  total_price     numeric(10,2) not null
);

create index on order_items(order_id);

-- ─────────────────────────────────────────────────────────────
-- ORDER TIMELINE
-- ─────────────────────────────────────────────────────────────
create table if not exists order_timeline (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     text not null,
  note       text,
  created_at timestamptz not null default now()
);

create index on order_timeline(order_id);

-- ─────────────────────────────────────────────────────────────
-- DISCOUNTS / COUPONS
-- ─────────────────────────────────────────────────────────────
create table if not exists coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  type             text not null check (type in ('percentage','fixed')),
  value            numeric(10,2) not null check (value > 0),
  min_order_value  numeric(10,2),
  max_uses         int,
  used_count       int  not null default 0,
  is_active        boolean not null default true,
  expires_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index on coupons(code);
create index on coupons(is_active);

-- ─────────────────────────────────────────────────────────────
-- MEDIA FILES
-- ─────────────────────────────────────────────────────────────
create table if not exists media_files (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  storage_path text not null unique,  -- path inside Supabase Storage bucket
  public_url   text not null,
  size_bytes   int,
  mime_type    text,
  uploaded_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- STORE SETTINGS  (single-row table)
-- ─────────────────────────────────────────────────────────────
create table if not exists store_settings (
  id                        uuid primary key default gen_random_uuid(),
  store_name                text not null default 'חרוטלי',
  store_email               text,
  store_phone               text,
  store_address             text,
  currency                  text not null default 'ILS',
  logo_url                  text,
  favicon_url               text,
  free_shipping_threshold   numeric(10,2) not null default 350,
  default_shipping_cost     numeric(10,2) not null default 35,
  seo_title                 text,
  seo_description           text,
  instagram_handle          text,
  facebook_handle           text,
  whatsapp_number           text,
  updated_at                timestamptz not null default now()
);

-- Insert the default single row
insert into store_settings (store_name) values ('חרוטלי')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- HOMEPAGE SECTIONS  (CMS)
-- ─────────────────────────────────────────────────────────────
create table if not exists homepage_sections (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,   -- 'hero' | 'featured_products' | 'banner' | 'testimonials'
  title      text,
  subtitle   text,
  image_url  text,
  cta_text   text,
  cta_link   text,
  is_visible boolean not null default true,
  sort_order int     not null default 0,
  extra      jsonb,            -- flexible extra config per section type
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at  (trigger function)
-- ─────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to every table that has updated_at
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'categories','products','customers','orders',
    'inventory','store_settings','homepage_sections'
  ] loop
    execute format('
      create trigger set_updated_at
      before update on %I
      for each row execute function update_updated_at()', tbl);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
-- Enable RLS on all tables — service role key bypasses this.
-- The admin panel always uses the service role key server-side.
alter table categories         enable row level security;
alter table products           enable row level security;
alter table product_images     enable row level security;
alter table inventory          enable row level security;
alter table inventory_log      enable row level security;
alter table customers          enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table order_timeline     enable row level security;
alter table coupons            enable row level security;
alter table media_files        enable row level security;
alter table store_settings     enable row level security;
alter table homepage_sections  enable row level security;

-- Policies: only authenticated users can read/write (admin auth via Supabase Auth)
-- Replace with more granular policies as needed.
create policy "Authenticated full access" on categories
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on products
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on product_images
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on inventory
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on inventory_log
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on customers
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on orders
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on order_items
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on order_timeline
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on coupons
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on media_files
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on store_settings
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on homepage_sections
  for all using (auth.role() = 'authenticated');
