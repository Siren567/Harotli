-- Run in Supabase SQL Editor if the project already exists (additive migration).

alter table products
  add column if not exists studio_colors text[] not null default array['gold','silver','rose','black']::text[];

create table if not exists product_category_assignments (
  product_id  uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create index if not exists idx_product_category_assignments_category  on product_category_assignments(category_id);

alter table product_category_assignments enable row level security;

drop policy if exists "Authenticated full access" on product_category_assignments;
create policy "Authenticated full access" on product_category_assignments
  for all using (auth.role() = 'authenticated');
