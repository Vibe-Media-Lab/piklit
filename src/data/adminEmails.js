// 마스터/관리자 계정 — 모든 기능 제한 없이 사용 가능
const ADMIN_EMAILS = [
    { email: 'sylee@datable.co.kr', name: '이승연' },
    { email: 'jongdae.lee@datable.co.kr', name: '이종대' },
    { email: 'wnddyd1234@gmail.com', name: '박중용' },
    { email: 'hyoho1110@gmail.com', name: '방효정' },
];

export function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.some(a => a.email === email.toLowerCase());
}

export function getAdminName(email) {
    if (!email) return null;
    const admin = ADMIN_EMAILS.find(a => a.email === email.toLowerCase());
    return admin?.name || null;
}

export default ADMIN_EMAILS;
