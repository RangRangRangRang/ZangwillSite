-- Bản cập nhật v10: mã ngắn (slug) cho từng truyện / phim, để gửi link gọn cho khách, vd: .../#/truyen/a3f9c2
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Link cũ dạng id dài vẫn mở bình thường.

alter table public.novels add column if not exists slug text;

-- Hàm tạo mã 6 ký tự (0-9, a-f), kiểm tra không trùng
create or replace function public.new_novel_slug() returns text language plpgsql as $$
declare s text;
begin
  loop
    s := lower(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.novels where slug = s);
  end loop;
  return s;
end $$;

-- Cấp mã cho truyện / phim đã có (từng dòng một để không trùng)
do $$
declare r record;
begin
  for r in select id from public.novels where slug is null loop
    update public.novels set slug = public.new_novel_slug() where id = r.id;
  end loop;
end $$;

-- Truyện / phim thêm mới sau này tự có mã
alter table public.novels alter column slug set default public.new_novel_slug();
create unique index if not exists novels_slug_key on public.novels (slug);
notify pgrst, 'reload schema';
