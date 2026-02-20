import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

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
export const functions = getFunctions(app, 'asia-northeast3');

// 로컬 개발 시 에뮬레이터 연결
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Cloud Functions callable 래퍼
export const callGeminiProxy = httpsCallable(functions, 'geminiProxy', { timeout: 120000 });
export const callGeminiImageProxy = httpsCallable(functions, 'geminiImageProxy', { timeout: 120000 });
export const callGetUsageInfo = httpsCallable(functions, 'getUsageInfo');

export default app;
