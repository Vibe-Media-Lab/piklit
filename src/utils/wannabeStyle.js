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

/** 체크된 항목만 추출하여 프롬프트용 규칙 문자열 생성 */
export function buildStyleRules(preset) {
    if (!preset?.checklist) return '';

    const rules = [];
    const groups = ['tone', 'structure', 'vocabulary', 'seo'];

    for (const group of groups) {
        const items = preset.checklist[group] || [];
        const checked = items.filter(item => item.checked);
        if (checked.length > 0) {
            rules.push(...checked.map(item => `- ${item.label}: ${item.value}`));
        }
    }

    if (rules.length === 0) return '';

    const isMyStyle = (preset.type || 'wannabe') === 'mystyle';
    const header = isMyStyle
        ? '\n[내 스타일 규칙 — 내가 평소 쓰는 말투와 습관을 유지하라.]\n'
        : '\n[워너비 스타일 규칙 — 위 기본 톤보다 아래 규칙을 우선 적용하라. 충돌 시 워너비 규칙이 이긴다.]\n';

    return `${header}${rules.join('\n')}\n`;
}
