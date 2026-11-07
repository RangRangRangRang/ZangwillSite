-- Bản cập nhật v8: mục Phim (dùng chung bảng novels với Truyện dịch, phân biệt bằng cột kind).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.

alter table public.novels add column if not exists kind text not null default 'novel';
alter table public.novels drop constraint if exists novels_kind_check;
alter table public.novels add constraint novels_kind_check check (kind in ('novel', 'movie'));
notify pgrst, 'reload schema';
