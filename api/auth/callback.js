import { SignJWT, importPKCS8 } from 'jose';

// Firebase Custom Token 생성 (jose RS256)
async function createFirebaseCustomToken(uid, claims = {}) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.replace(/\n/g, '\\n');
    const serviceAccount = JSON.parse(raw);
    const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');

    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ uid, claims })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(serviceAccount.client_email)
        .setSubject(serviceAccount.client_email)
        .setAudience('https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

    return token;
}

// 네이버: code → 액세스 토큰 → 프로필
async function getNaverProfile(code, state) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://piklit.pro';
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            code,
            state,
            redirect_uri: `${baseUrl}/api/auth/callback`,
        }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(`네이버 토큰 오류: ${tokenData.error_description}`);

    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    if (profileData.resultcode !== '00') throw new Error('네이버 프로필 조회 실패');

    const p = profileData.response;
    return {
        uid: `naver:${p.id}`,
        displayName: p.nickname || p.name || '네이버 사용자',
        email: p.email || null,
        photoURL: p.profile_image || null,
    };
}

// 카카오: code → 액세스 토큰 → 프로필
async function getKakaoProfile(code) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://piklit.pro';
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.KAKAO_REST_API_KEY,
            client_secret: process.env.KAKAO_CLIENT_SECRET,
            code,
            redirect_uri: `${baseUrl}/api/auth/callback`,
        }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(`카카오 토큰 오류: ${tokenData.error_description}`);

    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    const kakaoAccount = profileData.kakao_account || {};
    const profile = kakaoAccount.profile || {};
    return {
        uid: `kakao:${profileData.id}`,
        displayName: profile.nickname || '카카오 사용자',
        email: kakaoAccount.email || null,
        photoURL: profile.profile_image_url || null,
    };
}

export default async function handler(req, res) {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send('Missing code or state');
    }

    try {
        // state에서 프로바이더 파싱 (naver:uuid 또는 kakao:uuid)
        const provider = state.split(':')[0];
        let userInfo;

        if (provider === 'naver') {
            userInfo = await getNaverProfile(code, state);
        } else if (provider === 'kakao') {
            userInfo = await getKakaoProfile(code);
        } else {
            return res.status(400).send('Unknown provider');
        }

        // Firebase Custom Token 생성
        const customToken = await createFirebaseCustomToken(userInfo.uid, {
            provider,
            displayName: userInfo.displayName,
            email: userInfo.email,
            photoURL: userInfo.photoURL,
        });

        // postMessage로 토큰 전달 후 팝업 닫기
        const html = `<!DOCTYPE html>
<html>
<head><title>로그인 중...</title></head>
<body>
<p>로그인 처리 중입니다...</p>
<script>
    window.opener.postMessage({
        type: 'PIKLIT_AUTH',
        token: ${JSON.stringify(customToken)},
        displayName: ${JSON.stringify(userInfo.displayName)},
        photoURL: ${JSON.stringify(userInfo.photoURL)}
    }, window.location.origin);
    window.close();
</script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
    } catch (error) {
        console.error('OAuth callback error:', error);
        const errorHtml = `<!DOCTYPE html>
<html>
<head><title>로그인 실패</title></head>
<body>
<p>로그인에 실패했습니다. 창을 닫고 다시 시도해주세요.</p>
<script>
    window.opener.postMessage({
        type: 'PIKLIT_AUTH_ERROR',
        error: ${JSON.stringify(error.message)}
    }, window.location.origin);
    setTimeout(() => window.close(), 2000);
</script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(errorHtml);
    }
}
