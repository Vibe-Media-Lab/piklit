import React from 'react';

const DIFFICULTY_COLORS = {
    easy: { bg: '#F0FDF4', border: '#86EFAC', text: '#16A34A' },
    medium: { bg: '#FFFBEB', border: '#FCD34D', text: '#D97706' },
    hard: { bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626' },
};

const BarChart = ({ label, value, max, unit = '' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>{label}</span>
                <span style={{ fontWeight: 'bold', color: '#333' }}>{value.toLocaleString()}{unit}</span>
            </div>
            <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                    borderRadius: '4px',
                    transition: 'width 0.6s ease'
                }} />
            </div>
        </div>
    );
};

const CompetitorAnalysis = ({ data, loading, onAnalyze }) => {
    if (!data && !loading) {
        return (
            <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px dashed #A5B4FC'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                <p style={{ color: '#4338CA', fontWeight: '600', marginBottom: '4px' }}>
                    경쟁 블로그 분석
                </p>
                <p style={{ color: '#6366F1', fontSize: '0.85rem', marginBottom: '16px' }}>
                    같은 키워드 상위 블로그의 글자수, 이미지 수, 구조를 분석합니다
                </p>
                <button
                    onClick={onAnalyze}
                    className="wizard-btn-primary"
                    style={{ padding: '10px 24px', background: '#6366F1' }}
                >
                    🔍 경쟁 블로그 분석하기
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                padding: '32px',
                background: '#F8F9FA',
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>🔄</div>
                <p style={{ color: '#666' }}>경쟁 블로그를 분석하고 있습니다...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const { blogs = [], average = {} } = data;

    // 바 차트 최대값 계산
    const maxChar = Math.max(...blogs.map(b => b.charCount || 0), average.charCount || 0, 1);
    const maxImg = Math.max(...blogs.map(b => b.imageCount || 0), average.imageCount || 0, 1);
    const maxHeading = Math.max(...blogs.map(b => b.headingCount || 0), average.headingCount || 0, 1);

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden'
        }}>
            {/* 평균값 요약 */}
            <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white'
            }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem' }}>📊 상위 블로그 평균 가이드</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(average.charCount || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>평균 글자수</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{average.imageCount || 0}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>평균 이미지</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{average.headingCount || 0}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>평균 소제목</div>
                    </div>
                </div>
                <p style={{
                    margin: '14px 0 0 0',
                    fontSize: '0.8rem',
                    opacity: 0.9,
                    textAlign: 'center'
                }}>
                    ✅ 이 분석 결과가 AI 본문 생성에 자동 반영됩니다
                </p>
            </div>

            {/* 개별 블로그 카드 */}
            <div style={{ padding: '16px 24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#666' }}>
                    상위 {blogs.length}개 블로그
                </h4>
                {blogs.map((blog, i) => (
                    <div key={i} style={{
                        padding: '16px',
                        background: '#FAFAFA',
                        borderRadius: '10px',
                        marginBottom: i < blogs.length - 1 ? '10px' : 0
                    }}>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#6366F1',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                flexShrink: 0
                            }}>{i + 1}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {blog.title}
                            </span>
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
