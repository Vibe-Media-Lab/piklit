import {
    Camera, Search, Sparkles, BarChart3,
    Store, TrendingUp, Users,
    Upload, Bot, Rocket, Palette,
} from 'lucide-react';

export const FEATURES = [
    {
        id: 'photo',
        icon: Camera,
        label: '사진 분석',
        title: '사진 한 장이 2,000자 글이 됩니다',
        desc: '장소, 메뉴, 분위기를 AI가 자동 인식하고\nSEO에 맞는 본문으로 바꿔줍니다.',
        bullets: ['장소·음식·분위기 자동 인식', '사진별 SEO 설명 자동 생성', '본문 내 자연스러운 배치'],
    },
    {
        id: 'keyword',
        icon: Search,
        label: '키워드 분석',
        title: '골든 키워드, 30초 만에 발굴합니다',
        desc: '네이버 상위 10개 블로그를 실시간 분석하여\n검색량 높고 경쟁 낮은 키워드를 자동 추천합니다.',
        bullets: ['실시간 검색 트렌드 분석', '경쟁 블로그 상위 노출 분석', '롱테일 키워드 자동 추천'],
    },
    {
        id: 'generate',
        icon: Sparkles,
        label: 'AI 글 생성',
        title: '5분이면 발행 가능한 글이 완성됩니다',
        desc: '키워드, 사진, 경쟁 분석을 반영한\nSEO 최적화 글을 자동 생성합니다.',
        bullets: ['카테고리별 맞춤 톤·구조 적용', '소제목·문단 자동 구성', 'AI 버블 메뉴로 실시간 편집'],
    },
    {
        id: 'wannabe',
        icon: Palette,
        label: '워너비 스타일',
        title: '좋아하는 글의 문체를 내 글에 입힙니다',
        desc: '인기 블로거의 말투·구조·어휘를 AI가 분석하고\n내 글에 자동 적용합니다.',
        bullets: ['블로그 URL만 입력하면 스타일 분석', '말투·구조·어휘 3가지 축 분석', '프리셋 저장 후 원클릭 적용'],
    },
    {
        id: 'seo',
        icon: BarChart3,
        label: 'SEO 코칭',
        title: '발행 전 SEO 90점 이상을 보장합니다',
        desc: '키워드 밀도, 소제목, 본문 길이 등 12개 항목을\n실시간 체크하고 개선점을 안내합니다.',
        bullets: ['12개 항목 실시간 분석', '개선 포인트 즉시 안내', '경쟁 글 대비 점수 비교'],
    },
];

export const PAIN_POINTS = [
    { before: '"상위 노출 키워드 어떻게 찾지?"', after: '30초 만에 골든 키워드 발굴' },
    { before: '글 한 편 쓰는 데 반나절', after: '5분이면 발행 가능한 글 완성' },
    { before: '"SEO? 그게 뭔가요?"', after: 'AI가 SEO 90점 이상 자동 달성' },
    { before: '맨날 같은 톤, 같은 구조', after: '카테고리별 맞춤 톤 자동 적용' },
];

export const PERSONAS = [
    {
        icon: Store,
        title: '소상공인 / 자영업자',
        desc: '대행사에 월 30만원 쓰시나요?\n매장 사진만 올리면 5분 만에 홍보 포스팅 완성.',
        tag: '마케팅 비용 절감',
        scenario: '"카페 사진 3장 → 5분 만에 홍보 포스팅 완성"',
    },
    {
        icon: Users,
        title: '초보 블로거',
        desc: '처음이라도 괜찮아요.\n사진만 올리면 키워드부터 SEO까지 전부 처리합니다.',
        tag: '진입 장벽 제로',
        scenario: '"첫 글인데 SEO 92점, 이웃 신청이 계속 와요"',
    },
    {
        icon: TrendingUp,
        title: '파워 블로거 / N잡러',
        desc: '하루에 글 3개 이상 쓰시나요?\n경쟁 분석 + AI 편집으로 속도를 3배 올려드립니다.',
        tag: '생산성 극대화',
        scenario: '"하루 3개 포스팅도 거뜬, 작성 시간 90% 절약"',
    },
];

export const COMPARISON = [
    { feature: '네이버 SEO 특화', piklit: true, gadget: true, wordly: true, rytn: false },
    { feature: '사진 분석 → 본문', piklit: true, gadget: false, wordly: false, rytn: false },
    { feature: '내장 에디터', piklit: true, gadget: false, wordly: false, rytn: false },
    { feature: '실시간 키워드 분석', piklit: true, gadget: false, wordly: false, rytn: true },
    { feature: '경쟁 블로그 분석', piklit: true, gadget: false, wordly: false, rytn: false },
    { feature: 'SEO 코칭', piklit: true, gadget: false, wordly: false, rytn: false },
    { feature: '맞춤 톤·구조', piklit: true, gadget: true, wordly: true, rytn: true },
    { feature: '최저가 BYOK', piklit: true, gadget: false, wordly: false, rytn: false },
];

