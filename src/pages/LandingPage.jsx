import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, Sparkles,
    ChevronDown, Check, X, TrendingUp,
    Upload, Rocket, FileText, ArrowRight, Menu
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import {
    FEATURES, PAIN_POINTS, PERSONAS, COMPARISON,
    PRICING, FAQS, REVIEWS, STEPS, TRUST_NUMBERS, SAMPLES
} from '../data/landingContent';
import '../styles/landing.css';

/* ─── 서브 컴포넌트 ──────────────────────────────────── */

const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const NaverIcon = () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <path d="M13.56 10.7L6.17 0H0v20h6.44V9.3L13.83 20H20V0h-6.44v10.7z" fill="#fff"/>
    </svg>
);

const KakaoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.53-.96 3.4-.99 3.62 0 0-.02.17.09.23.1.06.23.01.23.01.31-.04 3.56-2.33 4.12-2.73.6.08 1.22.13 1.89.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z" fill="#3C1E1E"/>
    </svg>
);

const LoginModal = ({ onClose, onLogin, loginLoading, loginProvider }) => {
    React.useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
    <div className="login-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="로그인">
        <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={onClose} aria-label="닫기">
                <X size={20} />
            </button>
            <div className="login-modal-header">
                <img src="/logo.png" alt="Piklit" className="login-modal-logo" />
                <h3>피클잇 시작하기</h3>
                <p>간편 로그인으로 바로 시작하세요</p>
            </div>
            <div className="login-modal-buttons">
                <button
                    className="login-btn login-btn-google"
                    onClick={() => onLogin('google')}
                    disabled={loginLoading}
                >
                    {loginLoading && loginProvider === 'google'
                        ? <Loader2 size={16} className="spin" />
                        : <GoogleIcon />
                    }
                    <span>Google로 시작하기</span>
                </button>
                <button
                    className="login-btn login-btn-naver login-btn-disabled"
                    disabled
                >
                    <NaverIcon />
                    <span>네이버로 시작하기</span>
                    <span className="login-btn-badge">준비 중</span>
                </button>
                <button
                    className="login-btn login-btn-kakao login-btn-disabled"
                    disabled
                >
                    <KakaoIcon />
                    <span>카카오로 시작하기</span>
                    <span className="login-btn-badge">준비 중</span>
                </button>
            </div>
            <p className="login-modal-beta-note">베타 기간 중 Google 로그인만 지원됩니다</p>
        </div>
    </div>
    );
};

const StickyHeader = ({ handleStart, loginLoading }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id) => {
        setMobileMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
            <div className="landing-header-inner">
                <a href="/" className="landing-logo">
                    <img src="/logo.png" alt="Piklit" className="landing-logo-img" />
                    <span>Piklit</span>
                </a>
                <nav className="landing-nav">
                    <button onClick={() => scrollTo('features')}>기능</button>
                    <button onClick={() => scrollTo('pricing')}>요금</button>
                    <button onClick={() => scrollTo('faq')}>FAQ</button>
                </nav>
                <button
                    className="landing-mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(prev => !prev)}
                    aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <button
                    className="landing-header-cta"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading
                        ? <><Loader2 size={16} className="spin" /> 로그인 중...</>
                        : '시작하기'
                    }
                </button>
            </div>
            {mobileMenuOpen && (
                <nav className="landing-mobile-nav">
                    <button onClick={() => scrollTo('features')}>기능</button>
                    <button onClick={() => scrollTo('pricing')}>요금</button>
                    <button onClick={() => scrollTo('faq')}>FAQ</button>
                    <button className="landing-mobile-nav-cta" onClick={() => { setMobileMenuOpen(false); handleStart(); }}>
                        시작하기
                    </button>
                </nav>
            )}
        </header>
    );
};

