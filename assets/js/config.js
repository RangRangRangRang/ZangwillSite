// Cấu hình Supabase.
// Lấy 2 giá trị này ở: Supabase → Project Settings → API.
// - SUPABASE_URL: dạng https://xxxx.supabase.co
// - SUPABASE_ANON_KEY: khóa "anon public" (công khai, an toàn khi đã bật RLS).
// TUYỆT ĐỐI KHÔNG dán khóa "service_role" vào đây.
export const SUPABASE_URL = 'https://ujieemorixywrgvqiymd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_7XsuMCsVrNyDhx90OKUEaQ_X8jpacrb';


// Link liên hệ MẶC ĐỊNH — hiện ở mọi trang truyện, không cần nhập lại từng truyện.
// Điền link của bạn vào đây một lần. Để '' thì nút đó sẽ tự ẩn.
export const CONTACTS = [
    { name: 'Facebook', url: 'https://www.facebook.com/nos.tha.908' },
    { name: 'Zalo', url: 'https://zalo.me/0852529846' },
    { name: 'TikTok',    url: '' },
    { name: 'YouTube',   url: '' },
    { name: 'Instagram', url: '' },
];
