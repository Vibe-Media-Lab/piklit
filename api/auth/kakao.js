import { randomUUID } from 'crypto';

export default function handler(req, res) {
    const clientId = process.env.KAKAO_REST_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://piklit.pro';
    const state = `kakao:${randomUUID()}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const url = new URL('https://kauth.kakao.com/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    res.redirect(302, url.toString());
}
