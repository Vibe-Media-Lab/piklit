import {
    Camera, Search, Sparkles, BarChart3,
    Store, TrendingUp, Users,
    Upload, Bot, Rocket,
} from 'lucide-react';

export const FEATURES = [
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
        desc: '대행사에 월 30만원 쓰시나요? 매장 사진만 올리면 5분 만에 홍보 포스팅이 완성됩니다.',
        tag: '마케팅 비용 절감',
        scenario: '"카페 사진 3장 → 5분 만에 홍보 포스팅 완성"',
    },
    {
        icon: Users,
        title: '초보 블로거',
        desc: '처음이라도 괜찮아요. 사진만 올리면 AI가 키워드부터 SEO까지 전부 처리합니다.',
        tag: '진입 장벽 제로',
        scenario: '"첫 글인데 SEO 92점, 이웃 신청이 계속 와요"',
    },
    {
        icon: TrendingUp,
        title: '파워 블로거 / N잡러',
        desc: '하루에 글 3개 이상 쓰시나요? 경쟁 분석 + AI 편집으로 포스팅 속도를 3배 올려드립니다.',
        tag: '생산성 극대화',
        scenario: '"하루 3개 포스팅도 거뜬, 작성 시간 90% 절약"',
    },
];

export const COMPARISON = [
    { feature: '네이버 SEO 특화', piklit: true, gadget: true, wordly: true, chatgpt: false, rytn: false },
    { feature: '사진 분석 → 본문 반영', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '내장 에디터 (실시간 편집)', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '실시간 키워드 분석', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: true },
    { feature: '경쟁 블로그 분석', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '12개 SEO 항목 코칭', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
    { feature: '카테고리별 맞춤 톤', piklit: true, gadget: true, wordly: true, chatgpt: false, rytn: true },
    { feature: '최저가 BYOK', piklit: true, gadget: false, wordly: false, chatgpt: false, rytn: false },
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

export const REVIEWS = [
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

export const STEPS = [
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

export const TRUST_NUMBERS = [
    { num: 5, suffix: '분', label: '평균 작성 시간' },
    { num: 12, suffix: '개', label: 'SEO 분석 항목' },
    { num: 16, suffix: '개', label: '카테고리 지원' },
    { num: 90, suffix: '%', label: '작성 시간 절약' },
];

export const SAMPLES = [
    { cat: '☕ 카페', title: '강남역 숨은 카페 탐방기', excerpt: '오늘은 강남역 골목 안쪽에 숨겨진 분위기 좋은 카페를 발견했어요. 시그니처 라떼가...', score: 94 },
    { cat: '✈️ 여행', title: '제주도 3박 4일 가족여행 코스', excerpt: '아이들과 함께하는 제주도 여행, 어디를 가야 할지 고민이시죠? 이번에 저희 가족이...', score: 91 },
    { cat: '🍳 레시피', title: '15분 완성 원팬 파스타 레시피', excerpt: '퇴근 후 간단하게 만들 수 있는 원팬 파스타! 프라이팬 하나로 크림 파스타를 만들어...', score: 88 },
    { cat: '⭐ 솔직후기', title: '다이슨 에어랩 6개월 사용 후기', excerpt: '정가 60만원, 과연 그 값어치를 하는 걸까요? 6개월간 거의 매일 사용한 솔직한...', score: 92 },
    { cat: '💻 테크', title: '맥북 프로 M4 실사용 리뷰', excerpt: '개발자가 맥북 프로 M4를 한 달간 사용해보았습니다. 배터리부터 성능까지 솔직하게...', score: 90 },
    { cat: '🐾 반려동물', title: '골든리트리버 산책 코스 추천', excerpt: '대형견과 함께 걷기 좋은 서울 근교 산책로를 소개합니다. 반려견 동반 가능한...', score: 87 },
];
