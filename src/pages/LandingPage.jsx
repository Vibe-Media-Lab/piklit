import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, Camera, Search, Sparkles, BarChart3,
    ChevronDown, Zap, Grid3x3, Check, X, TrendingUp,
    Upload, Copy, Rocket, Image, Bot, FileText, ArrowRight, Eye, Target
} from 'lucide-react';
import '../styles/landing.css';

/* ─── 콘텐츠 데이터 ──────────────────────────────────── */

const FEATURES = [
    {
        id: 'photo',
        icon: Camera,
        label: '사진 분석',
        title: '사진 한 장이 2,000자 블로그 글이 됩니다',
        desc: '장소, 메뉴, 분위기를 AI가 자동 인식하고 SEO에 맞는 본문으로 바꿔줍니다.',
        bullets: ['장소·음식·분위기 자동 인식', '사진별 SEO 설명 자동 생성', '본문 내 자연스러운 배치'],
    },
    {
        id: 'keyword',
        icon: Search,
        label: '키워드 분석',
        title: '감춰진 골든 키워드, 30초 만에 발굴',
        desc: '네이버 상위 10개 블로그를 실시간 분석하여 검색량은 높고 경쟁은 낮은 키워드를 자동 추천합니다.',
        bullets: ['실시간 검색 트렌드 분석', '경쟁 블로그 상위 노출 분석', '롱테일 키워드 자동 추천'],
    },
    {
        id: 'generate',
        icon: Sparkles,
        label: 'AI 글 생성',
        title: '5분이면 발행 가능한 글이 완성됩니다',
        desc: '키워드, 사진, 경쟁 분석을 반영한 SEO 최적화 글을 자동 생성합니다.',
        bullets: ['카테고리별 맞춤 톤·구조 적용', '소제목·문단 자동 구성', 'AI 버블 메뉴로 실시간 편집'],
    },
    {
        id: 'seo',
        icon: BarChart3,
        label: 'SEO 코칭',
        title: '발행 전 SEO 90점 이상을 보장합니다',
        desc: '키워드 밀도, 소제목 구조, 본문 길이 등 12개 항목을 실시간 체크하고 개선점을 안내합니다.',
        bullets: ['12개 항목 실시간 분석', '개선 포인트 즉시 안내', '경쟁 글 대비 점수 비교'],
    },
];

const PAIN_POINTS = [
    { before: '"상위 노출 키워드 어떻게 찾지?"', after: '30초 만에 골든 키워드 발굴' },
    { before: '글 한 편 쓰는 데 반나절', after: '5분이면 발행 가능한 글 완성' },
    { before: '"SEO? 그게 뭔가요?"', after: 'AI가 SEO 90점 이상 자동 달성' },
    { before: '맨날 같은 톤, 같은 구조', after: '카테고리별 맞춤 톤 자동 적용' },
];

