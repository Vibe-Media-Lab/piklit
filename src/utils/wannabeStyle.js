/**
 * 워너비 스타일 프리셋 관리 (localStorage)
 * - 무료: 1개, BYOK: 2개, Pro: 5개
 */

const STORAGE_KEY = 'piklit_wannabe_presets';

const PLAN_LIMITS = { free: 1, byok: 2, pro: 5 };

/** 프리셋 스키마 예시:
 * {
 *   id: 'ws_1709...',
 *   name: '감성 맛집 블로거',
 *   summary: '존댓말 + 감성적 묘사 + 짧은 호흡',
 *   sourceUrl: 'https://blog.naver.com/...',
 *   createdAt: '2026-03-06T...',
 *   checklist: {
 *     tone: [
 *       { key: 'speech', label: '말투', value: '존댓말 (~했어요)', checked: true },
 *       { key: 'energy', label: '에너지', value: '활기찬', checked: false },
 *       ...
 *     ],
 *     structure: [...],
 *     vocabulary: [...]
 *   }
 * }
 */

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

/** 체크된 항목만 추출하여 프롬프트용 규칙 문자열 생성 */
export function buildStyleRules(preset) {
    if (!preset?.checklist) return '';

    const rules = [];
    const groups = ['tone', 'structure', 'vocabulary'];

    for (const group of groups) {
        const items = preset.checklist[group] || [];
        const checked = items.filter(item => item.checked);
        if (checked.length > 0) {
            rules.push(...checked.map(item => `- ${item.label}: ${item.value}`));
        }
    }

    if (rules.length === 0) return '';

    return `\n[워너비 스타일 규칙 — 위 기본 톤보다 아래 규칙을 우선 적용하라. 충돌 시 워너비 규칙이 이긴다.]\n${rules.join('\n')}\n`;
}
