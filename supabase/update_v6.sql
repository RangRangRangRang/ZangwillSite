-- Bản cập nhật v6: combo tự do (gõ tên bất kỳ + tick các truyện trong combo).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Cần chạy update_v5.sql trước.

-- Danh sách id truyện trong combo. Rỗng = combo cũ, tự gom các truyện theo tên tác giả.
alter table public.combos add column if not exists novel_ids jsonb not null default '[]'::jsonb;
