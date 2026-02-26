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

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `서버 오류 (${response.status})`);
    }

    // httpsCallable 호환: { data: ... } 구조 유지
    return { data };
}

// Vercel Serverless Functions 래퍼 (openai.js 인터페이스 동일)
export const callGeminiProxy = (payload) => callVercelFunction('/api/gemini', payload);
export const callGeminiImageProxy = (payload) => callVercelFunction('/api/gemini-image', payload);
export const callGetUsageInfo = () => callVercelFunction('/api/usage', {});

export default app;
