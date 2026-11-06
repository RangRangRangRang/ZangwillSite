// Trang công khai (chỉ đọc): một trang cuộn gồm Banner → Phần mềm → Truyện dịch.
// Bấm vào một mục sẽ mở cửa sổ chi tiết (địa chỉ #/sp/<id> hoặc #/truyen/<id>, mở thẳng được).
import { getProducts, getProduct, getNovels, getNovel, getCombos, getSettings, onData } from './db.js';
import { esc, safe, imgList, fullDeal, comboStats } from './util.js';
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
let DATA = { products: [], novels: [], combos: [], site: {} };
let curCat = 'all';
async function load() {
    // Chưa chạy update_v5.sql (chưa có bảng combos) thì bỏ qua, web vẫn chạy bình thường
    const [products, novels, site, combos] = await Promise.all([getProducts(), getNovels(), getSettings().catch(() => ({})), getCombos().catch(() => [])]);
    DATA = { products, novels, combos: combos || [], site: site || {} };
}

/* ===== Trang chính ===== */
const pCard = p => `<a class="pcard" href="#/sp/${esc(p.id)}"><div class="thumb" aria-hidden="true">${thumb(p)}<span class="em">${iconOf(p)}</span></div>
  <h3>${esc(p.name)}</h3><p>${esc(p.short)}</p><div class="pm"><span class="tag">${esc(p.cat)}</span>${p.version ? `<span class="ver">v${esc(p.version)}</span>` : ''}</div></a>`;
const nCard = n => `<a class="tile" href="#/truyen/${esc(n.id)}">${cover(n)}${stTag(n.status)}<b>${esc(n.title)}</b><small>${totalCh(n) ? totalCh(n) + ' chương' : 'Đang cập nhật'} · ${vnd(n.price)}/chương</small></a>`;

function renderProducts() {
    const { products } = DATA;
    const cats = [...new Set([...CATS, ...products.map(p => p.cat)])].filter(c => products.some(p => p.cat === c));
    if (curCat !== 'all' && !cats.includes(curCat)) curCat = 'all';
    const list = curCat === 'all' ? products : products.filter(p => p.cat === curCat);
    $('#filters').innerHTML = cats.length > 1
        ? [['all', 'Tất cả'], ...cats.map(c => [c, c])].map(([k, l]) => `<button class="chip" data-cat="${esc(k)}" aria-pressed="${curCat === k}">${esc(l)}</button>`).join('') : '';
    $('#pgrid').innerHTML = list.map(pCard).join('') || '<div class="empty">Chưa có sản phẩm nào.</div>';
}

/* ===== Truyện dịch: tìm kiếm, lọc trạng thái, sắp xếp ===== */
let nQuery = '', nStatus = 'all', nSort = 'default', nDir = 1, nAuthor = ''; // nAuthor: '' = mọi tác giả, còn lại = authorKey tác giả đang lọc; nDir: 1 = xuôi (trên xuống), -1 = ngược (dưới lên)
const SORTS = [['default', 'Thứ tự mặc định'], ['title', 'Tên (A–Z)'], ['len', 'Độ dài (số chương)'], ['price', 'Giá / chương']];
// Bỏ dấu + viết thường để gõ "tu tien" vẫn tìm ra "Tu Tiên"
const fold = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const byText = (a, b) => String(a || '').localeCompare(String(b || ''), 'vi');
const isDone = n => n.status === 'done';
const authorKey = n => fold(n.author).trim().replace(/\s+/g, ' ');

function sortNovels(list) {
    const l = list.slice(); // sort ổn định: bằng nhau thì giữ thứ tự admin đã kéo thả
    if (nSort === 'title') l.sort((a, b) => nDir * byText(a.title, b.title));
    else if (nSort === 'len') l.sort((a, b) => nDir * (totalCh(a) - totalCh(b)) || byText(a.title, b.title));
    else if (nSort === 'price') l.sort((a, b) => nDir * ((Number(a.price) || 0) - (Number(b.price) || 0)) || byText(a.title, b.title));
    else if (nDir < 0) l.reverse();
    return l;
}

