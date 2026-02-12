import React, { useState, useCallback } from 'react';
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
 * 형식: 메인키워드-슬롯한글명-순번.jpg
 * 예: 제주-김선문-식당-외관-1.jpg
 */
const generateSeoFilename = (mainKeyword, slotId, index) => {
    const cleaned = mainKeyword
        .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '') // 특수문자 제거 (하이픈 유지)
        .replace(/\s+/g, '-'); // 공백 → 하이픈
    const slotKorean = SLOT_LABELS[slotId] || slotId;
    return `${cleaned}-${slotKorean}-${index + 1}.jpg`;
};

/**
 * 이미지 SEO 가이드 컴포넌트
 * 추천 파일명 + ALT 텍스트를 슬롯별/이미지별로 보여주고 복사 기능 제공
 */
const ImageSeoGuide = ({ mainKeyword, imageAlts, photoMetadata }) => {
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = useCallback(async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch (e) {
            // fallback
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

    // 업로드된 슬롯만 필터
    const uploadedSlots = Object.entries(photoMetadata)
        .filter(([_, count]) => count > 0)
        .map(([slot, count]) => ({ slot, count }));

    if (uploadedSlots.length === 0) return null;

    // 전체 이미지 수
    const totalImages = uploadedSlots.reduce((sum, { count }) => sum + count, 0);

    // 전체 복사 텍스트 생성
    const buildFullText = () => {
        const lines = [];
        uploadedSlots.forEach(({ slot, count }) => {
            const slotKorean = SLOT_LABELS[slot] || slot;
            for (let i = 0; i < count; i++) {
                const filename = generateSeoFilename(mainKeyword, slot, i);
                const altArr = imageAlts[slot] || [];
                const alt = altArr[i] || `${mainKeyword} ${slotKorean}`;
                lines.push(`[${slotKorean}-${i + 1}] 파일명: ${filename} | ALT: ${alt}`);
            }
        });
        return lines.join('\n');
    };

    const handleCopyAll = () => {
        handleCopy(buildFullText(), 'all');
    };

    return (
        <div className="image-seo-guide">
            <div className="image-seo-guide-header">
                <h3>📸 이미지 SEO 가이드 ({totalImages}장)</h3>
                <button
                    className={`image-seo-copy-all-btn ${copiedKey === 'all' ? 'copied' : ''}`}
                    onClick={handleCopyAll}
                >
                    {copiedKey === 'all' ? '✅ 복사됨' : '📋 전체 복사'}
                </button>
            </div>

            <div className="image-seo-guide-body">
                {uploadedSlots.map(({ slot, count }) => {
                    const emoji = SLOT_EMOJI[slot] || '📷';
                    const slotKorean = SLOT_LABELS[slot] || slot;
                    const altArr = imageAlts[slot] || [];

                    return (
                        <div key={slot} className="image-seo-slot-section">
                            <div className="image-seo-slot-title">
                                {emoji} {slotKorean}
                                <span className="slot-count">({count}장)</span>
                            </div>

                            {Array.from({ length: count }, (_, i) => {
                                const filename = generateSeoFilename(mainKeyword, slot, i);
                                const alt = altArr[i] || `${mainKeyword} ${slotKorean}`;
                                const fnKey = `fn-${slot}-${i}`;
                                const altKey = `alt-${slot}-${i}`;

                                return (
                                    <div key={i} className="image-seo-item">
                                        <div className="image-seo-item-number">{i + 1}.</div>
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
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="image-seo-footer">
                💡 위 파일명으로 이미지 파일을 변경한 후 네이버 블로그에 업로드하고,
                ALT 텍스트를 이미지의 대체 텍스트에 입력하세요.
            </div>
        </div>
    );
};

export default ImageSeoGuide;
