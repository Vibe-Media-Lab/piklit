import { randomUUID } from 'crypto';

export default function handler(req, res) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://piklit.pro';
    const state = `naver:${randomUUID()}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const url = new URL('https://nid.naver.com/oauth2.0/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    res.redirect(302, url.toString());
}
