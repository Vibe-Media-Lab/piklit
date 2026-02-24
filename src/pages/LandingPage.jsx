import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, Camera, Search, Sparkles, BarChart3, Edit3, Clock,
    ChevronDown, Zap, Grid3x3, Check, X, Store, TrendingUp, Users,
    Upload, Copy, Rocket, Image, Bot, FileText
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import '../styles/landing.css';

/* ─── 콘텐츠 데이터 ──────────────────────────────────── */

const FEATURES = [
    {
        id: 'photo',
        icon: Camera,
        label: '사진 AI 분석',
        title: '사진만 올리면 AI가 분석합니다',
        desc: '업로드한 사진의 장소, 음식, 분위기를 AI가 자동 인식하여 블로그 본문에 자연스럽게 녹여냅니다. 최대 10장까지 한 번에 분석 가능합니다.',
        bullets: ['장소·음식·분위기 자동 인식', '사진별 설명 자동 생성', '본문 내 자연스러운 사진 배치'],
    },
    {
        id: 'keyword',
        icon: Search,
        label: '키워드·경쟁 분석',
        title: '실시간 검색 데이터로 키워드를 찾습니다',
        desc: '네이버 실시간 검색 트렌드 기반으로 상위 노출 키워드를 추천합니다. 경쟁 블로그 분석으로 차별화 전략까지 제안합니다.',
        bullets: ['실시간 검색 트렌드 분석', '경쟁 블로그 상위 10개 분석', '롱테일 키워드 자동 추천'],
    },
    {
        id: 'generate',
        icon: Sparkles,
        label: 'AI 본문 생성',
        title: 'SEO 최적화된 본문을 자동 생성합니다',
        desc: '키워드 분석 결과를 바탕으로 네이버 SEO에 최적화된 블로그 본문을 생성합니다. 카테고리별 맞춤 톤과 구조를 적용합니다.',
        bullets: ['카테고리별 맞춤 톤 적용', '소제목·문단 자동 구성', '키워드 밀도 자동 최적화'],
    },
    {
        id: 'seo',
        icon: BarChart3,
        label: 'SEO 코칭',
        title: '실시간으로 SEO 점수를 알려줍니다',
        desc: '12개 SEO 항목을 실시간으로 분석하여 점수와 개선 포인트를 안내합니다. 글을 수정할 때마다 점수가 업데이트됩니다.',
        bullets: ['12개 항목 실시간 분석', '개선 포인트 즉시 안내', '경쟁 글 대비 점수 비교'],
    },
    {
        id: 'edit',
        icon: Edit3,
        label: 'AI 편집 도구',
        title: '문장 단위로 AI가 편집을 도와줍니다',
        desc: '텍스트를 선택하면 AI 버블 메뉴가 나타납니다. 문장 다듬기, 늘리기, 줄이기, 톤 변경 등 다양한 편집 기능을 제공합니다.',
        bullets: ['버블 메뉴 AI 편집', '문장 다듬기·늘리기·줄이기', '도입부 자동 최적화'],
    },
    {
        id: 'history',
        icon: Clock,
        label: '히스토리 관리',
        title: '작성 이력을 한눈에 관리합니다',
        desc: '작성한 모든 글의 키워드, SEO 점수, AI 사용량을 대시보드에서 확인할 수 있습니다. 과거 글을 불러와 수정할 수도 있습니다.',
        bullets: ['작성 이력 대시보드', 'SEO 점수 추이 확인', '과거 글 불러오기·수정'],
    },
];

const PAIN_POINTS = [
    { before: '키워드 조사에 1시간 이상', after: 'AI가 30초 만에 분석 완료' },
    { before: '블로그 글 쓰는 데 반나절', after: '10분이면 SEO 최적화 글 완성' },
    { before: '상위 노출 방법을 모르겠다', after: '12개 항목 실시간 SEO 코칭' },
    { before: '매번 비슷한 글만 반복', after: '카테고리별 맞춤 톤·구조 적용' },
];