const COMPARISON = [
    { feature: '네이버 SEO 특화', piklit: true, gadget: true, wordly: true, chatgpt: false, rytn: false },
    { feature: '사진 분석 → 본문 반영', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '내장 에디터 (실시간 편집)', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '실시간 키워드 분석', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: true },
    { feature: '경쟁 블로그 분석', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '12개 SEO 항목 코칭', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '카테고리별 맞춤 톤', piklit: true, gadget: true, wordly: true, chatgpt: false, rytn: true },
    { feature: '최저가 BYOK', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
];

const PRICING = [
    {
        name: '무료 체험',
        price: '₩0',
        period: '월',
        desc: '부담 없이 먼저 써보세요',
        features: ['월 3회 글 생성', 'SEO 분석 리포트', 'AI 편집 도구', '15개 카테고리 템플릿', '네이버 블로그 최적화'],
        cta: '무료로 시작하기',
        highlighted: false,
    },
    {
        name: 'BYOK (내 키 연결)',
        price: '₩4,900',
        period: '월',
        desc: '커피 한 잔 값으로 무제한 포스팅',
        features: ['무제한 글 생성', 'AI 이미지 생성', 'Google AI 키 간편 연결', '모든 무료 기능 포함', '우선 고객 지원'],
        cta: '첫 달 무료로 시작',
        highlighted: true,
        badge: '첫 달 무료',
    },
    {
        name: 'Pro',
        price: '₩18,900',
        period: '월',
        desc: '키 설정 없이 올인원으로',
        features: ['무제한 글 생성', 'API 키 불필요', '클라우드 저장', '예약 발행', '팀 기능'],
        cta: '준비 중',
        highlighted: false,
        disabled: true,
        badge: '준비 중',
    },
];

const FAQS = [
    {
        q: '무료로 사용할 수 있나요?',
        a: '네, 가입 첫 달은 모든 기능을 무료로 사용할 수 있습니다. 이후에는 월 3회까지 무료 체험이 가능하며, BYOK 요금제(₩4,900/월)로 업그레이드하면 무제한으로 사용할 수 있습니다. 신용카드 등록 없이 네이버, 카카오, Google 계정으로 바로 시작하세요.',
    },
    {
        q: '네이버 블로그 외에 다른 플랫폼도 지원하나요?',
        a: '현재는 네이버 블로그에 최적화되어 있습니다. 향후 티스토리, 워드프레스 등 다른 플랫폼도 지원할 예정입니다.',
    },
    {
        q: 'AI로 쓴 글이 네이버에서 페널티를 받지 않나요?',
        a: '피클잇은 AI가 초안을 작성하고 사용자가 직접 수정·보완하는 방식입니다. 실시간 SEO 코칭으로 자연스러운 글을 완성할 수 있습니다.',
    },
    {
        q: 'AI가 쓴 글의 품질이 괜찮은가요?',
        a: '피클잇은 실제 네이버 상위 노출 글의 구조와 패턴을 분석하여 본문을 생성합니다. 카테고리별 맞춤 톤, 소제목 구성, 키워드 밀도까지 자동 최적화되며, 내장 에디터에서 원하는 대로 수정할 수 있습니다.',
    },
    {
        q: '"내 키 연결"은 어떻게 하나요?',
        a: 'Google AI Studio에서 무료로 AI 키를 발급받아 설정에 붙여넣기 하면 끝입니다. 1분이면 완료되고, 서비스 내 가이드에서 단계별로 안내합니다. BYOK 요금제(₩4,900/월, 첫 달 무료)를 선택하면 무제한으로 글을 생성할 수 있습니다.',
    },
    {
        q: '내 데이터는 안전한가요?',
        a: '업로드한 사진과 작성한 글은 사용자 브라우저에 저장되며, 서버에 별도 보관하지 않습니다. AI 분석 요청은 암호화된 연결로 처리됩니다.',
    },
];

const REVIEWS = [
    {
        name: '김OO님',
        role: '맛집 블로거',
        period: '사용 3개월',
        text: '사진만 올리면 글이 완성되니까 포스팅 시간이 반나절에서 15분으로 줄었어요. SEO 점수까지 알려주니 상위 노출도 훨씬 잘 돼요.',
        metric: '작성 시간 90% 절약',
        badge: 'BEST',
    },
    {
        name: '이OO님',
        role: '초보 블로거',
        period: '사용 1개월',
        text: '블로그를 처음 시작했는데, 키워드 분석부터 본문 구조까지 AI가 다 잡아줘서 첫 글부터 이웃 수가 빠르게 늘었습니다.',
        metric: '첫 달 이웃 50명 달성',
        badge: '인기',
    },
    {
        name: '박OO님',
        role: '카페 사장님',
        period: '사용 2개월',
        text: '가게 사진 찍어서 올리기만 하면 홍보 글이 나와요. 블로그 마케팅 대행 맡기던 비용을 완전히 아끼게 됐습니다.',
        metric: '마케팅 비용 100% 절감',
        badge: '인증됨',
    },
    {
        name: '정OO님',
        role: '여행 블로거',
        period: '사용 4개월',
        text: '여행 다녀와서 사진 정리하고 글 쓰는 게 제일 귀찮았는데, 피클잇 덕에 사진만 올리면 여행기가 완성돼요. 퀄리티도 만족합니다.',
        metric: '월 포스팅 3배 증가',
        badge: 'BEST',
    },
    {
        name: '최OO님',
        role: '육아 블로거',
        period: '사용 2개월',
        text: '아이 사진으로 육아 일기를 쓰는데 정말 편해요. 톤도 따뜻하게 잡아주고, 키워드도 알아서 넣어줘서 SEO 점수가 항상 90점 이상이에요.',
        metric: 'SEO 평균 92점',
        badge: '인기',
    },
    {
        name: '한OO님',
        role: '제품 리뷰어',
        period: '사용 3개월',
        text: '제품 사진 올리면 스펙 비교부터 사용 후기까지 짜임새 있게 나와요. 네이버 키워드 분석이 진짜 유용합니다.',
        metric: '리뷰 조회수 2배 상승',
        badge: '인증됨',
    },
];

const STEPS = [
    {
        num: 1,
        title: '사진을 올리세요. 나머지는 피클잇이 합니다',
        desc: '드래그 앤 드롭으로 사진만 올리면 AI가 장소, 메뉴, 분위기를 알아서 파악합니다.',
        icon: Upload,
        substeps: ['사진 최대 10장 드래그 & 드롭', '16개 카테고리 중 선택', 'AI가 사진 속 정보 자동 인식'],
    },
    {
        num: 2,
        title: '키워드 분석부터 본문 완성까지, 자동으로',
        desc: '버튼 하나로 키워드 분석, 경쟁 조사, SEO 최적화 본문까지 한 번에 완성됩니다.',
        icon: Bot,
        substeps: ['실시간 키워드 트렌드 분석', '경쟁 블로그 상위 10개 조사', 'SEO 최적화 본문 자동 생성'],
    },
    {
        num: 3,
        title: '복사 → 붙여넣기, 바로 네이버에 발행',
        desc: 'SEO 점수를 확인하고, 복사 버튼 하나로 네이버 블로그에 바로 발행하세요.',
        icon: Rocket,
        substeps: ['12개 SEO 항목 실시간 체크', 'AI 편집 도구로 문장 다듬기', '클립보드 복사 → 네이버 발행'],
    },
];

const TRUST_NUMBERS = [
    { num: 5, suffix: '분', label: '평균 작성 시간' },
    { num: 12, suffix: '개', label: 'SEO 분석 항목' },
    { num: 16, suffix: '개', label: '카테고리 지원' },
    { num: 90, suffix: '%', label: '작성 시간 절약' },
];

const SAMPLES = [
    { cat: '☕ 카페', title: '강남역 숨은 카페 탐방기', excerpt: '오늘은 강남역 골목 안쪽에 숨겨진 분위기 좋은 카페를 발견했어요. 시그니처 라떼가...', score: 94 },
    { cat: '✈️ 여행', title: '제주도 3박 4일 가족여행 코스', excerpt: '아이들과 함께하는 제주도 여행, 어디를 가야 할지 고민이시죠? 이번에 저희 가족이...', score: 91 },
    { cat: '🍳 레시피', title: '15분 완성 원팬 파스타 레시피', excerpt: '퇴근 후 간단하게 만들 수 있는 원팬 파스타! 프라이팬 하나로 크림 파스타를 만들어...', score: 88 },
    { cat: '⭐ 솔직후기', title: '다이슨 에어랩 6개월 사용 후기', excerpt: '정가 60만원, 과연 그 값어치를 하는 걸까요? 6개월간 거의 매일 사용한 솔직한...', score: 92 },
    { cat: '💻 테크', title: '맥북 프로 M4 실사용 리뷰', excerpt: '개발자가 맥북 프로 M4를 한 달간 사용해보았습니다. 배터리부터 성능까지 솔직하게...', score: 90 },
    { cat: '🐾 반려동물', title: '골든리트리버 산책 코스 추천', excerpt: '대형견과 함께 걷기 좋은 서울 근교 산책로를 소개합니다. 반려견 동반 가능한...', score: 87 },
];

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

const LoginModal = ({ onClose, onLogin, loginLoading, loginProvider }) => (
    <div className="login-modal-overlay" onClick={onClose}>
        <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={onClose}>
                <X size={20} />
            </button>
            <div className="login-modal-header">
                <img src="/logo.png" alt="Piklit" className="login-modal-logo" />
                <h3>피클잇 시작하기</h3>
                <p>간편 로그인으로 바로 시작하세요</p>
            </div>
            <div className="login-modal-buttons">
                <button
                    className="login-btn login-btn-naver"
                    onClick={() => onLogin('naver')}
                    disabled={loginLoading}
                >
                    {loginLoading && loginProvider === 'naver'
                        ? <Loader2 size={16} className="spin" />
                        : <NaverIcon />
                    }
                    <span>네이버로 시작하기</span>
                </button>
                <button
                    className="login-btn login-btn-kakao"
                    onClick={() => onLogin('kakao')}
                    disabled={loginLoading}
                >
                    {loginLoading && loginProvider === 'kakao'
                        ? <Loader2 size={16} className="spin" />
                        : <KakaoIcon />
                    }
                    <span>카카오로 시작하기</span>
                </button>
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
            </div>
        </div>
    </div>
);

const StickyHeader = ({ handleStart, loginLoading }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id) => {
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
        </header>
    );
};

