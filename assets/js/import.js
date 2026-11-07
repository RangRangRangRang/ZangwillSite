<<<<<<< HEAD
// Nhập truyện / phim từ file Excel (.xlsx, .xls, .csv). Chỉ dùng ở trang admin. Hai loại dùng chung bảng, chỉ khác nhãn (chương/tập, quyển/phần).
// Thư viện SheetJS chỉ được tải khi bấm nút nhập (không làm chậm trang).
import { parseLinks } from './util.js';

const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
export const DEFAULT_PRICE = 100; // đ / chương, dùng khi ô giá để trống (phim thì để 0 cho bạn tự đặt)
// Nhãn theo loại
const T = {
    novel: { word: 'truyện', unit: 'chương', vol: 'quyển', Vol: 'Quyển', author: 'Tác giả', sheet: 'Truyen', file: 'mau-nhap-truyen.xlsx' },
    movie: { word: 'phim', unit: 'tập', vol: 'phần', Vol: 'Phần', author: 'Đạo diễn', sheet: 'Phim', file: 'mau-nhap-phim.xlsx' },
};

// Các cột của file Excel (dòng đầu tiên là tiêu đề)
export const colsOf = kind => { const t = T[kind] || T.novel; return [`Tên ${t.word}`, t.author, 'Trạng thái', 'Giới thiệu', `Giá mỗi ${t.unit}`, 'Ảnh bìa', `Tổng số ${t.unit}`, `Các ${t.vol}`, 'Review', 'Giá toàn tập', ...(kind === 'movie' ? ['Loại phim'] : [])]; };
export const COLS = colsOf('novel');

// Nhận diện cột theo từ khóa có trong tiêu đề (đã bỏ dấu, viết thường). Thứ tự kiểm tra quan trọng:
// "tác giả" và "đánh giá" đều chứa chữ "gia" nên phải kiểm tra trước cột giá.
const RULES = [
    ['fullPrice', ['gia toan tap', 'gia tron bo', 'toan tap', 'tron bo']], // phải đứng trước cột giá thường
    ['price', ['gia moi chuong', 'gia chuong', 'gia moi tap', 'gia tap', 'don gia', 'price']], // "Giá mỗi chương/tập" phải đứng trước cột tổng số chương/tập (cũng chứa chữ chương/tập)
    ['author', ['tac gia', 'author', 'nguoi viet', 'dao dien', 'nguon']],
    ['status', ['trang thai', 'tinh trang', 'status']],
    ['synopsis', ['gioi thieu', 'noi dung', 'mo ta', 'tom tat', 'synopsis']],
    ['cover', ['anh bia', 'bia', 'cover', 'hinh', 'anh']],
    ['volumes', ['quyen', 'volume', 'phan', 'mua', 'season']],
    ['total', ['so chuong', 'tong chuong', 'so tap', 'tong tap', 'total', 'chuong', 'tap']],
    ['reviews', ['review', 'danh gia', 'nhan xet']],
    ['price', ['gia', 'price', 'don gia']],
    ['movieType', ['loai phim', 'phim bo', 'phim le', 'movie type']],
    ['title', ['ten', 'title', 'truyen', 'bo truyen', 'phim']],
];

const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
// So khớp theo TỪ nguyên vẹn (tránh "đánh giá" bị nhận nhầm là "ảnh" vì chứa chữ "anh")
const keyOf = h => { const n = ` ${norm(h).replace(/[^a-z0-9]+/g, ' ')} `; const r = RULES.find(([, words]) => words.some(w => n.includes(` ${w} `))); return r && r[0]; };
export const titleKey = t => norm(t);

function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = XLSX_URL;
        s.onload = () => ok(window.XLSX);
        s.onerror = () => fail(new Error('Không tải được thư viện đọc Excel. Kiểm tra mạng rồi thử lại.'));
        document.head.appendChild(s);
    });
}

// "Đã kết thúc / done / hoàn thành" → 'done', còn lại → 'ongoing'
const toStatus = v => /da ket thuc|hoan|done|full|end/.test(norm(v)) ? 'done' : 'ongoing';

