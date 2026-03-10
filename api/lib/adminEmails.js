const ADMIN_EMAILS = [
    'sylee@datable.co.kr',
    'jongdae.lee@datable.co.kr',
    'wnddyd1234@gmail.com',
    'hyoho1110@gmail.com',
];

export function isAdmin(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
