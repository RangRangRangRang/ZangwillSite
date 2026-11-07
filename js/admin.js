// Trang quản trị: đăng nhập mật khẩu + thêm/sửa/xóa Phần mềm và Truyện dịch.
import {
    getProducts, getNovels, getCombos, saveProduct, deleteProduct, saveNovel, deleteNovel, saveCombo, deleteCombo,
    sendOtp, signInPassword, getSession, signOut, sb, uploadImage, uploadFile, getSettings, saveSettings, settingsHint, reorderNovels,
} from './db.js';
import { esc, safe, parseLinks, linksToText, imgList, fullDeal, authorKey, fullPriceOf, comboStats, isSellable } from './util.js';
import { readNovelFile, downloadTemplate, titleKey, DEFAULT_PRICE } from './import.js';
const curKind = () => tab === 'movies' ? 'movie' : 'novel'; // loại đang mở ở tab (cho nhập Excel)

const $ = s => document.querySelector(s);
const CATS = ['Windows Apps', 'Mac Apps', 'Linux Apps', 'Mobile Apps', 'Web Apps', 'Chrome Extensions', 'Firefox Add-ons', 'Edge Add-ons', 'Plugins', 'Games', 'Công cụ', 'Scripts', 'Khác'];
let tab = 'products'; // 'products' | 'novels' | 'movies' | 'combos' | 'site'
const isItemTab = t => t === 'novels' || t === 'movies'; // Truyện dịch và Phim dùng chung bảng novels (cột kind)
const kindOf = n => n && n.kind === 'movie' ? 'movie' : 'novel';
let adminQuery = '', queryTab = ''; // ô tìm kiếm trong danh sách quản trị
let adminSort = 'default'; // cách xem danh sách truyện / phim (chỉ để xem, không đổi thứ tự trang chủ)
const totalOf = o => (o.volumes || []).reduce((m, v) => Math.max(m, v.to), 0);
const isSeriesItem = o => kindOf(o) === 'movie' && (o.movie_type === 'series' || (o.movie_type !== 'single' && totalOf(o) > 1)); // theo lựa chọn; chưa chọn thì nhiều hơn 1 tập = phim bộ
const viewOptions = t => [['default', 'Thứ tự trang chủ (kéo thả được)'], ['title', 'Tên A → Z'], ['len', 'Nhiều tập / chương nhất'], ['price', 'Giá mỗi tập / chương (thấp → cao)'], ['ongoing', 'Chỉ đang tiếp tục'], ['done', 'Chỉ đã kết thúc'],
    ...(t === 'movies' ? [['series', 'Chỉ phim bộ'], ['single', 'Chỉ phim lẻ'], ['seriesfirst', 'Phim bộ trước'], ['singlefirst', 'Phim lẻ trước']] : [])];
// Bỏ dấu + viết thường để gõ "tu tien" vẫn tìm ra "Tu Tiên"
const fold = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

/* ===== Thông báo ===== */
// Hiện ở đầu trang, và cả trong form nếu form đang mở (tránh bị che sau lớp nền)
function say(text, isErr = false) {
    const html = text ? `<div class="${isErr ? 'err' : 'calc'}">${esc(text)}</div>` : '';
    const f = $('#fmsg');
    const inForm = f && (!f.closest('dialog') || $('#dlg').open);
    $('#msg').innerHTML = inForm ? '' : html;
    if (f) f.innerHTML = inForm ? html : '';
    // Thông báo thành công tự tắt sau 4 giây (lỗi thì giữ lại để đọc)
    clearTimeout(say.t);
    if (text && !isErr && !inForm) say.t = setTimeout(() => { if ($('#msg').innerHTML === html) $('#msg').innerHTML = ''; }, 4000);
}
// Chạy một thao tác, báo lỗi dễ hiểu nếu thất bại
async function run(fn) {
    try { say(''); await fn(); }
    catch (e) {
        console.error(e);
        const hint = /movie_type/.test(e.message) ? ' — Hãy chạy file supabase/update_v9.sql trong SQL Editor rồi thử lại.'
            : /\bkind\b/.test(e.message) ? ' — Hãy chạy file supabase/update_v8.sql trong SQL Editor rồi thử lại.'
            : /is_free/.test(e.message) ? ' — Hãy chạy file supabase/update_v7.sql trong SQL Editor rồi thử lại.'
            : /full_price|sort_order/.test(e.message) ? ' — Hãy chạy file supabase/update_v4.sql trong SQL Editor rồi thử lại.'
            : /novel_ids/.test(e.message) ? ' — Hãy chạy file supabase/update_v6.sql trong SQL Editor rồi thử lại.'
            : /combos/.test(e.message) ? ' — Hãy chạy file supabase/update_v5.sql trong SQL Editor rồi thử lại.' : '';
        say('Lỗi: ' + e.message + hint, true);
    }
}

/* ===== Đăng nhập ===== */
// Đăng nhập bằng email + mật khẩu (không tốn email nên không bị giới hạn).
// Có thêm nút phụ "gửi link qua email" phòng khi quên mật khẩu.
function loginView(email = '') {
    $('#logout').hidden = true;
    $('#app').innerHTML = `<div class="detail" style="max-width:420px;margin:auto">
    <h2 style="margin-top:0">Đăng nhập quản trị</h2>
    <form id="lf">
      <label>Email admin</label>
      <input type="email" name="email" required autocomplete="username" value="${esc(email)}">
      <label>Mật khẩu</label>
      <input type="password" name="password" required autocomplete="current-password">
      <div class="row"><button class="btn p" type="submit">Đăng nhập</button>
      <button class="btn" type="button" id="link">Gửi link đăng nhập qua email</button></div>
    </form></div>`;
    $('#lf').onsubmit = e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        run(async () => { await signInPassword(f.email.trim(), f.password); await start(); });
    };
    $('#link').onclick = () => {
        const em = $('#lf').elements.email.value.trim();
        if (!em) return say('Hãy nhập email trước.', true);
        run(async () => { await sendOtp(em); say('Đã gửi link vào email. Bấm link đó để đăng nhập.'); });
    };
}

$('#logout').onclick = () => run(async () => { await signOut(); loginView(); });

/* ===== Khung quản trị ===== */
const tabsHtml = () => `<div class="tabs">
    <button class="btn ${tab === 'products' ? 'on' : ''}" data-tab="products">💻 Phần mềm</button>
    <button class="btn ${tab === 'novels' ? 'on' : ''}" data-tab="novels">📚 Truyện dịch</button>
    <button class="btn ${tab === 'movies' ? 'on' : ''}" data-tab="movies">🎬 Phim</button>
    <button class="btn ${tab === 'combos' ? 'on' : ''}" data-tab="combos">🎁 Combo</button>
    <button class="btn ${tab === 'site' ? 'on' : ''}" data-tab="site">🏠 Trang chủ</button></div>`;