const PERSONAS = [
    {
        icon: Store,
        title: '소상공인 / 자영업자',
        desc: '매장 사진만 올리면 블로그 홍보 글이 완성됩니다. 대행사 비용 없이 직접 블로그 마케팅을 시작하세요.',
        tag: '마케팅 비용 절감',
        scenario: '"카페 사진 3장 → 10분 만에 홍보 포스팅 완성"',
    },
    {
        icon: Users,
        title: '초보 블로거',
        desc: '키워드 조사, 글 구조, SEO 최적화를 AI가 모두 처리합니다. 사진만 있으면 첫 글부터 상위 노출을 노릴 수 있습니다.',
        tag: '진입 장벽 제로',
        scenario: '"첫 글인데 SEO 92점, 이웃 신청이 계속 와요"',
    },
    {
        icon: TrendingUp,
        title: '파워 블로거 / N잡러',
        desc: '경쟁 분석과 실시간 SEO 코칭으로 상위 노출 확률을 높이고, AI 편집 도구로 포스팅 속도를 2배 이상 올릴 수 있습니다.',
        tag: '생산성 극대화',
        scenario: '"하루 3개 포스팅도 거뜬, 작성 시간 90% 절약"',
    },
];

const COMPARISON = [
    { feature: '네이버 SEO 특화', piklit: true, chatgpt: false, rytn: false },
    { feature: '사진 분석 → 본문 반영', piklit: true, chatgpt: false, rytn: false },
    { feature: '실시간 키워드 분석', piklit: true, chatgpt: false, rytn: true },
    { feature: '경쟁 블로그 분석', piklit: true, chatgpt: false, rytn: false },
    { feature: '12개 SEO 항목 코칭', piklit: true, chatgpt: false, rytn: false },
    { feature: 'AI 버블 메뉴 편집', piklit: true, chatgpt: false, rytn: false },
    { feature: '카테고리별 맞춤 톤', piklit: true, chatgpt: false, rytn: true },
    { feature: '무료 사용 가능', piklit: true, chatgpt: false, rytn: true },
];

const PRICING = [
    {
        name: '무료',
        price: '₩0',
        period: '월',
        desc: '피클릿을 체험해보세요',
        features: ['월 10회 글 생성', 'SEO 분석 리포트', 'AI 편집 도구', '15개 카테고리 템플릿'],
        cta: '무료로 시작하기',
        highlighted: false,
    },
    {
        name: '무제한 (내 키 연결)',
        price: '₩0',
        period: '월',
        desc: '내 AI 키를 연결하면 무제한 무료',
        features: ['무제한 글 생성', 'Google AI 키 무료 발급 → 연결', '모든 무료 기능 포함', '우선 고객 지원'],
        cta: '추천 — 무료로 무제한 시작',
        highlighted: true,
        badge: '추천',
    },
    {
        name: 'Pro',
        price: '₩9,900',
        period: '월',
        desc: 'API 키 없이 무제한 사용',
        features: ['무제한 글 생성', 'API 키 불필요', '모든 기능 포함', '우선 고객 지원'],
        cta: '준비 중',
        highlighted: false,
        disabled: true,
        badge: '준비 중',
    },
];

