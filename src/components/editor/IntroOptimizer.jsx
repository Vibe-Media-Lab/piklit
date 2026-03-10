import React, { useState, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { humanizeText } from '../../utils/humanness';

// 정보카드 감지: <h2> 또는 <h3>로 시작하고 📍 또는 🏷️ 이모지 포함
const INFO_CARD_START = /<h[23][^>]*>\s*(?:📍|🏷️)/i;

/**
 * 정보카드가 콘텐츠 상단에 있는지 감지하고,
 * 있으면 { hasInfoCard: true, afterCardIndex: <hr> 뒤 위치 } 반환
 */
function detectInfoCard(html) {
    if (!html) return { hasInfoCard: false, afterCardIndex: -1 };
    const trimmed = html.trimStart();
    if (!INFO_CARD_START.test(trimmed.substring(0, 200))) {
        return { hasInfoCard: false, afterCardIndex: -1 };
    }
    // <hr> 또는 <hr/> 또는 <hr /> 찾기
    const hrMatch = html.match(/<hr\s*\/?>/i);
    if (!hrMatch) return { hasInfoCard: false, afterCardIndex: -1 };
    const afterCardIndex = hrMatch.index + hrMatch[0].length;
    return { hasInfoCard: true, afterCardIndex };
}

const IntroOptimizer = () => {
    const { title, content, setContent, keywords, suggestedTone, posts, currentPostId } = useEditor();
    const { showToast } = useToast();
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const mainKeyword = keywords.main?.trim() || '';

    const infoCardState = useMemo(() => detectInfoCard(content), [content]);

    // 현재 본문에서 도입부 텍스트 추출 (정보카드 감지 반영)
    const currentIntro = useMemo(() => {
        if (!content) return '';
        let searchArea = content;
        if (infoCardState.hasInfoCard && infoCardState.afterCardIndex > 0) {
            // 정보카드 뒤 영역에서 첫 <p> 찾기
            searchArea = content.substring(infoCardState.afterCardIndex);
        }
        const match = searchArea.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (!match) return '';
        const temp = document.createElement('div');
        temp.innerHTML = match[1];
        return temp.textContent?.trim() || '';
    }, [content, infoCardState]);

    // 검색 미리보기용 텍스트 — 정보카드 뒤에서 추출
    const previewText = useMemo(() => {
        if (!content) return '';
        let searchArea = content;
        if (infoCardState.hasInfoCard && infoCardState.afterCardIndex > 0) {
            searchArea = content.substring(infoCardState.afterCardIndex);
        }
        const temp = document.createElement('div');
        temp.innerHTML = searchArea;
        const text = temp.textContent || '';
        return text.substring(0, 160).trim() + (text.length > 160 ? '...' : '');
    }, [content, infoCardState]);

    const handleGenerate = async () => {
        if (!currentIntro) return showToast('본문에 도입부가 없습니다. 먼저 글을 작성해주세요.', 'warning');
        if (!mainKeyword) return showToast('메인 키워드를 먼저 설정해주세요.', 'warning');

        setLoading(true);
        setAlternatives([]);
        try {
            const subKws = (keywords.sub || []).filter(k => k && k.trim());
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const bodyText = (doc.body.textContent || '').substring(0, 800);
            const currentPost = posts.find(p => p.id === currentPostId);
            const category = currentPost?.categoryId || 'daily';
            const result = await AIService.generateIntroAlternatives(currentIntro, mainKeyword, subKws, title, suggestedTone, bodyText, category);
            if (result?.alternatives && Array.isArray(result.alternatives)) {
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
        const processed = humanizeText(`<p>${newIntroText}</p>`, suggestedTone || 'friendly');
        let searchArea, startOffset;
        if (infoCardState.hasInfoCard && infoCardState.afterCardIndex > 0) {
            searchArea = content.substring(infoCardState.afterCardIndex);
            startOffset = infoCardState.afterCardIndex;
        } else {
            searchArea = content;
            startOffset = 0;
        }
        // 기존 첫 번째 <p>...</p>를 찾아서 교체
        const firstP = searchArea.match(/<p[^>]*>[\s\S]*?<\/p>/i);
        if (firstP) {
            const before = content.substring(0, startOffset + firstP.index);
            const after = content.substring(startOffset + firstP.index + firstP[0].length);
            setContent(before + processed + after);
        } else {
            setContent(content.substring(0, startOffset) + processed + content.substring(startOffset));
        }
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
                <span><Search size={14} /> 검색 미리보기 & 도입부</span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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

                    {/* 생성 버튼 */}
                    <button
                        className="intro-generate-btn"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? <span className="btn-loading-spinner"><Loader2 size={14} className="spin" /> AI 도입부 생성 중...</span> : '✨ 클릭률 높은 도입부 3개 제안받기'}
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