const num = (v, lo, hi, d) => { v = parseFloat(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }; // số trong khoảng [lo, hi], sai thì lấy mặc định d
// Tab "Trang chủ": nửa trái nhập liệu (chữ, link ảnh, độ mờ / đậm nhạt), nửa phải là bản xem trước CHÍNH trang chủ, cập nhật ngay khi gõ / kéo
let pvCleanup = null;
async function sitePage() {
    if (pvCleanup) { pvCleanup(); pvCleanup = null; }
    let s = {};
    try { s = await getSettings(); } catch (e) { console.error(e); }
    const slider = (name, label, min, max, step, d, unit) => `<label>${label}</label>
      <div class="sl"><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${num(s[name], min, max, d)}" data-unit="${unit}"><b data-v="${name}"></b></div>`;
    $('#app').innerHTML = `${tabsHtml()}<div class="top"><h1>Trang chủ</h1><div class="sub">Chỉnh bên trái, xem kết quả ngay bên phải. Bấm Lưu để áp dụng cho khách.</div></div>
    <div class="sitegrid">
    <form id="sf" class="detail">
      <div class="sec">✍️ Chữ</div>
      <label>Tên hiển thị (câu "Mình là …")</label><input name="name" placeholder="[Tên bạn]" value="${esc(s.name || '')}">
      <label>Lời giới thiệu ngắn dưới tiêu đề</label><textarea name="tagline" rows="3" placeholder="Để trống = dùng câu mặc định">${esc(s.tagline || '')}</textarea>

      <div class="sec">🖼 Ảnh nền banner</div>
      ${imgField('banner', 'Dán link ảnh, hoặc bấm "Chọn tệp" để tải lên (ảnh ngang, tối thiểu 1600×700, dưới 3MB). Để trống = banner mặc định', s.banner || '')}
      ${slider('bgblur', 'Độ mờ ảnh banner', 0, 12, 1, 0, 'px')}
      ${slider('bgdim', 'Độ tối lớp phủ banner (để chữ dễ đọc)', 0, 120, 5, 100, '%')}
      ${slider('bgpop', 'Độ nổi của bìa combo (quầng sáng + bóng đổ)', 0, 100, 5, 0, '%')}

      <div class="sec">🌌 Ảnh nền cả trang</div>
      ${imgField('pagebg', 'Dán link ảnh, hoặc tải lên (nằm dưới mọi mục, cố định khi cuộn — ảnh ngang ≥ 1920px, nên dưới 1MB). Để trống = nền màu mặc định', s.pagebg || '')}
      ${slider('pageblur', 'Độ mờ ảnh nền trang', 0, 20, 1, 0, 'px')}
      ${slider('pagedim', 'Độ phủ màu nền (cao = ảnh mờ nhạt, chữ dễ đọc)', 0, 100, 5, 80, '%')}

      <div class="savebar"><div id="fmsg"></div><button class="btn p" type="submit">Lưu</button></div>
    </form>
    <aside class="pvpane" aria-label="Xem trước trang chủ">
      <div class="pvbar"><b>👁 Xem trước</b>
        <button class="btn on" type="button" data-pv="desk">Máy tính</button><button class="btn" type="button" data-pv="mob">Điện thoại</button></div>
      <div class="pvbox" id="pvbox"><iframe id="pvf" src="index.html?preview=1" title="Xem trước trang chủ"></iframe></div>
    </aside></div>`;

    const form = $('#sf'), el = form.elements;
    const collect = () => ({
        name: el.namedItem('name').value.trim(), tagline: el.tagline.value.trim(), banner: el.banner.value.trim(),
        bgblur: num(el.bgblur.value, 0, 12, 0), bgdim: num(el.bgdim.value, 0, 120, 100), bgpop: num(el.bgpop.value, 0, 100, 0),
        pagebg: el.pagebg.value.trim(), pageblur: num(el.pageblur.value, 0, 20, 0), pagedim: num(el.pagedim.value, 0, 100, 80),
    });
    // Số hiện cạnh thanh trượt
    const labels = () => form.querySelectorAll('[data-v]').forEach(b => { const i = el.namedItem(b.dataset.v); b.textContent = i.value + i.dataset.unit; });
    // Gửi cài đặt đang soạn vào khung xem trước (mỗi khung hình tối đa 1 lần)
    let raf = 0;
    const send = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const w = $('#pvf') && $('#pvf').contentWindow; if (w) w.postMessage({ type: 'zw-site', site: collect() }, location.origin); }); };
    form.addEventListener('input', () => { labels(); send(); });
    labels();

    // Khung xem trước: dựng ở bề ngang thật (1280px máy tính / 390px điện thoại) rồi thu nhỏ vừa nửa phải
    let mode = 'desk';
    const fit = () => {
        const box = $('#pvbox'), f = $('#pvf'); if (!box || !f) return;
        const W = mode === 'desk' ? 1280 : 390, k = Math.min(1, box.clientWidth / W);
        f.style.width = W + 'px'; f.style.height = box.clientHeight / k + 'px';
        f.style.transform = `scale(${k})`; f.style.left = Math.max(0, (box.clientWidth - W * k) / 2) + 'px';
    };
    const ro = new ResizeObserver(fit); ro.observe($('#pvbox')); fit();
    const onMsg = e => { if (e.origin === location.origin && e.data && e.data.type === 'zw-ready') send(); };
    addEventListener('message', onMsg);
    $('#pvf').addEventListener('load', send);
    document.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => {
        mode = b.dataset.pv;
        document.querySelectorAll('[data-pv]').forEach(x => x.classList.toggle('on', x === b));
        fit();
    });
    pvCleanup = () => { ro.disconnect(); removeEventListener('message', onMsg); cancelAnimationFrame(raf); };

    form.onsubmit = e => {
        e.preventDefault();
        run(async () => {
            try { await saveSettings(collect()); }
            catch (err) { throw new Error(settingsHint(err)); }
            say('Đã lưu. Trang chủ đã cập nhật cho khách.');
        });
    };
}

