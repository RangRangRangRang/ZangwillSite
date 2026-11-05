// Bấm link liên hệ (Zalo, Facebook, Messenger, TikTok, YouTube, Instagram) thì ưu tiên mở thẳng APP.
// Không có app / không mở được thì tự quay về mở link web như bình thường.
// Áp dụng cho thẻ <a data-app>. Điện thoại: mở app. Máy tính: mở link web (trình duyệt không tự bật app được).

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
    }
    // Máy tính: để trình duyệt mở link web như bình thường (tab mới)
});
