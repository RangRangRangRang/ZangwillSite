// Giỏ hàng: chỉ lưu "đã chọn mua gì" trên máy người xem (localStorage). Web không thanh toán —
// khách gửi danh sách này cho chủ web qua Zalo/Facebook. Không có dữ liệu quan trọng nào ở đây.
const KEY = 'zw:cart';
const subs = [];

// Mỗi truyện tối đa một dòng: { id, mode: 'range', from, to } | { id, mode: 'full' } | { id, mode: 'vols', vols: [[từ, đến], …] } (các quyển đã tick)
const isPair = p => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 1 && p[1] >= p[0];
const valid = x => x && typeof x.id === 'string' &&
    (x.mode === 'full' || (x.mode === 'range' && Number.isInteger(x.from) && Number.isInteger(x.to) && x.from >= 1 && x.to >= x.from) ||
        (x.mode === 'vols' && Array.isArray(x.vols) && x.vols.length > 0 && x.vols.every(isPair)));

function load() {
    try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a.filter(valid) : []; }
    catch (e) { return []; }
}
let items = load();

function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* trình duyệt chặn lưu: giỏ chỉ còn tới khi tải lại trang */ }
    subs.forEach(f => f());
}

export const getCart = () => items.slice();
export const inCart = id => items.some(x => x.id === id);
export function addItem(item) {
    if (!valid(item)) return;
    items = items.filter(x => x.id !== item.id); // thêm lại cùng truyện = thay bằng lựa chọn mới
    items.push(item);
    save();
}
export function removeItem(id) { items = items.filter(x => x.id !== id); save(); }
export function clearCart() { items = []; save(); }
export const onCartChange = f => subs.push(f);

// Mở web ở tab khác và sửa giỏ → các tab đồng bộ
addEventListener('storage', e => { if (e.key === KEY) { items = load(); subs.forEach(f => f()); } });
