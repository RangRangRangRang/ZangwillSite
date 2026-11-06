-- Bản cập nhật v5: combo đồng tác giả (banner giảm giá khi mua trọn bộ nhiều truyện của cùng một tác giả).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Cần chạy schema.sql trước (có hàm is_admin).

create table if not exists public.combos (
  id         uuid primary key default gen_random_uuid(),
  author     text not null,                              -- tên tác giả (trùng với cột author của truyện, không phân biệt hoa thường / dấu)
  cover      text default '',                            -- ảnh bìa banner combo (URL)
  price      int  not null default 0 check (price >= 0), -- giá combo (đ) khi mua trọn bộ tất cả truyện của tác giả
  created_at timestamptz not null default now()
);

alter table public.combos enable row level security;

drop policy if exists "combos_read"   on public.combos;
drop policy if exists "combos_insert" on public.combos;
drop policy if exists "combos_update" on public.combos;
drop policy if exists "combos_delete" on public.combos;

create policy "combos_read"   on public.combos for select using (true);
create policy "combos_insert" on public.combos for insert with check (public.is_admin());
create policy "combos_update" on public.combos for update using (public.is_admin()) with check (public.is_admin());
create policy "combos_delete" on public.combos for delete using (public.is_admin());