// Cột "Các quyển": mỗi dòng (hoặc cách nhau dấu ;) một quyển: "Tên|Từ|Đến", "Từ-Đến", hoặc "Từ|Đến"
function parseVolumes(text, t = T.novel) {
    const out = [];
    for (const line of String(text).split(/[\n;]+/).map(s => s.trim()).filter(Boolean)) {
        const parts = line.includes('|') ? line.split('|').map(s => s.trim()) : line.split(/\s*[-–]\s*/);
        let title = '', a, b;
        if (parts.length >= 3) [title, a, b] = parts; else[a, b] = parts;
        const from = parseInt(a, 10), to = parseInt(b, 10);
        if (!(from >= 1) || !(to >= from)) throw new Error(`cột "Các ${t.vol}" sai ở "${line}" (cần dạng Tên|Từ|Đến), đã bỏ qua`);
        out.push({ name: `${t.Vol} ${out.length + 1}`, title, from, to });
    }
    return out;
}

// Chuyển các dòng đọc từ Excel thành danh sách truyện.
// Chỉ dòng THIẾU TÊN mới bị coi là lỗi (error). Ô nào sai định dạng thì bỏ qua ô đó và ghi vào `warns`,
// phần còn lại của dòng vẫn được nhập — ô trống có thể điền sau.
export function parseNovelRows(rows, kind = 'novel') {
    const t = T[kind] || T.novel;
    const heads = rows.length ? Object.keys(rows[0]) : [];
    // Không thấy cột nào giống "tên truyện" → coi cột đầu tiên là tên truyện
    const hasTitle = heads.some(h => keyOf(h) === 'title');
    return rows.map((raw, i) => {
        const r = {};
        heads.forEach((h, idx) => {
            const k = keyOf(h) || (!hasTitle && idx === 0 ? 'title' : '');
            const v = String(raw[h] ?? '').trim();
            if (k && v && !r[k]) r[k] = v; // nhiều cột cùng loại: lấy cột có dữ liệu đầu tiên
        });
        const item = { line: i + 2, title: r.title || '', warns: [] };
        if (!item.title) { item.error = `thiếu tên ${t.word}`; return item; }
        const warn = m => item.warns.push(m);
        if (r.author) item.author = r.author;
        if (r.status) item.status = toStatus(r.status);
        if (kind === 'movie' && r.movieType) { // "Phim bộ" / "Phim lẻ"; ô trống = tự nhận theo số tập
            const v = norm(r.movieType);
            if (/\ble\b|single|1 tap|mot tap/.test(v)) item.movie_type = 'single'; else if (/\bbo\b|series|nhieu/.test(v)) item.movie_type = 'series'; else warn('cột "Loại phim" chỉ nhận "Phim bộ" hoặc "Phim lẻ", đã bỏ qua');
        }
        if (r.synopsis) item.synopsis = r.synopsis;
        if (r.cover) /^https?:\/\//i.test(r.cover) ? item.cover = r.cover : warn('ảnh bìa không phải link http(s), đã bỏ qua');
        if (r.price) {
            const p = parseInt(r.price.replace(/[^\d]/g, ''), 10);
            isNaN(p) ? warn('giá không phải số, dùng giá mặc định') : item.price = p;
        }
        if (r.fullPrice) {
            const p = parseInt(r.fullPrice.replace(/[^\d]/g, ''), 10);
            { if (isNaN(p)) warn('giá toàn tập không phải số, đã bỏ qua'); else { item.full_price = p; if (p === 0) item.is_free = true; } } // gõ 0 = giá 0đ (cần update_v7.sql)
        }
        if (r.volumes) {
            try { item.volumes = parseVolumes(r.volumes, t); } catch (e) { warn(e.message); }
        }
        if (!item.volumes && r.total) {
            const t = parseInt(r.total.replace(/[^\d]/g, ''), 10);
            t >= 1 ? item.volumes = [{ name: 'Toàn tập', title: '', from: 1, to: t }] : warn(`tổng số ${t.unit} không phải số, đã bỏ qua`);
        }
        if (r.reviews) item.reviews = parseLinks(r.reviews.replace(/;/g, '\n')).filter(x => /^https?:\/\//i.test(x.url));
        return item;
    });
}

// Đọc file → danh sách truyện (sheet đầu tiên có dữ liệu)
export async function readNovelFile(file, kind = 'novel') {
    const X = await loadXlsx();
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    for (const name of wb.SheetNames) {
        const rows = X.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false })
            .filter(r => Object.values(r).some(v => String(v).trim()));
        if (rows.length) return parseNovelRows(rows, kind);
    }
    throw new Error('File không có dòng dữ liệu nào (dòng 1 là tiêu đề cột, từ dòng 2 là dữ liệu).');
}