// Danh sách tác giả (đã bỏ trùng, A → Z) kèm số truyện, cho ô chọn tác giả
function authorList() {
    const m = new Map();
    for (const n of DATA.novels) { const k = authorKey(n); if (!k) continue; if (!m.has(k)) m.set(k, { key: k, name: String(n.author).trim(), count: 0 }); m.get(k).count++; }
    return [...m.values()].sort((a, b) => byText(a.name, b.name));
}
const authorOptions = () => `<option value="">Tất cả tác giả</option>${authorList().map(a => `<option value="${esc(a.key)}" ${nAuthor === a.key ? 'selected' : ''}>${esc(a.name)} (${a.count})</option>`).join('')}`;

function renderNovels() {
    if (!$('#ngrid')) return; // chưa có truyện nào
    const q = fold(nQuery).trim();
    const list = sortNovels(DATA.novels.filter(n =>
        (!nAuthor || authorKey(n) === nAuthor) && (nStatus === 'all' || (nStatus === 'done') === isDone(n)) && (!q || fold(n.title + ' ' + (n.author || '')).includes(q))));
    $('#nfilters').innerHTML = [['all', 'Tất cả'], ['ongoing', 'Đang tiếp tục'], ['done', 'Đã kết thúc']]
        .map(([k, l]) => `<button class="chip" data-st="${k}" aria-pressed="${nStatus === k}">${l}</button>`).join('');
    $('#ndown').setAttribute('aria-pressed', nDir > 0);
    $('#nup').setAttribute('aria-pressed', nDir < 0);
    $('#ngrid').innerHTML = list.map(nCard).join('') || '<div class="empty">Không tìm thấy truyện nào.</div>';
}

/* ===== Combo đồng tác giả: banner xếp chéo như bìa sách ở banner đầu trang, bấm vào mở cửa sổ chi tiết ===== */
// Chỉ hiện combo có ít nhất 2 truyện của tác giả đó (tự gom theo tên tác giả) và đã nhập giá combo
const comboList = () => DATA.combos.map(c => ({ c, st: comboStats(c, DATA.novels) })).filter(x => x.st.items.length >= 2 && x.st.price > 0);
const ribbon = pct => pct > 0 ? `<span class="rib" aria-label="Giảm ${pct}%">-${pct}%</span>` : '';
function comboCard({ c, st }, i) {
    const u = c.cover && safe(c.cover) !== '#' ? c.cover : '';
    return `<a class="cb cb${i % 3}" href="#/combo/${esc(c.id)}" aria-label="Combo ${esc(c.author)}: ${st.items.length} truyện, ${vnd(st.price)}">
      <div class="cbi ${u ? 'has' : ''}" style="${u ? `background-image:url('${cssUrl(u)}')` : `background:${grad(hueOf(c.author))}`}"></div>${ribbon(st.pct)}
      <div class="cbn"><b>${esc(c.author)}</b><small>${st.items.length} truyện · ${vnd(st.price)}</small></div></a>`;
}
function comboSection() {
    const L = comboList();
    return L.length ? `<section class="shelf" id="combo"><div class="sh"><h2>Combo đồng tác giả</h2></div><div class="cbrow">${L.map(comboCard).join('')}</div></section>` : '';
}

