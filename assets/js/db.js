// Mọi truy vấn Supabase nằm ở file này. Giao diện không gọi Supabase trực tiếp.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Trang công khai chỉ ĐỌC → dùng fetch thuần (không tải thư viện supabase-js ~100KB từ CDN) + cache để mở tức thì.
// Chỉ trang admin mới nạp supabase-js (đăng nhập, ghi dữ liệu, tải file).
const ADMIN = /admin/i.test(location.pathname);
export const sb = ADMIN
    ? (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')).createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Ném lỗi dễ hiểu nếu truy vấn thất bại
function check({ data, error }) {
    if (error) throw new Error(error.message);
    return data;
}

async function rget(q) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || r.statusText);
    return r.json();
}

// Hiện ngay dữ liệu đã lưu từ lần trước, đồng thời tải bản mới ở nền; nếu khác thì gọi lại các hàm đăng ký bằng onData().
const listeners = [];
export const onData = fn => listeners.push(fn);
function swr(table) {
    const key = 'zw:' + table;
    let old = null;
    try { old = localStorage.getItem(key); } catch (e) {}
    const fresh = rget(`${table}?select=*&order=created_at.asc`).then(d => {
        const str = JSON.stringify(d);
        if (str !== old) { try { localStorage.setItem(key, str); } catch (e) {} if (old) listeners.forEach(f => f()); }
        return d;
    });
    if (old) { fresh.catch(() => {}); try { return Promise.resolve(JSON.parse(old)); } catch (e) {} }
    return fresh;
}
const list = async table => ADMIN
    ? check(await sb.from(table).select('*').order('created_at', { ascending: true }))
    : swr(table);

export const getProducts = () => list('products');
// Cài đặt trang chủ (tên, lời giới thiệu, ảnh banner) lưu ở bảng settings, dòng key = 'site'
export async function getSettings() {
    const rows = await list('settings');
    const r = rows.find(x => x.key === 'site');
    return (r && r.value) || {};
}
export const getNovels = () => list('novels');
export async function getProduct(id) {
    return (await getProducts()).find(x => x.id === id) || (await rget(`products?select=*&id=eq.${encodeURIComponent(id)}`))[0] || null;
}
export async function getNovel(id) {
    return (await getNovels()).find(x => x.id === id) || (await rget(`novels?select=*&id=eq.${encodeURIComponent(id)}`))[0] || null;
}

/* ===== Đăng nhập admin (email OTP / magic link) ===== */
// shouldCreateUser:false → không tự tạo tài khoản mới (chỉ tài khoản đã có mới đăng nhập được)
export async function sendOtp(email) {
    const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname },
    });
    if (error) throw new Error(error.message);
}

export async function signInPassword(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
}

export async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
}

export async function signOut() {
    await sb.auth.signOut();
}

/* ===== Ghi dữ liệu (RLS chỉ cho admin) ===== */
// Nếu không phải admin, update/delete không báo lỗi mà trả về 0 dòng → ta tự báo lỗi
function mustChange(res) {
    const data = check(res);
    if (!data || !data.length) throw new Error('Không có quyền ghi (hãy đăng nhập đúng tài khoản admin) hoặc mục không còn tồn tại.');
}

async function save(table, o) {
    const { id, ...rest } = o;
    mustChange(id
        ? await sb.from(table).update(rest).eq('id', id).select()
        : await sb.from(table).insert(rest).select());
}

async function remove(table, id) {
    mustChange(await sb.from(table).delete().eq('id', id).select());
}

export async function saveSettings(value) {
    mustChange(await sb.from('settings').upsert({ key: 'site', value }).select());
}
export const saveProduct = p => save('products', p);
export const deleteProduct = id => remove('products', id);
export const saveNovel = n => save('novels', n);
export const deleteNovel = id => remove('novels', id);

/* ===== Tải ảnh lên Storage (bucket "images", chỉ admin) ===== */
// Trả về URL công khai của ảnh để lưu vào cột icon / img / cover
export async function uploadImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('images').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (error) throw new Error(upErr(error, 'images'));
    return sb.storage.from('images').getPublicUrl(path).data.publicUrl;
}

/* ===== Tải file (exe, apk, zip…) lên Storage (bucket "files", chỉ admin, tối đa 50MB) ===== */
export async function uploadFile(file) {
    const name = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = `${crypto.randomUUID()}/${name}`;
    const { error } = await sb.storage.from('files').upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl: '31536000' });
    if (error) throw new Error(upErr(error, 'files'));
    return sb.storage.from('files').getPublicUrl(path).data.publicUrl;
}

// Báo dễ hiểu khi chưa tạo bảng settings
export const settingsHint = e => /settings|relation|schema cache/i.test(e.message)
    ? 'Chưa có bảng "settings" trên Supabase. Hãy chạy file supabase/update_v3.sql trong SQL Editor rồi thử lại.'
    : e.message;

const upErr = (e, bucket) => /bucket not found/i.test(e.message)
    ? `Chưa có kho "${bucket}" trên Supabase. Hãy chạy file supabase/update_v2.sql trong SQL Editor rồi thử lại.`
    : e.message;
