import React from 'react';
import { BarChart3, Search, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

const CompetitorAnalysis = ({ data, loading, onAnalyze }) => {
    if (!data && !loading) {
        return (
            <button onClick={onAnalyze} className="wizard-btn-accent">
                <BarChart3 size={16} /> 경쟁 블로그 분석하기
            </button>
        );
    }

    if (loading) {
        return (
            <div className="ai-progress-card">
                <div className="ai-progress-header">
                    <Loader2 size={16} className="spin" />
                    경쟁 블로그를 분석하고 있습니다
                    <div className="ai-progress-dots"><span /><span /><span /></div>
                </div>
                <div className="ai-progress-bar-track">
                    <div className="ai-progress-bar-fill" />
                </div>
                <div className="ai-progress-steps">
                    <div className="ai-progress-step done">
                        <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                        검색 요청 전달 완료
                    </div>
                    <div className="ai-progress-step active">
                        <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                        상위 블로그 데이터 수집 중
                    </div>
                    <div className="ai-progress-step">
                        <div className="ai-progress-step-icon"><BarChart3 size={14} /></div>
                        평균 데이터 추출
                    </div>
                </div>
            </div>
        );
    }

    const { average = {} } = data;
    const insufficient = !average.charCount && !average.headingCount;

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