const FAQS = [
    {
        q: '무료로 사용할 수 있나요?',
        a: '네, 회원가입 후 월 10회까지 무료로 글을 생성할 수 있습니다. 신용카드 등록 없이 Google 계정으로 바로 시작하세요.',
    },
    {
        q: '네이버 블로그 외에 다른 플랫폼도 지원하나요?',
        a: '현재는 네이버 블로그에 최적화되어 있습니다. 향후 티스토리, 워드프레스 등 다른 플랫폼도 지원할 예정입니다.',
    },
    {
        q: 'AI로 쓴 글이 네이버에서 페널티를 받지 않나요?',
        a: '피클릿은 AI가 초안을 작성하고 사용자가 직접 수정·보완하는 방식입니다. 실시간 SEO 코칭으로 자연스러운 글을 완성할 수 있습니다.',
    },
    {
        q: 'AI가 쓴 글의 품질이 괜찮은가요?',
        a: '피클릿은 실제 네이버 상위 노출 글의 구조와 패턴을 분석하여 본문을 생성합니다. 카테고리별 맞춤 톤, 소제목 구성, 키워드 밀도까지 자동 최적화되며, 내장 에디터에서 원하는 대로 수정할 수 있습니다.',
    },
    {
        q: '"내 키 연결"은 어떻게 하나요?',
        a: 'Google AI Studio에서 무료로 AI 키를 발급받아 설정에 붙여넣기 하면 끝입니다. 1분이면 완료되고, 서비스 내 가이드에서 단계별로 안내합니다.',
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
        text: '여행 다녀와서 사진 정리하고 글 쓰는 게 제일 귀찮았는데, 피클릿 덕에 사진만 올리면 여행기가 완성돼요. 퀄리티도 만족합니다.',
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
        title: '사진 올리기',
        desc: '블로그에 사용할 사진을 업로드하세요. AI가 사진 속 장소, 음식, 분위기를 자동으로 분석합니다.',
        icon: Upload,
    },
    {
        num: 2,
        title: 'AI가 글을 작성합니다',
        desc: '키워드 분석, 경쟁 블로그 조사, SEO 최적화까지 AI가 한 번에 처리합니다. 카테고리별 맞춤 톤이 적용됩니다.',
        icon: Bot,
    },
    {
        num: 3,
        title: '복사해서 발행하기',
        desc: '완성된 글을 클립보드에 복사하여 네이버 블로그에 바로 붙여넣기 하세요. HTML 서식이 그대로 유지됩니다.',
        icon: Copy,
    },
];

const TRUST_NUMBERS = [
    { num: 90, suffix: '%', label: '작성 시간 절약' },
    { num: 12, suffix: '개', label: 'SEO 분석 항목' },
    { num: 16, suffix: '개', label: '카테고리 지원' },
    { num: 0, prefix: '₩', suffix: '', label: '시작 비용' },
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
                        : <><GoogleIcon /> Google로 시작하기</>
                    }
                </button>
            </div>
        </header>
    );
};

const HeroSection = ({ handleStart, loginLoading }) => (
    <section className="landing-hero">
        <div className="landing-hero-content">
            <span className="landing-badge hero-anim" style={{ '--delay': '0s' }}>AI 블로그 작성기</span>
            <h2 className="landing-hero-title">
                <span className="hero-anim" style={{ '--delay': '0.1s' }}>사진만 올리면</span><br />
                <span className="hero-anim" style={{ '--delay': '0.25s' }}>네이버 상위 노출 글이</span><br />
                <span className="highlight hero-anim-typing">완성됩니다</span>
            </h2>
            <p className="landing-hero-desc hero-anim" style={{ '--delay': '0.7s' }}>
                키워드 분석부터 SEO 최적화 본문 작성까지.<br />
                AI가 10분 만에 블로그 포스팅을 완성합니다.
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
                        : '무료로 시작하기'
                    }
                </button>
                <span className="landing-cta-hint">
                    ← Google 계정으로 바로 시작 · 회원가입 불필요
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
            <h2 className="landing-section-title">이런 글이 자동으로 만들어집니다</h2>
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
            <h2 className="landing-section-title">이런 고민, 피클릿이 해결합니다</h2>
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

