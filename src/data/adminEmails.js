// 마스터/관리자 계정 — 모든 기능 제한 없이 사용 가능
const ADMIN_EMAILS = [
    'sylee@datable.co.kr',
    'jongdae.lee@datable.co.kr',
    'wnddyd1234@gmail.com',
];

export function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default ADMIN_EMAILS;