let shownTab = ''; // tab đang hiển thị trên màn hình
async function panel() {
    $('#logout').hidden = false;
    document.querySelector('main').classList.toggle('wide', tab === 'site'); // tab Trang chủ cần chỗ rộng cho 2 nửa
    if (tab === 'site') { shownTab = ''; return sitePage(); }
    if (queryTab !== tab) { adminQuery = ''; adminSort = 'default'; queryTab = tab; } // đổi tab thì xóa ô tìm và cách xem
    // Đang ở đúng tab rồi (vừa sửa/xóa/nhập xong) → chỉ tải lại danh sách, giữ nguyên vị trí cuộn và ô tìm kiếm
    const refresh = shownTab === tab && !!$('#list');
    const y = scrollY;
    if (!refresh) $('#app').innerHTML = `${tabsHtml()}
    <div class="top"><h1>${{ products: 'Phần mềm', novels: 'Truyện dịch', movies: 'Phim', combos: 'Combo' }[tab]}</h1>
    <div class="row" style="margin:0">${isItemTab(tab) ? '<button class="btn" data-act="tpl">⬇ File Excel mẫu</button><button class="btn" data-act="import">📥 Nhập từ Excel</button>' : ''}
    <button class="btn p" data-act="add">+ Thêm mới</button></div></div>
    <input type="file" id="xfile" accept=".xlsx,.xls,.csv" hidden>
    <div class="row" style="margin:0 0 14px;align-items:center"><input type="search" id="aq" placeholder="${{ products: 'Tìm theo tên hoặc danh mục…', novels: 'Tìm theo tên truyện hoặc tác giả…', movies: 'Tìm theo tên phim hoặc đạo diễn…', combos: 'Tìm theo tên combo…' }[tab]}" value="${esc(adminQuery)}" aria-label="Tìm trong danh sách" autocomplete="off" style="margin:0;flex:1 1 260px">
    ${isItemTab(tab) ? `<select id="asort" aria-label="Cách xem danh sách" style="margin:0;flex:0 1 280px">${viewOptions(tab).map(([v, l]) => `<option value="${v}" ${adminSort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</div>
    <div id="list"><div class="empty">Đang tải…</div></div>`;
    if (tab === 'combos') { [window.__items, window.__novels] = await Promise.all([getCombos(), getNovels()]); }
    else if (tab === 'products') window.__items = await getProducts();
    else { const k = tab === 'movies' ? 'movie' : 'novel'; window.__items = (await getNovels()).filter(n => kindOf(n) === k); }
    shownTab = tab;
    drawList();
    if (refresh) scrollTo(0, y);
    else if (isItemTab(tab)) enableDnD();
}

const rowBtns = o => `<button class="btn" data-act="edit" data-id="${esc(o.id)}">Sửa</button><button class="btn d" data-act="del" data-id="${esc(o.id)}">Xóa</button>`;
function rowHtml(o, i, n, locked) {
    if (tab === 'products') return `<div class="rv" style="cursor:default"><div style="flex:1"><b>${esc(o.name)}</b><small>${esc(o.cat)}</small></div>${rowBtns(o)}</div>`;
    if (tab === 'combos') {
        const st = comboStats(o, window.__novels || []);
        return `<div class="rv" style="cursor:default"><div style="flex:1;min-width:0"><b>${esc(o.author)}</b><small>${st.items.length} truyện · combo ${vnd(o.price)}${st.pct ? ` · giảm ${st.pct}% (giá lẻ ${vnd(st.retail)})` : ''}${st.items.length < 2 ? ' · ⚠ cần ít nhất 2 truyện, combo chưa hiện ra trang web' : ''}</small></div>${rowBtns(o)}</div>`;
    }
    // Truyện: có tay nắm kéo thả + nút đưa lên đầu / lên / xuống (dùng được cả trên điện thoại)
    return `<div class="rv nrow" data-id="${esc(o.id)}" style="cursor:default">${locked ? '' : '<span class="grip" title="Kéo để sắp xếp" aria-hidden="true">⠿</span>'}<span class="pos">${i + 1}</span>
    <div style="flex:1;min-width:0"><b>${esc(o.title)}</b><small>${o.status === 'done' ? 'Đã kết thúc' : 'Đang tiếp tục'}${kindOf(o) === 'movie' ? (isSeriesItem(o) ? ` · Phim bộ (${totalOf(o)} tập)` : ' · Phim lẻ') : ''}</small></div>
    <button class="btn mv" data-act="top" data-id="${esc(o.id)}" title="Đưa lên đầu trang chủ" ${locked || i === 0 ? 'disabled' : ''}>⤒ Lên đầu</button>
    <button class="btn mv" data-act="up" data-id="${esc(o.id)}" aria-label="Lên một bậc" ${locked || i === 0 ? 'disabled' : ''}>↑</button>
    <button class="btn mv" data-act="down" data-id="${esc(o.id)}" aria-label="Xuống một bậc" ${locked || i === n - 1 ? 'disabled' : ''}>↓</button>${rowBtns(o)}</div>`;
}
function drawList() {
    const items = window.__items, q = fold(adminQuery).trim();
    // Giữ số thứ tự thật trong toàn danh sách, kể cả khi đang lọc
    let rows = items.map((o, i) => ({ o, i })).filter(({ o }) => !q || fold(tab === 'products' ? `${o.name} ${o.cat}` : tab === 'combos' ? o.author : `${o.title} ${o.author || ''}`).includes(q));
    // Cách xem (chỉ ảnh hưởng màn hình quản trị, không đổi thứ tự thật trên trang chủ)
    const v = isItemTab(tab) ? adminSort : 'default';
    if (v === 'ongoing' || v === 'done') rows = rows.filter(({ o }) => (o.status === 'done') === (v === 'done'));
    if (v === 'series') rows = rows.filter(({ o }) => isSeriesItem(o));
    if (v === 'single') rows = rows.filter(({ o }) => !isSeriesItem(o));
    if (v === 'title') rows.sort((a, b) => String(a.o.title).localeCompare(String(b.o.title), 'vi'));
    if (v === 'len') rows.sort((a, b) => totalOf(b.o) - totalOf(a.o));
    if (v === 'price') rows.sort((a, b) => (Number(a.o.price) || 0) - (Number(b.o.price) || 0));
    if (v === 'seriesfirst' || v === 'singlefirst') { const f = v === 'seriesfirst'; rows.sort((a, b) => (isSeriesItem(b.o) === f) - (isSeriesItem(a.o) === f)); }
    const locked = !!q || v !== 'default'; // đang lọc / sắp xếp thì khóa kéo thả
    const hint = locked && isItemTab(tab) ? '<div class="meta" style="margin-bottom:10px">Đang lọc / sắp xếp để xem — chọn "Thứ tự trang chủ" và xóa ô tìm kiếm để kéo thả đổi thứ tự.</div>' : '';
    $('#list').innerHTML = !items.length ? '<div class="empty">Chưa có mục nào.</div>'
        : !rows.length ? '<div class="empty">Không tìm thấy mục nào.</div>'
        : hint + rows.map(({ o, i }) => rowHtml(o, i, items.length, locked)).join('');
}

/* ===== Sắp xếp truyện: kéo thả hoặc bấm nút. Truyện đứng đầu danh sách = đầu tiên ở trang chủ ===== */
function persistOrder() {
    const ids = window.__items.map(x => x.id);
    run(async () => {
        try { await reorderNovels(ids); } catch (e) { await panel(); throw e; } // lỗi → tải lại thứ tự thật trong database
        say('Đã lưu thứ tự — trang chủ sẽ hiển thị theo thứ tự này.');
    });
}
function moveNovel(id, how) {
    const a = window.__items, i = a.findIndex(x => x.id === id);
    const j = how === 'top' ? 0 : how === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= a.length || j === i) return;
    a.splice(j, 0, a.splice(i, 1)[0]);
    drawList(); persistOrder();
    if (how === 'top') $('#list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function enableDnD() {
    const L = $('#list'); let drag = null;
    // Chỉ bắt đầu kéo khi bấm vào tay nắm ⠿ (để các nút khác vẫn bấm bình thường)
    L.addEventListener('mousedown', e => { const g = e.target.closest('.grip'); if (g) g.closest('.nrow').draggable = true; });
    L.addEventListener('dragstart', e => {
        drag = e.target.closest && e.target.closest('.nrow'); if (!drag) return;
        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.dataset.id);
        drag.classList.add('dragging');
    });
    L.addEventListener('dragover', e => {
        if (!drag) return; e.preventDefault();
        if (e.clientY < 90) scrollBy(0, -14); else if (e.clientY > innerHeight - 90) scrollBy(0, 14); // kéo sát mép thì tự cuộn
        const after = [...L.querySelectorAll('.nrow:not(.dragging)')].find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
        after ? L.insertBefore(drag, after) : L.appendChild(drag);
    });
    L.addEventListener('dragend', () => {
        if (!drag) return;
        drag.classList.remove('dragging'); drag.draggable = false; drag = null;
        const byId = new Map(window.__items.map(x => [x.id, x]));
        const ids = [...L.querySelectorAll('.nrow')].map(r => r.dataset.id);
        if (ids.every((id, i) => id === window.__items[i].id)) return; // không đổi chỗ
        window.__items = ids.map(id => byId.get(id));
        drawList(); persistOrder();
    });
    document.addEventListener('mouseup', () => L.querySelectorAll('.nrow[draggable=true]').forEach(r => r.draggable = false));
}

// Bấm tab / nút trong danh sách (dùng data-* thay vì onclick)
document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; return run(panel); }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    const item = (window.__items || []).find(x => x.id === id);
    if (b.dataset.act === 'tpl') return run(() => downloadTemplate(curKind()));
    if (b.dataset.act === 'import') return $('#xfile').click();
    if (['top', 'up', 'down'].includes(b.dataset.act)) return moveNovel(id, b.dataset.act);
    const openers = { products: productPage, novels: it => novelForm(it, 'novel'), movies: it => novelForm(it, 'movie'), combos: comboForm };
    if (b.dataset.act === 'add') openers[tab]();
    if (b.dataset.act === 'edit' && item) openers[tab](item);
    if (b.dataset.act === 'del' && confirm('Xóa mục này? Không thể hoàn tác.')) {
        run(async () => { await ({ products: deleteProduct, novels: deleteNovel, movies: deleteNovel, combos: deleteCombo }[tab])(id); await panel(); say('Đã xóa.'); });
    }
});

