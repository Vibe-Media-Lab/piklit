import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isLoggedIn, loginWithGoogle } = useAuth();
    const [loginLoading, setLoginLoading] = useState(false);

    // 이미 로그인된 사용자는 글 목록으로 이동
    React.useEffect(() => {
        if (isLoggedIn) {
            navigate('/posts', { replace: true });
        }
    }, [isLoggedIn, navigate]);

    const handleStart = async () => {
        if (isLoggedIn) {
            navigate('/posts');
            return;
        }
        setLoginLoading(true);
        try {
            await loginWithGoogle();
            navigate('/posts');
        } catch (error) {
            console.error('로그인 실패:', error);
        } finally {
            setLoginLoading(false);
        }
    };

    return (
        <div className="landing">
            {/* Header */}
            <header className="landing-header">
                <span className="landing-logo">피클릿</span>
                <button
                    className="landing-header-cta"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading ? '로그인 중...' : 'Google로 시작하기'}
                </button>
            </header>

            {/* Hero */}
            <section className="landing-hero">
                <span className="landing-badge">AI 블로그 작성기</span>
                <h1>
                    사진만 올리면,<br />
                    <span className="highlight">블로그 글</span>이 완성됩니다
                </h1>
                <p className="landing-hero-desc">
                    키워드 분석부터 SEO 최적화 본문 작성까지.<br />
                    AI가 네이버 블로그 상위 노출을 도와드립니다.
                </p>
                <div className="landing-cta-group">
                    <button
                        className="landing-cta-primary"
                        onClick={handleStart}
                        disabled={loginLoading}
                    >
                        {loginLoading ? '로그인 중...' : '무료로 시작하기'}
                    </button>
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <h2 className="landing-section-title">핵심 기능</h2>
                <div className="landing-features-grid">
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">📸</div>
                        <h3>사진 AI 분석</h3>
                        <p>업로드한 사진을 AI가 분석하여 블로그 본문에 자연스럽게 녹여냅니다.</p>
                    </div>
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🔍</div>
                        <h3>SEO 키워드 최적화</h3>
                        <p>실시간 검색 데이터 기반으로 네이버 상위 노출 키워드를 추천합니다.</p>
                    </div>
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">✍️</div>
                        <h3>AI 코칭 에디터</h3>
                        <p>문장 길이, 키워드 밀도, 가독성을 실시간 분석하고 개선점을 알려줍니다.</p>
                    </div>
                </div>
            </section>

            {/* Steps */}
            <section className="landing-steps">
                <div className="landing-steps-inner">
                    <h2 className="landing-section-title">3단계로 완성</h2>
                    <div className="landing-steps-list">
                        <div className="landing-step">
                            <div className="landing-step-number">1</div>
                            <h3>사진 올리기</h3>
                            <p>블로그에 사용할 사진을 업로드하세요</p>
                        </div>
                        <div className="landing-step">
                            <div className="landing-step-number">2</div>
                            <h3>AI 작성</h3>
                            <p>키워드 분석과 본문을 AI가 자동 생성합니다</p>
                        </div>
                        <div className="landing-step">
                            <div className="landing-step-number">3</div>
                            <h3>블로그에 복사</h3>
                            <p>완성된 글을 복사해서 바로 발행하세요</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="landing-bottom-cta">
                <h2>지금 바로 시작하세요</h2>
                <p>복잡한 설정 없이, 사진만 올리면 됩니다.</p>
                <button
                    className="landing-cta-primary"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading ? '로그인 중...' : '무료로 시작하기'}
                </button>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <span className="landing-footer-brand">피클릿 (Piklit)</span>
                <p>사진을 글로 절이다</p>
            </footer>
        </div>
    );
};

export default LandingPage;
