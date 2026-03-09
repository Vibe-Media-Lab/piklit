import React, { useState } from 'react';
import { BarChart3, CheckCircle, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';

const CompetitorAnalysis = ({ data, loading, onAnalyze, compact }) => {
    const [expanded, setExpanded] = useState(false);

    if (!data && !loading) {
        return (
            <button onClick={onAnalyze} className={compact ? 'competitor-compact-btn' : 'wizard-btn-accent'}>
                <BarChart3 size={16} /> 경쟁 블로그 분석하기
            </button>
        );
    }

    if (loading) {
        return (
            <div className={compact ? 'competitor-compact-loading' : 'ai-progress-card'}>
                <Loader2 size={16} className="spin" />
                <span>경쟁 블로그 분석 중...</span>
            </div>
        );
    }

    const { average = {} } = data;
    const insufficient = !average.charCount && !average.headingCount;

    if (compact) {
        return (
            <div className="competitor-compact">
                {insufficient ? (
                    <div className="competitor-compact-empty">
                        <BarChart3 size={14} />
                        <span>경쟁 블로그 데이터 부족 — 이미지는 카테고리 기준 권장값</span>
                    </div>
                ) : (
                    <div className="wizard-summary-inline">
                        <span>상위 블로그 평균 {(average.charCount || 0).toLocaleString()}자</span>
                        <span className="wizard-summary-dot">·</span>
                        <span>{average.headingCount || 0}소제목</span>
                        <span className="wizard-summary-dot">·</span>
                        <span>{average.imageCount || 0}이미지</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="competitor-panel">
            <div className="competitor-header">
                <h4>
                    <BarChart3 size={18} />
                    상위 블로그 평균 가이드
                </h4>
                {insufficient ? (
                    <div className="competitor-insufficient">
                        <AlertTriangle size={16} />
                        <div>
                            <strong>분석 데이터 부족</strong>
                            <p>이 키워드로 검색된 블로그가 부족하여 평균 데이터를 수집하지 못했습니다. 권장 이미지 수는 카테고리 기준으로 표시됩니다.</p>
                        </div>
                    </div>
                ) : (
                    <div className="competitor-stats-grid">
                        <div className="competitor-stat">
                            <div className="competitor-stat-value">{(average.charCount || 0).toLocaleString()}</div>
                            <div className="competitor-stat-label">평균 글자수</div>
                        </div>
                        <div className="competitor-stat">
                            <div className="competitor-stat-value">{average.imageCount || 0}</div>
                            <div className="competitor-stat-label">권장 이미지</div>
                        </div>
                        <div className="competitor-stat">
                            <div className="competitor-stat-value">{average.headingCount || 0}</div>
                            <div className="competitor-stat-label">평균 소제목</div>
                        </div>
                    </div>
                )}
                <p className="competitor-header-note">
                    <CheckCircle size={14} />
                    {insufficient
                        ? '이미지는 카테고리별 권장값'
                        : '글자수·소제목은 검색 기반 분석, 이미지는 카테고리별 권장값'}
                </p>
            </div>
        </div>
    );
};

export default CompetitorAnalysis;
