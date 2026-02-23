import React from 'react';
import { BarChart3, Search, Loader2, CheckCircle } from 'lucide-react';

const BarChart = ({ label, value, max, unit = '' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="competitor-bar">
            <div className="competitor-bar-header">
                <span className="competitor-bar-label">{label}</span>
                <span className="competitor-bar-value">{value.toLocaleString()}{unit}</span>
            </div>
            <div className="competitor-bar-track">
                <div className="competitor-bar-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

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
                    <Loader2 size={32} className="spin" />
                </div>
                <p className="competitor-loading-text">경쟁 블로그를 분석하고 있습니다...</p>
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

    const { blogs = [], average = {} } = data;

    const maxChar = Math.max(...blogs.map(b => b.charCount || 0), average.charCount || 0, 1);
    const maxImg = Math.max(...blogs.map(b => b.imageCount || 0), average.imageCount || 0, 1);
    const maxHeading = Math.max(...blogs.map(b => b.headingCount || 0), average.headingCount || 0, 1);

    return (
        <div className="competitor-panel">
            {/* 평균값 요약 */}
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
                        <div className="competitor-stat-label">평균 이미지</div>
                    </div>
                    <div className="competitor-stat">
                        <div className="competitor-stat-value">{average.headingCount || 0}</div>
                        <div className="competitor-stat-label">평균 소제목</div>
                    </div>
                </div>
                <p className="competitor-header-note">
                    <CheckCircle size={14} />
                    이 분석 결과가 AI 본문 생성에 자동 반영됩니다
                </p>
            </div>

            {/* 개별 블로그 카드 */}
            <div className="competitor-list">
                <h4 className="competitor-list-title">
                    상위 {blogs.length}개 블로그
                </h4>
                {blogs.map((blog, i) => (
                    <div key={i} className="competitor-card">
                        <div className="competitor-card-title">
                            <span className="competitor-card-rank">{i + 1}</span>
                            <span className="competitor-card-name">{blog.title}</span>
                        </div>
                        <BarChart label="글자수" value={blog.charCount || 0} max={maxChar} unit="자" />
                        <BarChart label="이미지" value={blog.imageCount || 0} max={maxImg} unit="장" />
                        <BarChart label="소제목" value={blog.headingCount || 0} max={maxHeading} unit="개" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompetitorAnalysis;