// Gõ vào ô tìm: chỉ vẽ lại danh sách (ô nhập không mất con trỏ)
document.addEventListener('input', e => { if (e.target.id === 'aq') { adminQuery = e.target.value; drawList(); } });
document.addEventListener('change', e => { if (e.target.id === 'asort') { adminSort = e.target.value; drawList(); } });

/* ===== Nhập truyện / phim từ Excel (theo tab đang mở) ===== */
// Chọn file → đọc → hiện bản xem trước (mới / cập nhật / lỗi) → bấm Nhập mới ghi vào database.
// Truyện trùng TÊN với truyện đã có thì cập nhật (ô Excel để trống = giữ nguyên dữ liệu cũ).
document.addEventListener('change', e => {
    if (e.target.id !== 'xfile' || !e.target.files[0]) return;
    const file = e.target.files[0]; e.target.value = '';
    const kind = curKind();
    run(async () => {
        say('Đang đọc file…');
        const items = await readNovelFile(file, kind);
        const old = new Map((await getNovels()).filter(n => kindOf(n) === kind).map(n => [titleKey(n.title), n])); // chỉ so tên trong cùng loại
        const seen = new Set();
        for (const it of items) {
            if (it.error) continue;
            const k = titleKey(it.title);
            it.old = old.get(k);
            if (seen.has(k)) it.error = 'trùng tên với một dòng phía trên';
            seen.add(k);
        }
        say('');
        importPreview(items, kind);
    });
});

function importPreview(items, kind = 'novel') {
    const W = kind === 'movie' ? 'phim' : 'truyện';
    const ok = items.filter(i => !i.error);
    const nNew = ok.filter(i => !i.old).length, nUp = ok.length - nNew;
    const row = i => `<tr><td>${i.line}</td><td>${esc(i.title || '—')}</td><td>${i.error ? `<span style="color:var(--dg)">Bỏ qua: ${esc(i.error)}</span>` : (i.old ? 'Cập nhật' : 'Thêm mới') + (i.warns && i.warns.length ? `<br><small style="color:var(--mut)">Lưu ý: ${esc(i.warns.join('; '))}</small>` : '')}</td></tr>`;
    $('#frm').innerHTML = `<h2 style="margin:0">Nhập ${W} từ Excel</h2><div id="fmsg"></div>
    <p>Thêm mới <b>${nNew}</b> · Cập nhật <b>${nUp}</b> · Bỏ qua (lỗi) <b>${items.length - ok.length}</b></p>
    <div style="max-height:50vh;overflow:auto"><table><tr><th>Dòng</th><th>Tên ${W}</th><th>Kết quả</th></tr>${items.map(row).join('')}</table></div>
    <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" type="button" id="cancel">Hủy</button>
    <button class="btn p" type="submit" ${ok.length ? '' : 'disabled'}>Nhập ${ok.length} ${W}</button></div>`;
    $('#cancel').onclick = () => $('#dlg').close();
    $('#frm').onsubmit = e => {
        e.preventDefault();
        run(async () => {
            let done = 0; const fails = [];
            for (const it of ok) {
                say(`Đang nhập ${done + fails.length + 1}/${ok.length}…`);
                try { await saveNovel(mergeNovel(it, kind)); done++; }
                catch (err) { console.error(err); fails.push(`${it.title}: ${err.message}`); }
            }
            $('#dlg').close(); await panel();
            say(fails.length ? `Đã nhập ${done} ${W}. Lỗi ${fails.length}: ${fails.join(' | ')}` : `Đã nhập ${done} ${W}.`, fails.length > 0);
        });
    };
    $('#dlg').showModal();
}

// Gộp dòng Excel vào truyện cũ (nếu có); ô trống thì giữ giá trị cũ
function mergeNovel(it, kind = 'novel') {
    const o = it.old || { author: '', status: 'ongoing', synopsis: '', price: kind === 'movie' ? 0 : DEFAULT_PRICE, cover: '', volumes: [], reviews: [] };
    const { line, error, old, warns, ...f } = it;
    return {
        id: o.id, title: it.title, author: o.author, status: o.status, synopsis: o.synopsis, price: o.price, cover: o.cover, volumes: o.volumes, reviews: o.reviews,
        ...f,
        ...((kind === 'movie' || 'kind' in o) ? { kind } : {}), // chỉ gửi cột kind khi cần (cần update_v8.sql cho phim)
        ...((f.full_price > 0 && o.is_free) ? { is_free: false } : {}), // đổi từ 0đ sang có giá
    };
}

/* ===== Ô ảnh: nhập link HOẶC chọn ảnh từ máy để tải lên ===== */
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMG = 3 * 1024 * 1024; // 3MB, khớp với giới hạn của bucket

function imgField(name, label, value, placeholder = 'https://...') {
    return `<label>${label}</label><input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}">
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-for="${name}" style="margin-top:6px">`;
}

