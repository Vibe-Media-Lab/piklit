import React from 'react';

const s = {
    page: { maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'Pretendard, -apple-system, sans-serif', color: '#37352F', lineHeight: 1.8 },
    logo: { height: 32, marginBottom: 8 },
    title: { fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px' },
    subtitle: { fontSize: '0.95rem', color: '#787774', marginBottom: 32 },
    section: { marginBottom: 36 },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #FF6B35', display: 'inline-block' },
    step: { display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
    stepNum: { flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: '#FF6B35', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 },
    stepText: { fontSize: '0.9rem', paddingTop: 3 },
    highlight: { background: '#FFF3ED', border: '1px solid #FFD4BC', borderRadius: 8, padding: '14px 16px', fontSize: '0.85rem', marginTop: 8 },
    bugSection: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '16px 18px', fontSize: '0.85rem' },
    footer: { marginTop: 40, paddingTop: 20, borderTop: '1px solid #E3E2E0', fontSize: '0.8rem', color: '#787774', textAlign: 'center' },
    link: { color: '#FF6B35', textDecoration: 'none', fontWeight: 600 },
    infoCard: { background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 16px', fontSize: '0.85rem', marginTop: 12 },
    // mockup
    mockup: { background: '#44403C', border: 'none', borderRadius: 12, padding: '16px 20px 20px', margin: '12px 0 20px', fontSize: '0.8rem' },
    mockInner: { background: 'white', borderRadius: 8, padding: '20px 24px' },
    mockLabel: { fontSize: '0.7rem', color: '#999', marginBottom: 8, letterSpacing: 0.5 },
    mockInput: { width: '100%', padding: '8px 12px', border: '1px solid #E3E2E0', borderRadius: 6, fontSize: '0.8rem', background: 'white', color: '#37352F', boxSizing: 'border-box' },
    mockInputRow: { display: 'flex', gap: 8, marginTop: 8 },
    mockBtn: { width: '100%', padding: '10px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, marginTop: 10, cursor: 'default' },
    mockBetaActive: { background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 8, padding: '12px 16px', marginTop: 12 },
    mockBetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    mockBetaLabel: { color: '#FF6B35', fontWeight: 700, fontSize: '0.85rem' },
    mockBetaDays: { color: '#FF6B35', fontWeight: 600, fontSize: '0.85rem' },
    // category grid
    mockCatGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8, margin: '12px 0' },
    mockCatItem: { border: '1px solid #E3E2E0', borderRadius: 8, padding: '10px 4px', textAlign: 'center', fontSize: '0.75rem', background: 'white' },
    mockCatItemActive: { border: '2px solid #FF6B35', borderRadius: 8, padding: '10px 4px', textAlign: 'center', fontSize: '0.75rem', background: '#FFF7ED' },
    // steps bar
    mockStepBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px', gap: 4 },
    mockStepDot: (active) => ({ width: 24, height: 24, borderRadius: '50%', background: active ? '#FF6B35' : '#E3E2E0', color: active ? 'white' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }),
    mockStepLine: { flex: 1, height: 2, background: '#E3E2E0' },
    // bug report mockup
    mockBugModal: { background: 'white', border: '1px solid #E3E2E0', borderRadius: 10, padding: '16px 20px', margin: '12px 0' },
    mockBugTextarea: { width: '100%', padding: '8px 12px', border: '1px solid #FDBA74', borderRadius: 6, fontSize: '0.75rem', background: 'white', color: '#999', minHeight: 50, resize: 'none', boxSizing: 'border-box' },
    mockBugInfo: { fontSize: '0.7rem', color: '#999', background: '#F9F9F9', padding: '6px 10px', borderRadius: 4, marginTop: 8 },
    mockBugActions: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 },
    mockBugCancel: { padding: '6px 16px', border: '1px solid #E3E2E0', borderRadius: 6, background: 'white', fontSize: '0.75rem', cursor: 'default' },
    mockBugSubmit: { padding: '6px 16px', border: 'none', borderRadius: 6, background: '#37352F', color: 'white', fontSize: '0.75rem', cursor: 'default' },
};

const Step = ({ num, children }) => (
    <div style={s.step}>
        <div style={s.stepNum}>{num}</div>
        <div style={s.stepText}>{children}</div>
    </div>
);

// 베타 코드 입력 목업
const MockBetaRegister = () => (
    <div style={s.mockup}>
        <div style={s.mockLabel}>📱 설정 화면</div>
        <div style={s.mockInner}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>베타 테스터 코드</div>
            <input style={s.mockInput} value="PIKLIT-VIP" readOnly />
            <div style={s.mockInputRow}>
                <input style={{ ...s.mockInput, flex: 1 }} value="홍길동" readOnly />
                <input style={{ ...s.mockInput, flex: 1 }} value="소속" readOnly />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#787774', marginTop: 8 }}>
                ☑️ 개인정보 수집·이용에 동의합니다
            </div>
            <div style={s.mockBtn}>베타 테스터 활성화</div>
            <div style={{ fontSize: '0.7rem', color: '#999', textAlign: 'center', marginTop: 6 }}>
                선착순 100명 한정, 활성화 후 7일간 Pro 기능을 무료로 체험할 수 있습니다.
            </div>
        </div>
    </div>
);

// 베타 활성화 후 목업
const MockBetaActivated = () => (
    <div style={s.mockup}>
        <div style={s.mockLabel}>📱 활성화 완료 후</div>
        <div style={s.mockInner}>
            <div style={s.mockBetaActive}>
                <div style={s.mockBetaHeader}>
                    <span style={s.mockBetaLabel}>Beta Tester</span>
                    <span style={s.mockBetaDays}>D-7</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#787774', marginTop: 6 }}>
                    글 생성 21회, AI 이미지 5장을 사용할 수 있습니다.
                </div>
                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
                    문제 발견 시 우측 하단 🐛 버튼으로 제보해주세요
                </div>
            </div>
        </div>
    </div>
);

// 위자드 카테고리 선택 목업
const MockWizard = () => (
    <div style={s.mockup}>
        <div style={s.mockLabel}>📱 새 글 작성 — 위자드</div>
        <div style={s.mockInner}>
            <div style={s.mockStepBar}>
                <div style={s.mockStepDot(true)}>1</div><div style={s.mockStepLine} />
                <div style={s.mockStepDot(false)}>2</div><div style={s.mockStepLine} />
                <div style={s.mockStepDot(false)}>3</div><div style={s.mockStepLine} />
                <div style={s.mockStepDot(false)}>4</div><div style={s.mockStepLine} />
                <div style={s.mockStepDot(false)}>5</div>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>주제 선택</div>
            <div style={{ fontSize: '0.75rem', color: '#787774', marginBottom: 10 }}>카테고리를 선택하고 주제를 입력하세요</div>
            <div style={s.mockCatGrid}>
                <div style={s.mockCatItemActive}>☕ 카페&맛집</div>
                <div style={s.mockCatItem}>✈️ 여행</div>
                <div style={s.mockCatItem}>⭐ 솔직후기</div>
                <div style={s.mockCatItem}>🍳 레시피</div>
                <div style={s.mockCatItem}>🛍️ 쇼핑</div>
                <div style={s.mockCatItem}>🐾 반려동물</div>
                <div style={s.mockCatItem}>💡 생활꿀팁</div>
                <div style={s.mockCatItem}>💻 테크</div>
            </div>
            <input style={s.mockInput} placeholder="예: 작성할 주제를 입력하세요" readOnly />
        </div>
    </div>
);

// 버그 리포트 목업
const MockBugReport = () => (
    <div style={s.mockup}>
        <div style={s.mockLabel}>📱 버그 리포트 모달</div>
        <div style={s.mockInner}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Bug Report</div>
            <div style={{ fontSize: '0.75rem', color: '#787774', marginBottom: 8 }}>문제를 설명해주세요. 콘솔 로그와 화면 캡쳐는 자동으로 첨부됩니다.</div>
            <textarea style={s.mockBugTextarea} value="어떤 문제가 발생했나요? (예: 글 생성 버튼을 눌렀는데 오류가 났어요)" readOnly />
            <div style={s.mockBugInfo}>자동 첨부: 화면 스크린샷, 콘솔 로그, 브라우저 정보, 현재 URL</div>
            <div style={s.mockBugActions}>
                <button style={s.mockBugCancel}>취소</button>
                <button style={s.mockBugSubmit}>전송</button>
            </div>
        </div>
    </div>
);

const BetaGuidePage = () => (
    <div style={s.page}>
        <img src="/logo.png" alt="Piklit" style={s.logo} />
        <h1 style={s.title}>피클잇 베타 테스터 가이드</h1>
        <p style={s.subtitle}>
            사진만 올리면 SEO 최적화된 네이버 블로그 글이 완성되는 AI 서비스
        </p>

        {/* 소개 */}
        <div style={s.section}>
            <div style={s.sectionTitle}>피클잇이 뭔가요?</div>
            <p style={{ fontSize: '0.9rem' }}>
                사진을 업로드하면 AI가 키워드 분석, 경쟁 블로그 조사, SEO 최적화까지 한 번에 처리해서
                네이버 블로그 글을 자동으로 만들어줍니다.
            </p>
            <div style={s.infoCard}>
                <strong>베타 테스터 혜택</strong> (선착순 100명)<br />
                — 7일간 글 생성 21회 + AI 이미지 5장 무료<br />
                — 모든 분석 기능 무제한
            </div>
        </div>

        {/* 등록 */}
        <div style={s.section}>
            <div style={s.sectionTitle}>베타 테스터 등록</div>
            <Step num="1">
                <a href="https://piklit.vercel.app" target="_blank" rel="noopener noreferrer" style={s.link}>
                    piklit.vercel.app
                </a>에 접속합니다
            </Step>
            <Step num="2">
                <strong>Google 계정</strong>으로 로그인합니다
            </Step>
            <Step num="3">
                상단 <strong>"마이"</strong> 탭을 누릅니다
            </Step>
            <Step num="4">
                <strong>베타 테스터 코드</strong> 입력란에 받은 코드를 입력하고,
                이름과 소속을 적은 뒤 <strong>"베타 테스터 활성화"</strong>를 누릅니다
            </Step>
            <div style={{ ...s.infoCard, marginBottom: 12 }}>
                정식 출시 시 베타 테스터 대상 <strong>할인 코드</strong>를 제공할 예정이에요.<br />
                이름과 소속을 정확히 기입해주세요!
            </div>
            <div style={{ ...s.bugSection, marginBottom: 12 }}>
                ⚠️ 베타 코드는 <strong>선착순 100명</strong> 한정입니다.<br />
                코드를 외부에 공유하지 말아주세요!
            </div>
            <MockBetaRegister />
            <Step num="5">
                아래처럼 <strong>"Beta Tester"</strong> 카드가 표시되면 등록 완료!
            </Step>
            <MockBetaActivated />
        </div>

        {/* 사용법 */}
        <div style={s.section}>
            <div style={s.sectionTitle}>글 작성 방법</div>
            <Step num="1">
                <strong>"새 글 쓰기"</strong>를 누릅니다
            </Step>
            <Step num="2">
                <strong>카테고리</strong>를 선택하고 주제를 입력합니다
            </Step>
            <MockWizard />
            <Step num="3">
                <strong>사진</strong>을 2장 이상 업로드합니다 (없어도 진행 가능)
            </Step>
            <Step num="4">
                AI가 <strong>키워드 분석 → 아웃라인 생성</strong>을 해줍니다. 원하는 대로 수정할 수 있어요
            </Step>
            <Step num="5">
                <strong>"본문 생성"</strong>을 누르면 AI가 글을 작성합니다
            </Step>
            <Step num="6">
                에디터에서 수정하고, 우측 상단 <strong>복사 버튼</strong>으로 네이버 블로그에 붙여넣기하세요
            </Step>
            <div style={s.highlight}>
                <strong>Tip:</strong> 하단 탭에서 SEO 점수, 자연스러움 분석, 썸네일 생성 등 다양한 기능을 활용할 수 있어요!
            </div>
        </div>

        {/* 버그 제보 */}
        <div style={s.section}>
            <div style={s.sectionTitle}>버그 제보 방법</div>
            <div style={s.bugSection}>
                화면 우측 하단에 <strong style={{ fontSize: '1.1rem' }}>🐛</strong> 버튼이 있습니다.<br /><br />
                문제가 발생하면 이 버튼을 눌러 상황을 적어주세요.<br />
                <strong>스크린샷과 오류 로그가 자동으로 첨부</strong>되니 간단히 설명만 적으면 됩니다.
            </div>
            <MockBugReport />
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
            <a
                href="https://piklit.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '14px 40px', background: '#FF6B35', color: 'white', borderRadius: 10, fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}
            >
                피클잇 체험하러 가기
            </a>
        </div>

        <div style={s.footer}>
            피클잇 (Piklit) — 사진을 글로 절이다<br />
            문의: 🐛 버그 리포트 버튼
        </div>
    </div>
);

export default BetaGuidePage;
