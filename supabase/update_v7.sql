-- Bản cập nhật v7: truyện miễn phí (nhập "Giá mua toàn tập" = 0).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.

alter table public.novels add column if not exists is_free boolean not null default false;
notify pgrst, 'reload schema';