function renderPage() {
    const { products, novels, site } = DATA;
    const name = esc(site.name || '[Tên bạn]');
    const tagline = esc(site.tagline || 'Một thư viện nhỏ: những sản phẩm mình tự làm, và những bộ truyện mình dịch — liên hệ để mua trực tiếp.');
    const bg = site.banner && safe(site.banner) !== '#' ? site.banner : '';
    const p0 = products[0];
    const art = `<div class="art" aria-hidden="true">
      ${p0 ? `<div class="win"><div class="wh"><i></i><i></i><i></i></div><div class="wb" style="background:${grad(hueOf(p0.name))}">${firstImg(p0) ? `<img src="${esc(safe(firstImg(p0)))}" alt="">` : esc(p0.name)}</div></div>` : ''}
      ${novels.slice(0, 3).map((n, i) => `<div class="bk b${i + 1}">${cover(n)}</div>`).join('')}</div>`;
    const links = contacts().map(c => `<a href="${esc(safe(c.url))}" data-app target="_blank" rel="noopener">${esc(c.name)}</a>`).join(' · ');
    $('#page').innerHTML = `<section class="ban ${rendered ? '' : 'view'} ${bg ? 'has-img' : ''}">${bg ? `<div class="ban-bg" style="background-image:url('${cssUrl(bg)}')"></div>` : ''}
      <div class="ban-in"><div><p class="eyebrow">Xin chào</p><h1>Mình là ${name},<br>làm phần mềm &amp; dịch truyện.</h1><p class="lead">${tagline}</p>
       <div class="btns"><a class="btn sw" href="#/sp">${ic('code')}Phần mềm</a><a class="btn" href="#/truyen">${ic('book')}Truyện dịch</a></div>
       <div class="chips"><a href="#/sp"><b>${products.length}</b>phần mềm</a><a href="#/truyen"><b>${novels.length}</b>truyện dịch</a></div></div>${art}</div></section>
     <div class="wrap ${rendered ? '' : 'view'}">
     <section class="shelf" id="sp" style="margin-top:0"><div class="sh"><h2>Phần mềm</h2><div class="filters" id="filters" role="group" aria-label="Lọc theo danh mục"></div></div><div class="pgrid" id="pgrid"></div></section>
     <section class="shelf" id="truyen"><div class="sh"><h2>Truyện dịch</h2><div class="filters" id="nfilters" role="group" aria-label="Lọc theo trạng thái"></div></div>
      ${novels.length ? `<div class="ntools"><input id="nq" type="search" placeholder="Tìm tên truyện, tác giả…" value="${esc(nQuery)}" aria-label="Tìm truyện" autocomplete="off">
       <select id="nsort" aria-label="Sắp xếp truyện">${SORTS.map(([k, l]) => `<option value="${k}" ${nSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
       <select id="nauthor" aria-label="Lọc theo tác giả">${authorOptions()}</select>
       <div class="dirs" role="group" aria-label="Chiều sắp xếp"><button class="chip" id="ndown" type="button" aria-pressed="${nDir > 0}" aria-label="Sắp từ trên xuống dưới (A→Z, ít→nhiều, thấp→cao)" title="Từ trên xuống: A→Z, ít→nhiều, thấp→cao">${ic('down')}</button><button class="chip" id="nup" type="button" aria-pressed="${nDir < 0}" aria-label="Sắp từ dưới lên trên (Z→A, nhiều→ít, cao→thấp)" title="Từ dưới lên: Z→A, nhiều→ít, cao→thấp">${ic('up')}</button></div></div>
       <div class="ngrid" id="ngrid"></div>` : '<div class="empty">Chưa có truyện nào.</div>'}</section>
     ${comboSection()}
     <footer>${links ? `Liên hệ mua truyện: ${links} · ` : ''}<a href="admin.html">Quản trị</a></footer></div>`;
    renderProducts();
    renderNovels();
    renderBadge();
}

// Bấm nút chọn danh mục (dùng data-cat thay vì onclick để an toàn)
document.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) { curCat = b.dataset.cat; renderProducts(); }
    const t = e.target.closest('[data-st]');
    if (t) { nStatus = t.dataset.st; renderNovels(); }
    if (e.target.closest('#ndown')) { nDir = 1; renderNovels(); }
    if (e.target.closest('#nup')) { nDir = -1; renderNovels(); }
});
// Gõ tìm kiếm / đổi cách sắp xếp: chỉ vẽ lại lưới truyện (ô nhập không bị mất con trỏ)
document.addEventListener('input', e => { if (e.target.id === 'nq') { nQuery = e.target.value; renderNovels(); } });
document.addEventListener('change', e => {
    if (e.target.id === 'nsort') { nSort = e.target.value; renderNovels(); }
    if (e.target.id === 'nauthor') { nAuthor = e.target.value; renderNovels(); }
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
    const fp = Number(n.full_price) || 0;
    if (!(fp > 0)) return '';
    const d = fullDeal(n.price, max, fp);
    return `<div class="deal"><div><span class="lbl">Mua toàn tập${max ? ` · ${max} chương` : ''}</span><b>${vnd(fp)}</b>${d.pct ? `<s>${vnd(d.retail)}</s>` : ''}</div>${d.pct ? `<span class="save">Rẻ hơn ${d.pct}%</span>` : ''}${max ? `<button class="btn nv" type="button" id="cfull">${ic('cart')}Thêm toàn tập vào giỏ</button>` : ''}<div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>`;
}

// Tên quyển hiển thị: "Quyển 1 – Thành phố của thánh ca"
const volLabel = v => `${v.name}${v.title ? ' – ' + v.title : ''}`;

function novelHtml(n) {
    const max = totalCh(n), vols = n.volumes || [];
    const pickable = vols.length > 1 && Number(n.price) > 0; // truyện chia quyển → cho tick chọn quyển
    const reviews = (n.reviews || []).map(x => {
        const [i, nm] = platform(x.url);
        return `<a class="rv" href="${esc(safe(x.url))}" target="_blank" rel="noopener"><span class="pi">${ic(i)}</span><div><b>${esc(x.label || nm)}</b><small>${esc(nm)}</small></div><span class="go">${ic('ext')}</span></a>`;
    }).join('');
    return `<div class="dh2">${cover(n)}<div>${stTag(n.status)}<h1 id="dt">${esc(n.title)}</h1></div></div>
     <div class="meta"><span>Tác giả: <b>${esc(n.author || '—')}</b></span><span>${max ? max + ' chương' : 'Đang cập nhật số chương'}</span><span><b>${vnd(n.price)}</b>/chương</span></div>
     ${dealHtml(n, max)}
     ${intro(n.synopsis)}
     ${vols.length ? `<h3 class="h">Danh sách quyển</h3><div class="vols"><div class="vrow th"><span>Quyển</span><span>Chương</span><span>Số chương</span><span>Giá trọn quyển</span></div>
      ${vols.map((v, i) => `<div class="vrow"><b>${pickable ? `<label class="vk"><input type="checkbox" data-vol="${i}" aria-label="Chọn ${esc(v.name)}"><span>${esc(volLabel(v))}</span></label>` : esc(volLabel(v))}</b><span>${v.from} – ${v.to}</span><span>${v.to - v.from + 1} chương</span><span>${vnd((v.to - v.from + 1) * n.price)}</span></div>`).join('')}</div>
      ${pickable ? `<div class="vpick"><label class="vk"><input type="checkbox" id="vall"><span>Chọn tất cả</span></label><div class="vsum" id="vsum" aria-live="polite">Tick vào các quyển muốn mua</div>
       <button class="btn nv" type="button" id="vadd" disabled>${ic('cart')}Thêm quyển đã chọn vào giỏ</button><div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>` : ''}` : ''}
     ${max ? `<div class="calc"><h4>${ic('calc')}Tính giá theo chương</h4><div class="in"><label>Từ chương <input type="number" id="c1" min="1" max="${max}" value="1"></label><label>đến <input type="number" id="c2" min="1" max="${max}" value="${max}"></label></div><div class="total" id="tot"></div><div class="btns"><button class="btn nv" type="button" id="cadd">${ic('cart')}Thêm vào giỏ</button></div><div class="cmsg" aria-live="polite"></div></div>` : ''}
     ${contacts().length ? `<h3 class="h" style="margin-top:0">Liên hệ mua</h3><div class="btns" style="margin-top:0">${contacts().map(c => `<a class="btn nv" href="${esc(safe(c.url))}" data-app target="_blank" rel="noopener">${ic(contactIcon(c.name))}${esc(c.name)}</a>`).join('')}</div>` : ''}
     ${reviews ? `<h3 class="h">Review &amp; đánh giá</h3>${reviews}` : ''}`;
}

// Tick chọn quyển → hiện số chương + giá → thêm các quyển đã tick vào giỏ
function initVols(n) {
    const boxes = [...dlg.querySelectorAll('input[data-vol]')], all = $('#vall'), add = $('#vadd');
    if (!boxes.length) return;
    const vols = n.volumes || [];
    const picked = () => boxes.filter(b => b.checked).map(b => vols[+b.dataset.vol]);
    const sync = () => {
        const p = picked(), k = p.reduce((s, v) => s + v.to - v.from + 1, 0);
        $('#vsum').innerHTML = p.length ? `Đã chọn <b>${p.length}</b> quyển · ${k} chương · <b>${vnd(k * n.price)}</b>` : 'Tick vào các quyển muốn mua';
        add.disabled = !p.length;
        all.checked = p.length === boxes.length;
    };
    boxes.forEach(b => b.onchange = sync);
    all.onchange = () => { boxes.forEach(b => b.checked = all.checked); sync(); };
    add.onclick = () => addToCart(n, { mode: 'vols', vols: picked().map(v => [v.from, v.to]) }, add);
    sync();
}

function initCalc(n) {
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
        $('#tot').innerHTML = `${vnd(k * n.price)}<small>${k} chương · chương ${a} → ${b}</small>${nudge}`;
    };
    c1.oninput = c2.oninput = calc;
    calc();
}

// Cửa sổ combo: các truyện của tác giả (như lưới truyện) + giá combo, % rẻ hơn, nút thêm vào giỏ
function comboHtml(c) {
    const st = comboStats(c, DATA.novels);
    return `<div class="dh2" style="margin-bottom:8px"><div><span class="tag ok"><i></i>Combo đồng tác giả</span><h1 id="dt">${esc(c.author)}</h1>
      <div class="meta"><span><b>${st.items.length}</b> truyện</span><span>Mua trọn bộ cả ${st.items.length} truyện</span></div></div></div>
     <div class="deal"><div><span class="lbl">Giá combo · ${st.items.length} truyện trọn bộ</span><b>${vnd(st.price)}</b>${st.pct ? `<s>${vnd(st.retail)}</s>` : ''}</div>${st.pct ? `<span class="save">Rẻ hơn ${st.pct}%</span>` : ''}
      <button class="btn nv" type="button" id="ccadd">${ic('cart')}Thêm combo vào giỏ</button><div class="cmsg" style="flex-basis:100%" aria-live="polite"></div></div>
     <h3 class="h">Gồm các truyện</h3><div class="ngrid cgrid">${st.items.map(nCard).join('')}</div>`;
}

async function openDetail(sec, id) {
    if (sec === 'combo') {
        const c = DATA.combos.find(x => x.id === id);
        if (!c || comboStats(c, DATA.novels).items.length < 2) return closeDetail(true);
        dlg.innerHTML = `<button class="xbtn" id="x" type="button" aria-label="Đóng">${ic('x')}</button><div class="dc">${comboHtml(c)}</div>`;
        dlg.setAttribute('aria-labelledby', 'dt');
        if (!dlg.open) dlg.showModal();
        dlg.scrollTop = 0;
        $('#x').onclick = () => dlg.close();
        $('#ccadd').onclick = e => addToCart({ id: 'combo:' + c.id }, { mode: 'combo', cid: c.id }, e.currentTarget);
        return;
    }
    const item = (sec === 'sp' ? DATA.products : DATA.novels).find(x => x.id === id)
        || await (sec === 'sp' ? getProduct(id) : getNovel(id)).catch(() => null);
    if (!item) return closeDetail(true);
    dlg.innerHTML = `<button class="xbtn" id="x" type="button" aria-label="Đóng">${ic('x')}</button><div class="dc">${sec === 'sp' ? productHtml(item) : novelHtml(item)}</div>`;
    dlg.setAttribute('aria-labelledby', 'dt');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    $('#x').onclick = () => dlg.close();
    if (sec === 'sp') initGallery();
    else { initCalc(item); initVols(item); const f = $('#cfull'); if (f) f.onclick = () => addToCart(item, { mode: 'full' }, f); }
}
function closeDetail(clearHash) {
    if (dlg.open) dlg.close();
    if (clearHash) history.replaceState(null, '', location.pathname + location.search);
}
// Đóng bằng nút, phím Esc hoặc bấm ra ngoài → bỏ phần #/sp/<id> khỏi địa chỉ
dlg.addEventListener('close', () => { if (/^#\/(sp|truyen|combo)\/./.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });


/* ===== Giỏ hàng (chỉ để chọn truyện rồi gửi danh sách cho chủ web qua Zalo/Facebook, không thanh toán) ===== */
const cartDlg = $('#cartdlg');

// Dòng trong giỏ: giá luôn tính lại từ dữ liệu hiện tại; truyện đã bị xóa / hết bán trọn bộ thì bỏ qua
function cartLines() {
    return getCart().map(it => {
        if (it.mode === 'combo') { // combo tác giả: giá tính lại từ dữ liệu hiện tại; combo bị xóa / còn dưới 2 truyện thì bỏ qua
            const c = DATA.combos.find(x => x.id === it.cid), st = c && comboStats(c, DATA.novels);
            return st && st.items.length >= 2 && st.price > 0
                ? { n: { id: it.id, title: `Combo tác giả ${c.author}` }, text: `Trọn bộ ${st.items.length} truyện: ${st.items.map(x => x.title).join('; ')}`, price: st.price } : null;
        }
        const n = DATA.novels.find(x => x.id === it.id), max = n && totalCh(n);
        if (!n || !max) return null;
        if (it.mode === 'full') {
            const fp = Number(n.full_price) || 0;
            return fp > 0 ? { n, text: `Trọn bộ (${max} chương)`, price: fp } : null;
        }
        if (it.mode === 'vols') {
            const p = (n.volumes || []).filter(v => it.vols.some(([f, t]) => f === v.from && t === v.to)); // quyển đã bị sửa/xóa thì bỏ qua
            if (!p.length) return null;
            const k = p.reduce((s, v) => s + v.to - v.from + 1, 0);
            return { n, text: `${p.length} quyển: ${p.map(volLabel).join('; ')} (${k} chương)`, price: k * n.price };
        }
        const a = Math.min(it.from, max), b = Math.min(it.to, max), k = b - a + 1;
        return { n, text: `Chương ${a} → ${b} (${k} chương)`, price: k * n.price };
    }).filter(Boolean);
}
const cartTotal = lines => lines.reduce((s, l) => s + l.price, 0);
const orderText = lines => `Chào bạn, mình muốn mua truyện:\n${lines.map((l, i) => `${i + 1}. ${l.n.title} — ${l.text}: ${vnd(l.price)}`).join('\n')}\nTổng cộng: ${vnd(cartTotal(lines))}`;

function renderBadge() {
    const n = cartLines().length;
    $('#cartbtn').innerHTML = `${ic('cart')}${n ? `<span class="cn">${n}</span>` : ''}`;
    $('#cartbtn').setAttribute('aria-label', n ? `Thống kê giỏ hàng (${n} mục)` : 'Thống kê giỏ hàng');
}

function renderCart() {
    const lines = cartLines();
    const body = !lines.length
        ? '<div class="empty">Chưa có truyện nào trong giỏ.<br><small>Mở một truyện rồi bấm “Thêm vào giỏ”.</small></div>'
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
        try { await load(); } catch (e) {
            console.error(e);
            $('#page').innerHTML = `<div class="wrap"><div class="err"><b>Không tải được dữ liệu.</b><br>${esc(e.message)}<br><small>Kiểm tra lại cấu hình trong assets/js/config.js và kết nối mạng.</small></div></div>`;
            return;
        }
        renderPage(); rendered = true;
    }
    const m = location.hash.match(/^#\/(sp|truyen|combo)\/(.+)$/);
    if (m) return openDetail(m[1], decodeURIComponent(m[2]));
    closeDetail(false);
    const s = location.hash.match(/^#\/(sp|truyen)$/);   // liên kết cũ #/sp, #/truyen → cuộn tới mục
    if (s) document.getElementById(s[1])?.scrollIntoView({ behavior: 'smooth' });
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
