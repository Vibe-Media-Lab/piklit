import React from 'react';
import '../styles/BetaGuidePage.css';

const Step = ({ num, children }) => (
    <div className="beta-step">
        <div className="beta-step-num">{num}</div>
        <div className="beta-step-text">{children}</div>
    </div>
);

// 베타 코드 입력 목업
const MockBetaRegister = () => (
    <div className="beta-mockup">
        <div className="beta-mock-label">📱 설정 화면</div>
        <div className="beta-mock-inner">
            <div className="beta-text-bold">베타 테스터 코드</div>
            <input className="beta-mock-input" value="PIKLIT-VIP" readOnly />
            <div className="beta-mock-input-row">
                <input className="beta-mock-input" style={{ flex: 1 }} value="홍길동" readOnly />
                <input className="beta-mock-input" style={{ flex: 1 }} value="소속" readOnly />
            </div>
            <div className="beta-text-consent">
                ☑️ 개인정보 수집·이용에 동의합니다
            </div>
            <div className="beta-mock-btn">베타 테스터 활성화</div>
            <div className="beta-text-xxs-center">
                선착순 100명 한정, 활성화 후 7일간 Pro 기능을 무료로 체험할 수 있습니다.
            </div>
        </div>
    </div>
);

// 베타 활성화 후 목업
const MockBetaActivated = () => (
    <div className="beta-mockup">
        <div className="beta-mock-label">📱 활성화 완료 후</div>
        <div className="beta-mock-inner">
            <div className="beta-mock-active">
                <div className="beta-mock-active-header">
                    <span className="beta-mock-active-label">Beta Tester</span>
                    <span className="beta-mock-active-days">D-7</span>
                </div>
                <div className="beta-text-active-desc">
                    글 생성 21회, AI 이미지 5장을 사용할 수 있습니다.
                </div>
                <div className="beta-text-active-hint">
                    문제 발견 시 우측 하단 🐛 버튼으로 제보해주세요
                </div>
            </div>
        </div>
    </div>
);

// 위자드 카테고리 선택 목업
const MockWizard = () => (
    <div className="beta-mockup">
        <div className="beta-mock-label">📱 새 글 작성 — 위자드</div>
        <div className="beta-mock-inner">
            <div className="beta-mock-step-bar">
                <div className="beta-mock-step-dot active">1</div><div className="beta-mock-step-line" />
                <div className="beta-mock-step-dot">2</div><div className="beta-mock-step-line" />
                <div className="beta-mock-step-dot">3</div><div className="beta-mock-step-line" />
                <div className="beta-mock-step-dot">4</div><div className="beta-mock-step-line" />
                <div className="beta-mock-step-dot">5</div>
            </div>
            <div className="beta-text-cat-title">주제 선택</div>
            <div className="beta-text-cat-desc">카테고리를 선택하고 주제를 입력하세요</div>
            <div className="beta-mock-cat-grid">
                <div className="beta-mock-cat-item active">☕ 카페&맛집</div>
                <div className="beta-mock-cat-item">✈️ 여행</div>
                <div className="beta-mock-cat-item">⭐ 솔직후기</div>
                <div className="beta-mock-cat-item">🍳 레시피</div>
                <div className="beta-mock-cat-item">🛍️ 쇼핑</div>
                <div className="beta-mock-cat-item">🐾 반려동물</div>
                <div className="beta-mock-cat-item">💡 생활꿀팁</div>
                <div className="beta-mock-cat-item">💻 테크</div>
            </div>
            <input className="beta-mock-input" placeholder="예: 작성할 주제를 입력하세요" readOnly />
        </div>
    </div>
);

