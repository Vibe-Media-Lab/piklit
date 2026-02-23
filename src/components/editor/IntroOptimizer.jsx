import React, { useState, useMemo } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';

const IntroOptimizer = () => {
    const { title, content, setContent, keywords, suggestedTone } = useEditor();
    const { showToast } = useToast();
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const mainKeyword = keywords.main?.trim() || '';

    // 현재 본문에서 첫 번째 <p> 텍스트 추출
    const currentIntro = useMemo(() => {
        if (!content) return '';
        const match = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (!match) return '';
        // HTML 태그 제거하여 순수 텍스트 추출
        const temp = document.createElement('div');
        temp.innerHTML = match[1];
        return temp.textContent?.trim() || '';
    }, [content]);

    // 검색 미리보기용 텍스트 (첫 2~3문장, ~160자)
    const previewText = useMemo(() => {
        if (!content) return '';
        const temp = document.createElement('div');
        temp.innerHTML = content;
        const text = temp.textContent || '';
        return text.substring(0, 160).trim() + (text.length > 160 ? '...' : '');
    }, [content]);

    const hasKeywordInIntro = mainKeyword && currentIntro.includes(mainKeyword);

    const handleGenerate = async () => {
        if (!currentIntro) return showToast('본문에 도입부가 없습니다. 먼저 글을 작성해주세요.', 'warning');
        if (!mainKeyword) return showToast('메인 키워드를 먼저 설정해주세요.', 'warning');

        setLoading(true);
        setAlternatives([]);
        try {
            const subKws = (keywords.sub || []).filter(k => k && k.trim());
            // 본문 텍스트를 전달하여 실제 톤앤무드를 분석하게 함
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const bodyText = (doc.body.textContent || '').substring(0, 800);
            let result = await AIService.generateIntroAlternatives(currentIntro, mainKeyword, subKws, title, suggestedTone, bodyText);
            if (result?.alternatives && Array.isArray(result.alternatives)) {
                // 140자 미만인 항목이 있으면 1회 재생성 시도
                const tooShort = result.alternatives.some(a => a.text && a.text.length < 130);
                if (tooShort) {
                    console.log('[도입부] 글자수 부족 — 재생성 시도');
                    const retry = await AIService.generateIntroAlternatives(currentIntro, mainKeyword, subKws, title, suggestedTone, bodyText);
                    if (retry?.alternatives && Array.isArray(retry.alternatives)) {
                        result = retry;
                    }
                }
                setAlternatives(result.alternatives);
            }
        } catch (e) {
            console.error('[도입부 최적화] 오류:', e);
            showToast('도입부 생성 중 오류가 발생했습니다: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = (newIntroText) => {
        // 맨 상단에 새 <p> 태그로 삽입 (정보카드 위에 배치)
        const newContent = `<p>${newIntroText}</p>` + content;
        setContent(newContent);
        setAlternatives([]);
    };

    // 본문이 없으면 렌더링하지 않음
    if (!content || content === '<p></p>' || !currentIntro) return null;

    return (
        <div className="intro-optimizer">
            <button
                className="intro-optimizer-toggle"
                onClick={() => setOpen(prev => !prev)}
            >
                <span>🔍 검색 미리보기 & 도입부 최적화</span>
                <span style={{ fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="intro-optimizer-body">
                    {/* 네이버 검색 미리보기 */}
                    <div className="naver-search-preview">
                        <div className="naver-preview-label">네이버 검색 미리보기</div>
                        <div className="naver-preview-card">
                            <div className="naver-preview-title">{title || '제목 없음'}</div>
                            <div className="naver-preview-url">blog.naver.com</div>
                            <div className="naver-preview-desc">{previewText || '본문 내용이 여기에 표시됩니다...'}</div>
                        </div>
                    </div>

                    {/* 도입부 분석 */}
                    <div className="intro-analysis">
                        <div className="intro-analysis-header">현재 도입부 분석</div>
                        <p className="intro-analysis-text">"{currentIntro}"</p>
                        <div className="intro-analysis-badges">
                            <span className={`intro-badge ${hasKeywordInIntro ? 'intro-badge-good' : 'intro-badge-warn'}`}>
                                {hasKeywordInIntro ? '✅ 키워드 포함' : '⚠️ 키워드 미포함'}
                            </span>
                            <span className={`intro-badge ${currentIntro.length >= 40 && currentIntro.length <= 160 ? 'intro-badge-good' : 'intro-badge-warn'}`}>
                                {currentIntro.length}자
                                {currentIntro.length < 40 ? ' (너무 짧음)' : currentIntro.length > 160 ? ' (너무 긺)' : ' (적정)'}
                            </span>
                        </div>
                    </div>

                    {/* 생성 버튼 */}
                    <button
                        className="intro-generate-btn"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? '⏳ AI 도입부 생성 중...' : '✨ 클릭률 높은 도입부 3개 제안받기'}
                    </button>

                    {/* 대안 도입부 목록 */}
                    {alternatives.length > 0 && (
                        <div className="intro-alternatives">
                            {alternatives.map((alt, idx) => (
                                <div key={idx} className="intro-alt-card">
                                    <div className="intro-alt-strategy">{alt.strategy}</div>
                                    <p className="intro-alt-text">{alt.text}</p>
                                    <div className="intro-alt-footer">
                                        <span className={`intro-badge ${alt.text.includes(mainKeyword) ? 'intro-badge-good' : 'intro-badge-warn'}`}>
                                            {alt.text.includes(mainKeyword) ? '✅ 키워드' : '⚠️ 키워드'}
                                        </span>
                                        <span className="intro-badge intro-badge-neutral">{alt.text.length}자</span>
                                        <button
                                            className="intro-apply-btn"
                                            onClick={() => handleApply(alt.text)}
                                        >
                                            적용하기
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IntroOptimizer;
