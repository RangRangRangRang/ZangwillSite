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
