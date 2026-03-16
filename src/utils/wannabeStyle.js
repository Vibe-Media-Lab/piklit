/**
 * 워너비 스타일 프리셋 관리 (localStorage)
 * - 무료: 1개, BYOK: 2개, Pro: 5개
 * - 타입: 'wannabe' (따라하고 싶은 스타일) / 'mystyle' (내 기존 스타일)
 */

const STORAGE_KEY = 'piklit_wannabe_presets';

const PLAN_LIMITS = { free: 1, byok: 2, pro: 5 };

export function getPresets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function savePreset(preset, userPlan = 'free') {
    const presets = getPresets();
    const limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;

    if (presets.length >= limit) {
        throw new Error(`${userPlan} 요금제는 최대 ${limit}개까지 저장할 수 있습니다. 기존 프리셋을 삭제해주세요.`);
    }

    const newPreset = {
        ...preset,
        id: preset.id || `ws_${Date.now()}`,
        type: preset.type || 'wannabe',
        createdAt: preset.createdAt || new Date().toISOString(),
    };

    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return newPreset;
}

export function updatePreset(id, updates) {
    const presets = getPresets();
    const idx = presets.findIndex(p => p.id === id);
    if (idx === -1) return null;

    presets[idx] = { ...presets[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return presets[idx];
}

export function deletePreset(id) {
    const presets = getPresets().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return presets;
}

export function getPresetLimit(userPlan = 'free') {
    return PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
}

/** 타입별 프리셋 필터 */
export function getPresetsByType(type) {
    return getPresets().filter(p => (p.type || 'wannabe') === type);
}

/** 항목별 구체적 명령 매핑 */
const RULE_COMMANDS = {
    // tone
    speech: {
        '반말': '모든 문장을 반말(~다, ~야, ~지)로 끝내라. 존댓말 금지.',
        '존댓말(~합니다)': '모든 문장을 ~합니다/~입니다 체로 끝내라. ~해요 체 금지.',
        '존댓말(~해요)': '모든 문장을 ~해요/~예요 체로 끝내라. ~합니다 체 금지.',
        '혼합': '도입부와 마무리는 존댓말, 본문 중간은 반말을 섞어라.',
    },
    energy: {
        '차분한': '감탄사·느낌표 사용을 최소화하라. 담백하고 절제된 문체로 쓸 것.',
        '보통': '자연스러운 톤을 유지하라.',
        '활기찬': '느낌표·감탄사를 적극 사용하라. 에너지 넘치는 문체로 쓸 것.',
    },
    selfReveal: {
        '관찰자 시점': '"~라고 한다", "~인 것 같다" 등 3인칭 관찰자 시점으로 서술하라.',
        '보통': '적절히 개인 경험을 섞되 객관적 정보도 포함하라.',
        '경험자 시점 (직접 체험 중심)': '"내가 직접~", "~했는데" 등 1인칭 체험 중심으로 서술하라. 모든 정보를 개인 경험에 녹여낼 것.',
    },
    humor: {
        '진지한': '비유·드립·유머 없이 정보 전달에 집중하라.',
        '보통': '가벼운 비유를 1~2회 사용하라.',
        '위트 있는 (비유/드립)': '재치 있는 비유·말장난·드립을 문단마다 1개 이상 넣어라.',
    },
    detail: {
        '핵심만': '군더더기 없이 핵심 정보만 간결하게 전달하라.',
        '보통': '적절한 묘사와 정보를 균형 있게 쓸 것.',
        '묘사 풍부 (오감 표현)': '맛·향·촉감·분위기 등 오감 묘사를 풍부하게 넣어라. 매 문단 최소 1개의 감각 표현 필수.',
    },
    readerRelation: {
        '일방 전달': '독자에게 질문하거나 공감을 유도하지 말 것. 정보 전달에 집중.',
        '보통': '자연스러운 흐름을 유지하라.',
        '대화형 (질문/공감 유도)': '"혹시 ~해보셨나요?", "~하지 않나요?" 등 독자에게 말 걸듯 질문·공감을 유도하라. 3문단마다 최소 1회.',
    },
    confidence: {
        '조심스러운': '"~인 것 같아요", "~일 수도 있어요" 등 조심스러운 표현을 사용하라.',
        '보통': '자연스러운 확신도를 유지하라.',
        '단정적 + 과장 리액션': '"무조건!", "역대급!", "미쳤다!" 등 단정적이고 과장된 리액션을 적극 사용하라.',
    },
    // structure
    introStyle: {
        '질문형': '도입부를 독자에게 던지는 질문으로 시작하라.',
        '에피소드형': '도입부를 짧은 에피소드/상황 묘사로 시작하라.',
        '정보 요약형': '도입부에 핵심 정보를 먼저 요약하라.',
        '공감 유도형': '도입부에 독자의 고민/상황에 공감하는 문장으로 시작하라.',
    },
    headingStyle: {
        '이모지+텍스트': '모든 소제목(h2)에 관련 이모지를 앞에 붙여라.',
        '번호형': '소제목을 1. 2. 3. 번호 형식으로 쓸 것.',
        '질문형': '소제목을 "~할까?", "~일까?" 등 질문 형태로 쓸 것.',
        '텍스트만': '소제목에 이모지·번호 없이 텍스트만 사용하라.',
    },
    paragraphLength: {
        '짧은 호흡 (1~2줄)': '한 문단을 1~2줄(40~80자)로 짧게 끊어라. 긴 문단 금지.',
        '보통 (3~4줄)': '한 문단을 3~4줄로 작성하라.',
        '긴 블록 (5줄+)': '한 문단을 5줄 이상으로 풍성하게 작성하라.',
    },
    imagePlace: {
        '문단 사이마다': '이미지를 매 문단 사이에 배치하라.',
        '섹션 끝에 모아서': '이미지를 각 섹션 끝에 모아서 배치하라.',
        '혼합': '이미지를 문맥에 맞게 자유롭게 배치하라.',
    },
    // vocabulary
    emojiUse: {
        '없음': '본문에 이모지를 사용하지 마라. 소제목 이모지는 headingStyle 규칙을 따를 것.',
        '적음 (섹션당 0~1개)': '본문 이모지는 섹션당 0~1개만 사용하라.',
        '보통 (문단당 1~2개)': '문단당 이모지 1~2개를 적절히 사용하라.',
        '많음 (문장마다)': '거의 모든 문장에 이모지를 1개 이상 넣어라.',
    },
    colloquial: {
        '격식체': '구어체 표현(진짜, 대박, ㅋㅋ 등)을 사용하지 마라.',
        '보통': '자연스러운 구어체를 적절히 섞어라.',
        '구어체 (진짜, 대박, ㅋㅋ 등)': '"진짜", "대박", "ㅋㅋ" 등 구어체 표현을 적극 사용하라.',
    },
    jargon: {
        '쉬운 말 위주': '전문용어를 피하고 누구나 이해할 수 있는 쉬운 말로 쓸 것.',
        '적절히 혼합': '전문용어를 사용하되 필요시 괄호로 쉬운 설명을 붙여라.',
        '전문 표현 다수': '해당 분야 전문용어를 적극적으로 사용하라.',
    },
    // seo
    keywordPlacement: {
        '자연스럽게 분산': '키워드를 글 전체에 자연스럽게 분산 배치하라.',
        '제목+도입부 집중': '키워드를 제목과 도입부에 집중 배치하라.',
        '소제목마다 반복': '매 소제목(h2)에 키워드를 포함시켜라.',
    },
    ctaStyle: {
        '없음': 'CTA(행동 유도 문구)를 넣지 마라.',
        '부드러운 권유': '마무리에 "~해보세요" 등 부드러운 권유를 1회 넣어라.',
        '직접 유도': '"꼭 ~하세요!", "지금 바로~" 등 직접적인 행동 유도를 넣어라.',
    },
};

const GROUP_LABELS = {
    tone: '톤/말투',
    structure: '글 구조',
    vocabulary: '어휘/표현',
    seo: 'SEO',
};

/** 체크된 항목만 추출하여 프롬프트용 강한 명령형 규칙 생성 */
export function buildStyleRules(preset) {
    if (!preset?.checklist) return '';

    const groups = ['tone', 'structure', 'vocabulary', 'seo'];
    const sections = [];

    for (const group of groups) {
        const items = preset.checklist[group] || [];
        const checked = items.filter(item => item.checked);
        if (checked.length === 0) continue;

        const commands = checked.map(item => {
            const cmdMap = RULE_COMMANDS[item.key];
            const cmd = cmdMap?.[item.value];
            return cmd
                ? `- [필수] ${cmd}`
                : `- [필수] ${item.label}을(를) "${item.value}" 스타일로 작성하라.`;
        });
        sections.push(`[${GROUP_LABELS[group]}]\n${commands.join('\n')}`);
    }

    if (sections.length === 0) return '';

    const isMyStyle = (preset.type || 'wannabe') === 'mystyle';
    const header = isMyStyle
        ? '=== 내 스타일 규칙 (최우선 적용) ==='
        : '=== 워너비 스타일 규칙 (최우선 적용 — 기본 톤보다 우선) ===';

    // sampleSentences가 있으면 문체 예시로 추가
    let samples = '';
    if (preset.sampleSentences?.length > 0) {
        samples = '\n[문체 예시 — 아래 문장의 말투·리듬·표현을 따라하라]\n'
            + preset.sampleSentences.map((s, i) => `${i + 1}. "${s}"`).join('\n');
    }

    return `\n${header}\n${sections.join('\n')}\n${samples}\n`;
}
