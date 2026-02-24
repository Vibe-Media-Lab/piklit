/**
 * AI 감지 분석 (Humanness Detection) — 클라이언트 사이드, 실시간
 * 6개 지표 + 톤별 가중치로 "사람이 쓴 것처럼 보이는지" 0~100점 분석
 */

// 톤별 가중치 프리셋 (총 100점)
const TONE_WEIGHTS = {
    friendly: { sentenceVariety: 15, personalExpr: 20, aiPattern: 20, paraVariety: 10, colloquial: 20, informal: 15 },
    professional: { sentenceVariety: 20, personalExpr: 15, aiPattern: 25, paraVariety: 15, colloquial: 15, informal: 10 },
    honest: { sentenceVariety: 15, personalExpr: 25, aiPattern: 20, paraVariety: 10, colloquial: 20, informal: 10 },
    emotional: { sentenceVariety: 20, personalExpr: 20, aiPattern: 25, paraVariety: 15, colloquial: 10, informal: 10 },
    guide: { sentenceVariety: 15, personalExpr: 10, aiPattern: 25, paraVariety: 10, colloquial: 20, informal: 20 },
};

// AI 단골 표현 패턴
const AI_PATTERNS = [
    '다양한', '효과적인', '효과적으로', '중요한', '핵심적인',
    '필수적인', '최적의', '극대화', '활용하여', '활용할 수',
    '살펴보겠습니다', '알아보겠습니다', '소개해 드리겠습니다',
    '마무리하겠습니다', '정리해 보겠습니다',
    '도움이 되셨으면', '도움이 되었으면',
    '그렇다면', '따라서', '이를 통해', '이러한',
    '주목할 만한', '놓치지 마세요', '꼭 확인해 보세요',
    '추천드립니다', '추천해 드립니다',
    '~에 대해 알아보', '장점과 단점',
    '결론적으로', '종합적으로', '궁극적으로',
];

// 구어체 마커
const COLLOQUIAL_MARKERS = [
    '진짜', '대박', '완전', '너무', '엄청',
    '솔직히', '사실', '근데', '그래서', '아무튼',
    '좀', '딱', '왜냐면', '거든요', '잖아요',
    '했는데요', '인데요', '더라고요', '같아요',
];

// 1인칭·경험체 패턴
const PERSONAL_PATTERNS = [
    /나는|내가|제가|저는|저도/,
    /했어요|했는데|해봤|먹어봤|가봤|써봤|입어봤/,
    /더라고요|더라구요|하더라고|하더라구/,
    /같아요|같더라고|같았어요/,
    /했거든요|인데요|거든요/,
    /추천해요|좋았어요|맛있었어요|괜찮았어요/,
    /개인적으로|솔직히 말하면/,
];

/**
 * HTML 콘텐츠의 AI 감지 위험도 분석
 * @param {string} htmlContent - 에디터 HTML 콘텐츠
 * @param {string} tone - 톤앤무드 (friendly|professional|honest|emotional|guide)
 * @returns {{ score: number, grade: string, metrics: Object, suggestions: Array, isEmpty: boolean }}
 */
