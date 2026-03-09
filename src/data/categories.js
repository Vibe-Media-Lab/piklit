export const CATEGORIES = [
    // 상위 9개 (인기순)
    { id: 'cafe', label: '카페&맛집', icon: '☕', tone: '친근한 이웃형', templateId: 'A', recommendedImages: 10 },
    { id: 'travel', label: '여행', icon: '✈️', tone: '친근한 이웃형', templateId: 'A', recommendedImages: 15 },
    { id: 'review', label: '솔직후기', icon: '⭐', tone: '내돈내산 솔직형', templateId: 'D', recommendedImages: 12 },
    { id: 'recipe', label: '레시피', icon: '🍳', tone: '단계별 가이드형', templateId: 'C', recommendedImages: 10 },
    { id: 'parenting', label: '육아', icon: '👶', tone: '친근한 이웃형', templateId: 'D', recommendedImages: 10 },
    { id: 'shopping', label: '쇼핑', icon: '🛍️', tone: '친근한 이웃형', templateId: 'E', recommendedImages: 12 },
    { id: 'pet', label: '반려동물', icon: '🐾', tone: '친근한 이웃형', templateId: 'A', recommendedImages: 10 },
    { id: 'tips', label: '생활꿀팁', icon: '💡', tone: '단계별 가이드형', templateId: 'C', recommendedImages: 8 },
    { id: 'tech', label: '테크', icon: '💻', tone: '전문 정보형', templateId: 'B', recommendedImages: 12 },
    // 더보기 (6개)
    { id: 'comparison', label: '제품비교', icon: '🆚', tone: '내돈내산 솔직형', templateId: 'D', recommendedImages: 12 },
    { id: 'economy', label: '경제', icon: '💰', tone: '전문 정보형', templateId: 'B', recommendedImages: 6 },
    { id: 'medical', label: '의학', icon: '🏥', tone: '전문 정보형', templateId: 'B', recommendedImages: 6 },
    { id: 'law', label: '법률', icon: '⚖️', tone: '전문 정보형', templateId: 'B', recommendedImages: 5 },
    { id: 'tutorial', label: '튜토리얼', icon: '📚', tone: '단계별 가이드형', templateId: 'C', recommendedImages: 8 },
    { id: 'daily', label: '일상', icon: '📝', tone: '친근한 이웃형', templateId: 'A', recommendedImages: 10 },
];

export const PRIMARY_CATEGORY_COUNT = 9;

// 한국어 톤 라벨 → 영문 톤 id 매핑
const TONE_LABEL_TO_ID = {
    '친근한 이웃형': 'friendly',
    '전문 정보형': 'professional',
    '내돈내산 솔직형': 'honest',
    '감성 에세이형': 'emotional',
    '단계별 가이드형': 'guide',
};

export const getToneForCategory = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    const label = category ? category.tone : '친근한 이웃형';
    return TONE_LABEL_TO_ID[label] || 'friendly';
};

export const getRecommendedImages = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.recommendedImages : 10;
};