// Tải file Excel mẫu về máy
export async function downloadTemplate(kind = 'novel') {
    const X = await loadXlsx();
    const t = T[kind] || T.novel, m = kind === 'movie';
    const ws = X.utils.aoa_to_sheet([colsOf(kind),
        [m ? 'Tên phim A' : 'Tên bộ truyện A', `Tên ${t.author.toLowerCase()}`, 'Đang tiếp tục', 'Nội dung giới thiệu…', m ? 3000 : 100, 'https://…/bia.jpg', m ? 24 : 300, '', 'Facebook|https://facebook.com/…', m ? 50000 : 25000, ...(m ? ['Phim bộ'] : [])],
        [m ? 'Tên phim B' : 'Tên bộ truyện B', m ? 'Đạo diễn B' : 'Tác giả B', 'Đã kết thúc', 'Giới thiệu…', '', '', '', m ? 'Mùa 1|1|12\nMùa 2|13|24' : 'Mở đầu|1|100\nPhần hai|101|250', '', '', ...(m ? ['Phim lẻ'] : [])]]);
    ws['!cols'] = [28, 18, 16, 40, 14, 28, 16, 28, 36, 16, 14].map(w => ({ wch: w }));
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, t.sheet);
    X.writeFile(wb, t.file);
}
=======
// Nhập truyện từ file Excel (.xlsx, .xls, .csv). Chỉ dùng ở trang admin.
// Thư viện SheetJS chỉ được tải khi bấm nút nhập (không làm chậm trang).
import { parseLinks } from './util.js';

const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
export const DEFAULT_PRICE = 100; // đ / chương, dùng khi ô giá để trống

// Các cột của file Excel (dòng đầu tiên là tiêu đề)
export const COLS = ['Tên truyện', 'Tác giả', 'Trạng thái', 'Giới thiệu', 'Giá mỗi chương', 'Ảnh bìa', 'Tổng số chương', 'Các quyển', 'Review', 'Giá toàn tập'];

// Nhận diện cột theo từ khóa có trong tiêu đề (đã bỏ dấu, viết thường). Thứ tự kiểm tra quan trọng:
// "tác giả" và "đánh giá" đều chứa chữ "gia" nên phải kiểm tra trước cột giá.
const RULES = [
    ['fullPrice', ['gia toan tap', 'gia tron bo', 'toan tap', 'tron bo']], // phải đứng trước cột giá thường
    ['author', ['tac gia', 'author', 'nguoi viet']],
    ['status', ['trang thai', 'tinh trang', 'status']],
    ['synopsis', ['gioi thieu', 'noi dung', 'mo ta', 'tom tat', 'synopsis']],
    ['cover', ['anh bia', 'bia', 'cover', 'hinh', 'anh']],
    ['volumes', ['quyen', 'volume']],
    ['total', ['so chuong', 'tong chuong', 'total', 'chuong']],
    ['reviews', ['review', 'danh gia', 'nhan xet']],
    ['price', ['gia', 'price', 'don gia']],
    ['title', ['ten', 'title', 'truyen', 'bo truyen']],
];

const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
// So khớp theo TỪ nguyên vẹn (tránh "đánh giá" bị nhận nhầm là "ảnh" vì chứa chữ "anh")
const keyOf = h => { const n = ` ${norm(h).replace(/[^a-z0-9]+/g, ' ')} `; const r = RULES.find(([, words]) => words.some(w => n.includes(` ${w} `))); return r && r[0]; };
export const titleKey = t => norm(t);

function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = XLSX_URL;
        s.onload = () => ok(window.XLSX);
        s.onerror = () => fail(new Error('Không tải được thư viện đọc Excel. Kiểm tra mạng rồi thử lại.'));
        document.head.appendChild(s);
    });
}

// "Đã kết thúc / done / hoàn thành" → 'done', còn lại → 'ongoing'
const toStatus = v => /da ket thuc|hoan|done|full|end/.test(norm(v)) ? 'done' : 'ongoing';

// Cột "Các quyển": mỗi dòng (hoặc cách nhau dấu ;) một quyển: "Tên|Từ|Đến", "Từ-Đến", hoặc "Từ|Đến"
function parseVolumes(text) {
    const out = [];
    for (const line of String(text).split(/[\n;]+/).map(s => s.trim()).filter(Boolean)) {
        const parts = line.includes('|') ? line.split('|').map(s => s.trim()) : line.split(/\s*[-–]\s*/);
        let title = '', a, b;
        if (parts.length >= 3) [title, a, b] = parts; else[a, b] = parts;
        const from = parseInt(a, 10), to = parseInt(b, 10);
        if (!(from >= 1) || !(to >= from)) throw new Error(`cột "Các quyển" sai ở "${line}" (cần dạng Tên|Từ|Đến), đã bỏ qua`);
        out.push({ name: `Quyển ${out.length + 1}`, title, from, to });
    }
    return out;
}