export const analyzeHumanness = (htmlContent, tone = 'friendly') => {
    if (!htmlContent || htmlContent === '<p></p>') {
        return { score: 0, grade: '-', metrics: {}, suggestions: [], isEmpty: true };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const fullText = doc.body.textContent || '';
    const totalChars = fullText.replace(/\s/g, '').length;

    if (totalChars < 100) {
        return {
            score: 0, grade: '-', metrics: {},
            suggestions: [{ type: 'info', text: '100자 이상 작성 시 AI 감지 분석이 시작됩니다.', priority: 0 }],
            isEmpty: true,
        };
    }

    const weights = TONE_WEIGHTS[tone] || TONE_WEIGHTS.friendly;

    const sentenceMetric = measureSentenceVariety(doc, weights.sentenceVariety);
    const personalMetric = measurePersonalExpression(fullText, weights.personalExpr);
    const aiPatternMetric = measureAiPatterns(fullText, weights.aiPattern);
    const paraMetric = measureParagraphVariety(doc, weights.paraVariety);
    const colloquialMetric = measureColloquialMarkers(fullText, weights.colloquial);
    const informalMetric = measureInformalElements(fullText, weights.informal);

    const metrics = {
        sentenceVariety: sentenceMetric,
        personalExpr: personalMetric,
        aiPattern: aiPatternMetric,
        paraVariety: paraMetric,
        colloquial: colloquialMetric,
        informal: informalMetric,
    };

    const totalScore = Math.round(
        sentenceMetric.score + personalMetric.score + aiPatternMetric.score +
        paraMetric.score + colloquialMetric.score + informalMetric.score
    );
    const score = Math.min(100, Math.max(0, totalScore));
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : 'D';

    const suggestions = [];
    Object.values(metrics).forEach(m => {
        if (m.suggestions) suggestions.push(...m.suggestions);
    });
    suggestions.sort((a, b) => b.priority - a.priority);

    return { score, grade, metrics, suggestions, isEmpty: false };
};

// ──────────────────────────────────────────────
// 1. 문장 길이 다양성
// ──────────────────────────────────────────────
function measureSentenceVariety(doc, maxScore) {
    const paragraphs = doc.querySelectorAll('p');
    const sentences = [];
    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (!text) return;
        const splits = text.match(/[^.!?…]+[.!?…]+/g) || [text];
        splits.forEach(s => { if (s.trim().length > 5) sentences.push(s.trim()); });
    });

    if (sentences.length < 3) {
        return { score: 0, label: '문장 길이 다양성', maxScore, suggestions: [] };
    }

    const lengths = sentences.map(s => s.length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length);
    const cv = mean > 0 ? stdDev / mean : 0;

    // cv(변동계수) 0.3~0.6 정도가 자연스러운 문장 길이 변화
    let ratio;
    if (cv >= 0.35 && cv <= 0.7) ratio = 1.0;
    else if (cv >= 0.2 && cv < 0.35) ratio = 0.7;
    else if (cv > 0.7) ratio = 0.85;
    else ratio = 0.4; // cv < 0.2: 매우 균일 → AI 느낌

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (cv < 0.2) {
        suggestions.push({ type: 'warning', text: '문장 길이가 너무 균일합니다. 짧은 문장과 긴 문장을 섞어주세요.', priority: 8 });
    } else if (cv < 0.3) {
        suggestions.push({ type: 'info', text: '문장 길이에 좀 더 변화를 주면 자연스러워집니다.', priority: 4 });
    }

    return { score, label: '문장 길이 다양성', maxScore, cv: Math.round(cv * 100) / 100, suggestions };
}

// ──────────────────────────────────────────────
// 2. 개인 표현 (1인칭, 경험체)
// ──────────────────────────────────────────────
function measurePersonalExpression(text, maxScore) {
    const sentenceCount = (text.match(/[.!?…]+/g) || []).length || 1;
    let matchCount = 0;
    PERSONAL_PATTERNS.forEach(pat => {
        const matches = text.match(new RegExp(pat.source, 'g'));
        if (matches) matchCount += matches.length;
    });

    const density = matchCount / sentenceCount;
    let ratio;
    if (density >= 0.3) ratio = 1.0;
    else if (density >= 0.15) ratio = 0.75;
    else if (density >= 0.05) ratio = 0.45;
    else ratio = 0.2;

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (density < 0.05) {
        suggestions.push({ type: 'warning', text: '개인적인 표현이 거의 없습니다. "제가 직접 해봤는데", "솔직히" 같은 경험체를 추가해보세요.', priority: 9 });
    } else if (density < 0.15) {
        suggestions.push({ type: 'info', text: '개인 경험 표현을 조금 더 넣으면 사람이 쓴 느낌이 강해집니다.', priority: 5 });
    }

    return { score, label: '개인 표현', maxScore, matchCount, suggestions };
}

// ──────────────────────────────────────────────
// 3. AI 패턴 감지 (역점수 — 많을수록 감점)
// ──────────────────────────────────────────────
function measureAiPatterns(text, maxScore) {
    let totalFound = 0;
    const foundPatterns = [];
    AI_PATTERNS.forEach(pat => {
        const regex = new RegExp(pat, 'g');
        const matches = text.match(regex);
        if (matches) {
            totalFound += matches.length;
            foundPatterns.push(pat);
        }
    });

    const charPer1000 = totalFound / (text.replace(/\s/g, '').length / 1000 || 1);
    let ratio;
    if (charPer1000 <= 1) ratio = 1.0;
    else if (charPer1000 <= 3) ratio = 0.75;
    else if (charPer1000 <= 6) ratio = 0.45;
    else ratio = 0.2;

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (charPer1000 > 6) {
        suggestions.push({ type: 'warning', text: `AI 단골 표현이 많습니다 (${totalFound}개): "${foundPatterns.slice(0, 3).join('", "')}". 자연스러운 표현으로 바꿔보세요.`, priority: 10 });
    } else if (charPer1000 > 3) {
        suggestions.push({ type: 'info', text: `"${foundPatterns.slice(0, 2).join('", "')}" 같은 AI 패턴 표현을 줄여보세요.`, priority: 6 });
    }

    return { score, label: 'AI 패턴 감지', maxScore, totalFound, suggestions };
}