const HeroSection = ({ handleStart, loginLoading }) => (
    <div className="landing-hero-wrap">
    <section className="landing-hero">
        <div className="landing-hero-content">
            <span className="landing-badge hero-anim" style={{ '--delay': '0s' }}>네이버 블로그 글쓰기 AI</span>
            <h1 className="landing-hero-title">
                <span className="hero-anim" style={{ '--delay': '0.1s' }}>사진만 올리면</span><br />
                <span className="hero-anim" style={{ '--delay': '0.25s' }}>상위 노출 블로그 글이</span><br />
                <span className="highlight hero-anim-typing">5분 만에 완성됩니다</span>
            </h1>
            <p className="landing-hero-desc hero-anim" style={{ '--delay': '0.7s' }}>
                다른 서비스에는 없는 <strong>사진 분석 AI</strong>가<br />
                키워드 분석, 경쟁 조사, SEO 최적화까지 한 번에 처리!
            </p>
            <div className="hero-tags hero-anim" style={{ '--delay': '0.8s' }}>
                <span>#사진_AI_분석</span>
                <span>#SEO_최적화</span>
                <span>#실시간_키워드</span>
                <span>#네이버_상위노출</span>
            </div>
            <div className="landing-cta-group hero-anim" style={{ '--delay': '1s' }}>
                <button
                    className="landing-cta-primary"
                    onClick={handleStart}
                    disabled={loginLoading}
                >
                    {loginLoading
                        ? <><Loader2 size={18} className="spin" /> 로그인 중...</>
                        : '지금 시작하기 — 첫 달 무료'
                    }
                </button>
                <span className="landing-cta-hint">
                    카드 등록 없음 · 가입 첫 달 모든 기능 무료
                </span>
            </div>
        </div>
        <div className="landing-hero-mockup">
            <div className="hero-mockup-window">
                <div className="hero-mockup-titlebar">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                </div>
                <div className="hero-demo">
                    {/* Phase 1: 사진 업로드 */}
                    <div className="hero-demo-screen screen-upload">
                        <div className="demo-step-label"><Upload size={14} /> 사진 업로드</div>
                        <div className="demo-photos">
                            <div className="demo-photo p1"><span>🍜</span></div>
                            <div className="demo-photo p2"><span>☕</span></div>
                            <div className="demo-photo p3"><span>🏪</span></div>
                        </div>
                        <div className="demo-bottom-label">📸 사진 3장 업로드 완료</div>
                    </div>
                    {/* Phase 2: AI 분석 */}
                    <div className="hero-demo-screen screen-analyze">
                        <div className="demo-step-label"><Sparkles size={14} /> AI 분석 중</div>
                        <div className="demo-progress"><div className="demo-progress-fill" /></div>
                        <div className="demo-keywords">
                            <span className="demo-kw kw1">#강남맛집</span>
                            <span className="demo-kw kw2">#데이트코스</span>
                            <span className="demo-kw kw3">#분위기좋은</span>
                        </div>
                        <div className="demo-bottom-label">🔍 키워드 3개 발견</div>
                    </div>
                    {/* Phase 3: 글 완성 */}
                    <div className="hero-demo-screen screen-complete">
                        <div className="demo-step-label"><FileText size={14} /> 글 작성 완료</div>
                        <div className="demo-lines">
                            <div className="demo-line dl-title" />
                            <div className="demo-line dl1" />
                            <div className="demo-line dl2" />
                            <div className="demo-line dl3" />
                        </div>
                        <div className="demo-complete-row">
                            <span className="demo-seo-score">SEO 92점</span>
                            <span className="demo-complete-check">✅ 발행 준비 완료</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    </div>
);

const CounterNumber = ({ num, prefix = '', suffix, label }) => {
    const ref = useRef(null);
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started) {
                    setStarted(true);
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started || num === 0) return;
        const duration = 1200;
        const steps = 30;
        const increment = num / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= num) {
                setCount(num);
                clearInterval(interval);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(interval);
    }, [started, num]);

    return (
        <div className="trust-item" ref={ref}>
            <span className="trust-value">{prefix}{started ? count : 0}{suffix}</span>
            <span className="trust-label">{label}</span>
        </div>
    );
};

