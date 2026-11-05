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

-- 0. Kho ảnh "images" (tạo lại nếu thiếu — sửa lỗi "Bucket not found" khi tải ảnh). Tối đa 3MB / ảnh.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "images_read"   on storage.objects;
drop policy if exists "images_insert" on storage.objects;
drop policy if exists "images_update" on storage.objects;
drop policy if exists "images_delete" on storage.objects;
create policy "images_read"   on storage.objects for select using (bucket_id = 'images');
create policy "images_insert" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "images_update" on storage.objects for update using (bucket_id = 'images' and public.is_admin()) with check (bucket_id = 'images' and public.is_admin());
create policy "images_delete" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());