// Chuyển các dòng đọc từ Excel thành danh sách truyện.
// Chỉ dòng THIẾU TÊN mới bị coi là lỗi (error). Ô nào sai định dạng thì bỏ qua ô đó và ghi vào `warns`,
// phần còn lại của dòng vẫn được nhập — ô trống có thể điền sau.
export function parseNovelRows(rows) {
    const heads = rows.length ? Object.keys(rows[0]) : [];
    // Không thấy cột nào giống "tên truyện" → coi cột đầu tiên là tên truyện
    const hasTitle = heads.some(h => keyOf(h) === 'title');
    return rows.map((raw, i) => {
        const r = {};
        heads.forEach((h, idx) => {
            const k = keyOf(h) || (!hasTitle && idx === 0 ? 'title' : '');
            const v = String(raw[h] ?? '').trim();
            if (k && v && !r[k]) r[k] = v; // nhiều cột cùng loại: lấy cột có dữ liệu đầu tiên
        });
        const item = { line: i + 2, title: r.title || '', warns: [] };
        if (!item.title) { item.error = 'thiếu tên truyện'; return item; }
        const warn = m => item.warns.push(m);
        if (r.author) item.author = r.author;
        if (r.status) item.status = toStatus(r.status);
        if (r.synopsis) item.synopsis = r.synopsis;
        if (r.cover) /^https?:\/\//i.test(r.cover) ? item.cover = r.cover : warn('ảnh bìa không phải link http(s), đã bỏ qua');
        if (r.price) {
            const p = parseInt(r.price.replace(/[^\d]/g, ''), 10);
            isNaN(p) ? warn('giá không phải số, dùng giá mặc định') : item.price = p;
        }
        if (r.fullPrice) {
            const p = parseInt(r.fullPrice.replace(/[^\d]/g, ''), 10);
            isNaN(p) ? warn('giá toàn tập không phải số, đã bỏ qua') : item.full_price = p;
        }
        if (r.volumes) {
            try { item.volumes = parseVolumes(r.volumes); } catch (e) { warn(e.message); }
        }
        if (!item.volumes && r.total) {
            const t = parseInt(r.total.replace(/[^\d]/g, ''), 10);
            t >= 1 ? item.volumes = [{ name: 'Toàn tập', title: '', from: 1, to: t }] : warn('tổng số chương không phải số, đã bỏ qua');
        }
        if (r.reviews) item.reviews = parseLinks(r.reviews.replace(/;/g, '\n')).filter(x => /^https?:\/\//i.test(x.url));
        return item;
    });
}

// Đọc file → danh sách truyện (sheet đầu tiên có dữ liệu)
export async function readNovelFile(file) {
    const X = await loadXlsx();
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    for (const name of wb.SheetNames) {
        const rows = X.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false })
            .filter(r => Object.values(r).some(v => String(v).trim()));
        if (rows.length) return parseNovelRows(rows);
    }
    throw new Error('File không có dòng dữ liệu nào (dòng 1 là tiêu đề cột, từ dòng 2 là truyện).');
}

// Tải file Excel mẫu về máy
export async function downloadTemplate() {
    const X = await loadXlsx();
    const ws = X.utils.aoa_to_sheet([COLS,
        ['Tên bộ truyện A', 'Tên tác giả', 'Đang tiếp tục', 'Nội dung giới thiệu…', 100, 'https://…/bia.jpg', 300, '', 'Facebook|https://facebook.com/…', 25000],
        ['Tên bộ truyện B', 'Tác giả B', 'Đã kết thúc', 'Giới thiệu…', '', '', '', 'Mở đầu|1|100\nPhần hai|101|250', '', '']]);
    ws['!cols'] = [28, 18, 16, 40, 14, 28, 16, 28, 36, 16].map(w => ({ wch: w }));
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Truyen');
    X.writeFile(wb, 'mau-nhap-truyen.xlsx');
}
>>>>>>> 428e6d034d7e4b34fa4e8d288fbbd3dc1590d15b