const TrustBar = () => (
    <section className="landing-trust">
        <div className="landing-trust-inner">
            {TRUST_NUMBERS.map((item, i) => (
                <CounterNumber key={i} {...item} />
            ))}
        </div>
    </section>
);

const SampleCarousel = () => (
    <section className="landing-samples reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">AI 생성 예시</span>
            <h2 className="landing-section-title">실제로 이런 글이 5분 만에 나옵니다</h2>
        </div>
        <div className="samples-track-wrap">
            <div className="samples-track">
                {[...SAMPLES, ...SAMPLES].map((s, i) => (
                    <div className="sample-card" key={i}>
                        <span className="sample-cat">{s.cat}</span>
                        <h4 className="sample-title">{s.title}</h4>
                        <p className="sample-excerpt">{s.excerpt}</p>
                        <div className="sample-footer">
                            <span className="sample-score">SEO {s.score}점</span>
                            <span className="sample-tag">AI 생성</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const PainSection = () => (
    <section className="landing-pain reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">문제 해결</span>
            <h2 className="landing-section-title">블로그 글쓰기, 이렇게 고민하셨죠?</h2>
            <div className="pain-grid">
                {PAIN_POINTS.map((p, i) => (
                    <div className="pain-card" key={i}>
                        <div className="pain-before">
                            <X size={16} />
                            <span>{p.before}</span>
                        </div>
                        <div className="pain-arrow">→</div>
                        <div className="pain-after">
                            <Check size={16} />
                            <span>{p.after}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FeatureMockup = ({ id }) => {
    if (id === 'photo') return (
        <div className="feat-mockup feat-mockup-photo">
            <div className="fm-photo-grid">
                <div className="fm-photo"><span>🍜</span></div>
                <div className="fm-photo"><span>☕</span></div>
                <div className="fm-photo"><span>🏪</span></div>
            </div>
            <div className="fm-photo-tags">
                <span className="fm-tag">📍 강남역</span>
                <span className="fm-tag">🍜 라멘</span>
                <span className="fm-tag">✨ 아늑한 분위기</span>
            </div>
        </div>
    );
    if (id === 'keyword') return (
        <div className="feat-mockup feat-mockup-keyword">
            <div className="fm-kw-row">
                <span className="fm-kw-label">강남 맛집</span>
                <div className="fm-kw-bar"><div className="fm-kw-fill" style={{ width: '92%' }} /></div>
                <span className="fm-kw-badge best">추천</span>
            </div>
            <div className="fm-kw-row">
                <span className="fm-kw-label">강남역 라멘</span>
                <div className="fm-kw-bar"><div className="fm-kw-fill" style={{ width: '78%' }} /></div>
                <span className="fm-kw-badge">경쟁↓</span>
            </div>
            <div className="fm-kw-row">
                <span className="fm-kw-label">데이트 코스</span>
                <div className="fm-kw-bar"><div className="fm-kw-fill" style={{ width: '65%' }} /></div>
                <span className="fm-kw-badge">롱테일</span>
            </div>
        </div>
    );
    if (id === 'generate') return (
        <div className="feat-mockup feat-mockup-generate">
            <div className="fm-editor-titlebar">
                <span className="fm-dot red" /><span className="fm-dot yellow" /><span className="fm-dot green" />
            </div>
            <div className="fm-editor-body">
                <div className="fm-editor-title-line" />
                <div className="fm-editor-line w80" />
                <div className="fm-editor-line w95" />
                <div className="fm-bubble-menu">
                    <span>다듬기</span><span>늘리기</span><span>톤 변경</span>
                </div>
            </div>
        </div>
    );
    if (id === 'wannabe') return (
        <div className="feat-mockup feat-mockup-wannabe">
            <div className="fm-wannabe-segment">
                <span className="fm-seg-active">워너비</span>
                <span className="fm-seg-inactive">내스타일</span>
            </div>
            <div className="fm-wannabe-slots">
                <div className="fm-slot filled">📸</div>
                <div className="fm-slot filled">📸</div>
                <div className="fm-slot empty">+</div>
            </div>
            <div className="fm-wannabe-result">
                <div className="fm-wannabe-axis">
                    <span className="fm-wannabe-label">말투</span>
                    <span className="fm-wannabe-value">~했어요 (친근체)</span>
                </div>
                <div className="fm-wannabe-axis">
                    <span className="fm-wannabe-label">구조</span>
                    <span className="fm-wannabe-value">짧은 문단 + 사진 교차</span>
                </div>
            </div>
            <div className="fm-wannabe-apply">프리셋 저장</div>
        </div>
    );
    if (id === 'seo') return (
        <div className="feat-mockup feat-mockup-seo">
            <div className="fm-gauge">
                <svg viewBox="0 0 160 100" className="fm-gauge-svg">
                    <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="#E3E2E0" strokeWidth="7" strokeLinecap="round" />
                    <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="#FF6B35" strokeWidth="7" strokeLinecap="round" strokeDasharray="189" strokeDashoffset="15" />
                </svg>
                <span className="fm-gauge-score">92<span className="fm-gauge-suffix">/ 100</span></span>
            </div>
            <div className="fm-seo-checks">
                <div className="fm-seo-check done"><Check size={12} /> 키워드 밀도 적정</div>
                <div className="fm-seo-check done"><Check size={12} /> 소제목 3개 이상</div>
                <div className="fm-seo-check done"><Check size={12} /> 본문 1,500자+</div>
            </div>
        </div>
    );
    return null;
};

const FeatureShowcase = () => (
    <section className="landing-features reveal-on-scroll" id="features">
        <div className="landing-section-inner">
            <span className="landing-section-badge">왜 피클잇인가</span>
            <h2 className="landing-section-title">사진 한 장에서 상위 노출까지, 5분</h2>
            <div className="features-grid">
                {FEATURES.map((feat, i) => (
                    <div className={`feature-card ${i % 2 === 1 ? 'reverse' : ''}`} key={feat.id}>
                        <div className="feature-card-text">
                            <div className="feature-card-icon">
                                <feat.icon size={20} />
                                <span>{feat.label}</span>
                            </div>
                            <h3>{feat.title}</h3>
                            <p>{feat.desc}</p>
                            <ul>
                                {feat.bullets.map((b, j) => (
                                    <li key={j}><Check size={14} /> {b}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="feature-card-visual">
                            <FeatureMockup id={feat.id} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const MidCTA = ({ handleStart, loginLoading }) => (
    <section className="landing-mid-cta">
        <div className="landing-section-inner">
            <p className="mid-cta-text">사진만 올리면 5분 만에 SEO 90점 글이 완성됩니다</p>
            <button
                className="landing-cta-primary"
                onClick={handleStart}
                disabled={loginLoading}
            >
                {loginLoading
                    ? <><Loader2 size={16} className="spin" /> 로그인 중...</>
                    : '지금 시작하기 — 첫 달 무료'
                }
            </button>
        </div>
    </section>
);

const StepMockup = ({ num }) => {
    if (num === 1) return (
        <div className="step-mockup step-mockup-upload">
            <div className="sm-dropzone">
                <Upload size={20} />
                <span>사진을 드래그하세요</span>
            </div>
            <div className="sm-thumbs">
                <div className="sm-thumb">🍜</div>
                <div className="sm-thumb">☕</div>
                <div className="sm-thumb">🏪</div>
            </div>
            <div className="sm-category-chips">
                <span className="sm-chip active">☕ 카페</span>
                <span className="sm-chip">🍳 레시피</span>
                <span className="sm-chip">✈️ 여행</span>
            </div>
        </div>
    );
    if (num === 2) return (
        <div className="step-mockup step-mockup-ai">
            <div className="sm-pipeline">
                <div className="sm-pipe-step done">
                    <Check size={14} />
                    <span>사진 분석</span>
                </div>
                <div className="sm-pipe-arrow"><ArrowRight size={12} /></div>
                <div className="sm-pipe-step done">
                    <Check size={14} />
                    <span>키워드 분석</span>
                </div>
                <div className="sm-pipe-arrow"><ArrowRight size={12} /></div>
                <div className="sm-pipe-step active">
                    <Loader2 size={14} className="spin" />
                    <span>본문 생성</span>
                </div>
                <div className="sm-pipe-arrow"><ArrowRight size={12} /></div>
                <div className="sm-pipe-step pending">
                    <span className="sm-pipe-dot" />
                    <span>SEO 검증</span>
                </div>
            </div>
        </div>
    );
    if (num === 3) return (
        <div className="step-mockup step-mockup-publish">
            <div className="sm-result-card">
                <div className="sm-result-title">강남역 숨은 라멘 맛집 탐방기</div>
                <div className="sm-result-meta">
                    <span className="sm-seo-badge">SEO 94점</span>
                    <span className="sm-word-count">2,450자</span>
                </div>
            </div>
            <button className="sm-publish-btn">
                <Rocket size={14} /> 클립보드 복사 → 네이버 발행
            </button>
        </div>
    );
    return null;
};

const StepsSection = () => (
    <section className="landing-steps reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">사용 방법</span>
            <h2 className="landing-section-title">딱 3단계, 5분이면 끝</h2>
            <p className="landing-section-desc">
                복잡한 건 피클잇이 다 합니다. 당신은 사진만 올리세요.
            </p>
            <div className="steps-list">
                {STEPS.map((step, i) => (
                    <React.Fragment key={i}>
                        <div className={`step-row ${i % 2 === 1 ? 'reverse' : ''}`}>
                            <div className="step-number">{step.num}</div>
                            <div className="step-text">
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                                {step.substeps && (
                                    <ul className="step-substeps">
                                        {step.substeps.map((s, j) => (
                                            <li key={j}><Check size={14} /> {s}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="step-visual">
                                <StepMockup num={step.num} />
                            </div>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="step-connector">
                                <ArrowRight size={20} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    </section>
);

const CategoryGrid = () => (
    <section className="landing-categories reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">카테고리</span>
            <h2 className="landing-section-title">어떤 주제든 전문가처럼 써 줍니다</h2>
            <p className="landing-section-desc">
                맛집, 여행, 육아, 테크…{'\n'}카테고리별 톤과 키워드 전략이 자동 적용됩니다.
            </p>
            <div className="category-pills">
                {CATEGORIES.map((cat) => (
                    <span className="category-pill" key={cat.id}>
                        <span className="category-pill-icon">{cat.icon}</span>
                        {cat.label}
                    </span>
                ))}
            </div>
        </div>
    </section>
);

const PersonaCards = () => (
    <section className="landing-personas reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">누구를 위한 서비스?</span>
            <h2 className="landing-section-title">누가 쓰면 가장 효과적일까요?</h2>
            <div className="persona-grid">
                {PERSONAS.map((p, i) => (
                    <div className="persona-card" key={i}>
                        <div className="persona-icon"><p.icon size={28} /></div>
                        <span className="persona-tag">{p.tag}</span>
                        <h3>{p.title}</h3>
                        <p>{p.desc}</p>
                        <span className="persona-scenario">{p.scenario}</span>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const ReviewsSection = () => (
    <section className="landing-reviews reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">베타 테스터 후기</span>
            <h2 className="landing-section-title">베타 테스터들의 솔직한 피드백</h2>
            <div className="reviews-grid">
                {REVIEWS.map((r, i) => (
                    <div className="review-card" key={i}>
                        <div className="review-header">
                            <div className="review-avatar">{r.name.charAt(0)}</div>
                            <div className="review-info">
                                <span className="review-name">{r.name}</span>
                                <span className="review-role">{r.role} · {r.period}</span>
                            </div>
                            <span className={`review-badge ${r.badge === 'BEST' ? 'best' : r.badge === '인증됨' ? 'verified' : 'popular'}`}>
                                {r.badge}
                            </span>
                        </div>
                        <p className="review-text">{r.text}</p>
                        <div className="review-metric">
                            <TrendingUp size={14} />
                            <span>{r.metric}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const ComparisonTable = () => (
    <section className="landing-comparison reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">비교</span>
            <h2 className="landing-section-title">다른 AI 도구와 비교해보세요</h2>
            <div className="comparison-table-wrap">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th>기능</th>
                            <th className="comp-highlight">피클잇</th>
                            <th>가제트AI</th>
                            <th>워들리</th>
                            <th>뤼튼</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARISON.map((row, i) => (
                            <tr key={i}>
                                <td>{row.feature}</td>
                                <td className="comp-highlight">{row.piklit ? <Check size={18} /> : <X size={18} />}</td>
                                <td>{row.gadget ? <Check size={18} /> : <X size={18} />}</td>
                                <td>{row.wordly ? <Check size={18} /> : <X size={18} />}</td>
                                <td>{row.rytn ? <Check size={18} /> : <X size={18} />}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </section>
);

const MidCTA2 = ({ handleStart, loginLoading }) => (
    <section className="landing-mid-cta">
        <div className="landing-section-inner">
            <p className="mid-cta-text">다른 도구와 비교해도 피클잇이 압도적입니다</p>
            <button
                className="landing-cta-primary"
                onClick={handleStart}
                disabled={loginLoading}
            >
                {loginLoading
                    ? <><Loader2 size={16} className="spin" /> 로그인 중...</>
                    : '지금 시작하기 — 첫 달 무료'
                }
            </button>
        </div>
    </section>
);

const PricingSection = ({ handleStart, loginLoading }) => (
    <section className="landing-pricing reveal-on-scroll" id="pricing">
        <div className="landing-section-inner">
            <span className="landing-section-badge">요금제</span>
            <h2 className="landing-section-title">블로그 대행 비용의 1/60</h2>
            <p className="pricing-anchor">블로그 대행 월 30~50만원 vs 피클잇<br />시작은 커피 한 잔 값도 안 듭니다</p>
            <div className="pricing-grid">
                {PRICING.map((plan, i) => (
                    <div className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`} key={i}>
                        {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
                        <h3>{plan.name}{plan.name.includes('BYOK') && <><br /><span className="pricing-byok-sub">Bring Your Own Key</span></>}</h3>
                        <div className="pricing-price">
                            <span className="pricing-amount">{plan.price}</span>
                            <span className="pricing-period">/ {plan.period}</span>
                        </div>
                        <p className="pricing-desc">{plan.desc}</p>
                        <ul className="pricing-features">
                            {plan.features.map((f, j) => (
                                <li key={j}><Check size={16} /> {f}</li>
                            ))}
                        </ul>
                        <button
                            className={`pricing-cta ${plan.highlighted ? 'primary' : ''}`}
                            onClick={plan.disabled ? undefined : handleStart}
                            disabled={loginLoading || plan.disabled}
                        >
                            {loginLoading && !plan.disabled
                                ? <><Loader2 size={16} className="spin" /> 로그인 중...</>
                                : plan.cta
                            }
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(null);

    return (
        <section className="landing-faq reveal-on-scroll" id="faq">
            <div className="landing-section-inner">
                <span className="landing-section-badge">FAQ</span>
                <h2 className="landing-section-title">자주 묻는 질문</h2>
                <div className="faq-list">
                    {FAQS.map((faq, i) => (
                        <div
                            className={`faq-item ${openIndex === i ? 'open' : ''}`}
                            key={i}
                        >
                            <button
                                className="faq-question"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                aria-expanded={openIndex === i}
                            >
                                <span>{faq.q}</span>
                                <ChevronDown size={20} />
                            </button>
                            <div className="faq-answer">
                                <p>{faq.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const BottomCTA = ({ handleStart, loginLoading }) => (
    <section className="landing-bottom-cta">
        <div className="landing-section-inner">
            <h2>첫 상위 노출 글, 지금 만들어보세요</h2>
            <p className="bottom-cta-desc">
                첫 달 모든 기능 무료.{'\n'}5분이면 SEO 90점 이상 글이 완성됩니다.
            </p>
            <button
                className="landing-cta-primary landing-cta-large"
                onClick={handleStart}
                disabled={loginLoading}
            >
                {loginLoading
                    ? <><Loader2 size={20} className="spin" /> 로그인 중...</>
                    : <><Rocket size={20} /> 지금 시작하기 — 첫 달 무료</>
                }
            </button>
            <span className="bottom-cta-note">카드 등록 없음 · 간편 소셜 로그인</span>
        </div>
    </section>
);

const Footer = () => (
    <footer className="landing-footer">
        <div className="landing-footer-inner">
            <div className="landing-footer-logo">
                <img src="/logo.png" alt="Piklit" className="landing-footer-logo-img" />
                <span className="landing-footer-brand">Piklit</span>
            </div>
            <p className="landing-footer-tagline">사진을 글로 절이다</p>
            <div className="landing-footer-links">
                <a href="/terms" onClick={(e) => e.preventDefault()}>이용약관</a>
                <span className="landing-footer-divider">·</span>
                <a href="/privacy" onClick={(e) => e.preventDefault()}>개인정보처리방침</a>
            </div>
            <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Piklit. All rights reserved.</p>
        </div>
    </footer>
);

/* ─── 메인 컴포넌트 ──────────────────────────────────── */

const LandingPage = () => {
    const navigate = useNavigate();
    const { isLoggedIn, loginWithGoogle, loginWithNaver, loginWithKakao } = useAuth();
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginProvider, setLoginProvider] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // 이미 로그인된 사용자는 글 목록으로 이동
    useEffect(() => {
        if (isLoggedIn) {
            navigate('/posts', { replace: true });
        }
    }, [isLoggedIn, navigate]);

    // 스크롤 애니메이션 (IntersectionObserver)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const handleStart = () => {
        if (isLoggedIn) {
            navigate('/posts');
            return;
        }
        setShowLoginModal(true);
    };

    const handleProviderLogin = async (provider) => {
        setLoginLoading(true);
        setLoginProvider(provider);
        try {
            if (provider === 'google') {
                await loginWithGoogle();
            } else if (provider === 'naver') {
                await loginWithNaver();
            } else if (provider === 'kakao') {
                await loginWithKakao();
            }
            setShowLoginModal(false);
            navigate('/posts');
        } catch (error) {
            console.error(`${provider} 로그인 실패:`, error);
        } finally {
            setLoginLoading(false);
            setLoginProvider(null);
        }
    };

    return (
        <main className="landing">
            <StickyHeader handleStart={handleStart} loginLoading={loginLoading} />
            <HeroSection handleStart={handleStart} loginLoading={loginLoading} />
            <TrustBar />
            <SampleCarousel />
            <PainSection />
            <FeatureShowcase />
            <MidCTA handleStart={handleStart} loginLoading={loginLoading} />
            <StepsSection />
            <CategoryGrid />
            <PersonaCards />
            <ReviewsSection />
            <ComparisonTable />
            <MidCTA2 handleStart={handleStart} loginLoading={loginLoading} />
            <PricingSection handleStart={handleStart} loginLoading={loginLoading} />
            <FAQSection />
            <BottomCTA handleStart={handleStart} loginLoading={loginLoading} />
            <Footer />
            {showLoginModal && (
                <LoginModal
                    onClose={() => setShowLoginModal(false)}
                    onLogin={handleProviderLogin}
                    loginLoading={loginLoading}
                    loginProvider={loginProvider}
                />
            )}
        </main>
    );
};

export default LandingPage;
