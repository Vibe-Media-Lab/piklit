const ADMIN_EMAILS = [
    { email: 'sylee@datable.co.kr', name: '이승연' },
    { email: 'jongdae.lee@datable.co.kr', name: '이종대' },
    { email: 'wnddyd1234@gmail.com', name: '박중용' },
    { email: 'hyoho1110@gmail.com', name: '방효정' },
];

export function isAdmin(email) {
    if (!email) return false;
    return ADMIN_EMAILS.some(a => a.email === email.toLowerCase());
}
