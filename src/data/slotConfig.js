// 카테고리별 이미지 슬롯 설정 (이름 매핑, 순서, 라벨)
export const SLOT_CONFIG = {
    food: {
        order: ['entrance', 'menu', 'food', 'interior', 'parking', 'extra'],
        aliases: { entrance: 'entrance', 외관: 'entrance', 간판: 'entrance', 첫인상: 'entrance', menu: 'menu', 메뉴: 'menu', 메뉴판: 'menu', food: 'food', 음식: 'food', 요리: 'food', interior: 'interior', 인테리어: 'interior', 내부: 'interior', parking: 'parking', 주차: 'parking', extra: 'extra', 기타: 'extra' },
        labels: { entrance: '외관/간판', menu: '메뉴판', food: '음식', interior: '인테리어', parking: '주차장', extra: '추가' },
    },
    shopping: {
        order: ['unboxing', 'product', 'detail', 'usage', 'compare', 'extra'],
        aliases: { unboxing: 'unboxing', 언박싱: 'unboxing', 포장: 'unboxing', 택배: 'unboxing', product: 'product', 제품: 'product', 외관: 'product', detail: 'detail', 디테일: 'detail', 클로즈업: 'detail', 소재: 'detail', usage: 'usage', 실사용: 'usage', 착용: 'usage', 사용: 'usage', compare: 'compare', 비교: 'compare', extra: 'extra', 기타: 'extra', 추가: 'extra' },
        labels: { unboxing: '언박싱', product: '제품 외관', detail: '디테일', usage: '실사용', compare: '비교', extra: '추가' },
    },
    tips: {
        order: ['problem', 'tools', 'step', 'result', 'compare', 'extra'],
        aliases: { problem: 'problem', 문제: 'problem', before: 'problem', 현재: 'problem', tools: 'tools', 준비물: 'tools', 재료: 'tools', 도구: 'tools', step: 'step', 과정: 'step', 방법: 'step', 단계: 'step', result: 'result', 결과: 'result', after: 'result', 완성: 'result', compare: 'compare', 비교: 'compare', 전후: 'compare', extra: 'extra', 추가: 'extra', 팁: 'extra' },
        labels: { problem: '문제 상황', tools: '준비물', step: '과정', result: '결과', compare: '비교', extra: '추가 팁' },
    },
    travel: {
        order: ['transport', 'accommodation', 'spot', 'restaurant', 'scenery', 'extra'],
        aliases: { transport: 'transport', 교통: 'transport', 이동: 'transport', accommodation: 'accommodation', 숙소: 'accommodation', 호텔: 'accommodation', 펜션: 'accommodation', spot: 'spot', 명소: 'spot', 관광: 'spot', 포토존: 'spot', restaurant: 'restaurant', 맛집: 'restaurant', 먹거리: 'restaurant', 음식: 'restaurant', scenery: 'scenery', 풍경: 'scenery', 야경: 'scenery', 자연: 'scenery', extra: 'extra', 기념품: 'extra', 기타: 'extra' },
        labels: { transport: '교통', accommodation: '숙소', spot: '명소', restaurant: '맛집', scenery: '풍경', extra: '기념품' },
    },
    recipe: {
        order: ['ingredients', 'prep', 'cooking', 'complete', 'plating', 'extra'],
        aliases: { ingredients: 'ingredients', 재료: 'ingredients', 식재료: 'ingredients', 양념: 'ingredients', prep: 'prep', 손질: 'prep', 준비: 'prep', cooking: 'cooking', 조리: 'cooking', 요리: 'cooking', 볶기: 'cooking', complete: 'complete', 완성: 'complete', 결과: 'complete', plating: 'plating', 플레이팅: 'plating', 담기: 'plating', 세팅: 'plating', extra: 'extra', 보관: 'extra', 팁: 'extra' },
        labels: { ingredients: '재료', prep: '손질', cooking: '조리', complete: '완성', plating: '플레이팅', extra: '보관팁' },
    },
    tutorial: {
        order: ['setup', 'config', 'step1', 'step2', 'result', 'extra'],
        aliases: { setup: 'setup', 준비: 'setup', 설치: 'setup', config: 'config', 설정: 'config', step1: 'step1', 단계1: 'step1', step2: 'step2', 단계2: 'step2', result: 'result', 결과: 'result', 완성: 'result', extra: 'extra', 트러블슈팅: 'extra', 팁: 'extra' },
        labels: { setup: '준비', config: '설정', step1: '단계1', step2: '단계2', result: '결과', extra: '트러블슈팅' },
    },
    comparison: {
        order: ['productA', 'productB', 'spec', 'usage', 'detail', 'extra'],
        aliases: { productA: 'productA', 제품A: 'productA', producta: 'productA', productB: 'productB', 제품B: 'productB', productb: 'productB', spec: 'spec', 스펙: 'spec', 사양: 'spec', 성능: 'spec', usage: 'usage', 실사용: 'usage', 사용: 'usage', detail: 'detail', 디테일: 'detail', 차이: 'detail', extra: 'extra', 가격: 'extra', 추가: 'extra' },
        labels: { productA: '제품A', productB: '제품B', spec: '스펙비교', usage: '실사용', detail: '디테일', extra: '추가' },
    },
    parenting: {
        order: ['baby', 'product', 'activity', 'milestone', 'tip', 'extra'],
        aliases: { baby: 'baby', 아이: 'baby', 아기: 'baby', product: 'product', 용품: 'product', 제품: 'product', activity: 'activity', 활동: 'activity', 놀이: 'activity', 체험: 'activity', milestone: 'milestone', 성장: 'milestone', 기록: 'milestone', tip: 'tip', 꿀팁: 'tip', 노하우: 'tip', extra: 'extra', 기타: 'extra' },
        labels: { baby: '아이', product: '육아용품', activity: '활동', milestone: '성장', tip: '꿀팁', extra: '추가' },
    },
    pet: {
        order: ['pet', 'daily', 'walk', 'food', 'product', 'extra'],
        aliases: { pet: 'pet', 반려동물: 'pet', 강아지: 'pet', 고양이: 'pet', daily: 'daily', 일상: 'daily', 집: 'daily', walk: 'walk', 산책: 'walk', 외출: 'walk', food: 'food', 사료: 'food', 간식: 'food', product: 'product', 용품: 'product', 장난감: 'product', extra: 'extra', 병원: 'extra', 기타: 'extra' },
        labels: { pet: '반려동물', daily: '일상', walk: '산책', food: '사료/간식', product: '용품', extra: '추가' },
    },
    info: {
        order: ['main', 'data', 'detail', 'example', 'reference', 'extra'],
        aliases: { main: 'main', 대표: 'main', 썸네일: 'main', data: 'data', 데이터: 'data', 그래프: 'data', 통계: 'data', detail: 'detail', 상세: 'detail', example: 'example', 사례: 'example', 예시: 'example', reference: 'reference', 참고: 'reference', 출처: 'reference', extra: 'extra', 기타: 'extra' },
        labels: { main: '대표', data: '데이터', detail: '상세', example: '사례', reference: '참고', extra: '추가' },
    },
    daily: {
        order: ['main', 'scene1', 'scene2', 'food', 'selfie', 'extra'],
        aliases: { main: 'main', 메인: 'main', scene1: 'scene1', 장면1: 'scene1', scene2: 'scene2', 장면2: 'scene2', food: 'food', 먹거리: 'food', 음식: 'food', selfie: 'selfie', 셀피: 'selfie', 인물: 'selfie', extra: 'extra', 기타: 'extra' },
        labels: { main: '메인', scene1: '장면1', scene2: '장면2', food: '먹거리', selfie: '셀피', extra: '추가' },
    },
};

// 카테고리 → 슬롯 설정 매핑 (공유 카테고리 처리)
export const CATEGORY_SLOT_MAP = {
    cafe: 'food', review: 'shopping', tech: 'shopping',
    economy: 'info', medical: 'info', law: 'info',
};

export const getSlotConfig = (categoryId) => {
    const configKey = CATEGORY_SLOT_MAP[categoryId] || categoryId;
    return SLOT_CONFIG[configKey] || SLOT_CONFIG.food;
};
