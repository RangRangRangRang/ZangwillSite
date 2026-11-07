// Trang công khai (chỉ đọc): một trang cuộn gồm Banner → Phần mềm → Truyện dịch.
// Bấm vào một mục sẽ mở cửa sổ chi tiết (địa chỉ #/sp/<id> hoặc #/truyen/<id>, mở thẳng được).
import { getProducts, getProduct, getNovels, getNovel, getCombos, getSettings, onData } from './db.js';
import { esc, safe, imgList, fullDeal, comboStats, fullPriceOf, isSellable } from './util.js';
import { CONTACTS } from './config.js';
import { getCart, inCart, addItem, removeItem, clearCart, onCartChange } from './cart.js';
import './applink.js'; // bấm link liên hệ thì mở thẳng app (Zalo, Facebook…)

const $ = s => document.querySelector(s);

/* ===== Hàm an toàn (chống XSS): esc, safe nằm trong util.js ===== */
// URL dùng trong CSS url('...'): chỉ http(s) và mã hóa ký tự nguy hiểm
const cssUrl = u => safe(u).replace(/['"()\\\s]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));

const vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const hues = [250, 200, 160, 20, 330, 45];
const hueOf = name => hues[((name || '?').charCodeAt(0) + (name || '?').length) % hues.length];
const grad = h => `linear-gradient(135deg,hsl(${h} 62% 46%),hsl(${(h + 45) % 360} 60% 30%))`;
const CATS = ['Windows Apps', 'Mac Apps', 'Linux Apps', 'Mobile Apps', 'Web Apps', 'Chrome Extensions', 'Firefox Add-ons', 'Edge Add-ons', 'Plugins', 'Games', 'Công cụ', 'Scripts', 'Khác'];

/* ===== Biểu tượng (SVG, không dùng emoji) ===== */
const ICONS = {
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    fb: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    yt: '<path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    ig: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4a4 4 0 1 1-7.4 1.2 4 4 0 0 1 7.4-1.2"/><path d="M17.5 6.5h.01"/>',
    news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>', up: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
};
const ic = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

/* ===== Thành phần dùng chung ===== */
const firstImg = p => imgList(p).filter(u => safe(u) !== '#')[0] || '';
// Ảnh bìa phần mềm = ảnh đầu tiên; chưa có ảnh thì dùng ô màu theo chữ cái đầu
const thumb = p => {
    const u = firstImg(p);
    return u ? `<img src="${esc(safe(u))}" alt="" loading="lazy">`
        : `<span class="ph" style="background:${grad(hueOf(p.name))}">${esc((p.name || '?')[0])}</span>`;
};
const iconOf = p => /^https?:/i.test(p.icon || '') ? `<img src="${esc(safe(p.icon))}" alt="">` : esc(p.icon || (p.name || '?')[0]);
const cover = n => {
    const u = n.cover && safe(n.cover) !== '#' ? n.cover : '';
    return u ? `<div class="cover has" style="background-image:url('${cssUrl(u)}')" role="img" aria-label="${esc(n.title)}"></div>`
        : `<div class="cover" style="background:${grad(hueOf(n.title))}"><span>${esc(n.title)}</span></div>`;
};
// Truyện dịch và Phim dùng chung một bảng dữ liệu (cột kind); chỉ khác nhãn chữ
const KIND = {
    novel: { sec: 'truyen', title: 'Truyện dịch', word: 'truyện', unit: 'chương', vol: 'Quyển', author: 'Tác giả', authorAll: 'Tất cả tác giả' },
    movie: { sec: 'phim', title: 'Phim', word: 'phim', unit: 'tập', vol: 'Phần', author: 'Đạo diễn', authorAll: 'Tất cả đạo diễn' },
};
const kindOf = n => n && n.kind === 'movie' ? 'movie' : 'novel';
const L = n => KIND[kindOf(n)];
// Phim bộ / phim lẻ: theo lựa chọn trong admin (movie_type); chưa chọn thì tự nhận theo số tập (nhiều hơn 1 tập = phim bộ)
const isSeries = n => n.movie_type === 'series' ? true : n.movie_type === 'single' ? false : totalCh(n) > 1;
const itemsOf = k => DATA.novels.filter(n => kindOf(n) === k);
// Từ gọi chung cho một nhóm mục (combo có thể gồm cả truyện lẫn phim)
const wordOf = items => items.length && items.every(n => kindOf(n) === 'movie') ? 'phim' : items.some(n => kindOf(n) === 'movie') ? 'mục' : 'truyện';
const totalCh = n => (n.volumes || []).reduce((m, v) => Math.max(m, v.to), 0);
const stTag = s => s === 'done' ? '<span class="tag ok"><i></i>Đã kết thúc</span>' : '<span class="tag warn"><i></i>Đang tiếp tục</span>';
const contacts = () => CONTACTS.filter(c => c.url);
const contactIcon = name => ({ facebook: 'fb', tiktok: 'music', youtube: 'yt', instagram: 'ig' }[String(name).toLowerCase()] || 'chat');

// Nhận diện nền tảng từ link review
function platform(u) {
    let h = '';
    try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
    if (/facebook|fb\.com|fb\.watch/.test(h)) return ['fb', 'Facebook'];
    if (/tiktok/.test(h)) return ['music', 'TikTok'];
    if (/youtube|youtu\.be/.test(h)) return ['yt', 'YouTube'];
    if (/instagram/.test(h)) return ['ig', 'Instagram'];
    return ['news', h || 'Báo / Website'];
}

/* ===== Dữ liệu ===== */
// Truyện đặt giá 0đ (is_free): coi như giá mỗi chương và giá trọn bộ đều bằng 0, còn lại xử lý như hàng bình thường (giỏ, combo…)
const normNovel = n => n && n.is_free ? { ...n, price: 0, full_price: 0 } : n;
let DATA = { products: [], novels: [], combos: [], site: {} };
// Chế độ xem trước (trang admin → Trang chủ nhúng trang này trong khung và gửi cài đặt đang soạn qua postMessage)
const PREVIEW = new URLSearchParams(location.search).has('preview');
let previewSite = null;
let curCat = 'all';
async function load() {
    // Chưa chạy update_v5.sql (chưa có bảng combos) thì bỏ qua, web vẫn chạy bình thường
    const [products, novels, site, combos] = await Promise.all([getProducts(), getNovels(), getSettings().catch(() => ({})), getCombos().catch(() => [])]);
    DATA = { products, novels: novels.map(normNovel), combos: combos || [], site: previewSite || site || {} };
}

/* ===== Trang chính ===== */
const pCard = p => `<a class="pcard" href="#/sp/${esc(p.id)}"><div class="thumb" aria-hidden="true">${thumb(p)}<span class="em">${iconOf(p)}</span></div>
  <h3>${esc(p.name)}</h3><p>${esc(p.short)}</p><div class="pm"><span class="tag">${esc(p.cat)}</span>${p.version ? `<span class="ver">v${esc(p.version)}</span>` : ''}</div></a>`;
// full = true (trong cửa sổ combo): hiện giá mua trọn bộ thay vì giá mỗi chương
// Giá hiện trên thẻ: ưu tiên giá trọn bộ; chưa tính được trọn bộ (chưa có giá/số chương) thì hiện giá mỗi chương
const priceLine = n => isSellable(n) ? vnd(fullPriceOf(n)) + ' trọn bộ' : (Number(n.price) > 0 ? vnd(n.price) + '/' + L(n).unit : 'Liên hệ');
<<<<<<< HEAD
const nCard = n => `<a class="tile" href="#/${L(n).sec}/${esc(n.slug || n.id)}">${cover(n)}${stTag(n.status)}<b>${esc(n.title)}</b><small>${kindOf(n) === 'movie' && (n.movie_type === 'single' || (totalCh(n) && !isSeries(n))) ? 'Phim lẻ' : !totalCh(n) ? 'Đang cập nhật' : totalCh(n) + ' ' + L(n).unit} · <span class="pr">${priceLine(n)}</span></small></a>`;
=======
const nCard = n => `<a class="tile" href="#/${L(n).sec}/${esc(n.id)}">${cover(n)}${stTag(n.status)}<b>${esc(n.title)}</b><small>${kindOf(n) === 'movie' && (n.movie_type === 'single' || (totalCh(n) && !isSeries(n))) ? 'Phim lẻ' : !totalCh(n) ? 'Đang cập nhật' : totalCh(n) + ' ' + L(n).unit} · <span class="pr">${priceLine(n)}</span></small></a>`;
>>>>>>> bb726af4585c0aaba7a36488730ee199beb083b7

function renderProducts() {
    const { products } = DATA;
    const cats = [...new Set([...CATS, ...products.map(p => p.cat)])].filter(c => products.some(p => p.cat === c));
    if (curCat !== 'all' && !cats.includes(curCat)) curCat = 'all';
    const list = curCat === 'all' ? products : products.filter(p => p.cat === curCat);
    $('#filters').innerHTML = cats.length > 1
        ? [['all', 'Tất cả'], ...cats.map(c => [c, c])].map(([k, l]) => `<button class="chip" data-cat="${esc(k)}" aria-pressed="${curCat === k}">${esc(l)}</button>`).join('') : '';
    $('#pgrid').innerHTML = list.map(pCard).join('') || '<div class="empty">Chưa có sản phẩm nào.</div>';
}

/* ===== Truyện dịch / Phim: tìm kiếm, lọc trạng thái, sắp xếp (mỗi mục giữ trạng thái lọc riêng) ===== */
// q: từ khóa; st: trạng thái; author: '' = mọi tác giả/đạo diễn, còn lại = authorKey đang lọc; dir: 1 = xuôi (trên xuống), -1 = ngược (dưới lên)
const NS = { novel: { q: '', st: 'all', sort: 'default', dir: 1, author: '' }, movie: { q: '', st: 'all', sort: 'default', dir: 1, author: '' } };
const PFX = { novel: 'n', movie: 'm' }; // tiền tố id các ô trong thanh công cụ (nq, nsort, nauthor… / mq, msort, mauthor…)
const sortsOf = k => [['default', 'Thứ tự mặc định'], ['title', 'Tên (A–Z)'], ['len', `Độ dài (số ${KIND[k].unit})`], ['price', `Giá / ${KIND[k].unit}`],
    ...(k === 'movie' ? [['series', 'Phim bộ trước'], ['single', 'Phim lẻ trước']] : [])];
// Bỏ dấu + viết thường để gõ "tu tien" vẫn tìm ra "Tu Tiên"
const fold = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const byText = (a, b) => String(a || '').localeCompare(String(b || ''), 'vi');
const isDone = n => n.status === 'done';
const authorKey = n => fold(n.author).trim().replace(/\s+/g, ' ');

function sortNovels(list, s) {
    const l = list.slice(); // sort ổn định: bằng nhau thì giữ thứ tự admin đã kéo thả
    if (s.sort === 'title') l.sort((a, b) => s.dir * byText(a.title, b.title));
    else if (s.sort === 'len') l.sort((a, b) => s.dir * (totalCh(a) - totalCh(b)) || byText(a.title, b.title));
    else if (s.sort === 'price') l.sort((a, b) => s.dir * ((Number(a.price) || 0) - (Number(b.price) || 0)) || byText(a.title, b.title));
    else if (s.sort === 'series' || s.sort === 'single') { // gom nhóm phim bộ / phim lẻ, trong nhóm theo thứ tự mặc định
        const first = s.sort === 'series' ? 1 : 0;
        l.sort((a, b) => ((isSeries(b) ? 1 : 0) === first) - ((isSeries(a) ? 1 : 0) === first));
        if (s.dir < 0) l.reverse();
    }
    else if (s.dir < 0) l.reverse();
    return l;
}
// Danh sách tác giả (đã bỏ trùng, A → Z) kèm số mục, cho ô chọn tác giả
function authorList(k) {
    const m = new Map();
    for (const n of itemsOf(k)) { const key = authorKey(n); if (!key) continue; if (!m.has(key)) m.set(key, { key, name: String(n.author).trim(), count: 0 }); m.get(key).count++; }
    return [...m.values()].sort((a, b) => byText(a.name, b.name));
}
const authorOptions = k => `<option value="">${KIND[k].authorAll}</option>${authorList(k).map(a => `<option value="${esc(a.key)}" ${NS[k].author === a.key ? 'selected' : ''}>${esc(a.name)} (${a.count})</option>`).join('')}`;

// Một mục (kệ) trên trang chủ: tiêu đề + thanh công cụ + lưới.
function shelfHtml(k) {
    const K = KIND[k], p = PFX[k], s = NS[k], items = itemsOf(k);
    return `<section class="shelf" id="${K.sec}"><div class="sh"><h2>${K.title}</h2></div>
      ${items.length ? `<div class="ntools" data-k="${k}"><input id="${p}q" type="search" placeholder="Tìm tên ${K.word}, ${K.author.toLowerCase()}…" value="${esc(s.q)}" aria-label="Tìm ${K.word}" autocomplete="off">
       <select id="${p}sort" data-f="sort" aria-label="Sắp xếp ${K.word}">${sortsOf(k).map(([v, l]) => `<option value="${v}" ${s.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
       <select id="${p}author" data-f="author" aria-label="Lọc theo ${K.author.toLowerCase()}">${authorOptions(k)}</select>
       <div class="filters" id="${p}filters" role="group" aria-label="Lọc theo trạng thái"></div>
       <div class="dirs" role="group" aria-label="Chiều sắp xếp"><button class="chip" id="${p}down" data-dir="1" type="button" aria-pressed="${s.dir > 0}" aria-label="Sắp từ trên xuống dưới (A→Z, ít→nhiều, thấp→cao)" title="Từ trên xuống: A→Z, ít→nhiều, thấp→cao">${ic('down')}</button><button class="chip" id="${p}up" data-dir="-1" type="button" aria-pressed="${s.dir < 0}" aria-label="Sắp từ dưới lên trên (Z→A, nhiều→ít, cao→thấp)" title="Từ dưới lên: Z→A, nhiều→ít, cao→thấp">${ic('up')}</button></div></div>
       <div class="ngrid" id="${p}grid"></div>` : `<div class="empty">Chưa có ${K.word} nào.</div>`}</section>`;
}

function renderNovels(k) {
    const p = PFX[k], s = NS[k];
    if (!$('#' + p + 'grid')) return; // chưa có mục nào
    const q = fold(s.q).trim();
    const list = sortNovels(itemsOf(k).filter(n =>
        (!s.author || authorKey(n) === s.author) && (s.st === 'all' || (s.st === 'done') === isDone(n)) && (!q || fold(n.title + ' ' + (n.author || '')).includes(q))), s);
    $('#' + p + 'filters').innerHTML = [['all', 'Tất cả'], ['ongoing', 'Đang tiếp tục'], ['done', 'Đã kết thúc']]
        .map(([v, l]) => `<button class="chip" data-st="${v}" aria-pressed="${s.st === v}">${l}</button>`).join('');
    $('#' + p + 'down').setAttribute('aria-pressed', s.dir > 0);
    $('#' + p + 'up').setAttribute('aria-pressed', s.dir < 0);
    $('#' + p + 'grid').innerHTML = list.map(n => nCard(n)).join('') || `<div class="empty">Không tìm thấy ${KIND[k].word} nào.</div>`;
}
const renderShelves = () => { renderNovels('novel'); renderNovels('movie'); };

/* ===== Combo đồng tác giả: banner xếp chéo như bìa sách ở banner đầu trang, bấm vào mở cửa sổ chi tiết ===== */
// Chỉ hiện combo có ít nhất 2 truyện của tác giả đó (tự gom theo tên tác giả) và đã nhập giá combo
const comboList = () => DATA.combos.map(c => ({ c, st: comboStats(c, DATA.novels) })).filter(x => x.st.items.length >= 2);
const ribbon = pct => pct > 0 ? `<span class="rib" aria-label="Giảm ${pct}%">-${pct}%</span>` : '';
// Bìa combo; pos = l | c | r (vị trí trong chùm xòe quạt)
function comboCard({ c, st }, pos) {
    const u = c.cover && safe(c.cover) !== '#' ? c.cover : '';
    return `<a class="cb fan ${pos}" href="#/combo/${esc(c.id)}" aria-label="Combo ${esc(c.author)}: ${st.items.length} ${wordOf(st.items)}, ${vnd(st.price)}">
      <div class="cbi ${u ? 'has' : ''}" style="${u ? `background-image:url('${cssUrl(u)}')` : `background:${grad(hueOf(c.author))}`}"></div>${ribbon(st.pct)}
      <div class="cbn"><b>${esc(c.author)}</b><small>${st.items.length} ${wordOf(st.items)} · ${vnd(st.price)}</small></div></a>`;
}
// Chùm 3 bìa xòe quạt bên phải banner. Từ 4 combo trở lên: tự trượt từng bìa (cửa sổ 3 bìa, xoay vòng) + nút ‹ › + chấm chọn
let fanI = 0, fanTimer = null;
function fanInner() {
    const all = comboList(), n = all.length, k = Math.min(3, n);
    const L = Array.from({ length: k }, (_, i) => all[(fanI + i) % n]);
    const pos = { 1: ['c'], 2: ['l', 'r'], 3: ['l', 'c', 'r'] }[k] || [];
    const nav = n > 3 ? `<div class="fnav"><button type="button" data-fan="-1" aria-label="Combo trước">‹</button>
      <span class="fdots">${all.map((_, i) => `<button type="button" class="fd" data-fan-to="${i}" aria-label="Combo ${i + 1}" aria-current="${i === fanI}"></button>`).join('')}</span>
      <button type="button" data-fan="1" aria-label="Combo sau">›</button></div>` : '';
    // Bìa thứ 4 mờ ló ra bên phải, báo cho khách biết còn combo khác (bấm vào = sang combo kế)
    const ghost = n > 3 ? comboCard(all[(fanI + 3) % n], 'g').replace('<a class="cb', '<a tabindex="-1" aria-hidden="true" class="cb') : '';
    return ghost + L.map((x, i) => comboCard(x, pos[i])).join('') + nav;
}
function comboFan() {
    return comboList().length ? `<div class="art fanbox" id="fanbox" data-n="${Math.min(3, comboList().length)}" role="group" aria-label="Combo đồng tác giả">${fanInner()}</div>` : '';
}
function fanGo(d, abs) {
    const n = comboList().length, box = $('#fanbox');
    if (!box || n < 4) return;
    fanI = abs != null ? abs : (fanI + d + n) % n;
    box.innerHTML = fanInner();
}
function fanStart() {
    clearInterval(fanTimer); fanTimer = null;
    if (comboList().length < 4 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fanTimer = setInterval(() => { const b = $('#fanbox'); if (!b) return clearInterval(fanTimer); if (!b.matches(':hover') && !b.contains(document.activeElement)) fanGo(1); }, 4500);
}
document.addEventListener('click', e => {
    if (e.target.closest('.fan.g')) { e.preventDefault(); fanGo(1); fanStart(); return; }
    const b = e.target.closest('[data-fan],[data-fan-to]');
    if (!b) return;
    if (b.dataset.fanTo != null) fanGo(0, +b.dataset.fanTo); else fanGo(+b.dataset.fan);
    fanStart(); // bấm tay thì tính lại nhịp tự trượt
});

// Ảnh nền cả trang: một lớp cố định sau mọi nội dung; lớp phủ màu nền (--bg) quyết định ảnh hiện rõ hay mờ nhạt
function applyPageBg(site) {
    let el = $('#pgbg');
    const u = site.pagebg && safe(site.pagebg) !== '#' ? site.pagebg : '';
    if (!u) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'pgbg'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
    const nm = (v, lo, hi, d) => { v = parseFloat(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
    el.style.cssText = `--pgblur:${nm(site.pageblur, 0, 20, 0)}px;--pgdim:${nm(site.pagedim, 0, 100, 80) / 100};background-image:url('${cssUrl(u)}')`;
}

function renderPage() {
    const { products, site } = DATA;
    const novels = itemsOf('novel'), movies = itemsOf('movie');
    const name = esc(site.name || '[Tên bạn]');
    const tagline = esc(site.tagline || 'Một thư viện nhỏ: những sản phẩm mình tự làm, và những bộ truyện mình dịch — liên hệ để mua trực tiếp.');
    const bg = site.banner && safe(site.banner) !== '#' ? site.banner : '';
    const p0 = products[0];
    const fan = comboFan();
    const art = fan || (bg ? '' : `<div class="art" aria-hidden="true">
      ${p0 ? `<div class="win"><div class="wh"><i></i><i></i><i></i></div><div class="wb" style="background:${grad(hueOf(p0.name))}">${firstImg(p0) ? `<img src="${esc(safe(firstImg(p0)))}" alt="">` : esc(p0.name)}</div></div>` : ''}
      ${novels.slice(0, 3).map((n, i) => `<div class="bk b${i + 1}">${cover(n)}</div>`).join('')}</div>`);
    const links = contacts().map(c => `<a href="${esc(safe(c.url))}" data-app target="_blank" rel="noopener">${esc(c.name)}</a>`).join(' · ');
    const nm = (v, lo, hi, d) => { v = parseFloat(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
    const bgVars = `--bgblur:${nm(site.bgblur, 0, 12, 0)}px;--dim:${nm(site.bgdim, 0, 120, 100) / 100};--pop:${nm(site.bgpop, 0, 100, 0) / 100}`;
    $('#page').innerHTML = `<section class="ban ${rendered ? '' : 'view'} ${bg ? 'has-img' : ''}" style="${bgVars}">${bg ? `<div class="ban-bg" style="background-image:url('${cssUrl(bg)}')"></div>` : ''}
      <div class="ban-in"><div><p class="eyebrow">Xin chào</p><h1>Mình là ${name},<br>làm phần mềm &amp; dịch truyện.</h1><p class="lead">${tagline}</p>
       <div class="chips"><a href="#/sp"><b>${products.length}</b>phần mềm</a><a href="#/truyen"><b>${novels.length}</b>truyện dịch</a><a href="#/phim"><b>${movies.length}</b>phim</a></div></div>${art}</div></section>
     <div class="wrap ${rendered ? '' : 'view'}">
     <section class="shelf" id="sp" style="margin-top:0"><div class="sh"><h2>Phần mềm</h2><div class="filters" id="filters" role="group" aria-label="Lọc theo danh mục"></div></div><div class="pgrid" id="pgrid"></div></section>
     ${shelfHtml('novel')}
     ${shelfHtml('movie')}
     <footer>${links ? `Liên hệ mua: ${links} · ` : ''}<a href="admin.html">Quản trị</a></footer></div>`;
    applyPageBg(site);
    renderProducts();
    renderShelves();
    renderBadge();
    fanStart();
}

// Bấm nút chọn danh mục (dùng data-cat thay vì onclick để an toàn)
const kOf = el => { const t = el.closest('[data-k]'); return t ? t.dataset.k : null; };
document.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) { curCat = b.dataset.cat; renderProducts(); }
    const t = e.target.closest('[data-st]'), d = e.target.closest('[data-dir]');
    if (t && kOf(t)) { NS[kOf(t)].st = t.dataset.st; renderNovels(kOf(t)); }
    if (d && kOf(d)) { NS[kOf(d)].dir = +d.dataset.dir; renderNovels(kOf(d)); }
});
// Gõ tìm kiếm / đổi cách sắp xếp: chỉ vẽ lại lưới của mục đó (ô nhập không bị mất con trỏ)
document.addEventListener('input', e => { const k = e.target.matches && e.target.matches('.ntools input') ? kOf(e.target) : null; if (k) { NS[k].q = e.target.value; renderNovels(k); } });
document.addEventListener('change', e => {
    const f = e.target.dataset && e.target.dataset.f, k = f ? kOf(e.target) : null;
    if (k) { NS[k][f] = e.target.value; renderNovels(k); }
});

/* ===== Cửa sổ chi tiết ===== */
const dlg = $('#dlg');

// Thư viện ảnh: lướt ngang (vuốt) hoặc bấm mũi tên, có ảnh thu nhỏ bên dưới
function gallery(p) {
    const imgs = imgList(p).filter(u => safe(u) !== '#');
    if (!imgs.length) return `<div class="gal"><div class="gmain"><div class="gone" style="background:${grad(hueOf(p.name))}">${esc((p.name || '?')[0])}</div></div></div>`;
    const many = imgs.length > 1;
    return `<div class="gal"><div class="gmain"><div class="gtrack">${imgs.map(u => `<img src="${esc(safe(u))}" alt="${esc(p.name)}" draggable="false">`).join('')}</div>
     ${many ? `<button type="button" class="gnav prev" aria-label="Ảnh trước">${ic('prev')}</button><button type="button" class="gnav next" aria-label="Ảnh sau">${ic('next')}</button><span class="gcount"></span>` : ''}</div>
     ${many ? `<div class="gthumbs">${imgs.map((u, i) => `<button type="button" data-go="${i}" aria-label="Ảnh ${i + 1}"><img src="${esc(safe(u))}" alt=""></button>`).join('')}</div>` : ''}</div>`;
}
function initGallery() {
    const t = dlg.querySelector('.gtrack'); if (!t || t.children.length < 2) return;
    const n = t.children.length, thumbs = [...dlg.querySelectorAll('.gthumbs button')];
    const go = i => t.scrollTo({ left: ((i + n) % n) * t.clientWidth, behavior: 'smooth' });
    const cur = () => Math.round(t.scrollLeft / t.clientWidth);
    const sync = () => {
        const i = cur(); dlg.querySelector('.gcount').textContent = `${i + 1}/${n}`;
        thumbs.forEach((b, k) => b.classList.toggle('on', k === i));
        thumbs[i]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    t.addEventListener('scroll', sync, { passive: true });
    dlg.querySelector('.gnav.prev').onclick = () => go(cur() - 1);
    dlg.querySelector('.gnav.next').onclick = () => go(cur() + 1);
    thumbs.forEach(b => b.onclick = () => go(+b.dataset.go));
    sync();
}

function productHtml(p) {
    return `<div class="dh2"><div class="ico">${iconOf(p)}</div><div><span class="tag">${esc(p.cat)}</span><h1 id="dt">${esc(p.name)}</h1>
      ${p.version ? `<div class="meta" style="margin:0">Phiên bản: <b>${esc(p.version)}</b></div>` : ''}</div></div>
     <div class="dgrid">${gallery(p)}<div><div class="desc">${esc(p.short)}</div><div style="margin-top:18px"><b>Tải về / Truy cập</b></div>
      <div class="btns">${(p.links || []).map(l => `<a class="btn sw" href="${esc(safe(l.url))}" target="_blank" rel="noopener">${ic('dl')}${esc(l.label || 'Tải xuống')}</a>`).join('') || '<span class="meta">Chưa có link tải</span>'}</div></div></div>
     ${intro(p.desc)}`;
}

// Phần giới thiệu: một nút bấm mới mở ra (gọn hơn). Để trống thì không hiện nút.
const intro = t => t && String(t).trim() ? `<details class="intro"><summary class="btn">Giới thiệu</summary><div class="desc">${esc(t)}</div></details>` : '';

// Ô "Mua toàn tập": giá, giá lẻ gạch ngang và % rẻ hơn. Không nhập giá toàn tập thì không hiện.
function dealHtml(n, max) {
    const K = L(n);
    const fp = Number(n.full_price) || 0;
    if (!n.is_free && !(fp > 0)) return ''; // không nhập giá toàn tập (và không phải 0đ có chủ ý) thì không hiện ô này
    const d = fp > 0 ? fullDeal(n.price, max, fp) : { retail: 0, pct: null };
    return `<div class="deal"><div><span class="lbl">Mua toàn tập${max ? ` · ${max} ${K.unit}` : ''}</span><b>${vnd(fp)}</b>${d.pct ? `<s>${vnd(d.retail)}</s>` : ''}</div>${d.pct ? `<span class="save">Rẻ hơn ${d.pct}%</span>` : ''}${max ? `<button class="btn nv" type="button" id="cfull">${ic('cart')}Thêm toàn tập vào giỏ</button>` : ''}<div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>`;
}

// Tên quyển hiển thị: "Quyển 1 – Thành phố của thánh ca"
const volLabel = v => `${v.name}${v.title ? ' – ' + v.title : ''}`;

function novelHtml(n) {
    const bc = backCombo && DATA.combos.find(x => x.id === backCombo);
    const K = L(n), max = totalCh(n), vols = n.volumes || [];
    const pickable = vols.length > 1 && (n.is_free || Number(n.price) > 0); // truyện chia quyển → cho tick chọn quyển
    const reviews = (n.reviews || []).map(x => {
        const [i, nm] = platform(x.url);
        return `<a class="rv" href="${esc(safe(x.url))}" target="_blank" rel="noopener"><span class="pi">${ic(i)}</span><div><b>${esc(x.label || nm)}</b><small>${esc(nm)}</small></div><span class="go">${ic('ext')}</span></a>`;
    }).join('');
    return `${bc ? `<a class="btn back" href="#/combo/${esc(bc.id)}">${ic('prev')}Quay lại combo ${esc(bc.author)}</a>` : ''}
     <div class="dh2">${cover(n)}<div>${stTag(n.status)}<h1 id="dt">${esc(n.title)}</h1></div></div>
     <div class="meta"><span>${K.author}: <b>${esc(n.author || '—')}</b></span>${kindOf(n) === 'movie' ? `<span><b>${isSeries(n) ? 'Phim bộ' : 'Phim lẻ'}</b></span>` : ''}<span>${max ? max + ' ' + K.unit : 'Đang cập nhật số ' + K.unit}</span><span><b>${vnd(n.price)}</b>/${K.unit}</span></div>
     ${dealHtml(n, max)}
     ${intro(n.synopsis)}
     ${vols.length ? `<h3 class="h">Danh sách ${K.vol.toLowerCase()}</h3><div class="vols"><div class="vrow th"><span>${K.vol}</span><span>${K.unit[0].toUpperCase() + K.unit.slice(1)}</span><span>Số ${K.unit}</span><span>Giá trọn ${K.vol.toLowerCase()}</span></div>
      ${vols.map((v, i) => `<div class="vrow"><b>${pickable ? `<label class="vk"><input type="checkbox" data-vol="${i}" aria-label="Chọn ${esc(v.name)}"><span>${esc(volLabel(v))}</span></label>` : esc(volLabel(v))}</b><span>${v.from} – ${v.to}</span><span>${v.to - v.from + 1} ${K.unit}</span><span>${vnd((v.to - v.from + 1) * n.price)}</span></div>`).join('')}</div>
      ${pickable ? `<div class="vpick"><label class="vk"><input type="checkbox" id="vall"><span>Chọn tất cả</span></label><div class="vsum" id="vsum" aria-live="polite">Tick vào các ${K.vol.toLowerCase()} muốn mua</div>
       <button class="btn nv" type="button" id="vadd" disabled>${ic('cart')}Thêm ${K.vol.toLowerCase()} đã chọn vào giỏ</button><div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>` : ''}` : ''}
     ${max ? `<div class="calc"><h4>${ic('calc')}Tính giá theo ${K.unit}</h4><div class="in"><label>Từ ${K.unit} <input type="number" id="c1" min="1" max="${max}" value="1"></label><label>đến <input type="number" id="c2" min="1" max="${max}" value="${max}"></label></div><div class="total" id="tot"></div><div class="btns"><button class="btn nv" type="button" id="cadd">${ic('cart')}Thêm vào giỏ</button></div><div class="cmsg" aria-live="polite"></div></div>` : ''}
     ${contacts().length ? `<h3 class="h" style="margin-top:0">Liên hệ mua</h3><div class="btns" style="margin-top:0">${contacts().map(c => `<a class="btn nv" href="${esc(safe(c.url))}" data-app target="_blank" rel="noopener">${ic(contactIcon(c.name))}${esc(c.name)}</a>`).join('')}</div>` : ''}
     ${reviews ? `<h3 class="h">Review &amp; đánh giá</h3>${reviews}` : ''}`;
}

// Tick chọn quyển → hiện số chương + giá → thêm các quyển đã tick vào giỏ
function initVols(n) {
    const K = L(n);
    const boxes = [...dlg.querySelectorAll('input[data-vol]')], all = $('#vall'), add = $('#vadd');
    if (!boxes.length) return;
    const vols = n.volumes || [];
    const picked = () => boxes.filter(b => b.checked).map(b => vols[+b.dataset.vol]);
    const sync = () => {
        const p = picked(), k = p.reduce((s, v) => s + v.to - v.from + 1, 0);
        $('#vsum').innerHTML = p.length ? `Đã chọn <b>${p.length}</b> ${K.vol.toLowerCase()} · ${k} ${K.unit} · <b>${vnd(k * n.price)}</b>` : `Tick vào các ${K.vol.toLowerCase()} muốn mua`;
        add.disabled = !p.length;
        all.checked = p.length === boxes.length;
    };
    boxes.forEach(b => b.onchange = sync);
    all.onchange = () => { boxes.forEach(b => b.checked = all.checked); sync(); };
    add.onclick = () => addToCart(n, { mode: 'vols', vols: picked().map(v => [v.from, v.to]) }, add);
    sync();
}

function initCalc(n) {
    const K = L(n);
    const c1 = $('#c1'), c2 = $('#c2'); if (!c1) return;
    let sel = { a: 1, b: 1 };
    $('#cadd').onclick = () => addToCart(n, { mode: 'range', from: sel.a, to: sel.b }, $('#cadd'));
    const calc = () => {
        let a = Math.round(+c1.value) || 1, b = Math.round(+c2.value) || 1;
        if (a > b) [a, b] = [b, a];
        sel = { a, b };
        const k = b - a + 1;
        const fp = Number(n.full_price) || 0;
        // Khoảng chương đã chọn đắt hơn mua toàn tập → nhắc người mua
        const nudge = fp > 0 && k * n.price > fp ? `<small class="hint">Mua toàn tập chỉ ${vnd(fp)} — rẻ hơn mua lẻ khoảng này.</small>` : '';
        $('#tot').innerHTML = `${vnd(k * n.price)}<small>${k} ${K.unit} · ${K.unit} ${a} → ${b}</small>${nudge}`;
    };
    c1.oninput = c2.oninput = calc;
    calc();
}

// Cửa sổ combo: các truyện của tác giả (như lưới truyện) + giá combo, % rẻ hơn, nút thêm vào giỏ
let backCombo = null; // id combo đang mở khi bấm vào một truyện bên trong → truyện đó hiện nút "Quay lại combo"
function comboHtml(c) {
    const st = comboStats(c, DATA.novels);
    return `<div class="dh2" style="margin-bottom:8px"><div><span class="tag ok"><i></i>Combo</span><h1 id="dt">${esc(c.author)}</h1>
      <div class="meta"><span><b>${st.items.length}</b> ${wordOf(st.items)}</span><span>Mua trọn bộ cả ${st.items.length} ${wordOf(st.items)}</span></div></div></div>
     <div class="deal"><div><span class="lbl">Giá combo · ${st.items.length} ${wordOf(st.items)} trọn bộ</span><b>${vnd(st.price)}</b>${st.pct ? `<s>${vnd(st.retail)}</s>` : ''}</div>${st.pct ? `<span class="save">Rẻ hơn ${st.pct}%</span>` : ''}
      <button class="btn nv" type="button" id="ccadd">${ic('cart')}Thêm combo vào giỏ</button><div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>
     <h3 class="h">Gồm các ${wordOf(st.items)}</h3><div class="ngrid cgrid">${st.items.map(n => nCard(n)).join('')}</div>`;
}

async function openDetail(sec, id) {
    if (sec === 'combo') {
        const c = DATA.combos.find(x => x.id === id);
        if (!c || comboStats(c, DATA.novels).items.length < 2) return closeDetail(true);
        backCombo = null; // đã quay lại combo
        dlg.innerHTML = `<button class="xbtn" id="x" type="button" aria-label="Đóng">${ic('x')}</button><div class="dc">${comboHtml(c)}</div>`;
        dlg.setAttribute('aria-labelledby', 'dt');
        if (!dlg.open) dlg.showModal();
        dlg.scrollTop = 0;
        $('#x').onclick = () => dlg.close();
        $('#ccadd').onclick = e => addToCart({ id: 'combo:' + c.id }, { mode: 'combo', cid: c.id }, e.currentTarget);
        return;
    }
    const item = (sec === 'sp' ? DATA.products.find(x => x.id === id) : DATA.novels.find(x => x.id === id || x.slug === id)) // truyện / phim tìm được cả bằng mã ngắn
        || await (sec === 'sp' ? getProduct(id) : getNovel(id).then(normNovel)).catch(() => null);
    if (!item) return closeDetail(true);
    showItem(sec, item);
}
let openedKey = ''; // đang mở cửa sổ nào (tránh vẽ lại khi dữ liệu đầy đủ về sau khi đã mở nhanh)
function showItem(sec, item) {
    const key = sec + ':' + item.id;
    if (dlg.open && openedKey === key) return;
    openedKey = key;
    dlg.innerHTML = `<button class="xbtn" id="x" type="button" aria-label="Đóng">${ic('x')}</button><div class="dc">${sec === 'sp' ? productHtml(item) : novelHtml(item)}</div>`;
    dlg.setAttribute('aria-labelledby', 'dt');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    $('#x').onclick = () => dlg.close();
    if (sec === 'sp') initGallery();
    else { initCalc(item); initVols(item); const f = $('#cfull'); if (f) f.onclick = () => addToCart(item, { mode: 'full' }, f); }
}
function closeDetail(clearHash) {
    openedKey = '';
    if (dlg.open) dlg.close();
    if (clearHash) history.replaceState(null, '', location.pathname + location.search);
}
// Đóng bằng nút, phím Esc hoặc bấm ra ngoài → bỏ phần #/sp/<id> khỏi địa chỉ
dlg.addEventListener('close', () => { backCombo = null; openedKey = ''; if (/^#\/(sp|truyen|phim|combo)\/./.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
dlg.addEventListener('click', e => {
    if (e.target === dlg) dlg.close();
    // Bấm truyện trong cửa sổ combo → nhớ combo đó; bấm truyện từ nơi khác → bỏ nút quay lại
    const t = e.target.closest('a.tile');
    if (t) { const m = location.hash.match(/^#\/combo\/(.+)$/); backCombo = m ? decodeURIComponent(m[1]) : null; }
});


/* ===== Giỏ hàng (chỉ để chọn truyện rồi gửi danh sách cho chủ web qua Zalo/Facebook, không thanh toán) ===== */
const cartDlg = $('#cartdlg');

// Dòng trong giỏ: giá luôn tính lại từ dữ liệu hiện tại; truyện đã bị xóa / hết bán trọn bộ thì bỏ qua
function cartLines() {
    return getCart().map(it => {
        if (it.mode === 'combo') { // combo tác giả: giá tính lại từ dữ liệu hiện tại; combo bị xóa / còn dưới 2 truyện thì bỏ qua
            const c = DATA.combos.find(x => x.id === it.cid), st = c && comboStats(c, DATA.novels);
            return st && st.items.length >= 2
                ? { n: { id: it.id, title: `Combo ${c.author}` }, text: `Trọn bộ ${st.items.length} ${wordOf(st.items)}: ${st.items.map(x => x.title).join('; ')}`, price: st.price } : null;
        }
        const n = DATA.novels.find(x => x.id === it.id), max = n && totalCh(n);
        if (!n || !max) return null;
        if (it.mode === 'full') {
            const fp = Number(n.full_price) || 0;
            return fp > 0 || n.is_free ? { n, text: `Trọn bộ (${max} ${L(n).unit})`, price: fp } : null;
        }
        if (it.mode === 'vols') {
            const p = (n.volumes || []).filter(v => it.vols.some(([f, t]) => f === v.from && t === v.to)); // quyển đã bị sửa/xóa thì bỏ qua
            if (!p.length) return null;
            const k = p.reduce((s, v) => s + v.to - v.from + 1, 0);
            return { n, text: `${p.length} ${L(n).vol.toLowerCase()}: ${p.map(volLabel).join('; ')} (${k} ${L(n).unit})`, price: k * n.price };
        }
        const a = Math.min(it.from, max), b = Math.min(it.to, max), k = b - a + 1;
        return { n, text: `${L(n).unit[0].toUpperCase() + L(n).unit.slice(1)} ${a} → ${b} (${k} ${L(n).unit})`, price: k * n.price };
    }).filter(Boolean);
}
const cartTotal = lines => lines.reduce((s, l) => s + l.price, 0);
const orderText = lines => `Chào bạn, mình muốn mua:\n${lines.map((l, i) => `${i + 1}. ${l.n.title} — ${l.text}: ${vnd(l.price)}`).join('\n')}\nTổng cộng: ${vnd(cartTotal(lines))}`;

function renderBadge() {
    const n = cartLines().length;
    $('#cartbtn').innerHTML = `${ic('cart')}${n ? `<span class="cn">${n}</span>` : ''}`;
    $('#cartbtn').setAttribute('aria-label', n ? `Thống kê giỏ hàng (${n} mục)` : 'Thống kê giỏ hàng');
}

function renderCart() {
    const lines = cartLines();
    const body = !lines.length
        ? '<div class="empty">Chưa có mục nào trong giỏ.<br><small>Mở một truyện hoặc phim rồi bấm “Thêm vào giỏ”.</small></div>'
        : `${lines.map(l => `<div class="cline"><div><b>${esc(l.n.title)}</b><small>${esc(l.text)}</small></div><span class="cp">${vnd(l.price)}</span>
            <button class="iconbtn" type="button" data-cdel="${esc(l.n.id)}" aria-label="Bỏ “${esc(l.n.title)}” khỏi giỏ">${ic('x')}</button></div>`).join('')}
          <div class="ctotal"><span>Tổng cộng</span><b>${vnd(cartTotal(lines))}</b></div>
          <textarea id="ctext" readonly aria-label="Nội dung đơn hàng">${esc(orderText(lines))}</textarea>
          <div class="btns"><button class="btn sw" type="button" data-ccopy>Sao chép đơn</button>
          ${contacts().map(c => `<a class="btn nv" href="${esc(safe(c.url))}" data-app data-ccopy target="_blank" rel="noopener">${ic(contactIcon(c.name))}Gửi qua ${esc(c.name)}</a>`).join('')}
          <button class="btn" type="button" data-cclear>Xóa giỏ</button></div>
          <div class="cmsg" id="ccopymsg" aria-live="polite"></div>`;
    cartDlg.innerHTML = `<button class="xbtn" id="cx" type="button" aria-label="Đóng">${ic('x')}</button><div class="dc"><h1 id="ct">Thống kê giỏ hàng</h1>${body}</div>`;
    $('#cx').onclick = () => cartDlg.close();
}
function openCart() { renderCart(); if (!cartDlg.open) cartDlg.showModal(); cartDlg.scrollTop = 0; }
cartDlg.addEventListener('click', e => { if (e.target === cartDlg) cartDlg.close(); });
onCartChange(() => { renderBadge(); if (cartDlg.open) renderCart(); });

// Thêm vào giỏ từ trang chi tiết truyện, rồi báo ngay tại chỗ nút vừa bấm
function addToCart(n, item, btn) {
    const had = inCart(n.id);
    if (item.mode === 'combo') { // thêm combo thì bỏ các truyện lẻ của tác giả đó khỏi giỏ để không tính tiền hai lần
        const c = DATA.combos.find(x => x.id === item.cid);
        if (c) comboStats(c, DATA.novels).items.forEach(x => removeItem(x.id));
    }
    addItem({ id: n.id, ...item });
    const box = btn.closest('.deal, .calc, .vpick'), m = box && box.querySelector('.cmsg');
    if (m) m.innerHTML = `✓ ${had ? 'Đã cập nhật trong giỏ.' : 'Đã thêm vào giỏ.'} <button class="linkbtn" type="button" data-copen>Xem giỏ hàng</button>`;
}

// Sao chép nội dung đơn. Dùng cả cách cũ (chạy ngay) lẫn clipboard API để chắc chắn được trên mọi máy.
function copyOrder() {
    const ta = $('#ctext'); if (!ta) return false;
    let ok = false;
    ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { /* bỏ qua */ }
    try { if (navigator.clipboard) { navigator.clipboard.writeText(ta.value).catch(() => {}); ok = true; } } catch (e) { /* bỏ qua */ }
    const m = $('#ccopymsg');
    if (m) m.textContent = ok ? '✓ Đã sao chép đơn — dán vào khung chat rồi gửi nhé.' : 'Không tự sao chép được — hãy bôi đen khung trên rồi sao chép thủ công.';
    return ok;
}

document.addEventListener('click', e => {
    if (e.target.closest('#cartbtn')) return openCart();
    if (e.target.closest('[data-copen]')) { closeDetail(true); return openCart(); }
    const del = e.target.closest('[data-cdel]'); if (del) return removeItem(del.dataset.cdel);
    if (e.target.closest('[data-cclear]')) return clearCart();
    if (e.target.closest('[data-ccopy]')) copyOrder(); // không chặn: nút "Gửi qua Zalo/Facebook" vẫn mở app sau khi đã sao chép
});

/* ===== Định tuyến theo địa chỉ ===== */
let rendered = false;
async function route() {
    if (!rendered) {
        // Khách bấm link gửi tận tay (#/truyen/mã): chỉ tải đúng 1 truyện đó và mở ngay, trong lúc cả trang tải ở nền
        const q = location.hash.match(/^#\/(truyen|phim)\/(.+)$/);
        if (q) getNovel(decodeURIComponent(q[2])).then(normNovel).then(it => { if (it) showItem(q[1], it); }).catch(() => {});
        try { await load(); } catch (e) {
            console.error(e);
            $('#page').innerHTML = `<div class="wrap"><div class="err"><b>Không tải được dữ liệu.</b><br>${esc(e.message)}<br><small>Kiểm tra lại cấu hình trong assets/js/config.js và kết nối mạng.</small></div></div>`;
            return;
        }
        renderPage(); rendered = true;
    }
    const m = location.hash.match(/^#\/(sp|truyen|phim|combo)\/(.+)$/);
    if (m) return openDetail(m[1], decodeURIComponent(m[2]));
    closeDetail(false);
    const s = location.hash.match(/^#\/(sp|truyen|phim)$/);   // liên kết cũ #/sp, #/truyen → cuộn tới mục
    if (s) document.getElementById(s[1])?.scrollIntoView({ behavior: 'smooth' });
}
if (PREVIEW) {
    addEventListener('message', e => {
        if (e.origin !== location.origin || !e.data || e.data.type !== 'zw-site') return;
        previewSite = e.data.site || {};
        DATA.site = previewSite;
        if (rendered) { const y = scrollY; renderPage(); scrollTo(0, y); }
    });
    // Trong khung xem trước: chặn chuyển trang, chỉ để xem
    document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true);
    parent.postMessage({ type: 'zw-ready' }, location.origin);
}
addEventListener('hashchange', route);
$('#logo').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
onData(async () => { try { await load(); renderPage(); } catch (e) { console.error(e); } }); // có dữ liệu mới ở nền → vẽ lại

/* ===== Nút đổi sáng/tối (mặc định theo hệ thống) ===== */
$('#logo-i').innerHTML = ic('spark');
const tb = $('#theme'), mq = matchMedia('(prefers-color-scheme:dark)');
const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : mq.matches;
const paintTheme = () => { tb.innerHTML = ic(isDark() ? 'sun' : 'moon'); };
tb.onclick = () => {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('zw:theme', t); } catch (e) {}
    paintTheme();
};
mq.addEventListener('change', paintTheme);
paintTheme();

route();