export const PRICING = [
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

export const FAQS = [
    {
        q: '무료로 사용할 수 있나요?',
        a: '네, 가입 첫 달은 모든 기능을 무료로 사용할 수 있습니다. 이후에는 월 3회까지 무료 체험이 가능하며, BYOK 요금제(₩4,900/월)로 업그레이드하면 무제한으로 사용할 수 있습니다. 신용카드 등록 없이 네이버, 카카오, Google 계정으로 바로 시작하세요.',
    },
    {
        q: '네이버 외 다른 플랫폼도 지원하나요?',
        a: '현재는 네이버 블로그에 최적화되어 있습니다. 향후 티스토리, 워드프레스 등 다른 플랫폼도 지원할 예정입니다.',
    },
    {
        q: 'AI 글이 네이버 페널티를 받지 않나요?',
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
    {
        q: '다른 AI 글쓰기 도구와 뭐가 다른가요?',
        a: '피클잇은 사진 분석, 실시간 키워드 조사, 경쟁 블로그 분석, SEO 코칭, 내장 에디터까지 네이버 블로그에 특화된 올인원 도구입니다. ChatGPT나 뤼튼처럼 단순히 글만 생성하는 것이 아니라, 상위 노출을 위한 전체 파이프라인을 제공합니다.',
    },
];

export const REVIEWS = [
    {
        name: '김OO님',
        role: '맛집 블로거',
        period: '베타 테스터',
        text: '사진만 올리면 글이 완성되니까 시간이 확 줄었어요.\nSEO 점수까지 실시간으로 알려주는 게 정말 편합니다.',
        metric: '작성 시간 80% 단축',
        badge: 'BEST',
    },
    {
        name: '이OO님',
        role: '초보 블로거',
        period: '베타 테스터',
        text: '블로그가 처음인데, 키워드 분석부터 본문 구조까지\nAI가 다 잡아줘서 첫 글부터 자신감이 생겼어요.',
        metric: '첫 글 SEO 92점 달성',
        badge: '인증됨',
    },
    {
        name: '박OO님',
        role: '카페 사장님',
        period: '베타 테스터',
        text: '가게 사진 찍어서 올리기만 하면 홍보 글이 나와요.\n대행사에 맡기지 않아도 될 것 같습니다.',
        metric: '월 30만원 대행비 절약',
        badge: 'BEST',
    },
    {
        name: '정OO님',
        role: '여행 블로거',
        period: '베타 테스터',
        text: '사진 정리하고 글 쓰는 게 제일 귀찮았는데,\n사진만 올리면 여행기가 완성돼요. 퀄리티도 괜찮아요.',
        metric: '포스팅 속도 3배 향상',
        badge: '인증됨',
    },
];

export const STEPS = [
    {
        num: 1,
        title: '사진을 올리세요.\n나머지는 피클잇이 합니다',
        desc: '사진만 올리면 AI가 장소·메뉴·분위기를 자동 파악합니다.',
        icon: Upload,
        substeps: ['사진 최대 10장 드래그 & 드롭', '16개 카테고리 중 선택', 'AI가 사진 속 정보 자동 인식'],
    },
    {
        num: 2,
        title: '키워드 분석부터 본문 완성까지\n자동으로 피클잇이 합니다',
        desc: '키워드·경쟁조사·SEO 본문을 한 번에 완성.',
        icon: Bot,
        substeps: ['실시간 키워드 트렌드 분석', '경쟁 블로그 상위 10개 조사', 'SEO 최적화 본문 자동 생성'],
    },
    {
        num: 3,
        title: '복사 → 붙여넣기, 바로 네이버에 발행',
        desc: 'SEO 점수 확인 후 복사 한 번으로 바로 발행.',
        icon: Rocket,
        substeps: ['12개 SEO 항목 실시간 체크', 'AI 편집 도구로 문장 다듬기', '클립보드 복사 → 네이버 발행'],
    },
];

export const TRUST_NUMBERS = [
    { num: 90, suffix: '%', label: '작성 시간 절약' },
    { num: 92, suffix: '점', label: '평균 SEO 점수' },
    { num: 16, suffix: '개', label: '카테고리 지원' },
    { num: 5, suffix: '분', label: '글 완성 시간' },
];

export const SAMPLES = [
    { cat: '☕ 카페', title: '강남역 숨은 카페 탐방기', excerpt: '오늘은 강남역 골목 안쪽에 숨겨진 분위기 좋은 카페를 발견했어요. 시그니처 라떼가...', score: 94 },
    { cat: '✈️ 여행', title: '제주도 3박 4일 가족여행 코스', excerpt: '아이들과 함께하는 제주도 여행, 어디를 가야 할지 고민이시죠? 이번에 저희 가족이...', score: 91 },
    { cat: '🍳 레시피', title: '15분 완성 원팬 파스타 레시피', excerpt: '퇴근 후 간단하게 만들 수 있는 원팬 파스타! 프라이팬 하나로 크림 파스타를 만들어...', score: 88 },
    { cat: '⭐ 솔직후기', title: '다이슨 에어랩 6개월 사용 후기', excerpt: '정가 60만원, 과연 그 값어치를 하는 걸까요? 6개월간 거의 매일 사용한 솔직한...', score: 92 },
    { cat: '💻 테크', title: '맥북 프로 M4 실사용 리뷰', excerpt: '개발자가 맥북 프로 M4를 한 달간 사용해보았습니다. 배터리부터 성능까지 솔직하게...', score: 90 },
    { cat: '🐾 반려동물', title: '골든리트리버 산책 코스 추천', excerpt: '대형견과 함께 걷기 좋은 서울 근교 산책로를 소개합니다. 반려견 동반 가능한...', score: 87 },
];