// Khi chọn file: tải lên Storage rồi điền URL vào ô tương ứng
document.addEventListener('change', e => {
    const fi = e.target.closest('input[type=file][data-for]');
    if (!fi || !fi.files[0]) return;
    const file = fi.files[0];
    run(async () => {
        if (!IMG_TYPES.includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.');
        if (file.size > MAX_IMG) throw new Error('Ảnh lớn hơn 3MB. Hãy thu nhỏ ảnh rồi thử lại.');
        say('Đang tải ảnh lên…');
        const url = await uploadImage(file);
        const t = fi.form.querySelector(`[name="${fi.dataset.for}"]`); t.value = url; t.dispatchEvent(new Event('input', { bubbles: true }));
        say('Đã tải ảnh lên. Bấm Lưu để hoàn tất.');
    }).finally(() => { fi.value = ''; });
});

/* ===== Form dùng chung ===== */
function openForm(title, fields, onSave) {
    $('#frm').innerHTML = `<h2 style="margin:0">${title}</h2><div id="fmsg"></div>${fields}
    <div class="row" style="justify-content:flex-end;margin-top:18px">
    <button class="btn" type="button" id="cancel">Hủy</button><button class="btn p" type="submit">Lưu</button></div>`;
    $('#cancel').onclick = () => $('#dlg').close();
    $('#frm').onsubmit = e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData($('#frm')));
        run(async () => { await onSave(f); $('#dlg').close(); await panel(); say('Đã lưu.'); });
    };
    $('#dlg').showModal();
}

/* ===== Trang soạn Phần mềm: nhiều ảnh, link tải, tải file lên, giới thiệu ===== */
const MAX_FILE = 50 * 1024 * 1024; // giới hạn file của Supabase gói miễn phí
function checkImg(f) {
    if (!IMG_TYPES.includes(f.type)) throw new Error(`"${f.name}": chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.`);
    if (f.size > MAX_IMG) throw new Error(`"${f.name}" lớn hơn 3MB. Hãy thu nhỏ ảnh rồi thử lại.`);
}

function productPage(p = { name: '', cat: 'Windows Apps', icon: '', short: '', desc: '', version: '' }) {
    let imgs = imgList(p), sel = 0;
    let links = (p.links || []).map(l => ({ label: l.label || '', url: l.url || '' }));
    // Bố cục giống hệt trang thật: bấm vào chữ / ảnh nào thì sửa chỗ đó
    $('#app').innerHTML = `<div class="sbar"><button class="btn" type="button" id="back">← Quay lại</button>
      <span class="meta" style="margin-right:auto">${p.id ? 'Đang sửa' : 'Đang thêm'} — giao diện giống trang thật, bấm vào từng phần để sửa</span>
      <button class="btn" type="button" id="cancel">Hủy</button><button class="btn p" type="submit" form="pf">Lưu</button></div>
    <form id="pf" class="detail ed"><div id="fmsg"></div>
    <div class="cbh" style="margin-bottom:16px"><div class="ico" id="icoprev" style="width:72px;height:72px;font-size:38px"></div>
      <div style="flex:1;min-width:0">
        <select class="tag-in" name="cat" id="catsel">${[...new Set([...CATS, p.cat].filter(Boolean))].map(c => `<option value="${esc(c)}" ${c === p.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}<option value="__new">＋ Danh mục mới…</option></select>
        <input class="tag-in" id="catnew" placeholder="Tên danh mục mới" hidden>
        <input class="h1-in" name="name" required placeholder="Tên sản phẩm" value="${esc(p.name)}">
        <div class="meta">Phiên bản: <input class="ver-in" name="version" placeholder="1.0" value="${esc(p.version)}"></div></div></div>
    <div class="icbox">${imgField('icon', 'Icon (emoji, link ảnh hoặc tải ảnh lên)', p.icon, '🧩 hoặc https://...')}</div>
    <div class="dh" style="margin-top:14px">
      <div id="ged"></div>
      <div><input class="short-in" name="short" placeholder="Mô tả ngắn (hiện cạnh ảnh)" value="${esc(p.short)}">
        <b>Tải về / Truy cập</b>
        <div id="led"></div><button class="btn" type="button" id="addlk">+ Thêm link</button>
        <div class="meta" style="margin-top:6px">Dán link hoặc bấm “Tải file lên” (exe, apk, zip… tối đa 50MB).</div></div></div>
    <h3>Giới thiệu</h3><textarea name="desc" rows="10" placeholder="Giới thiệu chi tiết…">${esc(p.desc)}</textarea></form>
    <input type="file" id="gfile" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif">`;

    $('#back').onclick = $('#cancel').onclick = () => run(panel);
    $('#catsel').onchange = () => { const n = $('#catsel').value === '__new'; $('#catnew').hidden = !n; if (n) $('#catnew').focus(); };

    const drawIcon = () => {
        const v = ($('#pf').elements.icon.value || '').trim();
        $('#icoprev').innerHTML = /^https?:/i.test(v) ? `<img src="${esc(safe(v))}" alt="">` : esc(v || ($('#pf').elements.name.value || '?')[0]);
    };
    $('#pf').addEventListener('input', e => { if (e.target.name === 'icon' || e.target.name === 'name') drawIcon(); });
    drawIcon();

    const drawImgs = () => {
        const n = imgs.length; sel = Math.max(0, Math.min(sel, n - 1));
        $('#ged').innerHTML = `<div class="gal"><div class="gmain">
          ${n ? `<img class="gone" src="${esc(safe(imgs[sel]))}" alt="">` : '<div class="gempty">Chưa có ảnh<br><small>Bấm “＋ Thêm ảnh” bên dưới</small></div>'}
          ${n > 1 ? '<button type="button" class="gnav prev" data-nav="-1">‹</button><button type="button" class="gnav next" data-nav="1">›</button>' : ''}
          ${n ? `<span class="gcount">${sel + 1}/${n}</span>` : ''}</div>
        <div class="gthumbs">${imgs.map((u, i) => `<button type="button" data-go="${i}" class="${i === sel ? 'on' : ''}"><img src="${esc(safe(u))}" alt=""></button>`).join('')}<button type="button" class="gadd" data-a="add">＋</button></div>
        <div class="row gtools"><button class="btn" type="button" data-a="l" ${sel > 0 ? '' : 'disabled'}>← Dịch trái</button>
          <button class="btn" type="button" data-a="r" ${sel < n - 1 ? '' : 'disabled'}>Dịch phải →</button>
          <button class="btn d" type="button" data-a="d" ${n ? '' : 'disabled'}>🗑 Xóa ảnh này</button>
          <button class="btn p" type="button" data-a="add">＋ Thêm ảnh</button></div>
        <div class="meta" style="margin-top:6px">Chọn ảnh nhỏ bên dưới rồi dịch / xóa. Ảnh đầu tiên là ảnh chính.</div></div>`;
    };
    $('#ged').onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        const n = imgs.length;
        if (b.dataset.nav) sel = (sel + +b.dataset.nav + n) % n;
        else if (b.dataset.go) sel = +b.dataset.go;
        else if (b.dataset.a === 'add') return $('#gfile').click();
        else if (b.dataset.a === 'd') imgs.splice(sel, 1);
        else { const k = b.dataset.a === 'l' ? sel - 1 : sel + 1; [imgs[sel], imgs[k]] = [imgs[k], imgs[sel]]; sel = k; }
        drawImgs();
    };
    $('#gfile').onchange = e => {
        const files = [...e.target.files]; e.target.value = '';
        run(async () => {
            files.forEach(checkImg);
            for (const [k, f] of files.entries()) { say(`Đang tải ảnh ${k + 1}/${files.length}…`); imgs.push(await uploadImage(f)); sel = imgs.length - 1; drawImgs(); }
            say('Đã tải ảnh lên. Bấm Lưu để hoàn tất.');
        });
    };

    const drawLinks = () => {
        $('#led').innerHTML = links.map((l, i) => `<div class="lk">
        <input data-i="${i}" data-k="label" placeholder="Tên nút (vd: Tải .exe)" value="${esc(l.label)}">
        <input data-i="${i}" data-k="url" placeholder="https://... hoặc tải file lên" value="${esc(l.url)}">
        <label class="btn">⬆ Tải file lên<input type="file" data-i="${i}" hidden></label>
        <button type="button" class="btn d" data-del="${i}" aria-label="Xóa link">✕</button></div>`).join('') || '<div class="meta" style="margin:8px 0">Chưa có link nào.</div>';
    };
    $('#addlk').onclick = () => { links.push({ label: '', url: '' }); drawLinks(); };
    $('#led').oninput = e => { const t = e.target; if (t.dataset.k) links[+t.dataset.i][t.dataset.k] = t.value; };
    $('#led').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { links.splice(+b.dataset.del, 1); drawLinks(); } };
    $('#led').onchange = e => {
        const t = e.target; if (t.type !== 'file' || !t.files[0]) return;
        const f = t.files[0], i = +t.dataset.i;
        run(async () => {
            if (f.size > MAX_FILE) throw new Error('File lớn hơn 50MB (giới hạn của Supabase gói miễn phí).');
            say(`Đang tải "${f.name}" lên…`);
            links[i].url = await uploadFile(f);
            if (!links[i].label.trim()) links[i].label = 'Tải ' + f.name;
            drawLinks(); say('Đã tải file lên. Bấm Lưu để hoàn tất.');
        });
    };
    drawImgs(); drawLinks();

    $('#pf').onsubmit = e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        run(async () => {
            await saveProduct({
                id: p.id, name: f.name.trim(), cat: (f.cat === '__new' ? $('#catnew').value : f.cat).trim() || 'Khác', icon: f.icon.trim(), version: f.version.trim(),
                short: f.short.trim(), desc: f.desc, img: imgs[0] || '', images: imgs,
                links: links.map(l => ({ label: l.label.trim(), url: l.url.trim() })).filter(l => l.url),
            });
            await panel(); say('Đã lưu.');
        });
    };
    window.scrollTo(0, 0);
}

