// ── 상수 ──

const TONES = [
    { id: 'friendly', label: '🥳 친근한 이웃형', emoji: '🥳', desc: '해요체, 이모지, 감탄사',
      sample: '여기 진짜 숨은 맛집이에요 🍽️ 제가 3번이나 갔는데 매번 웨이팅 있더라고요. 근데 그만큼 맛은 보장된다는 뜻이겠죠?!' },
    { id: 'professional', label: '🔎 전문 정보형', emoji: '🔎', desc: '합쇼체, 개조식 요약, 신뢰감',
      sample: '이 제품의 핵심은 발열 성능입니다. 실측 결과 30분 만에 20도까지 상승했으며, 동급 제품 대비 15% 빠른 수치입니다.' },
    { id: 'honest', label: '📝 내돈내산 솔직형', emoji: '📝', desc: '단호한 문체, 장단점 명확',
      sample: '맛은 괜찮은데 가격이 좀 있어요. 1인분 15,000원이면 솔직히 이 동네 물가 감안해도 비싼 편. 근데 양은 넉넉해요.' },
    { id: 'emotional', label: '☕️ 감성 에세이형', emoji: '☕️', desc: '평어체, 명조체 감성, 여백',
      sample: '창밖으로 노을이 번졌다. 커피잔을 감싸 쥔 손끝이 따뜻했다. 이런 오후가 자주 오면 좋겠다고 생각했다.' },
    { id: 'guide', label: '📚 단계별 가이드형', emoji: '📚', desc: '권유형, 번호표, 팁 박스',
      sample: '먼저 재료를 준비하세요. 꿀팁: 양파는 반달 모양으로 썰면 식감이 살아요. 그다음 센 불에서 2분간 볶아주세요.' }
];

const LENGTH_OPTIONS = ['800~1200자', '1200~1800자', '1800~2500자', '2500~3000자'];
const LENGTH_MIDPOINTS = [1000, 1500, 2150, 2750];

const recommendLength = (avgCharCount) => {
    if (!avgCharCount) return null;
    let closest = LENGTH_OPTIONS[0];
    let minDiff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[0]);
    for (let i = 1; i < LENGTH_MIDPOINTS.length; i++) {
        const diff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closest = LENGTH_OPTIONS[i];
        }
    }
    return closest;
};

// ── 헬퍼 ──

const getKw = (item) => item?.keyword || item;
const getDifficulty = (item) => item?.difficulty || 'medium';

export { TONES, LENGTH_OPTIONS, LENGTH_MIDPOINTS, recommendLength, getKw, getDifficulty };
