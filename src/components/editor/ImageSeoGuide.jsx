import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

/**
 * 통합 이미지 SEO 가이드 컴포넌트
 * 사진 1장 = 카드 1개, 왼쪽(AI 분석+SEO) + 오른쪽(사진 썸네일)
 */
const ImageSeoGuide = ({ mainKeyword, imageAlts, imageCaptions = {}, photoMetadata, photoAnalysis, photoFiles }) => {
    const [copiedKey, setCopiedKey] = useState(null);

    // 업로드된 슬롯
    const uploadedSlots = useMemo(() =>
        Object.entries(photoMetadata)
            .filter(([, count]) => count > 0)
            .map(([slot, count]) => ({ slot, count })),
        [photoMetadata]
    );

    // 사진별 플랫 리스트: [{slot, index, file}, ...]
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

    // 모든 사진의 blob URL 생성
    const thumbUrls = useMemo(() => {
        return photoList.map(({ file }) =>
            file ? URL.createObjectURL(file) : null
        );
    }, [photoList]);

    // blob URL 정리
    useEffect(() => {
        return () => {
            thumbUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
        };
    }, [thumbUrls]);

    // photoAnalysis 파싱
    const analysisGroups = useMemo(() => parsePhotoAnalysis(photoAnalysis), [photoAnalysis]);

    // 번호 있는 분석 그룹 → 사진 순서대로 1:1 매핑
    const { photoAnalysisMap, fallbackGroups, preambleGroups } = useMemo(() => {
        const numbered = analysisGroups.filter(g => g.num !== null);
        const unnumbered = analysisGroups.filter(g => g.num === null);
        const map = {};
        if (numbered.length === photoList.length) {
            photoList.forEach((_, i) => { map[i] = numbered[i]; });
        }
        return {
            photoAnalysisMap: map,
            fallbackGroups: Object.keys(map).length === 0 && analysisGroups.length > 0 ? analysisGroups : null,
            preambleGroups: Object.keys(map).length > 0 && unnumbered.length > 0 ? unnumbered : null,
        };
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
    const hasAnalysis = !!photoAnalysis;
    const headerTitle = hasAnalysis
        ? `📸 사진 분석 & SEO 가이드 (${totalImages}장)`
        : `📸 이미지 SEO 가이드 (${totalImages}장)`;

    // 전체 복사 텍스트
    const buildFullText = () => {
        const lines = [];
        photoList.forEach(({ slot, index }, seq) => {
            const slotKorean = SLOT_LABELS[slot] || slot;
            const emoji = SLOT_EMOJI[slot] || '📷';
            const analysis = photoAnalysisMap[seq];
            lines.push(`\n${emoji} ${analysis?.title || `${slotKorean} ${index + 1}`}`);
            if (analysis) {
                analysis.lines.forEach(l => {
                    const text = clean(l.replace(/^\s*[\*\-]\s*/, '').trim());
                    if (text) lines.push(`  ${text}`);
                });
            }
            const filename = generateSeoFilename(mainKeyword, slot, index);
            const altArr = imageAlts[slot] || [];
            const alt = altArr[index] || `${mainKeyword} ${slotKorean}`;
            const captionArr = imageCaptions[slot] || [];
            const caption = captionArr[index] || '';
            let seoLine = `파일명: ${filename} | ALT: ${alt}`;
            if (caption) seoLine += ` | 캡션: ${caption}`;
            lines.push(seoLine);
        });
        return lines.join('\n');
    };

    const handleCopyAll = () => {
        handleCopy(buildFullText(), 'all');
    };

    /** 분석 라인 렌더 */
    const renderAnalysisLines = (group) => {
        if (!group?.lines) return null;
        return (
            <div className="image-seo-analysis">
                {group.lines.map((line, j) => {
                    let text = clean(line.replace(/^\s*[\*\-]\s*/, '').trim());
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
                <h3>{headerTitle}</h3>
                <button
                    className={`image-seo-copy-all-btn ${copiedKey === 'all' ? 'copied' : ''}`}
                    onClick={handleCopyAll}
                >
                    {copiedKey === 'all' ? '✅ 복사됨' : '📋 전체 복사'}
                </button>
            </div>

            <div className="image-seo-guide-body">
                {/* fallback: 분석 그룹 수 ≠ 사진 수일 때 전체 텍스트 상단 표시 */}
                {fallbackGroups && (
                    <div className="image-seo-fallback-analysis">
                        {fallbackGroups.map((group, gi) => {
                            if (group.num) {
                                return (
                                    <div key={gi} className="image-seo-analysis-group">
                                        <h5 className="image-seo-analysis-group-title">
                                            <span className="image-seo-analysis-num">{group.num}</span>
                                            {group.title}
                                        </h5>
                                        {renderAnalysisLines(group)}
                                    </div>
                                );
                            }
                            return <p key={gi} className="image-seo-analysis-item">{clean(group.lines.join(' '))}</p>;
                        })}
                    </div>
                )}

                {/* preamble 텍스트 */}
                {preambleGroups && (
                    <div className="image-seo-preamble">
                        {preambleGroups.map((g, i) => (
                            <p key={i} className="image-seo-analysis-item">{clean(g.lines.join(' '))}</p>
                        ))}
                    </div>
                )}

                {/* 사진별 1:1 카드 */}
                {photoList.map(({ slot, index }, seq) => {
                    const emoji = SLOT_EMOJI[slot] || '📷';
                    const slotKorean = SLOT_LABELS[slot] || slot;
                    const altArr = imageAlts[slot] || [];
                    const captionArr = imageCaptions[slot] || [];
                    const analysis = photoAnalysisMap[seq];
                    const thumbUrl = thumbUrls[seq];
                    const filename = generateSeoFilename(mainKeyword, slot, index);
                    const alt = altArr[index] || `${mainKeyword} ${slotKorean}`;
                    const caption = captionArr[index] || '';
                    const fnKey = `fn-${slot}-${index}`;
                    const altKey = `alt-${slot}-${index}`;
                    const capKey = `cap-${slot}-${index}`;

                    return (
                        <div key={`${slot}-${index}`} className="image-seo-photo-card">
                            {/* 왼쪽: 텍스트 영역 */}
                            <div className="image-seo-photo-card-left">
                                <div className="image-seo-photo-card-title">
                                    {emoji} {analysis?.title || `${slotKorean} ${index + 1}`}
                                </div>

                                {/* AI 분석 */}
                                {analysis && renderAnalysisLines(analysis)}

                                {/* 구분선 */}
                                {analysis && <div className="image-seo-divider" />}

                                {/* SEO 정보 */}
                                <div className="image-seo-rows">
                                    <div className="image-seo-row">
                                        <span className="image-seo-row-label">파일명</span>
                                        <span className="image-seo-row-value">{filename}</span>
                                        <button
                                            className={`image-seo-copy-btn ${copiedKey === fnKey ? 'copied' : ''}`}
                                            onClick={() => handleCopy(filename, fnKey)}
                                        >
                                            {copiedKey === fnKey ? '✅' : '복사'}
                                        </button>
                                    </div>
                                    <div className="image-seo-row">
                                        <span className="image-seo-row-label">ALT</span>
                                        <span className="image-seo-row-value">{alt}</span>
                                        <button
                                            className={`image-seo-copy-btn ${copiedKey === altKey ? 'copied' : ''}`}
                                            onClick={() => handleCopy(alt, altKey)}
                                        >
                                            {copiedKey === altKey ? '✅' : '복사'}
                                        </button>
                                    </div>
                                    {caption && (
                                        <div className="image-seo-row">
                                            <span className="image-seo-row-label">캡션</span>
                                            <span className="image-seo-row-value">{caption}</span>
                                            <button
                                                className={`image-seo-copy-btn ${copiedKey === capKey ? 'copied' : ''}`}
                                                onClick={() => handleCopy(caption, capKey)}
                                            >
                                                {copiedKey === capKey ? '✅' : '복사'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 오른쪽: 사진 썸네일 */}
                            {thumbUrl && (
                                <div className="image-seo-photo-card-right">
                                    <img
                                        src={thumbUrl}
                                        alt={`${slotKorean} ${index + 1} 썸네일`}
                                        className="image-seo-photo-thumb"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="image-seo-footer">
                💡 위 파일명으로 이미지를 저장하고, ALT 텍스트는 대체 텍스트에,
                캡션은 이미지 아래 설명에 입력하세요.
            </div>
        </div>
    );
};

export { generateSeoFilename, parsePhotoAnalysis };
export default ImageSeoGuide;