const HeroSection = ({ handleStart, loginLoading }) => (
    <section className="landing-hero">
        <div className="landing-hero-content">
            <span className="landing-badge hero-anim" style={{ '--delay': '0s' }}>네이버 블로그 전문 AI</span>
            <h2 className="landing-hero-title">
                <span className="hero-anim" style={{ '--delay': '0.1s' }}>사진만 올리면</span><br />
                <span className="hero-anim" style={{ '--delay': '0.25s' }}>상위 노출 블로그 글이</span><br />
                <span className="highlight hero-anim-typing">5분 만에 완성됩니다</span>
            </h2>
            <p className="landing-hero-desc hero-anim" style={{ '--delay': '0.7s' }}>
                피클잇이 키워드 분석, 경쟁 조사, SEO 최적화까지 한 번에 처리합니다.<br />
                당신은 사진만 올리세요.
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
                        : '30초 만에 시작하기 — 첫 달 무료'
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

const PainFeatureSection = () => (
    <section className="landing-features reveal-on-scroll" id="features">
        <div className="landing-section-inner">
            <span className="landing-section-badge">왜 피클잇인가</span>
            <h2 className="landing-section-title">사진 한 장에서 상위 노출까지, 5분</h2>
            <p className="landing-section-desc">이렇게 고민하셨죠?</p>
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
                <div className="fm-editor-line w70" />
                <div className="fm-bubble-menu">
                    <span>다듬기</span><span>늘리기</span><span>톤 변경</span>
                </div>
            </div>
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
                <div className="fm-seo-check warn"><Target size={12} /> 이미지 ALT 추가 권장</div>
            </div>
        </div>
    );
    return null;
};

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
                            <div className="step-text">
                                <div className="step-number">{step.num}</div>
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

