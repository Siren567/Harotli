-- באקט ציבורי לתמונות מוצרים (העלאה מפאנל אדמין, קריאה ציבורית לחנות)
-- הרץ ב-Supabase → SQL Editor.
-- אפשר גם ליצור ידנית: Storage → New bucket → שם product-images → Public

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- קריאה ציבורית
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- העלאה / עדכון / מחיקה — משתמש מחובר (אדמין)
drop policy if exists "Auth insert product images" on storage.objects;
create policy "Auth insert product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Auth update product images" on storage.objects;
create policy "Auth update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Auth delete product images" on storage.objects;
create policy "Auth delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
