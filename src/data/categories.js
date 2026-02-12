export const CATEGORIES = [
    { id: 'cafe', label: '카페&맛집', icon: '☕', tone: '친근한 이웃형', templateId: 'A' },
    { id: 'tips', label: '생활꿀팁', icon: '💡', tone: '단계별 가이드형', templateId: 'C' },
    { id: 'comparison', label: '제품비교', icon: '🆚', tone: '내돈내산 솔직형', templateId: 'D' },
    { id: 'travel', label: '여행', icon: '✈️', tone: '친근한 이웃형', templateId: 'A' },
    { id: 'pet', label: '반려동물', icon: '🐾', tone: '친근한 이웃형', templateId: 'A' },
    { id: 'review', label: '솔직후기', icon: '⭐', tone: '내돈내산 솔직형', templateId: 'D' },
    { id: 'economy', label: '경제', icon: '💰', tone: '전문 정보형', templateId: 'B' },
    { id: 'shopping', label: '쇼핑', icon: '🛍️', tone: '친근한 이웃형', templateId: 'E' },
    { id: 'tech', label: '테크', icon: '💻', tone: '전문 정보형', templateId: 'B' },
    { id: 'medical', label: '의학', icon: '🏥', tone: '전문 정보형', templateId: 'B' },
    { id: 'parenting', label: '육아', icon: '👶', tone: '친근한 이웃형', templateId: 'D' },
    { id: 'law', label: '법률', icon: '⚖️', tone: '전문 정보형', templateId: 'B' },
    { id: 'recipe', label: '레시피', icon: '🍳', tone: '단계별 가이드형', templateId: 'C' },
    { id: 'tutorial', label: '튜토리얼', icon: '📚', tone: '단계별 가이드형', templateId: 'C' },
    { id: 'daily', label: '일상', icon: '📝', tone: '친근한 이웃형', templateId: 'A' }
];

export const getToneForCategory = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.tone : '친근한 이웃형';
};
