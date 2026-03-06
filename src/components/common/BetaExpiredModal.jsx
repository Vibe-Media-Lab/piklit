import React from 'react';
import { X, FileText, Zap, Sparkles, Key, Crown } from 'lucide-react';

const BetaExpiredModal = ({ stats, onClose, onNavigate }) => {
    const plans = [
        {
            id: 'free',
            label: '무료로 계속',
            desc: '월 3회 글 생성',
            sub: '부담 없이 유지',
            icon: FileText,
            color: '#787774',
            bg: '#F7F6F3',
            border: '#E3E2E0',
        },
        {
            id: 'byok',
            label: '내 키 연결',
            price: '₩4,900/월',
            desc: '무제한 글 생성',
            sub: '가성비 최고',
            icon: Key,
            color: '#2EAADC',
            bg: '#F0F9FF',
            border: '#B8E4F0',
        },
        {
            id: 'pro',
            label: 'Pro 구독',
            price: '₩18,900/월',
            desc: '무제한 + AI 이미지',
            sub: '추천',
            icon: Crown,
            color: '#FF6B35',
            bg: '#FFF5F0',
            border: '#FFD0B5',
            recommended: true,
        },
    ];

    return (
        <div className="beta-expired-overlay">
            <div className="beta-expired-modal">
                <button className="beta-expired-close" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* 헤더 */}
                <div className="beta-expired-header">
                    <Sparkles size={28} color="#FF6B35" />
                    <h3>베타 테스트가 종료되었습니다</h3>
                    <p>피클잇을 체험해주셔서 감사합니다!</p>
                </div>

                {/* 사용 통계 */}
                {(stats?.postsCreated > 0 || stats?.aiActions > 0) && (
                    <div className="beta-expired-stats">
                        <div className="beta-expired-stat">
                            <span className="beta-expired-stat-value">{stats.postsCreated || 0}</span>
                            <span className="beta-expired-stat-label">작성한 글</span>
                        </div>
                        <div className="beta-expired-stat">
                            <span className="beta-expired-stat-value">{stats.aiActions || 0}</span>
                            <span className="beta-expired-stat-label">AI 기능 사용</span>
                        </div>
                    </div>
                )}

                {/* 요금제 선택 */}
                <div className="beta-expired-plans">
                    {plans.map(plan => {
                        const Icon = plan.icon;
                        return (
                            <button
                                key={plan.id}
                                className={`beta-expired-plan${plan.recommended ? ' recommended' : ''}`}
                                style={{ '--plan-color': plan.color, '--plan-bg': plan.bg, '--plan-border': plan.border }}
                                onClick={() => onNavigate(plan.id)}
                            >
                                {plan.recommended && (
                                    <span className="beta-expired-badge">추천</span>
                                )}
                                <Icon size={22} color={plan.color} />
                                <strong>{plan.label}</strong>
                                {plan.price && <span className="beta-expired-price">{plan.price}</span>}
                                <span className="beta-expired-plan-desc">{plan.desc}</span>
                                <span className="beta-expired-plan-sub">{plan.sub}</span>
                            </button>
                        );
                    })}
                </div>

                <p className="beta-expired-footer">
                    작성한 글은 그대로 유지됩니다. 언제든 업그레이드할 수 있어요.
                </p>
            </div>
        </div>
    );
};

export default BetaExpiredModal;