const FeatureShowcase = () => {
    const [activeTab, setActiveTab] = useState(0);
    const feat = FEATURES[activeTab];

    return (
        <section className="landing-features reveal-on-scroll" id="features">
            <div className="landing-section-inner">
                <span className="landing-section-badge">핵심 기능</span>
                <h2 className="landing-section-title">블로그 작성에 필요한 모든 것</h2>
                <div className="features-tabs">
                    {FEATURES.map((f, i) => (
                        <button
                            key={f.id}
                            className={`feature-tab ${i === activeTab ? 'active' : ''}`}
                            onClick={() => setActiveTab(i)}
                        >
                            <f.icon size={18} />
                            <span>{f.label}</span>
                        </button>
                    ))}
                </div>
                <div className="feature-detail">
                    <div className="feature-detail-text">
                        <h3>{feat.title}</h3>
                        <p>{feat.desc}</p>
                        <ul>
                            {feat.bullets.map((b, i) => (
                                <li key={i}><Check size={16} /> {b}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="feature-detail-visual">
                        <div className="feature-visual-card">
                            <feat.icon size={48} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const StepsSection = () => (
    <section className="landing-steps reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">사용 방법</span>
            <h2 className="landing-section-title">3단계로 블로그 글 완성</h2>
            <p className="landing-section-desc">
                복잡한 과정 없이, 사진만 올리면 AI가 나머지를 처리합니다.
            </p>
            <div className="steps-list">
                {STEPS.map((step, i) => (
                    <div className={`step-row ${i % 2 === 1 ? 'reverse' : ''}`} key={i}>
                        <div className="step-text">
                            <div className="step-number">{step.num}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                        </div>
                        <div className="step-visual">
                            <div className="step-icon-circle">
                                <step.icon size={32} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const CategoryGrid = () => (
    <section className="landing-categories reveal-on-scroll">
        <div className="landing-section-inner">
            <span className="landing-section-badge">카테고리</span>
            <h2 className="landing-section-title">어떤 주제든 맞춤 글을 생성합니다</h2>
            <p className="landing-section-desc">
                16개 카테고리별 톤·구조·키워드 전략이 자동 적용됩니다.
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
            <h2 className="landing-section-title">이런 분들에게 추천합니다</h2>
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
            <span className="landing-section-badge">사용자 후기</span>
            <h2 className="landing-section-title">피클릿 사용자들의 이야기</h2>
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
            <h2 className="landing-section-title">왜 피클릿인가요?</h2>
            <div className="comparison-table-wrap">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th>기능</th>
                            <th className="comp-highlight">피클릿</th>
                            <th>ChatGPT</th>
                            <th>뤼튼</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARISON.map((row, i) => (
                            <tr key={i}>
                                <td>{row.feature}</td>
                                <td className="comp-highlight">{row.piklit ? <Check size={18} /> : <X size={18} />}</td>
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
            <h2 className="landing-section-title">심플한 요금, 숨겨진 비용 없음</h2>
            <p className="pricing-anchor">블로그 대행 월 30~50만원 vs 피클릿은 커피 한 잔 값도 안 듭니다</p>
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
            <h2>지금 바로 시작하세요</h2>
            <p className="bottom-cta-desc">
                사진만 올리면, AI가 네이버 상위 노출 글을 완성합니다.
            </p>
            <button
                className="landing-cta-primary landing-cta-large"
                onClick={handleStart}
                disabled={loginLoading}
            >
                {loginLoading
                    ? <><Loader2 size={20} className="spin" /> 로그인 중...</>
                    : <><Rocket size={20} /> 무료로 시작하기</>
                }
            </button>
            <span className="bottom-cta-note">회원가입 없이 Google 계정으로 바로 시작</span>
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
            <p className="landing-footer-copy">&copy; 2025 Piklit. All rights reserved.</p>
        </div>
    </footer>
);

/* ─── 메인 컴포넌트 ──────────────────────────────────── */

const LandingPage = () => {
    const navigate = useNavigate();
    const { isLoggedIn, loginWithGoogle } = useAuth();
    const [loginLoading, setLoginLoading] = useState(false);

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
            <StickyHeader handleStart={handleStart} loginLoading={loginLoading} />
            <HeroSection handleStart={handleStart} loginLoading={loginLoading} />
            <TrustBar />
            <SampleCarousel />
            <PainSection />
            <FeatureShowcase />
            <StepsSection />
            <CategoryGrid />
            <PersonaCards />
            <ReviewsSection />
            <ComparisonTable />
            <PricingSection handleStart={handleStart} loginLoading={loginLoading} />
            <FAQSection />
            <BottomCTA handleStart={handleStart} loginLoading={loginLoading} />
            <Footer />
        </div>
    );
};

export default LandingPage;
