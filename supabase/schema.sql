-- =====================================================
-- Schema cho web cá nhân: Phần mềm & Truyện dịch
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ file này → Run.
-- TRƯỚC KHI CHẠY: đổi 'EMAIL_ADMIN_CUA_BAN@gmail.com' (ở hàm is_admin bên dưới) thành email thật của bạn.
-- Có thể chạy lại nhiều lần (không bị lỗi trùng).
-- =====================================================

-- ---------- 1. Bảng ----------
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  cat        text not null default 'Khác',   -- danh mục (cho phép tự gõ mới)
  icon       text default '',                -- emoji hoặc URL ảnh
  version    text default '',
  short      text default '',                -- mô tả ngắn
  "desc"     text default '',                -- giới thiệu chi tiết
  img        text default '',                -- URL ảnh minh họa, trống = ảnh gradient
  links      jsonb not null default '[]'::jsonb,  -- [{label, url}]
  created_at timestamptz not null default now()
);

create table if not exists public.novels (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  author     text default '',
  status     text not null default 'ongoing' check (status in ('ongoing','done')),
  synopsis   text default '',
  price      int  not null default 0 check (price >= 0),   -- giá mỗi chương (VNĐ)
  cover      text default '',
  volumes    jsonb not null default '[]'::jsonb,  -- [{name, from, to}]
  fb         text default '',
  zalo       text default '',
  reviews    jsonb not null default '[]'::jsonb,  -- [{label, url}]
  created_at timestamptz not null default now()
);

-- ---------- 2. Hàm kiểm tra admin ----------
-- Chỉ tài khoản đã đăng nhập (email) VÀ nằm trong danh sách bên dưới mới là admin.
-- Thêm admin: thêm email vào trong ARRAY[...], cách nhau dấu phẩy, VIẾT CHỮ THƯỜNG.
-- (Mỗi admin cũng phải được tạo ở Authentication → Users.)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'leegiang180505@gmail.com',
     'peargiang18@gmail.com'
  ]);
$$;

-- ---------- 3. Row Level Security ----------
alter table public.products enable row level security;
alter table public.novels   enable row level security;

-- Xóa policy cũ (nếu chạy lại)
drop policy if exists "products_read"   on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;
drop policy if exists "novels_read"     on public.novels;
drop policy if exists "novels_insert"   on public.novels;
drop policy if exists "novels_update"   on public.novels;
drop policy if exists "novels_delete"   on public.novels;

-- Ai cũng được đọc
create policy "products_read" on public.products for select using (true);
create policy "novels_read"   on public.novels   for select using (true);

-- Chỉ admin được ghi
create policy "products_insert" on public.products for insert with check (public.is_admin());
create policy "products_update" on public.products for update using (public.is_admin()) with check (public.is_admin());
create policy "products_delete" on public.products for delete using (public.is_admin());

create policy "novels_insert" on public.novels for insert with check (public.is_admin());
create policy "novels_update" on public.novels for update using (public.is_admin()) with check (public.is_admin());
create policy "novels_delete" on public.novels for delete using (public.is_admin());

-- ---------- 4. Dữ liệu mẫu (chỉ thêm khi bảng còn trống) ----------
insert into public.products (name, cat, icon, version, short, "desc", links)
select * from (values
  ('Note Nhanh', 'Mobile Apps', '📝', '1.2.0', 'Ghi chú siêu nhẹ, mở lên là gõ.',
   E'Ứng dụng ghi chú tối giản, khởi động dưới 1 giây.\n\nTính năng:\n• Ghi chú văn bản, checklist\n• Đồng bộ qua file\n• Chế độ tối',
   '[{"label":"Tải APK","url":"#"},{"label":"Google Play","url":"#"}]'::jsonb),
  ('Tính Lương Online', 'Web Apps', '💰', '2.0', 'Tính lương, bảo hiểm, thuế TNCN.',
   'Công cụ web tính lương gross/net theo quy định mới nhất.',
   '[{"label":"Mở web","url":"#"}]'::jsonb),
  ('Auto Rename', 'Windows Apps', '🗂️', '0.9 beta', 'Đổi tên hàng loạt file theo mẫu.',
   'Đổi tên hàng nghìn file chỉ trong vài giây, hỗ trợ regex.',
   '[{"label":"Tải .exe","url":"#"},{"label":"Bản portable","url":"#"}]'::jsonb),
  ('Tab Gọn', 'Chrome Extensions', '🧩', '1.0', 'Gom và quản lý hàng chục tab.',
   'Tiện ích Chrome giúp gom tab, tìm nhanh và giải phóng RAM.',
   '[{"label":"Chrome Web Store","url":"#"}]'::jsonb)
) as v(name, cat, icon, version, short, "desc", links)
where not exists (select 1 from public.products);

