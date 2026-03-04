import React from 'react';

export const MetricBar = ({ label, score, maxScore, classPrefix = 'metric-bar' }) => {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const barColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#2563EB' : pct >= 40 ? '#D97706' : '#EF4444';

    return (
        <div className={`${classPrefix}`}>
            <div className={`${classPrefix}-header`}>
                <span className={`${classPrefix}-label`}>{label}</span>
                <span className={`${classPrefix}-score`} style={{ color: barColor }}>
                    {score}/{maxScore}
                </span>
            </div>
            <div className={`${classPrefix}-bar-bg`}>
                <div
                    className={`${classPrefix}-bar-fill`}
                    style={{ width: `${pct}%`, background: barColor }}
                />
            </div>
        </div>
    );
};
