-- Bản cập nhật v4: giá mua toàn tập + sắp xếp truyện bằng kéo thả.
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chạy lại nhiều lần không lỗi.
-- Cần chạy schema.sql trước (có hàm is_admin).

-- 1. Giá mua toàn tập (đ). 0 = không bán trọn bộ, trang web sẽ không hiện ô "Mua toàn tập".
alter table public.novels add column if not exists full_price int not null default 0 check (full_price >= 0);

-- 2. Thứ tự hiển thị: số nhỏ hiện trước ở trang chủ.
alter table public.novels add column if not exists sort_order int not null default 0;

-- Truyện hiện có: đánh số theo thứ tự đang hiển thị (cũ → mới), chỉ làm với dòng chưa có số
update public.novels n set sort_order = r.rn
from (select id, row_number() over (order by created_at, id)::int as rn from public.novels) r
where n.id = r.id and n.sort_order = 0;

-- 3. Hàm lưu thứ tự mới trong MỘT lần gọi: ids[1] hiện đầu tiên. Chỉ admin được gọi.
create or replace function public.reorder_novels(ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Không có quyền sắp xếp';
  end if;
  update public.novels n
     set sort_order = x.ord::int
    from unnest(ids) with ordinality as x(id, ord)
   where n.id = x.id;
end;
$$;

revoke execute on function public.reorder_novels(uuid[]) from public, anon;
grant  execute on function public.reorder_novels(uuid[]) to authenticated;
