import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { generateThumbnail, THUMBNAIL_STYLES, CATEGORY_FONT_MAP } from '../../utils/thumbnail';
import { loadGoogleFont, loadGoogleFonts } from '../../utils/fontLoader';
import { Sparkles, Loader2 } from 'lucide-react';
import '../../styles/ThumbnailPanel.css';

const ThumbnailPanel = () => {
    const { title, keywords, posts, currentPostId, photoPreviewUrls, editorRef, content, recordAiAction } = useEditor();
    const { showToast } = useToast();

    // photoPreviewUrls가 비어있으면 에디터 본문의 이미지 src를 fallback으로 사용
    const availablePhotos = useMemo(() => {
        if (photoPreviewUrls.length > 0) return photoPreviewUrls;
        if (!content) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const imgs = doc.querySelectorAll('img[src]');
        const urls = [];
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !urls.includes(src)) urls.push(src);
        });
        return urls;
    }, [photoPreviewUrls, content]);

    const [isOpen, setIsOpen] = useState(false);
    const [style, setStyle] = useState('A');
    const [mainText, setMainText] = useState('');
    const [subText, setSubText] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isGeneratingText, setIsGeneratingText] = useState(false);

    // 줌 & 패닝
    const [zoom, setZoom] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const dragRef = useRef(null);
    const previewRef = useRef(null);

    // 폰트 사이즈
    const [mainFontSize, setMainFontSize] = useState(64);
    const [subFontSize, setSubFontSize] = useState(36);

    // 폰트 컬러
    const [fontColor, setFontColor] = useState('');

    // 컬러 띠 옵션 (스타일 E)
    const [bandPosition, setBandPosition] = useState('top');
    const [bandColor, setBandColor] = useState('#FF6B35');
    const [bandHeight, setBandHeight] = useState(150);

    // 카테고리 & 폰트
    const currentPost = posts.find(p => p.id === currentPostId);
    const categoryId = currentPost?.categoryId || 'daily';
    const fontMap = CATEGORY_FONT_MAP[categoryId] || CATEGORY_FONT_MAP.daily;
    const [fontFamily, setFontFamily] = useState(fontMap.fonts[0]);
    const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
    const [fontsReady, setFontsReady] = useState(false);
    const fontDropdownRef = useRef(null);

    const debounceRef = useRef(null);

    useEffect(() => {
        if (isOpen && !fontsReady) {
            loadGoogleFonts(fontMap.fonts).then(() => setFontsReady(true));
        }
    }, [isOpen, fontMap.fonts, fontsReady]);

    useEffect(() => {
        setFontsReady(false);
    }, [categoryId]);

    useEffect(() => {
        if (!fontDropdownOpen) return;
        const handleClick = (e) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target)) {
                setFontDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [fontDropdownOpen]);

    useEffect(() => {
        if (availablePhotos.length > 0 && !selectedPhoto) {
            setSelectedPhoto(availablePhotos[0]);
        }
    }, [availablePhotos, selectedPhoto]);

    useEffect(() => {
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
    }, [selectedPhoto]);

    useEffect(() => {
        const newDefault = (CATEGORY_FONT_MAP[categoryId] || CATEGORY_FONT_MAP.daily).fonts[0];
        setFontFamily(newDefault);
    }, [categoryId]);

    const renderPreview = useCallback(() => {
        if (!selectedPhoto) {
            setPreviewUrl(null);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                if (style !== 'G') {
                    await loadGoogleFont(fontFamily);
                }
                const dataUrl = await generateThumbnail(selectedPhoto, {
                    style, mainText, subText, fontFamily,
                    zoom, offsetX, offsetY,
                    mainFontSize, subFontSize, fontColor,
                    bandPosition, bandColor, bandHeight,
                });
                setPreviewUrl(dataUrl);
            } catch {
                setPreviewUrl(null);
            }
        }, 200);
    }, [selectedPhoto, style, mainText, subText, fontFamily, zoom, offsetX, offsetY, mainFontSize, subFontSize, fontColor, bandPosition, bandColor, bandHeight]);

    useEffect(() => {
        if (isOpen) renderPreview();
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [isOpen, renderPreview]);

    // ── 드래그 패닝 ──
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const handlePointerDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragRef.current = { startX: clientX, startY: clientY, startOx: offsetX, startOy: offsetY };
    };

    const handlePointerMove = useCallback((e) => {
        if (!dragRef.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;

        const dx = (clientX - dragRef.current.startX) / (rect.width / 2);
        const dy = (clientY - dragRef.current.startY) / (rect.height / 2);
        setOffsetX(clamp(dragRef.current.startOx - dx, -1, 1));
        setOffsetY(clamp(dragRef.current.startOy - dy, -1, 1));
    }, []);

    const handlePointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [isOpen, handlePointerMove, handlePointerUp]);

    const handleGenerateText = async () => {
        if (!title) return showToast('제목을 먼저 입력해주세요.', 'warning');
        setIsGeneratingText(true);
        recordAiAction('thumbnailText');
        try {
            const result = await AIService.generateThumbnailText(title, keywords.main);
            setMainText(result.mainText || '');
            setSubText(result.subText || '');
        } catch (e) {
            showToast('텍스트 생성 실패: ' + e.message, 'error');
        } finally {
            setIsGeneratingText(false);
        }
    };

    const handleDownload = async () => {
        if (!previewUrl) return;

        // 모바일 + Web Share API 지원 시 공유 시트 사용
        if (navigator.share && navigator.canShare) {
            try {
                const res = await fetch(previewUrl);
                const blob = await res.blob();
                const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: 'image/png' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: '피클잇 썸네일',
                    });
                    showToast('공유/저장이 완료되었습니다.', 'success');
                    return;
                }
            } catch (e) {
                // 사용자가 공유 취소한 경우 무시
                if (e.name === 'AbortError') return;
            }
        }

        // PC 또는 미지원 브라우저: 기존 다운로드 방식
        const link = document.createElement('a');
        link.download = `thumbnail-${Date.now()}.png`;
        link.href = previewUrl;
        link.click();
        showToast('썸네일이 다운로드되었습니다.', 'success');
    };

    const handleInsert = () => {
        const editor = editorRef?.current;
        if (!editor || !previewUrl) return;
        editor.chain().focus().setImage({ src: previewUrl, alt: mainText || '썸네일' }).run();
        showToast('썸네일이 본문에 삽입되었습니다.', 'success');
    };

    const hasPhotos = availablePhotos.length > 0;
    const showTextControls = style !== 'G';

    return (
        <div className="thumbnail-panel">
            <button
                className="thumbnail-panel-toggle"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>썸네일 자동 생성</span>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                    {isOpen ? '접기 ▲' : '펼치기 ▼'}
                </span>
            </button>

            {isOpen && (
                <div className="thumbnail-panel-body">
                    <div className="thumbnail-fullscreen-topbar">
                        <button className="thumbnail-fullscreen-close" onClick={() => setIsOpen(false)}>닫기</button>
                        <span style={{ fontWeight: 600 }}>썸네일 편집</span>
                        <button className="thumbnail-fullscreen-done" onClick={() => setIsOpen(false)}>완료</button>
                    </div>
                    {!hasPhotos ? (
                        <div className="thumbnail-preview-empty">
                            사진을 먼저 업로드하면<br />썸네일을 생성할 수 있습니다.
                        </div>
                    ) : (
                        <>
                            {/* 사진 선택 */}
                            <div className="thumbnail-photo-grid">
                                {availablePhotos.map((url, i) => (
                                    <div
                                        key={i}
                                        className={`thumbnail-photo-option ${selectedPhoto === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedPhoto(url)}
                                    >
                                        <img src={url} alt={`사진 ${i + 1}`} />
                                    </div>
                                ))}
                            </div>

                            {/* 미리보기 */}
                            <div
                                ref={previewRef}
                                className={`thumbnail-preview ${zoom > 1 ? 'thumbnail-preview-draggable' : ''}`}
                                onMouseDown={handlePointerDown}
                                onTouchStart={handlePointerDown}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="썸네일 미리보기" draggable={false} />
                                ) : (
                                    <div className="thumbnail-preview-empty">미리보기 생성 중...</div>
                                )}
                            </div>

                            {/* 확대 */}
                            <div className="thumbnail-zoom-row">
                                <label>확대</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="2.5"
                                    step="0.1"
                                    value={zoom}
                                    onChange={e => setZoom(parseFloat(e.target.value))}
                                />
                                <span className="thumbnail-zoom-value">{zoom.toFixed(1)}x</span>
                            </div>

                            {/* 스타일 칩 */}
                            <div className="thumbnail-style-chips">
                                {THUMBNAIL_STYLES.map(s => (
                                    <button
                                        key={s.id}
                                        className={`thumbnail-style-chip ${style === s.id ? 'active' : ''}`}
                                        onClick={() => setStyle(s.id)}
                                        title={s.desc}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* 컬러 띠 옵션 (스타일 E) */}
                            {style === 'E' && (
                                <div className="thumbnail-band-options">
                                    <div className="thumbnail-band-row">
                                        <label>위치</label>
                                        <select value={bandPosition} onChange={e => setBandPosition(e.target.value)}>
                                            <option value="top">상단</option>
                                            <option value="center">중앙</option>
                                            <option value="bottom">하단</option>
                                        </select>
                                    </div>
                                    <div className="thumbnail-band-row">
                                        <label>색상</label>
                                        <div className="thumbnail-color-picker">
                                            <input
                                                type="color"
                                                value={bandColor}
                                                onChange={e => setBandColor(e.target.value)}
                                            />
                                            <span>{bandColor}</span>
                                        </div>
                                    </div>
                                    <div className="thumbnail-band-row">
                                        <label>두께</label>
                                        <input
                                            type="range"
                                            min="80"
                                            max="400"
                                            step="10"
                                            value={bandHeight}
                                            onChange={e => setBandHeight(Number(e.target.value))}
                                        />
                                        <span className="thumbnail-slider-value">{bandHeight}px</span>
                                    </div>
                                </div>
                            )}

                            {/* 텍스트 입력 */}
                            {showTextControls && (
                                <div className="thumbnail-text-section">
                                    <div className="thumbnail-input-wrap">
                                        <input
                                            type="text"
                                            value={mainText}
                                            onChange={e => setMainText(e.target.value)}
                                            placeholder="메인 텍스트 (10자 이내)"
                                            maxLength={12}
                                        />
                                        <span className="thumbnail-input-count">{mainText.length}/10</span>
                                    </div>
                                    <div className="thumbnail-input-wrap">
                                        <input
                                            type="text"
                                            value={subText}
                                            onChange={e => setSubText(e.target.value)}
                                            placeholder="서브 텍스트 (15자 이내)"
                                            maxLength={17}
                                        />
                                        <span className="thumbnail-input-count">{subText.length}/15</span>
                                    </div>
                                    <button
                                        className="thumbnail-btn-ai"
                                        onClick={handleGenerateText}
                                        disabled={isGeneratingText || !title}
                                    >
                                        {isGeneratingText
                                            ? <><Loader2 size={13} className="spin" /> 생성 중...</>
                                            : <><Sparkles size={13} /> AI 텍스트 생성</>
                                        }
                                    </button>
                                </div>
                            )}

                            {/* 글꼴 & 스타일링 */}
                            {showTextControls && (
                                <div className="thumbnail-styling-section">
                                    <div className="thumbnail-font-row">
                                        <div className="thumbnail-font-dropdown" ref={fontDropdownRef}>
                                            <button
                                                className="thumbnail-font-selected"
                                                onClick={() => setFontDropdownOpen(prev => !prev)}
                                                style={{ fontFamily: `"${fontFamily}", Pretendard, sans-serif` }}
                                            >
                                                <span>{fontFamily}</span>
                                                <span className="thumbnail-font-arrow">{fontDropdownOpen ? '▲' : '▼'}</span>
                                            </button>
                                            {fontDropdownOpen && (
                                                <ul className="thumbnail-font-list">
                                                    {fontMap.fonts.map(f => (
                                                        <li
                                                            key={f}
                                                            className={f === fontFamily ? 'active' : ''}
                                                            style={{ fontFamily: `"${f}", Pretendard, sans-serif` }}
                                                            onClick={() => { setFontFamily(f); setFontDropdownOpen(false); }}
                                                        >
                                                            {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="thumbnail-color-picker">
                                            <input
                                                type="color"
                                                value={fontColor || '#ffffff'}
                                                onChange={e => setFontColor(e.target.value)}
                                            />
                                            {fontColor && (
                                                <button
                                                    className="thumbnail-color-reset"
                                                    onClick={() => setFontColor('')}
                                                >
                                                    초기화
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="thumbnail-size-row">
                                        <div className="thumbnail-size-col">
                                            <label>메인</label>
                                            <input
                                                type="range"
                                                min="36"
                                                max="96"
                                                step="2"
                                                value={mainFontSize}
                                                onChange={e => setMainFontSize(Number(e.target.value))}
                                            />
                                            <span className="thumbnail-slider-value">{mainFontSize}px</span>
                                        </div>
                                        <div className="thumbnail-size-col">
                                            <label>서브</label>
                                            <input
                                                type="range"
                                                min="20"
                                                max="56"
                                                step="2"
                                                value={subFontSize}
                                                onChange={e => setSubFontSize(Number(e.target.value))}
                                            />
                                            <span className="thumbnail-slider-value">{subFontSize}px</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 하단 버튼 */}
                            <div className="thumbnail-actions">
                                <button
                                    className="thumbnail-btn-download"
                                    onClick={handleDownload}
                                    disabled={!previewUrl}
                                >
                                    다운로드
                                </button>
                                <button
                                    className="thumbnail-btn-insert"
                                    onClick={handleInsert}
                                    disabled={!previewUrl}
                                >
                                    본문 삽입
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThumbnailPanel;
