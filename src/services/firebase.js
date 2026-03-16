import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Vercel Serverless Functions 호출 헬퍼
async function callVercelFunction(path, payload) {
    const user = auth.currentUser;
    if (!user) throw new Error('로그인이 필요합니다.');

    const token = await user.getIdToken();
    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`서버 응답 파싱 실패 (${response.status}): ${text.substring(0, 100)}`);
    }
    if (!response.ok) {
        const error = new Error(data.error || `서버 오류 (${response.status})`);
        error.status = response.status;
        error.code = data.code;
        throw error;
    }

    // httpsCallable 호환: { data: ... } 구조 유지
    return { data };
}

// 로컬 개발용: Gemini API 직접 호출 (Vercel 프록시 우회)
async function callGeminiDirect(payload) {
    const apiKey = payload.userApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY가 .env에 설정되지 않았습니다.');

    const modelId = payload.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.body),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Gemini API 오류 (${response.status})`);
    }
    return { data };
}

async function callGeminiImageDirect(payload) {
    const apiKey = payload.userApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY가 .env에 설정되지 않았습니다.');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.body),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Gemini Image API 오류 (${response.status})`);
    }
    return { data };
}

// 개발 모드: Gemini 직접 호출, 프로덕션: Vercel 프록시
export const callGeminiProxy = import.meta.env.DEV
    ? (payload) => callGeminiDirect(payload)
    : (payload) => callVercelFunction('/api/gemini', payload);

export const callGeminiImageProxy = import.meta.env.DEV
    ? (payload) => callGeminiImageDirect(payload)
    : (payload) => callVercelFunction('/api/gemini-image', payload);

export const callGetUsageInfo = () => callVercelFunction('/api/usage', {});

export const callBetaStatus = () => callVercelFunction('/api/beta', { action: 'status' });
export const callBetaActivate = (code, name, affiliation) => callVercelFunction('/api/beta', { action: 'activate', code, name, affiliation });

export const callListBetaUsers = () => callVercelFunction('/api/beta-admin', {});
export const callDeleteBetaUser = (userId) => callVercelFunction('/api/beta-admin', { action: 'delete', userId });

export const callSubmitBugReport = (data) => callVercelFunction('/api/bug-report', { action: 'submit', ...data });
export const callListBugReports = () => callVercelFunction('/api/bug-report', { action: 'list' });
export const callUpdateBugStatus = (reportId, status) => callVercelFunction('/api/bug-report', { action: 'updateStatus', reportId, status });
export const callDeleteBugReport = (reportId) => callVercelFunction('/api/bug-report', { action: 'delete', reportId });

// 글 클라우드 저장 API
export const callSavePost = (post) => callVercelFunction('/api/posts', { action: 'save', post });
export const callLoadPosts = () => callVercelFunction('/api/posts', { action: 'list' });
export const callLoadPost = (postId) => callVercelFunction('/api/posts', { action: 'get', postId });
export const callDeletePost = (postId) => callVercelFunction('/api/posts', { action: 'delete', postId });
export const callUploadImage = (postId, fileName, base64Data, contentType) =>
    callVercelFunction('/api/upload-image', { postId, fileName, base64Data, contentType });

export default app;