const ReviewsSection = () => (
    <section className="landing-reviews reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">사용자 후기</span>
            <h2 className="landing-section-title">실제 사용자들의 솔직 후기</h2>
            <div className="reviews-score">
                <span className="reviews-star">&#9733; 4.9</span>
                <span className="reviews-score-label">/ 5.0 사용자 만족도</span>
            </div>
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
                            <th>ChatGPT</th>
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
                                <td>{row.chatgpt ? <Check size={18} /> : <X size={18} />}</td>
                                <td>{row.rytn ? <Check size={18} /> : <X size={18} />}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </section>
);

const PricingSection = ({ handleStart, loginLoading }) => (
    <section className="landing-pricing reveal-on-scroll" id="pricing">
        <div className="landing-section-inner">
            <span className="landing-section-badge">요금제</span>
            <h2 className="landing-section-title">블로그 대행 비용의 1/60</h2>
            <p className="pricing-anchor">블로그 대행 월 30~50만원 vs 피클잇은 커피 한 잔 값도 안 듭니다</p>
            <div className="pricing-grid">
                {PRICING.map((plan, i) => (
                    <div className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`} key={i}>
                        {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
                        <h3>{plan.name}</h3>
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
            <h2>오늘, 첫 번째 상위 노출 글을 만들어보세요</h2>
            <p className="bottom-cta-desc">
                가입 첫 달 모든 기능 무료. 5분이면 SEO 90점 이상의 블로그 글이 완성됩니다.
            </p>
            <button
                className="landing-cta-primary landing-cta-large"
                onClick={handleStart}
                disabled={loginLoading}
            >
                {loginLoading
                    ? <><Loader2 size={20} className="spin" /> 로그인 중...</>
                    : <><Rocket size={20} /> 30초 만에 시작하기 — 첫 달 무료</>
                }
            </button>
            <span className="bottom-cta-note">카드 등록 없음 · 네이버 · 카카오 · Google 계정으로 바로 시작</span>
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
        <div className="landing">
            <StickyHeader handleStart={handleStart} loginLoading={loginLoading} />
            <HeroSection handleStart={handleStart} loginLoading={loginLoading} />
            <TrustBar />
            <SampleCarousel />
            <PainFeatureSection />
            <ReviewsSection />
            <StepsSection />
            <ComparisonTable />
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
        </div>
    );
};

export default LandingPage;