const isFreeIn = v => String(v ?? '').trim() !== '' && parseInt(v, 10) === 0; // ô giá toàn tập gõ đúng 0
function novelForm(n, kind = 'novel') {
    const movie = (n && n.kind === 'movie') || kind === 'movie';
    n = n || { title: '', author: '', synopsis: '', status: 'ongoing', price: movie ? '' : 200, cover: '', volumes: [], reviews: [] };
    // Nhãn theo loại: Truyện (chương / quyển) hay Phim (tập / phần)
    const W = movie ? 'phim' : 'truyện', U = movie ? 'tập' : 'chương', V = movie ? 'Phần' : 'Quyển', AU = movie ? 'Đạo diễn / nguồn' : 'Tác giả';
    const old = n.volumes || [];
    const mode = old.length === 1 && old[0].name === 'Toàn tập' ? 'all' : 'vol';
    const total = mode === 'all' ? old[0].to : '';
    // Mỗi quyển: {title, from, to}. Tên hiển thị luôn là "Quyển <số>"; title là tên riêng (có thể bỏ trống)
    const vols = mode === 'all' ? [] : old.map(v => ({ title: v.title ?? (/^(Quyển|Phần)\s*\d+$/i.test(v.name) ? '' : v.name), from: v.from, to: v.to }));

    openForm(n.id ? `Sửa ${W}` : `Thêm ${W}`, `
    <label>Tên ${W}</label><input name="title" required value="${esc(n.title)}">
    <div class="two"><div><label>${AU}</label><input name="author" value="${esc(n.author)}"></div>
    <div><label>Trạng thái</label><select name="status">
      <option value="ongoing" ${n.status === 'ongoing' ? 'selected' : ''}>Đang tiếp tục</option>
      <option value="done" ${n.status === 'done' ? 'selected' : ''}>Đã kết thúc</option></select></div></div>
    ${movie ? `<label>Loại phim</label><select name="movie_type">
      <option value="" ${!n.movie_type ? 'selected' : ''}>Tự nhận theo số tập (nhiều hơn 1 tập = phim bộ)</option>
      <option value="series" ${n.movie_type === 'series' ? 'selected' : ''}>Phim bộ</option>
      <option value="single" ${n.movie_type === 'single' ? 'selected' : ''}>Phim lẻ</option></select>` : ''}
    <label>Nội dung giới thiệu</label><textarea name="synopsis" rows="4">${esc(n.synopsis)}</textarea>
    <div class="two"><div><label>Giá mỗi ${U} (đ)</label><input name="price" type="number" min="0" value="${esc(n.price)}"${movie ? ' placeholder="vd: 3000"' : ''}></div>
    <div>${imgField('cover', 'Ảnh bìa (link hoặc tải lên)', n.cover)}</div></div>
    <label>Giá mua toàn tập (đ) — để trống nếu không bán trọn bộ; nhập 0 = giá 0đ (hàng miễn phí / tặng kèm, vẫn bán và vào combo như bình thường)</label><input name="full_price" type="number" min="0" value="${esc(n.is_free ? '0' : (n.full_price || ''))}" placeholder="vd: 25000">
    <div id="fpinfo" class="meta" style="margin-top:6px" aria-live="polite"></div>
    <label>Các ${V.toLowerCase()}</label>
    <select id="vmode"><option value="all" ${mode === 'all' ? 'selected' : ''}>Toàn tập</option><option value="vol" ${mode === 'vol' ? 'selected' : ''}>Theo quyển</option></select>
    <div id="vall" ${mode === 'all' ? '' : 'hidden'}><label>Tổng số ${U} (tính từ ${U} 1)</label><input type="number" id="vtotal" min="1" value="${esc(total)}"></div>
    <div id="vvol" ${mode === 'vol' ? '' : 'hidden'}><label>Số ${V.toLowerCase()} (từ 1 đến …)</label><input type="number" id="vcount" min="1" max="100" value="${vols.length || ''}">
      <div style="overflow-x:auto"><table id="vtab"></table></div></div>
    <label>Link review / đánh giá (Facebook, TikTok, YouTube, báo… mỗi dòng: Tên|URL hoặc chỉ URL)</label>
    <textarea name="reviews" rows="3">${esc(linksToText(n.reviews))}</textarea>
    <div class="meta" style="margin-top:8px">Link Facebook / Zalo / TikTok / YouTube / Instagram để liên hệ mua được đặt mặc định trong assets/js/config.js.</div>`,
        f => saveNovel({
            id: n.id, title: f.title.trim(), author: f.author.trim(), status: f.status, synopsis: f.synopsis,
            price: Math.max(0, parseInt(f.price, 10) || 0), cover: f.cover.trim(), volumes: buildVolumes(), reviews: parseLinks(f.reviews),
            ...(movie && (f.movie_type || 'movie_type' in n) ? { movie_type: f.movie_type || '' } : {}), // chỉ gửi khi cần (cần update_v9.sql)
            ...((movie || 'kind' in n) ? { kind: movie ? 'movie' : 'novel' } : {}), // chỉ gửi cột kind khi cần, để truyện thường vẫn lưu được trước khi chạy update_v8.sql
            ...(('full_price' in n) || parseInt(f.full_price, 10) > 0 ? { full_price: Math.max(0, parseInt(f.full_price, 10) || 0) } : {}),
            // Nhập đúng số 0 ở ô giá toàn tập = miễn phí (cần chạy update_v7.sql; chỉ gửi cột này khi cần để không ảnh hưởng truyện thường)
            ...((('is_free' in n) || isFreeIn(f.full_price)) ? { is_free: isFreeIn(f.full_price) } : {}),
        }));

    const drawV = () => {
        $('#vtab').innerHTML = `<tr><th>${V}</th><th>Tên ${V.toLowerCase()} (bỏ trống cũng được)</th><th>${U[0].toUpperCase() + U.slice(1)}</th></tr>` + vols.map((v, i) => `<tr>
        <td style="white-space:nowrap">${V} ${i + 1}</td>
        <td><input data-i="${i}" data-k="title" value="${esc(v.title)}"></td>
        <td><div class="rng"><input type="number" min="1" data-i="${i}" data-k="from" value="${esc(v.from)}" placeholder="từ"> – <input type="number" min="1" data-i="${i}" data-k="to" value="${esc(v.to)}" placeholder="đến"></div></td></tr>`).join('');
    };
    $('#vmode').onchange = () => { const all = $('#vmode').value === 'all'; $('#vall').hidden = !all; $('#vvol').hidden = all; };
    $('#vcount').oninput = () => {
        const c = Math.min(100, parseInt($('#vcount').value, 10) || 0); if (!c) return;
        while (vols.length < c) { const last = vols[vols.length - 1]; vols.push({ title: '', from: last && last.to ? +last.to + 1 : '', to: '' }); }
        vols.length = c; drawV();
    };
    $('#vtab').oninput = e => {
        const t = e.target; if (!t.dataset.k) return;
        const i = +t.dataset.i; vols[i][t.dataset.k] = t.value;
        // Gõ "đến" của quyển này → tự điền "từ" của quyển kế tiếp
        if (t.dataset.k === 'to' && vols[i + 1] && parseInt(t.value, 10) >= 1) {
            vols[i + 1].from = parseInt(t.value, 10) + 1;
            $('#vtab').querySelector(`[data-i="${i + 1}"][data-k="from"]`).value = vols[i + 1].from;
        }
    };
    drawV();

    // Gõ giá toàn tập (hoặc đổi giá / số chương) → hiện ngay giá lẻ cả bộ và % rẻ hơn
    const totalNow = () => $('#vmode').value === 'all'
        ? parseInt($('#vtotal').value, 10) || 0
        : vols.reduce((m, v) => Math.max(m, parseInt(v.to, 10) || 0), 0);
    const updDeal = () => {
        const f = $('#frm').elements, price = +f.price.value || 0, fp = +f.full_price.value || 0, t = totalNow(), el = $('#fpinfo');
        if (isFreeIn(f.full_price.value)) { el.textContent = 'Truyện sẽ hiện giá 0đ: vẫn thêm vào giỏ và đưa vào combo được (làm quà tặng kèm hoặc combo miễn phí).'; return; }
        if (!(t > 0 && price > 0)) { el.textContent = fp ? `Nhập số ${U} và giá mỗi ${U} để tính % rẻ hơn.` : ''; return; }
        const d = fullDeal(price, t, fp);
        if (!fp) el.textContent = `Giá lẻ cả bộ: ${vnd(d.retail)} (${t} ${U} × ${vnd(price)}). Nhập giá toàn tập để xem % rẻ hơn.`;
        else if (d.pct) el.innerHTML = `Giá lẻ cả bộ ${vnd(d.retail)} → mua toàn tập <b>rẻ hơn ${d.pct}%</b> (tiết kiệm ${vnd(d.retail - fp)}).`;
        else el.textContent = `⚠ Giá toàn tập không thấp hơn giá lẻ cả bộ (${vnd(d.retail)}), nên trang web sẽ không hiện "rẻ hơn".`;
    };
    $('#frm').oninput = $('#frm').onchange = updDeal;
    updDeal();

    function buildVolumes() {
        if ($('#vmode').value === 'all') {
            const t = parseInt($('#vtotal').value, 10);
            if (!(t >= 1)) throw new Error(`Hãy nhập tổng số ${U}.`);
            return [{ name: 'Toàn tập', title: '', from: 1, to: t }];
        }
        if (!vols.length) throw new Error(`Hãy nhập số ${V.toLowerCase()}.`);
        return vols.map((v, i) => {
            const from = parseInt(v.from, 10), to = parseInt(v.to, 10);
            if (!(from >= 1) || !(to >= from)) throw new Error(`${V} ${i + 1}: ${U} "từ / đến" chưa đúng.`);
            return { name: `${V} ${i + 1}`, title: (v.title || '').trim(), from, to };
        });
    }
}