// 버그 리포트 목업
const MockBugReport = () => (
    <div className="beta-mockup">
        <div className="beta-mock-label">📱 버그 리포트 모달</div>
        <div className="beta-mock-inner">
            <div className="beta-text-bug-title">Bug Report</div>
            <div className="beta-text-bug-desc">문제를 설명해주세요. 콘솔 로그와 화면 캡쳐는 자동으로 첨부됩니다.</div>
            <textarea className="beta-mock-bug-textarea" value="어떤 문제가 발생했나요? (예: 글 생성 버튼을 눌렀는데 오류가 났어요)" readOnly />
            <div className="beta-mock-bug-info">자동 첨부: 화면 스크린샷, 콘솔 로그, 브라우저 정보, 현재 URL</div>
            <div className="beta-mock-bug-actions">
                <button className="beta-mock-bug-cancel">취소</button>
                <button className="beta-mock-bug-submit">전송</button>
            </div>
        </div>
    </div>
);

const BetaGuidePage = () => (
    <div className="beta-page">
        <img src="/logo.png" alt="Piklit" className="beta-logo" />
        <h1 className="beta-title">피클잇 베타 테스터 가이드</h1>
        <p className="beta-subtitle">
            사진만 올리면 SEO 최적화된 네이버 블로그 글이 완성되는 AI 서비스
        </p>

        {/* 소개 */}
        <div className="beta-section">
            <div className="beta-section-title">피클잇이 뭔가요?</div>
            <p className="beta-text-sm">
                사진을 업로드하면 AI가 키워드 분석, 경쟁 블로그 조사, SEO 최적화까지 한 번에 처리해서
                네이버 블로그 글을 자동으로 만들어줍니다.
            </p>
            <div className="beta-info-card">
                <strong>베타 테스터 혜택</strong> (선착순 100명)<br />
                — 7일간 글 생성 21회 + AI 이미지 5장 무료<br />
                — 모든 분석 기능 무제한
            </div>
        </div>

        {/* 등록 */}
        <div className="beta-section">
            <div className="beta-section-title">베타 테스터 등록</div>
            <Step num="1">
                <a href="https://piklit.vercel.app" target="_blank" rel="noopener noreferrer" className="beta-link">
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
            <div className="beta-info-card beta-mb-12">
                🎁 정식 출시 시 베타 테스터 대상 <strong>할인 혜택</strong>을 드릴 예정이에요.<br />
                이름과 소속을 정확히 기입해주세요!
            </div>
            <div className="beta-bug-section beta-mb-12">
                🔒 이 초대 코드는 소수의 분들께만 개별로 전달드리고 있어요.<br />
                코드가 공개되면 조기 마감될 수 있으니 <strong>외부에 공유하지 말아주세요!</strong>
            </div>
            <MockBetaRegister />
            <Step num="5">
                아래처럼 <strong>"Beta Tester"</strong> 카드가 표시되면 등록 완료!
            </Step>
            <MockBetaActivated />
        </div>

        {/* 사용법 */}
        <div className="beta-section">
            <div className="beta-section-title">글 작성 방법</div>
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
            <div className="beta-highlight">
                <strong>Tip:</strong> 하단 탭에서 SEO 점수, 자연스러움 분석, 썸네일 생성 등 다양한 기능을 활용할 수 있어요!
            </div>
        </div>

        {/* 버그 제보 */}
        <div className="beta-section">
            <div className="beta-section-title">버그 제보 방법</div>
            <div className="beta-bug-section">
                화면 우측 하단에 <strong style={{ fontSize: '1.1rem' }}>🐛</strong> 버튼이 있습니다.<br /><br />
                문제가 발생하면 이 버튼을 눌러 상황을 적어주세요.<br />
                <strong>스크린샷과 오류 로그가 자동으로 첨부</strong>되니 간단히 설명만 적으면 됩니다.
            </div>
            <MockBugReport />
        </div>

        <div className="beta-cta-wrap">
            <a
                href="https://piklit.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="beta-cta-btn"
            >
                피클잇 체험하러 가기
            </a>
            <p className="beta-cta-text">
                편하게 써보시고 솔직한 피드백 주시면 큰 힘이 됩니다. 감사해요! 💕
            </p>
        </div>

        <div className="beta-footer">
            피클잇 (Piklit) — 사진을 글로 절이다<br />
            문의: 🐛 버그 리포트 버튼
        </div>
    </div>
);

export default BetaGuidePage;
