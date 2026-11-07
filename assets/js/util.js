// Hàm dùng chung cho trang công khai và trang admin.

// Escape mọi dữ liệu trước khi đưa vào HTML (chống XSS)
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Link chỉ cho phép http(s) (chặn javascript:)
export const safe = u => /^https?:\/\//i.test(u || '') ? u : '#';

// Ô nhập "mỗi dòng một mục": "Tên|URL" hoặc chỉ "URL" → [{label, url}]
export const parseLinks = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => {
  const i = s.indexOf('|');
  return i >= 0 ? { label: s.slice(0, i).trim(), url: s.slice(i + 1).trim() } : { label: '', url: s };
});

// Ngược lại: [{label, url}] → text để đưa vào ô nhập
export const linksToText = arr => (arr || []).map(l => l.label ? l.label + '|' + l.url : l.url).join('\n');


// Giá mua toàn tập so với mua lẻ: retail = giá lẻ cả bộ; pct = % rẻ hơn (null nếu chưa tính được, 0 nếu không rẻ hơn)
export function fullDeal(price, chapters, full) {
  const retail = (Number(price) || 0) * (Number(chapters) || 0);
  if (!(full > 0) || !(retail > 0)) return { retail, pct: null };
  const pct = Math.round((1 - full / retail) * 100);
  return { retail, pct: full < retail && pct > 0 ? pct : 0 };
}

// Danh sách ảnh của sản phẩm: ưu tiên cột images, nếu chưa có thì dùng ảnh cũ (img)
export const imgList = p => (Array.isArray(p.images) && p.images.length ? p.images : (p.img ? [p.img] : [])).filter(Boolean);

// ===== Combo đồng tác giả (dùng chung cho trang công khai và trang admin) =====
// Bỏ dấu + viết thường: "Ái Tiềm Thủy" = "ai tiem thuy"
export const fold = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
export const authorKey = a => fold(typeof a === 'object' && a ? a.author : a).trim().replace(/\s+/g, ' ');
// Tổng số chương = chương cuối của quyển cuối
export const totalChapters = n => (n.volumes || []).reduce((m, v) => Math.max(m, v.to), 0);
// Giá mua trọn bộ của một truyện: dùng giá toàn tập nếu có, không thì giá mỗi chương × số chương
export const fullPriceOf = n => n.is_free ? 0 : (Number(n.full_price) > 0 ? Number(n.full_price) : (Number(n.price) || 0) * totalChapters(n));
// Truyện có "bán" được không: có giá trọn bộ > 0, hoặc được đặt giá 0đ có chủ ý (is_free: hàng miễn phí / tặng kèm vẫn là hàng bình thường)
export const isSellable = n => !!n.is_free || fullPriceOf(n) > 0;
// Gom truyện của một combo: nếu combo có danh sách truyện đã tick (novel_ids) thì lấy đúng các truyện đó;
// combo cũ (chưa có danh sách) thì tự gom theo tên tác giả. Cộng giá trọn bộ từng truyện, tính % giảm so với giá combo.
export function comboStats(combo, novels) {
    const ids = Array.isArray(combo.novel_ids) ? combo.novel_ids : [];
    const k = authorKey(combo.author);
    const items = ids.length ? novels.filter(n => ids.includes(n.id) && isSellable(n))
        : k ? novels.filter(n => authorKey(n) === k && isSellable(n)) : [];
    const retail = items.reduce((s, n) => s + fullPriceOf(n), 0);
    const price = Number(combo.price) || 0;
    const given = combo.price !== '' && combo.price != null; // đã nhập giá (0đ cũng là giá: combo miễn phí / quà tặng)
    const pct = retail > 0 && given && price < retail ? Math.round((1 - price / retail) * 100) : 0;
    return { items, retail, price, pct };
}