// ──────────────────────────────────────────────
// 4. 문단 길이 다양성
// ──────────────────────────────────────────────
function measureParagraphVariety(doc, maxScore) {
    const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => {
        const text = p.textContent.trim();
        return text.length > 10 && !p.querySelector('img');
    });

    if (paragraphs.length < 3) {
        return { score: 0, label: '문단 길이 다양성', maxScore, suggestions: [] };
    }

    const lengths = paragraphs.map(p => p.textContent.trim().length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length);
    const cv = mean > 0 ? stdDev / mean : 0;

    let ratio;
    if (cv >= 0.4) ratio = 1.0;
    else if (cv >= 0.25) ratio = 0.7;
    else if (cv >= 0.15) ratio = 0.45;
    else ratio = 0.2;

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (cv < 0.15) {
        suggestions.push({ type: 'info', text: '문단 길이가 비슷합니다. 짧은 강조 문단과 긴 설명 문단을 섞어보세요.', priority: 3 });
    }

    return { score, label: '문단 길이 다양성', maxScore, cv: Math.round(cv * 100) / 100, suggestions };
}

// ──────────────────────────────────────────────
// 5. 구어체 마커
// ──────────────────────────────────────────────
function measureColloquialMarkers(text, maxScore) {
    const sentenceCount = (text.match(/[.!?…]+/g) || []).length || 1;
    let matchCount = 0;
    COLLOQUIAL_MARKERS.forEach(marker => {
        const regex = new RegExp(marker, 'g');
        const matches = text.match(regex);
        if (matches) matchCount += matches.length;
    });

    // 질문문("~까요?", "~나요?", "~죠?") 카운트
    const questionCount = (text.match(/[가-힣]+\?/g) || []).length;
    matchCount += questionCount;

    // 감탄("~!", "~!!")
    const exclamCount = (text.match(/[가-힣]+!+/g) || []).length;
    matchCount += exclamCount;

    const density = matchCount / sentenceCount;
    let ratio;
    if (density >= 0.4) ratio = 1.0;
    else if (density >= 0.2) ratio = 0.7;
    else if (density >= 0.1) ratio = 0.4;
    else ratio = 0.15;

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (density < 0.1) {
        suggestions.push({ type: 'warning', text: '구어체 표현이 부족합니다. 질문이나 감탄, "진짜", "솔직히" 같은 표현을 추가해보세요.', priority: 7 });
    } else if (density < 0.2) {
        suggestions.push({ type: 'info', text: '구어체를 조금 더 섞으면 친근한 느낌이 납니다.', priority: 4 });
    }

    return { score, label: '구어체 마커', maxScore, matchCount, suggestions };
}

// ──────────────────────────────────────────────
// 6. 이모지/비격식 요소
// ──────────────────────────────────────────────
function measureInformalElements(text, maxScore) {
    // 이모지 카운트
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiCount = (text.match(emojiRegex) || []).length;

    // ㅋㅋ, ㅎㅎ, ㅠㅠ 등
    const kSlangCount = (text.match(/[ㅋㅎㅠㅜ]{2,}/g) || []).length;

    // !! 또는 ~ 이모티콘
    const tildeCount = (text.match(/~+/g) || []).length;
    const doubleExclaim = (text.match(/!{2,}/g) || []).length;

    // (...) 말줄임
    const ellipsisCount = (text.match(/\.{3,}|…/g) || []).length;

    const totalInformal = emojiCount + kSlangCount + tildeCount + doubleExclaim + ellipsisCount;
    const per1000 = totalInformal / (text.replace(/\s/g, '').length / 1000 || 1);

    let ratio;
    if (per1000 >= 3) ratio = 1.0;
    else if (per1000 >= 1.5) ratio = 0.7;
    else if (per1000 >= 0.5) ratio = 0.45;
    else ratio = 0.15;

    const score = Math.round(maxScore * ratio);
    const suggestions = [];
    if (per1000 < 0.5) {
        suggestions.push({ type: 'info', text: '이모지, ~, !! 같은 비격식 요소를 추가하면 사람다운 느낌이 납니다.', priority: 2 });
    }

    return { score, label: '이모지/비격식', maxScore, totalInformal, suggestions };
}
