-- Bản cập nhật v9: chọn "Phim bộ / Phim lẻ" cho phim (cần đã chạy update_v8.sql trước).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Giá trị: '' = tự nhận theo số tập (nhiều hơn 1 tập = phim bộ), 'series' = phim bộ, 'single' = phim lẻ.

alter table public.novels add column if not exists movie_type text not null default '';
alter table public.novels drop constraint if exists novels_movie_type_check;
alter table public.novels add constraint novels_movie_type_check check (movie_type in ('', 'series', 'single'));
notify pgrst, 'reload schema';