/* ===== Combo: gõ tên (tên tác giả hoặc tên tùy ý) + tick các truyện trong combo → nhập giá combo → tự tính % giảm ===== */
// Gõ đúng tên một tác giả thì tự tick sẵn các truyện của tác giả đó (vẫn bỏ / thêm tick tự do được).
const vnd = x => Number(x || 0).toLocaleString('vi-VN') + 'đ';
function comboForm(c = { author: '', cover: '', price: '', novel_ids: [] }) {
    const novels = (window.__novels || []).filter(isSellable); // chỉ truyện đã có giá (kể cả 0đ có chủ ý) mới đưa vào combo được
    const authors = [...new Map(novels.filter(n => authorKey(n)).map(n => [authorKey(n), String(n.author).trim()])).values()].sort((a, b) => a.localeCompare(b, 'vi'));
    const byAuthor = name => { const k = authorKey(name); return k ? novels.filter(n => authorKey(n) === k).map(n => n.id) : []; };
    // Đang sửa: dùng danh sách đã lưu; combo cũ chưa có danh sách thì lấy các truyện của tác giả
    const sel = new Set(c.novel_ids && c.novel_ids.length ? c.novel_ids : (c.id ? byAuthor(c.author) : []));
    let lastAuthor = authorKey(c.author);
    const ids = () => novels.filter(n => sel.has(n.id)).map(n => n.id); // theo thứ tự truyện trên trang

    openForm(c.id ? 'Sửa combo' : 'Thêm combo', `
    <label>Tên combo (gõ tên tác giả để tự tick truyện của tác giả đó, hoặc gõ tên tùy ý)</label>
    <input name="author" required list="alist" value="${esc(c.author)}" autocomplete="off">
    <datalist id="alist">${authors.map(a => `<option value="${esc(a)}">`).join('')}</datalist>
    <label>Chọn truyện trong combo</label>
    <div class="row" style="margin:0 0 6px" id="ctype" role="group" aria-label="Lọc theo loại">
      <button class="btn on" type="button" data-ct="all">Tất cả (${novels.length})</button>
      <button class="btn" type="button" data-ct="novel">📚 Truyện (${novels.filter(n => kindOf(n) === 'novel').length})</button>
      <button class="btn" type="button" data-ct="movie">🎬 Phim (${novels.filter(n => kindOf(n) === 'movie').length})</button></div>
    <input type="search" id="csearch" placeholder="Lọc theo tên…" autocomplete="off">
    <div class="row" style="margin:6px 0"><button class="btn" type="button" id="call">Chọn hết (đang hiện)</button><button class="btn" type="button" id="cnone">Bỏ chọn hết</button></div>
    <div id="cpick" style="max-height:220px;overflow:auto;border:1px solid var(--bd);border-radius:8px;padding:6px 10px">${novels.map(n => `<label class="cpk" data-t="${esc(fold(n.title))}" data-k="${kindOf(n)}" style="display:flex;gap:8px;align-items:center;margin:0;padding:5px 0;color:var(--tx);font-size:15px;cursor:pointer"><input type="checkbox" value="${esc(n.id)}" style="width:auto" ${sel.has(n.id) ? 'checked' : ''}>${n.kind === 'movie' ? '🎬 ' : ''}${esc(n.title)}</label>`).join('') || '<div class="meta">Chưa có truyện / phim nào (cần có số chương).</div>'}</div>
    <div id="cinfo" aria-live="polite"></div>
    ${imgField('cover', 'Ảnh bìa banner combo (link hoặc tải lên — nên dùng ảnh dọc tỉ lệ 3:4)', c.cover || '')}
    <label>Giá combo (đ) — giá mua trọn bộ tất cả truyện đã chọn</label>
    <input name="price" type="number" min="0" required value="${esc(c.price == null ? '' : c.price)}" placeholder="vd: 250000 (nhập 0 = combo miễn phí)">
    <div id="cpct" class="meta" style="margin-top:6px" aria-live="polite"></div>`,
        f => {
            const novel_ids = ids();
            const st = comboStats({ author: f.author, price: f.price, novel_ids }, novels);
            if (st.items.length < 2) throw new Error('Hãy tick ít nhất 2 truyện cho combo.');
            const price = parseInt(f.price, 10);
            if (!(price >= 0)) throw new Error('Hãy nhập giá combo (nhập 0 nếu là combo miễn phí).');
            return saveCombo({ id: c.id, author: f.author.trim(), cover: f.cover.trim(), price, novel_ids });
        });

    const upd = () => {
        const f = $('#frm').elements, st = comboStats({ author: f.author.value, price: f.price.value, novel_ids: ids() }, novels);
        $('#cinfo').innerHTML = !st.items.length ? '<div class="meta" style="margin-top:8px">Chưa chọn truyện nào.</div>'
            : `<table><tr><th>Truyện đã chọn</th><th style="text-align:right">Giá mua trọn bộ</th></tr>
               ${st.items.map(n => `<tr><td>${esc(n.title)}</td><td style="text-align:right">${vnd(fullPriceOf(n))}</td></tr>`).join('')}
               <tr><th>Tổng ${st.items.length} truyện cộng lại</th><th style="text-align:right;color:var(--ac)">${vnd(st.retail)}</th></tr></table>
               ${st.items.length < 2 ? '<div class="meta">⚠ Cần ít nhất 2 truyện mới làm được combo.</div>' : ''}`;
        const p = +f.price.value || 0;
        $('#cpct').innerHTML = f.price.value.trim() === '' || !st.retail ? ''
            : p < st.retail ? `Giá combo ${vnd(p)} so với ${vnd(st.retail)} → ruy băng hiện <b>-${st.pct}%</b> (tiết kiệm ${vnd(st.retail - p)}).`
            : `⚠ Giá combo không thấp hơn tổng giá lẻ (${vnd(st.retail)}), nên sẽ không hiện ruy băng giảm giá.`;
    };
    const tick = (list, on) => { list.forEach(id => on ? sel.add(id) : sel.delete(id)); $('#cpick').querySelectorAll('input').forEach(b => b.checked = sel.has(b.value)); upd(); };
    $('#cpick').onchange = e => { if (e.target.type === 'checkbox') { e.target.checked ? sel.add(e.target.value) : sel.delete(e.target.value); upd(); } };
    // Lọc danh sách chọn theo loại (Tất cả / Truyện / Phim) và theo tên; "Chọn hết" chỉ tick các mục đang hiện
    let ctype = 'all';
    const refilter = () => { const q = fold($('#csearch').value).trim(); $('#cpick').querySelectorAll('.cpk').forEach(l => { const off = (ctype !== 'all' && l.dataset.k !== ctype) || (!!q && !l.dataset.t.includes(q)); l.style.display = off ? 'none' : 'flex'; l.toggleAttribute('data-off', off); }); };
    $('#csearch').oninput = e => { e.stopPropagation(); refilter(); };
    $('#ctype').onclick = e => { const b = e.target.closest('[data-ct]'); if (!b) return; ctype = b.dataset.ct; $('#ctype').querySelectorAll('[data-ct]').forEach(x => x.classList.toggle('on', x === b)); refilter(); };
    $('#call').onclick = () => tick([...$('#cpick').querySelectorAll('.cpk:not([data-off]) input')].map(b => b.value), true);
    $('#cnone').onclick = () => tick([...sel], false);
    // Gõ trúng tên một tác giả (mới) → tick thêm các truyện của tác giả đó
    $('#frm').oninput = $('#frm').onchange = e => {
        if (e.target.name === 'author') {
            const k = authorKey(e.target.value);
            if (k !== lastAuthor) { lastAuthor = k; const a = byAuthor(e.target.value); if (a.length) return tick(a, true); }
        }
        upd();
    };
    upd();
}

/* ===== Khởi động ===== */
let signedIn = false;
async function start() {
    const session = await getSession();
    signedIn = !!session;
    if (session) await panel(); else loginView();
}

// Khi đăng nhập bằng link trong email, Supabase đưa phiên về trang này → tự vào khung quản trị
// Lưu ý: Supabase còn phát SIGNED_IN mỗi lần quay lại tab trình duyệt → chỉ khởi động lại khi CHƯA đăng nhập,
// nếu không trang đang sửa dở sẽ bị đóng.
sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') signedIn = false;
    else if (event === 'SIGNED_IN' && !signedIn) run(start);
});
run(start);