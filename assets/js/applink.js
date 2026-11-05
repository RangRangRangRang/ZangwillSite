// Bấm link liên hệ (Zalo, Facebook, Messenger, TikTok, YouTube, Instagram) thì ưu tiên mở thẳng APP.
// Không có app / không mở được thì tự quay về mở link web như bình thường.
// Áp dụng cho thẻ <a data-app>. Điện thoại: mở app. Máy tính: thử mở Zalo PC (zalo://); các link khác mở web.

const UA = navigator.userAgent;
const ANDROID = /Android/i.test(UA);
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Tên miền → gói app trên Android
const PKG = {
    'zalo.me': 'com.zing.zalo', 'chat.zalo.me': 'com.zing.zalo',
    'facebook.com': 'com.facebook.katana', 'fb.com': 'com.facebook.katana', 'fb.me': 'com.facebook.katana',
    'm.me': 'com.facebook.orca', // Messenger
    'tiktok.com': 'com.zhiliaoapp.musically', 'vt.tiktok.com': 'com.zhiliaoapp.musically',
    'youtube.com': 'com.google.android.youtube', 'youtu.be': 'com.google.android.youtube',
    'instagram.com': 'com.instagram.android',
};
const hostOf = u => u.hostname.replace(/^(www|m|mobile|web)\./, '');

// iPhone: một số app có địa chỉ riêng (scheme); app còn lại tự mở qua link web (universal link)
function iosScheme(u) {
    const h = hostOf(u);
    if (/^(facebook\.com|fb\.com|fb\.me)$/.test(h)) return 'fb://facewebmodal/f?href=' + encodeURIComponent(u.href);
    if (h === 'instagram.com') { const name = u.pathname.split('/').filter(Boolean)[0]; if (name) return 'instagram://user?username=' + encodeURIComponent(name); }
    return '';
}

// Máy tính: chỉ Zalo PC có địa chỉ riêng zalo:// (Facebook, TikTok, YouTube, Instagram không có app máy tính để mở)
function zaloScheme(u) {
    if (hostOf(u) !== 'zalo.me') return '';
    const id = u.pathname.split('/').filter(Boolean)[0];
    if (!id) return '';
    if (/^(0\d{9,10}|84\d{9,10})$/.test(id)) return 'zalo://qr/p/' + (id[0] === '0' ? '84' + id.slice(1) : id); // số điện thoại
    return 'zalo://oa/' + encodeURIComponent(id); // trang Official Account
}

// Gọi zalo://… rồi chờ: nếu trình duyệt chuyển sang Zalo (cửa sổ mất focus) thì xong,
// còn không (chưa cài Zalo PC / bị chặn) thì sau 1,5 giây mở link web.
function openDesktopApp(scheme, webUrl) {
    let left = false;
    const onBlur = () => { left = true; };
    window.addEventListener('blur', onBlur);
    location.href = scheme;
    setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (left || document.hidden) return;
        if (!window.open(webUrl, '_blank', 'noopener')) location.href = webUrl;
    }, 1500);
}

document.addEventListener('click', e => {
    const a = e.target.closest('a[data-app]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    let u; try { u = new URL(a.href); } catch (_) { return; }
    if (!/^https?:$/.test(u.protocol)) return;

    if (ANDROID) {
        const pkg = PKG[hostOf(u)] || PKG[u.hostname];
        if (!pkg) return; // không biết app nào → mở web bình thường
        e.preventDefault();
        // intent:// mở app, nếu máy chưa cài thì Android tự chuyển sang link web (browser_fallback_url)
        location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
    } else if (IOS) {
        e.preventDefault();
        const scheme = iosScheme(u);
        if (!scheme) { location.href = u.href; return; } // cùng tab để iPhone tự mở app qua universal link
        location.href = scheme;
        // Sau 1,2 giây trang vẫn còn hiển thị = app không mở được → mở link web
        setTimeout(() => { if (!document.hidden) location.href = u.href; }, 1200);
    } else {
        const scheme = zaloScheme(u);
        if (!scheme) return; // link khác: mở web như bình thường (tab mới)
        e.preventDefault();
        openDesktopApp(scheme, u.href);
    }
});