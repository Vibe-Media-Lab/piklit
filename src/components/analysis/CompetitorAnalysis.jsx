import React from 'react';
import { BarChart3, Search, Sparkles, CheckCircle } from 'lucide-react';

const CompetitorAnalysis = ({ data, loading, onAnalyze }) => {
    if (!data && !loading) {
        return (
            <div className="competitor-cta">
                <div className="competitor-cta-icon">
                    <BarChart3 size={32} />
                </div>
                <p className="competitor-cta-title">경쟁 블로그 분석</p>
                <p className="competitor-cta-desc">
                    같은 키워드 상위 블로그의 글자수, 이미지 수, 구조를 분석합니다
                </p>
                <button onClick={onAnalyze} className="wizard-btn-primary">
                    <Search size={16} /> 경쟁 블로그 분석하기
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="competitor-loading">
                <div className="competitor-loading-icon">
                    <Sparkles size={36} />
                </div>
                <p className="competitor-loading-text">경쟁 블로그를 분석하고 있어요</p>
                <p className="competitor-loading-sub">잠시만 기다려주세요.</p>
                <div className="ai-progress-bar-track" style={{ marginTop: '16px', maxWidth: '280px', marginInline: 'auto' }}>
                    <div className="ai-progress-bar-fill" />
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="skeleton-bar long" />
                    <div className="skeleton-bar medium" />
                    <div className="skeleton-bar short" />
                    <div className="skeleton-bar long" />
                    <div className="skeleton-bar medium" />
                </div>
            </div>
        );
    }

    const { average = {} } = data;

    return (
        <div className="competitor-panel">
            <div className="competitor-header">
                <h4>
                    <BarChart3 size={18} />
                    상위 블로그 평균 가이드
                </h4>
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
                <p className="competitor-header-note">
                    <CheckCircle size={14} />
                    글자수·소제목은 검색 기반 분석, 이미지는 카테고리별 권장값
                </p>
            </div>
        </div>
    );
};

export default CompetitorAnalysis;
