import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

const AI_ACTIONS = new Set([
    'keywordAnalysis', 'competitorAnalysis', 'fullDraft', 'introOptimize',
    'titleRecommend', 'tagExtract', 'imageGenerate', 'selectionRewrite',
    'photoAnalysis', 'outlineGenerate', 'seoFix', 'thumbnailText',
]);

const AI_ACTION_LABELS = {
    keywordAnalysis: '키워드 분석',
    competitorAnalysis: '경쟁 분석',
    fullDraft: 'AI 초안 생성',
    introOptimize: '도입부 최적화',
    titleRecommend: '제목 추천',
    tagExtract: '태그 추출',
    imageGenerate: '이미지 생성',
    selectionRewrite: '부분 수정',
    photoAnalysis: '사진 분석',
    outlineGenerate: '아웃라인 생성',
    seoFix: 'SEO 자동 수정',
    thumbnailText: '썸네일 텍스트',
};

const PostHistory = () => {
    const { posts, currentPostId } = useEditor();
    const [isOpen, setIsOpen] = useState(false);

    const post = posts.find(p => p.id === currentPostId);
    if (!post) return null;

    const editSessions = post.editSessions || [];
    const aiUsage = post.aiUsage || {};

    // 타임라인 아이템 구성
    const items = [];

    // 글 생성
    if (post.createdAt) {
        items.push({
            type: post.mode === 'ai' ? 'ai' : 'manual',
            action: `글 생성 (${post.mode === 'ai' ? 'AI' : '직접 작성'})`,
            time: post.createdAt,
        });
    }

    // 세션별 AI 액션 → 개별 아이템
    editSessions.forEach(session => {
        const actions = session.aiActions || [];
        if (actions.length > 0) {
            const actionLabels = actions.map(a => AI_ACTION_LABELS[a] || a);
            const count = actions.length > 1 ? ` (${actions.length}건)` : '';
            items.push({
                type: 'ai',
                action: `${actionLabels[0]}${count}`,
                time: session.startedAt,
            });
        } else {
            items.push({
                type: 'manual',
                action: '본문 편집',
                time: session.startedAt,
            });
        }
    });

    // AI 사용 내역에서 세션에 없는 것 추가
    Object.entries(aiUsage).forEach(([key, count]) => {
        if (count > 0 && !editSessions.some(s => (s.aiActions || []).includes(key))) {
            items.push({
                type: AI_ACTIONS.has(key) ? 'ai' : 'manual',
                action: AI_ACTION_LABELS[key] || key,
                time: post.updatedAt || post.createdAt,
            });
        }
    });

    // 시간 정렬
    items.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (items.length === 0) return null;

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <>
            <button
                className={`v3-panel-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>작성 히스토리</span>
                <ChevronDown size={16} className={`v3-panel-chevron ${isOpen ? 'open' : ''}`} />
            </button>
            {isOpen && (
                <div className="v3-panel-body">
                    {items.map((item, i) => (
                        <div key={i} className="v3-history-item">
                            <div className={`v3-history-dot ${item.type}`} />
                            <div className="v3-history-info">
                                <div className="v3-history-action">{item.action}</div>
                                <div className="v3-history-time">{formatTime(item.time)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default PostHistory;
