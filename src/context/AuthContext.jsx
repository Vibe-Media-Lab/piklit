import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithCustomToken, updateProfile, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// 소셜 로그인 팝업 헬퍼
function openSocialPopup(provider) {
    return new Promise((resolve, reject) => {
        const url = `/api/auth/${provider}`;
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
            url,
            `${provider}_login`,
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            reject(new Error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.'));
            return;
        }

        const onMessage = async (event) => {
            if (event.origin !== window.location.origin) return;
            const { data } = event;

            if (data.type === 'PIKLIT_AUTH') {
                window.removeEventListener('message', onMessage);
                try {
                    const credential = await signInWithCustomToken(auth, data.token);
                    // 프로필 정보 업데이트 (displayName, photoURL)
                    if (data.displayName || data.photoURL) {
                        await updateProfile(credential.user, {
                            displayName: data.displayName || credential.user.displayName,
                            photoURL: data.photoURL || credential.user.photoURL,
                        });
                    }
                    resolve(credential.user);
                } catch (error) {
                    reject(error);
                }
            } else if (data.type === 'PIKLIT_AUTH_ERROR') {
                window.removeEventListener('message', onMessage);
                reject(new Error(data.error || '로그인 실패'));
            }
        };

        window.addEventListener('message', onMessage);

        // 팝업이 닫히면 정리
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', onMessage);
            }
        }, 500);
    });
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google 로그인 실패:', error);
            throw error;
        }
    };

    const loginWithNaver = async () => {
        try {
            return await openSocialPopup('naver');
        } catch (error) {
            console.error('네이버 로그인 실패:', error);
            throw error;
        }
    };

    const loginWithKakao = async () => {
        try {
            return await openSocialPopup('kakao');
        } catch (error) {
            console.error('카카오 로그인 실패:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        loginWithNaver,
        loginWithKakao,
        logout,
        isLoggedIn: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
