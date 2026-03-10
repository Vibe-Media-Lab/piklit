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
            }
        }
    }, [isOpen, user]);

    const handleBetaActivate = async () => {
        if (!betaCode.trim()) return showToast('베타 코드를 입력해주세요.', 'warning');
        setBetaLoading(true);
        try {
            const result = await callBetaActivate(betaCode.trim());
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
                            베타 테스트 기간 중 모든 Pro 기능을 무제한 사용할 수 있습니다.
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
                                placeholder="베타 코드 입력"
                                disabled={betaStatus?.expired}
                                className="settings-beta-input"
                                onKeyDown={(e) => e.key === 'Enter' && handleBetaActivate()}
                            />
                            <button
                                onClick={handleBetaActivate}
                                disabled={betaLoading || betaStatus?.expired}
                                className="settings-beta-activate-btn"
                            >
                                {betaLoading ? '확인 중...' : '활성화'}
                            </button>
                        </div>
                        <p className="settings-beta-hint">
                            선착순 30명 한정, 활성화 후 7일간 Pro 기능을 무료로 체험할 수 있습니다.
                        </p>
                    </div>
                )}

                {/* 사용량 표시 */}
                {!hasOwnKey && (
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

                {hasOwnKey && (
                    <div className="settings-own-key-badge">
                        직접 API 키 사용 중 (무제한)
                    </div>
                )}

                {/* API 키 입력 */}
                <div className="settings-api-section">
                    <label className="settings-label">
                        Google Gemini API Key (선택)
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="settings-api-input"
                    />
                    <p className="settings-api-hint">
                        직접 API 키를 등록하면 무료 체험 횟수와 관계없이 무제한으로 사용할 수 있습니다.
                    </p>
                </div>

                <div className="settings-actions">
                    <button
                        onClick={onClose}
                        className="settings-cancel-btn"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="settings-save-btn"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
