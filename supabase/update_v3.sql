-- Bản cập nhật v3: cài đặt trang chủ (tên hiển thị, lời giới thiệu, ảnh banner).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Cần chạy schema.sql trước (có hàm is_admin).

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "settings_read"   on public.settings;
drop policy if exists "settings_insert" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_delete" on public.settings;

-- Ai cũng được đọc, chỉ admin được ghi
create policy "settings_read"   on public.settings for select using (true);
create policy "settings_insert" on public.settings for insert with check (public.is_admin());
create policy "settings_update" on public.settings for update using (public.is_admin()) with check (public.is_admin());
create policy "settings_delete" on public.settings for delete using (public.is_admin());

-- Dòng cài đặt mặc định (rỗng = dùng chữ và banner mặc định)
insert into public.settings (key, value) values ('site', '{}'::jsonb) on conflict (key) do nothing;
