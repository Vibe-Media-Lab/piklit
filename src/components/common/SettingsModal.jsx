import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';
import { callGetUsageInfo, callBetaStatus, callBetaActivate } from '../../services/firebase';

const SettingsModal = ({ isOpen, onClose }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [usage, setUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [betaCode, setBetaCode] = useState('');
    const [betaName, setBetaName] = useState('');
    const [betaAffiliation, setBetaAffiliation] = useState('');
    const [betaConsent, setBetaConsent] = useState(false);
    const [betaConsentOpen, setBetaConsentOpen] = useState(false);
    const [betaStatus, setBetaStatus] = useState(null);
    const [betaLoading, setBetaLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('openai_api_key') || '');
            if (user) {
                // 사용량 조회
                setUsageLoading(true);
                callGetUsageInfo()
                    .then(result => setUsage(result.data))
                    .catch(err => console.error('사용량 조회 실패:', err))
                    .finally(() => setUsageLoading(false));
                // 베타 상태 조회
                callBetaStatus()
                    .then(result => setBetaStatus(result.data))
                    .catch(err => console.error('베타 상태 조회 실패:', err));
                // 구글 프로필 이름 자동 채움
                if (user.displayName) setBetaName(user.displayName);
            }
        }
    }, [isOpen, user]);

    const handleBetaActivate = async () => {
        if (!betaCode.trim()) return showToast('베타 코드를 입력해주세요.', 'warning');
        if (!betaName.trim()) return showToast('이름을 입력해주세요.', 'warning');
        if (!betaConsent) return showToast('개인정보 수집·이용에 동의해주세요.', 'warning');
        setBetaLoading(true);
        try {
            const result = await callBetaActivate(betaCode.trim(), betaName.trim(), betaAffiliation.trim());
            setBetaStatus(result.data);
            setBetaCode('');
            showToast(result.data.message || '베타 테스터 활성화 완료!', 'success');
        } catch (err) {
            showToast(err.message || '베타 코드 활성화 실패', 'error');
        } finally {
            setBetaLoading(false);
        }
    };

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('openai_api_key', apiKey.trim());
            showToast('API Key가 저장되었습니다. 무제한으로 사용할 수 있습니다.', 'success');
        } else {
            localStorage.removeItem('openai_api_key');
            showToast('API Key가 제거되었습니다. 무료 체험으로 전환됩니다.', 'success');
        }
        onClose();
    };

    if (!isOpen) return null;

    const hasOwnKey = !!localStorage.getItem('openai_api_key');
    const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;

    return (
        <div className="settings-overlay">
            <div className="settings-modal">
                <h3 className="settings-title">설정</h3>

                {/* 베타 테스터 */}
                {betaStatus?.active ? (
                    <div className="settings-beta-card-active">
                        <div className="settings-beta-header">
                            <span className="settings-beta-label">
                                Beta Tester
                            </span>
                            <span className="settings-beta-days">
                                D-{betaStatus.daysLeft}
                            </span>
                        </div>
                        <p className="settings-beta-desc">
                            글 생성 21회, AI 이미지 5장을 사용할 수 있습니다.
                        </p>
                    </div>
                ) : (
                    <div className="settings-beta-card-inactive">
                        <label className="settings-label">
                            베타 테스터 코드
                        </label>
                        {betaStatus?.expired && (
                            <p className="settings-beta-expired">
                                베타 테스트 기간이 만료되었습니다.
                            </p>
                        )}
                        <div className="settings-beta-input-row">
                            <input
                                type="text"
                                value={betaCode}
                                onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                                placeholder="초대 코드 입력"
                                disabled={betaStatus?.expired}
                                className="settings-beta-input"
                                onKeyDown={(e) => e.key === 'Enter' && handleBetaActivate()}
                            />
                        </div>
                        <div className="settings-beta-fields">
                            <input
                                type="text"
                                value={betaName}
                                onChange={(e) => setBetaName(e.target.value)}
                                placeholder="이름"
                                disabled={betaStatus?.expired}
                                className="settings-beta-input"
                            />
                            <input
                                type="text"
                                value={betaAffiliation}
                                onChange={(e) => setBetaAffiliation(e.target.value)}
                                placeholder="소속"
                                disabled={betaStatus?.expired}
                                className="settings-beta-input"
                            />
                        </div>
                        <div className="settings-beta-consent">
                            <label className="settings-beta-consent-label">
                                <input
                                    type="checkbox"
                                    checked={betaConsent}
                                    onChange={(e) => setBetaConsent(e.target.checked)}
                                    disabled={betaStatus?.expired}
                                />
                                <span>개인정보 수집·이용에 동의합니다</span>
                                <button
                                    type="button"
                                    className="settings-beta-consent-toggle"
                                    onClick={() => setBetaConsentOpen(!betaConsentOpen)}
                                >
                                    {betaConsentOpen ? '접기' : '자세히 보기'}
                                </button>
                            </label>
                            {betaConsentOpen && (
                                <div className="settings-beta-consent-detail">
                                    <p>• 수집 항목: 이름, 소속, 이메일(Google 로그인)</p>
                                    <p>• 수집 목적: 클로즈드 베타 서비스 제공 및 안내</p>
                                    <p>• 보유 기간: 정식 서비스 출시 후 1개월 이내 파기</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleBetaActivate}
                            disabled={betaLoading || betaStatus?.expired}
                            className="settings-beta-activate-btn"
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {betaLoading ? '확인 중...' : '베타 테스터 활성화'}
                        </button>
                        <p className="settings-beta-hint">
                            선착순 100명 한정, 활성화 후 7일간 Pro 기능을 무료로 체험할 수 있습니다.
                        </p>
                    </div>
                )}

                {/* 사용량 표시 (베타 활성 시 숨김, 로딩 완료 전 숨김) */}
                {!hasOwnKey && !betaStatus?.active && usage && (
                    <div
                        className="settings-usage-card"
                        style={{
                            background: usage?.isPromo ? '#F0FFF4' : '#FFF8F5',
                            border: `1px solid ${usage?.isPromo ? '#C6F6D5' : '#FFE0D0'}`
                        }}
                    >
                        <div className="settings-usage-header">
                            <span className="settings-usage-title">
                                {usage?.isPromo ? '첫 달 무료 체험 중' : '무료 체험'}
                            </span>
                            {usageLoading ? (
                                <span className="settings-usage-loading">조회 중...</span>
                            ) : usage?.isPromo ? (
                                <span className="settings-usage-count" style={{ color: 'var(--color-success)' }}>
                                    D-{usage.promoDaysLeft ?? '?'}
                                </span>
                            ) : usage ? (
                                <span className="settings-usage-count" style={{ color: usagePercent >= 80 ? 'var(--color-error)' : 'var(--color-brand)' }}>
                                    {usage.used} / {usage.limit}회 사용
                                </span>
                            ) : null}
                        </div>
                        {usage && (
                            <div className="settings-progress-track">
                                <div
                                    className="settings-progress-bar"
                                    style={{
                                        width: usage.isPromo ? '100%' : `${Math.min(usagePercent, 100)}%`,
                                        background: usage.isPromo ? 'var(--color-success)' : (usagePercent >= 80 ? 'var(--color-error)' : 'var(--color-brand)')
                                    }}
                                />
                            </div>
                        )}
                        {usage?.isPromo && (
                            <p className="settings-usage-promo-text">
                                무제한 글 생성 가능
                            </p>
                        )}
                        {usage && !usage.isPromo && usage.used >= usage.limit && (
                            <p className="settings-usage-exhausted-text">
                                무료 체험이 소진되었습니다. 아래에서 직접 API 키를 등록하면 무제한 사용 가능합니다.
                            </p>
                        )}
                    </div>
                )}

                {/* API 키 섹션 — 베타 기간 중 숨김 */}

                <div className="settings-actions">
                    <button
                        onClick={onClose}
                        className="settings-save-btn"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
