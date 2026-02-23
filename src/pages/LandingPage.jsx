import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Search, Edit3, Loader2, Rocket, Upload, Sparkles, CheckCircle, Copy } from 'lucide-react';
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
                <a href="/" className="landing-logo">
                    <img src="/logo.png" alt="Piklit" className="landing-logo-img" />
                    <span>Piklit</span>
                </a>
                <button
                    className="landing-header-cta"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading
                        ? <><Loader2 size={16} className="spin" /> 로그인 중...</>
                        : <><GoogleIcon /> Google로 시작하기</>
                    }
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
                        {loginLoading
                            ? <><Loader2 size={18} className="spin" /> 로그인 중...</>
                            : '무료로 시작하기'
                        }
                    </button>
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <h2 className="landing-section-title">핵심 기능</h2>
                <div className="landing-features-grid">
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon"><Camera size={32} /></div>
                        <h3>사진 AI 분석</h3>
                        <p>업로드한 사진을 AI가 분석하여 블로그 본문에 자연스럽게 녹여냅니다.</p>
                    </div>
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon"><Search size={32} /></div>
                        <h3>SEO 키워드 최적화</h3>
                        <p>실시간 검색 데이터 기반으로 네이버 상위 노출 키워드를 추천합니다.</p>
                    </div>
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon"><Edit3 size={32} /></div>
                        <h3>AI 코칭 에디터</h3>
                        <p>문장 길이, 키워드 밀도, 가독성을 실시간 분석하고 개선점을 알려줍니다.</p>
                    </div>
                </div>
            </section>

            {/* Steps */}
            <section className="landing-steps">
                <div className="landing-steps-inner">
                    <h2 className="landing-section-title">3단계로 완성</h2>
                    <p className="landing-section-desc">
                        복잡한 과정 없이 빠르고 간편하게 블로그 포스팅을 완료하세요.
                    </p>

                    {/* 스텝 번호 + 커넥터 */}
                    <div className="landing-steps-header">
                        <div className="landing-step-number">1</div>
                        <div className="landing-step-number">2</div>
                        <div className="landing-step-number">3</div>
                    </div>

                    {/* 스텝 카드 */}
                    <div className="landing-steps-cards">
                        <div className="landing-step-card">
                            <h3>사진 올리기</h3>
                            <p>블로그에 사용할 사진을 업로드하세요</p>
                            <div className="landing-step-mockup mockup-upload">
                                <div className="mockup-dropzone">
                                    <Upload size={24} strokeWidth={1.5} />
                                    <span>Drag & Drop</span>
                                </div>
                                <div className="mockup-dot dot-blue" style={{ top: '16px', right: '20px' }} />
                                <div className="mockup-dot dot-green" style={{ bottom: '20px', left: '16px' }} />
                            </div>
                        </div>

                        <div className="landing-step-card">
                            <h3>AI 작성</h3>
                            <p>키워드 분석과 본문을 AI가 자동 생성합니다</p>
                            <div className="landing-step-mockup mockup-editor">
                                <div className="mockup-titlebar">
                                    <span className="mockup-dot-red" />
                                    <span className="mockup-dot-yellow" />
                                    <span className="mockup-dot-green" />
                                </div>
                                <div className="mockup-lines">
                                    <div className="mockup-line" style={{ width: '80%' }} />
                                    <div className="mockup-line" style={{ width: '100%' }} />
                                    <div className="mockup-line" style={{ width: '65%' }} />
                                    <div className="mockup-line" style={{ width: '90%' }} />
                                </div>
                                <div className="mockup-sparkle">
                                    <Sparkles size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="landing-step-card">
                            <h3>블로그에 복사</h3>
                            <p>완성된 글을 복사해서 바로 발행하세요</p>
                            <div className="landing-step-mockup mockup-copy">
                                <div className="mockup-check">
                                    <CheckCircle size={28} />
                                </div>
                                <div className="mockup-copy-btn">
                                    <Copy size={14} /> 복사하기
                                </div>
                                <div className="mockup-dot dot-yellow" style={{ top: '16px', left: '16px' }} />
                                <div className="mockup-dot dot-red" style={{ bottom: '40px', left: '24px' }} />
                                <div className="mockup-dot dot-blue" style={{ bottom: '16px', right: '16px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="landing-bottom-cta">
                <button
                    className="landing-cta-primary landing-cta-large"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading
                        ? <><Loader2 size={20} className="spin" /> 로그인 중...</>
                        : <><Rocket size={20} /> 지금 바로 시작하기</>
                    }
                </button>
                <p>회원가입 없이 무료로 체험해보세요.</p>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-logo">
                    <img src="/logo.png" alt="Piklit" className="landing-footer-logo-img" />
                    <span className="landing-footer-brand">Piklit</span>
                </div>
                <p>사진을 글로 절이다</p>
            </footer>
        </div>
    );
};

// Google 아이콘 (공식 컬러 SVG)
const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export default LandingPage;