insert into public.novels (title, author, status, synopsis, price, volumes, fb, zalo, reviews)
select * from (values
  ('Kiếm Đạo Độc Tôn', 'Tác giả mẫu', 'ongoing',
   'Thiếu niên mang trong mình tàn hồn kiếm thần, bước lên con đường nghịch thiên cải mệnh, một kiếm phá vạn pháp.',
   300,
   '[{"name":"Quyển 1","from":1,"to":100},{"name":"Quyển 2","from":101,"to":200},{"name":"Quyển 3","from":201,"to":268}]'::jsonb,
   'https://facebook.com/', 'https://zalo.me/0900000000',
   '[{"label":"Review chi tiết bộ truyện","url":"https://youtube.com/"},{"label":"","url":"https://tiktok.com/"},{"label":"Bài giới thiệu trên Facebook","url":"https://facebook.com/"}]'::jsonb),
  ('Trọng Sinh Chi Đô Thị', 'Tác giả mẫu 2', 'done',
   'Trở về mười năm trước, anh quyết định không lặp lại sai lầm cũ.',
   200,
   '[{"name":"Quyển 1","from":1,"to":150},{"name":"Quyển 2","from":151,"to":300}]'::jsonb,
   'https://facebook.com/', '',
   '[{"label":"Báo Tuổi Trẻ giới thiệu","url":"https://tuoitre.vn/"}]'::jsonb)
) as v(title, author, status, synopsis, price, volumes, fb, zalo, reviews)
where not exists (select 1 from public.novels);

-- ---------- 5. Kho ảnh (Storage) ----------
-- Bucket "images": ai cũng xem được ảnh, chỉ admin được tải lên / sửa / xóa.
-- Chỉ nhận JPG, PNG, WebP, GIF (không nhận SVG để tránh mã độc), tối đa 3MB mỗi ảnh.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images_read"   on storage.objects;
drop policy if exists "images_insert" on storage.objects;
drop policy if exists "images_update" on storage.objects;
drop policy if exists "images_delete" on storage.objects;

create policy "images_read"   on storage.objects for select using (bucket_id = 'images');
create policy "images_insert" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "images_update" on storage.objects for update using (bucket_id = 'images' and public.is_admin()) with check (bucket_id = 'images' and public.is_admin());
create policy "images_delete" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());

-- ---------- 6. Kiểm tra RLS (làm sau khi chạy xong) ----------
-- Mở trang web khi CHƯA đăng nhập, thử ghi dữ liệu bằng anon key → phải bị từ chối.
-- Thử tải ảnh lên Storage khi chưa đăng nhập → cũng phải bị từ chối.
-- ---------- 7. Cập nhật v2 (nhiều ảnh + kho file) ----------
-- Bản cập nhật v2: nhiều ảnh cho phần mềm + kho file tải lên.
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.

-- 1. Cột lưu nhiều ảnh minh họa (danh sách URL)
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
-- Chuyển ảnh cũ (cột img) sang danh sách mới
update public.products set images = jsonb_build_array(img) where coalesce(img,'') <> '' and images = '[]'::jsonb;

-- 2. Bucket "files": ai cũng tải về được, chỉ admin được upload / sửa / xóa. Tối đa 50MB / file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "files_read"   on storage.objects;
drop policy if exists "files_insert" on storage.objects;
drop policy if exists "files_update" on storage.objects;
drop policy if exists "files_delete" on storage.objects;
create policy "files_read"   on storage.objects for select using (bucket_id = 'files');
create policy "files_insert" on storage.objects for insert with check (bucket_id = 'files' and public.is_admin());
create policy "files_update" on storage.objects for update using (bucket_id = 'files' and public.is_admin()) with check (bucket_id = 'files' and public.is_admin());
create policy "files_delete" on storage.objects for delete using (bucket_id = 'files' and public.is_admin());
