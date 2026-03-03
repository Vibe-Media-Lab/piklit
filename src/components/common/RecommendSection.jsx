import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../context/EditorContext';
import { AIService } from '../../services/openai';
import { parseNaverBlogStats } from '../../utils/excelParser';
import { TrendingUp, Upload, ChevronDown, ChevronUp, Sparkles, ArrowRight, FileSpreadsheet, X, BarChart3 } from 'lucide-react';

const CACHE_KEY = 'piklit_recommendations';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}

function saveCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

const DIFFICULTY_LABEL = {
    '쉬움': { className: 'recommend-diff-easy', text: '쉬움' },
    '보통': { className: 'recommend-diff-medium', text: '보통' },
    '어려움': { className: 'recommend-diff-hard', text: '어려움' },
};

const RecommendSection = () => {
    const navigate = useNavigate();
    const { posts, createPost } = useEditor();

    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(() => loadCache());
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState(null);
    const fileInputRef = useRef(null);

    // 캐시된 결과가 있으면 펼친 상태로 시작
    useEffect(() => {
        if (result) setExpanded(true);
    }, []);

    const analyzeWithStats = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        setFileName(file.name);
        try {
            const blogStats = await parseNaverBlogStats(file);
            const res = await AIService.recommendNextTopics(blogStats, posts);
            if (res?.recommendations) {
                setResult(res);
                saveCache(res);
            } else {
                throw new Error('추천 결과를 받지 못했습니다.');
            }
        } catch (err) {
            console.error('추천 분석 실패:', err);
            setError(err.message || '분석 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [posts]);

    const analyzeWithHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFileName(null);
        try {
            const res = await AIService.recommendNextTopics(null, posts);
            if (res?.recommendations) {
                setResult(res);
                saveCache(res);
            } else {
                throw new Error('추천 결과를 받지 못했습니다.');
            }
        } catch (err) {
            console.error('추천 분석 실패:', err);
            setError(err.message || '분석 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [posts]);

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            analyzeWithStats(file);
        } else {
            setError('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.');
        }
    }, [analyzeWithStats]);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            analyzeWithStats(file);
        }
        e.target.value = '';
    }, [analyzeWithStats]);

    const handleWriteClick = (rec) => {
        const newId = createPost({ mode: 'ai' });
        navigate(`/editor/${newId}`, {
            state: {
                isNew: true,
                prefillTopic: rec.topic,
                prefillCategory: rec.category,
            }
        });
    };

    const clearResult = () => {
        setResult(null);
        setFileName(null);
        localStorage.removeItem(CACHE_KEY);
    };

    // 접힌 상태: 배너 + 캐시된 미리보기
    if (!expanded) {
        return (
            <div className="recommend-banner" onClick={() => setExpanded(true)}>
                <div className="recommend-banner-left">
                    <TrendingUp size={18} />
                    <span className="recommend-banner-text">
                        {result
                            ? `추천 주제: "${result.recommendations[0]?.topic}"`
                            : '블로그 통계로 다음 글 추천받기'
                        }
                    </span>
                </div>
                <ChevronDown size={16} className="recommend-banner-arrow" />
            </div>
        );
    }

    return (
        <div className="recommend-section">
            {/* 헤더 */}
            <div className="recommend-header" onClick={() => setExpanded(false)}>
                <div className="recommend-header-left">
                    <TrendingUp size={18} />
                    <span>다음 글 추천</span>
                </div>
                <ChevronUp size={16} className="recommend-banner-arrow" />
            </div>

            {/* 결과가 없을 때: 업로드 영역 */}
            {!result && !loading && (
                <div className="recommend-body">
                    {/* 드롭존 */}
                    <div
                        className={`recommend-dropzone ${dragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={24} className="recommend-dropzone-icon" />
                        <p className="recommend-dropzone-title">네이버 블로그 통계 엑셀 업로드</p>
                        <p className="recommend-dropzone-desc">
                            드래그 앤 드롭 또는 클릭하여 파일 선택 (.xlsx)
                        </p>
                        <p className="recommend-dropzone-hint">
                            내 블로그 &gt; 통계 &gt; 게시글별 조회수 &gt; 엑셀 다운로드
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* 구분선 */}
                    <div className="recommend-divider">
                        <span>또는</span>
                    </div>

                    {/* 히스토리 기반 분석 */}
                    <button
                        className="recommend-history-btn"
                        onClick={analyzeWithHistory}
                        disabled={posts.length === 0}
                    >
                        <BarChart3 size={16} />
                        내 작성 기록으로 분석
                        {posts.length === 0 && <span className="recommend-history-hint">(작성한 글이 없습니다)</span>}
                    </button>

                    {error && <p className="recommend-error">{error}</p>}
                </div>
            )}

            {/* 로딩 */}
            {loading && (
                <div className="recommend-loading">
                    <Sparkles size={20} className="recommend-loading-icon" />
                    <p>AI가 블로그 데이터를 분석하고 있습니다...</p>
                    {fileName && <p className="recommend-loading-file"><FileSpreadsheet size={14} /> {fileName}</p>}
                </div>
            )}

            {/* 결과 카드 */}
            {result && !loading && (
                <div className="recommend-results">
                    {/* 인사이트 */}
                    {result.insight && (
                        <div className="recommend-insight">
                            <Sparkles size={14} />
                            <span>{result.insight}</span>
                        </div>
                    )}

                    {/* 추천 카드 목록 */}
                    <div className="recommend-cards">
                        {result.recommendations.map((rec, i) => {
                            const diff = DIFFICULTY_LABEL[rec.difficulty] || DIFFICULTY_LABEL['보통'];
                            return (
                                <div key={i} className="recommend-card">
                                    <div className="recommend-card-top">
                                        <span className="recommend-card-num">{i + 1}</span>
                                        <span className="recommend-card-category">{rec.category}</span>
                                        <span className={`recommend-card-diff ${diff.className}`}>{diff.text}</span>
                                    </div>
                                    <h4 className="recommend-card-topic">{rec.topic}</h4>
                                    <p className="recommend-card-reason">{rec.reason}</p>
                                    <div className="recommend-card-keywords">
                                        {rec.keywords?.map((kw, j) => (
                                            <span key={j} className="recommend-card-keyword">#{kw}</span>
                                        ))}
                                    </div>
                                    <button
                                        className="recommend-card-cta"
                                        onClick={() => handleWriteClick(rec)}
                                    >
                                        이 주제로 글쓰기
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* 하단 액션 */}
                    <div className="recommend-actions">
                        <button className="recommend-refresh" onClick={clearResult}>
                            <X size={14} />
                            결과 지우기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendSection;
