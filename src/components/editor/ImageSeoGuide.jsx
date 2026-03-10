import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import '../../styles/ImageSeoGuide.css';

const SLOT_LABELS = {
    entrance: '외관',
    parking: '주차장',
    menu: '메뉴판',
    interior: '인테리어',
    food: '음식',
    extra: '추가',
};

const SLOT_EMOJI = {
    entrance: '🏠',
    parking: '🚗',
    menu: '📋',
    interior: '🪑',
    food: '🍱',
    extra: '✨',
};

/**
 * SEO 추천 파일명 생성
 */
const generateSeoFilename = (mainKeyword, slotId, index) => {
    const cleaned = mainKeyword
        .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
        .replace(/\s+/g, '-');
    const slotKorean = SLOT_LABELS[slotId] || slotId;
    return `${cleaned}-${slotKorean}-${index + 1}.jpg`;
};

/**
 * photoAnalysis 텍스트를 "사진 N" 그룹으로 파싱
 */
const parsePhotoAnalysis = (photoAnalysis) => {
    if (!photoAnalysis) return [];
    const raw = typeof photoAnalysis === 'string' ? photoAnalysis : JSON.stringify(photoAnalysis, null, 2);
    const lines = raw.split('\n').filter(l => {
        const t = l.trim();
        if (!t || /^-{3,}$/.test(t)) return false;
        if (/^(원하시면|추가로|더 궁금|도움이|감사합니다|이상으로|참고로|위 분석|블로그에 활용)/.test(t)) return false;
        return true;
    });
    const groups = [];
    let current = null;
    lines.forEach(line => {
        const trimmed = line.trim();
        const titleMatch = trimmed.match(/^#{2,}\s*사진\s*(\d+)\s*[:：]\s*(.+?)[:：]?\s*$/)
            || trimmed.match(/^\[사진\s*(\d+)\]\s*(.+?)[:：]?\s*$/)
            || trimmed.match(/^\*{2}사진\s*(\d+)\s*[:：]\s*(.+?)\*{2}\s*$/)
            || trimmed.match(/^\*{2}(\d+)\.\s*(?:사진\s*\d*:\s*)?(.+?)\*{2}$/)
            || trimmed.match(/^(\d+)\.\s*사진\s*\d*\s*[:：]\s*(.+?)[:：]?\s*$/)
            || trimmed.match(/^#{2,}\s*(\d+)\.\s*(.+?)[:：]?\s*$/)
            || trimmed.match(/^사진\s*(\d+)\s*[:：]\s*(.+?)[:：]?\s*$/);
        if (titleMatch) {
            current = {
                num: titleMatch[1],
                title: titleMatch[2].replace(/\*{1,2}/g, '').replace(/[:：]\s*$/, ''),
                lines: []
            };
            groups.push(current);
        } else if (current) {
            current.lines.push(trimmed);
        } else {
            groups.push({ num: null, title: null, lines: [trimmed] });
        }
    });
    return groups;
};

/** 마크다운 기호 제거 */
const clean = (s) => s.replace(/\*{1,2}/g, '').replace(/^#+\s*/, '');

/** 분석 라인에서 한 줄 요약 추출 */
const extractSummary = (group) => {
    if (!group?.lines?.length) return '';
    for (const line of group.lines) {
        const text = clean(line.replace(/^\s*[*-]\s*/, '').trim());
        const match = text.match(/^분위기[:：]\s*(.+)$/) || text.match(/^활용[:：]\s*(.+)$/);
        if (match) return match[1].slice(0, 40);
    }
    const first = clean(group.lines[0].replace(/^\s*[*-]\s*/, '').trim());
    const labelMatch = first.match(/^[^:：]+[:：]\s*(.+)$/);
    return (labelMatch ? labelMatch[1] : first).slice(0, 40);
};

/**
 * 초간결 이미지 SEO 가이드
 * 기본: 한 줄 요약 + 파일명 복사. 상세 보기 토글로 전체 분석 펼침.
 */
const ImageSeoGuide = ({ imageCaptions = {}, photoMetadata, photoAnalysis, photoFiles }) => {
    const [copiedKey, setCopiedKey] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    const toggleCard = (key) => {
        setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const uploadedSlots = useMemo(() =>
        Object.entries(photoMetadata)
            .filter(([, count]) => count > 0)
            .map(([slot, count]) => ({ slot, count })),
        [photoMetadata]
    );

    const photoList = useMemo(() => {
        const list = [];
        uploadedSlots.forEach(({ slot, count }) => {
            const files = photoFiles?.[slot] || [];
            for (let i = 0; i < count; i++) {
                list.push({ slot, index: i, file: files[i] || null });
            }
        });
        return list;
    }, [uploadedSlots, photoFiles]);

    const thumbUrls = useMemo(() => {
        return photoList.map(({ file }) =>
            file ? URL.createObjectURL(file) : null
        );
    }, [photoList]);

    useEffect(() => {
        return () => {
            thumbUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
        };
    }, [thumbUrls]);

    const analysisGroups = useMemo(() => parsePhotoAnalysis(photoAnalysis), [photoAnalysis]);

    const { photoAnalysisMap } = useMemo(() => {
        const numbered = analysisGroups.filter(g => g.num !== null);
        const map = {};
        if (numbered.length === photoList.length) {
            photoList.forEach((_, i) => { map[i] = numbered[i]; });
        }
        return { photoAnalysisMap: map };
    }, [analysisGroups, photoList]);

    const handleCopy = useCallback(async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        }
    }, []);

    if (photoList.length === 0) return null;

    const totalImages = photoList.length;

    const buildFullText = () => {
        const lines = [];
        photoList.forEach(({ slot, index }, seq) => {
            const slotKorean = SLOT_LABELS[slot] || slot;
            const emoji = SLOT_EMOJI[slot] || '📷';
            const analysis = photoAnalysisMap[seq];
            lines.push(`\n${emoji} ${analysis?.title || `${slotKorean} ${index + 1}`}`);
            if (analysis) {
                analysis.lines.forEach(l => {
                    const text = clean(l.replace(/^\s*[*-]\s*/, '').trim());
                    if (text) lines.push(`  ${text}`);
                });
            }
            const captionArr = imageCaptions[slot] || [];
            const caption = captionArr[index] || '';
            if (caption) lines.push(`사진 설명: ${caption}`);
        });
        return lines.join('\n');
    };

    const renderAnalysisLines = (group) => {
        if (!group?.lines) return null;
        return (
            <div className="image-seo-analysis">
                {group.lines.map((line, j) => {
                    let text = clean(line.replace(/^\s*[*-]\s*/, '').trim());
                    if (!text) return null;
                    const labelMatch = text.match(/^([^:]+)[:：]\s*(.+)$/);
                    if (labelMatch) {
                        return (
                            <p key={j} className="image-seo-analysis-item">
                                <strong>{labelMatch[1]}:</strong> {labelMatch[2]}
                            </p>
                        );
                    }
                    return <p key={j} className="image-seo-analysis-item">{text}</p>;
                })}
            </div>
        );
    };

    return (
        <div className="image-seo-guide">
            <div className="image-seo-guide-header">
                <span className="image-seo-guide-title">사진 분석 완료 · {totalImages}장</span>
                <button
                    className={`image-seo-copy-all-btn ${copiedKey === 'all' ? 'copied' : ''}`}
                    onClick={() => handleCopy(buildFullText(), 'all')}
                >
                    {copiedKey === 'all' ? '✅ 복사됨' : '전체 복사'}
                </button>
            </div>

            <div className="image-seo-guide-body">
                {photoList.map(({ slot, index }, seq) => {
                    const emoji = SLOT_EMOJI[slot] || '📷';
                    const slotKorean = SLOT_LABELS[slot] || slot;
                    const captionArr = imageCaptions[slot] || [];
                    const analysis = photoAnalysisMap[seq];
                    const thumbUrl = thumbUrls[seq];
                    const caption = captionArr[index] || '';
                    const cardKey = `${slot}-${index}`;
                    const isExpanded = expandedCards[cardKey];
                    const summary = analysis ? extractSummary(analysis) : '';

                    return (
                        <div key={cardKey} className={`image-seo-compact-card ${isExpanded ? 'expanded' : ''}`}>
                            {/* 컴팩트 요약 행 */}
                            <div className="image-seo-compact-row">
                                {thumbUrl && (
                                    <img
                                        src={thumbUrl}
                                        alt={`${slotKorean} ${index + 1}`}
                                        className="image-seo-compact-thumb"
                                    />
                                )}
                                <div className="image-seo-compact-info">
                                    <div className="image-seo-compact-title">
                                        {emoji} {analysis?.title || `${slotKorean} ${index + 1}`}
                                    </div>
                                    {summary && (
                                        <div className="image-seo-compact-summary">{summary}</div>
                                    )}
                                </div>
                                <button
                                    className={`image-seo-expand-btn ${isExpanded ? 'open' : ''}`}
                                    onClick={() => toggleCard(cardKey)}
                                    title="상세 보기"
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>

                            {/* 펼침 상세 영역 */}
                            {isExpanded && (
                                <div className="image-seo-detail">
                                    {analysis && renderAnalysisLines(analysis)}

                                    {caption && (
                                        <div className="image-seo-detail-caption">
                                            <span className="image-seo-detail-label">사진 설명</span>
                                            <div className="image-seo-detail-caption-row">
                                                <span className="image-seo-detail-value">{caption}</span>
                                                <button
                                                    className={`image-seo-copy-btn ${copiedKey === `dcap-${cardKey}` ? 'copied' : ''}`}
                                                    onClick={() => handleCopy(caption, `dcap-${cardKey}`)}
                                                >
                                                    {copiedKey === `dcap-${cardKey}` ? '✅' : '복사'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="image-seo-footer">
                · 사진 설명은 네이버 에디터의 '사진 설명'에 입력하면 키워드 보강에 도움됩니다
            </div>
        </div>
    );
};

export { generateSeoFilename, parsePhotoAnalysis };
export default ImageSeoGuide;
