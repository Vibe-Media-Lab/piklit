import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { generateThumbnail, THUMBNAIL_STYLES, CATEGORY_FONT_MAP } from '../../utils/thumbnail';
import { loadGoogleFont, loadGoogleFonts } from '../../utils/fontLoader';
import '../../styles/ThumbnailPanel.css';

const ThumbnailPanel = () => {
    const { title, keywords, posts, currentPostId, photoPreviewUrls, editorRef, recordAiAction } = useEditor();
    const { showToast } = useToast();

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

    // 패널 열릴 때 카테고리 폰트 전체 미리 로딩
    useEffect(() => {
        if (isOpen && !fontsReady) {
            loadGoogleFonts(fontMap.fonts).then(() => setFontsReady(true));
        }
    }, [isOpen, fontMap.fonts, fontsReady]);

    // 카테고리 변경 시 폰트 다시 로딩
    useEffect(() => {
        setFontsReady(false);
    }, [categoryId]);

    // 폰트 드롭다운 바깥 클릭 시 닫기
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

    // 첫 사진 자동 선택
    useEffect(() => {
        if (photoPreviewUrls.length > 0 && !selectedPhoto) {
            setSelectedPhoto(photoPreviewUrls[0]);
        }
    }, [photoPreviewUrls, selectedPhoto]);

    // 사진 변경 시 줌/오프셋 리셋
    useEffect(() => {
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
    }, [selectedPhoto]);

    // 카테고리 변경 시 기본 폰트 재설정
    useEffect(() => {
        const newDefault = (CATEGORY_FONT_MAP[categoryId] || CATEGORY_FONT_MAP.daily).fonts[0];
        setFontFamily(newDefault);
    }, [categoryId]);

    // 썸네일 렌더링 (디바운스 200ms)
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

    // ── 드래그 패닝 (마우스 + 터치) ──
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

    // AI 텍스트 생성
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

    // 다운로드
    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement('a');
        link.download = `thumbnail-${Date.now()}.png`;
        link.href = previewUrl;
        link.click();
        showToast('썸네일이 다운로드되었습니다.', 'success');
    };

    // 본문 삽입
    const handleInsert = () => {
        const editor = editorRef?.current;
        if (!editor || !previewUrl) return;
        editor.chain().focus().setImage({ src: previewUrl, alt: mainText || '썸네일' }).run();
        showToast('썸네일이 본문에 삽입되었습니다.', 'success');
    };

    const hasPhotos = photoPreviewUrls.length > 0;
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
                    {!hasPhotos ? (
                        <div className="thumbnail-preview-empty">
                            사진을 먼저 업로드하면<br />썸네일을 생성할 수 있습니다.
                        </div>
                    ) : (
                        <>
                            {/* ── 사진 섹션 ── */}
                            <div className="thumbnail-section-label">사진</div>
                            <div className="thumbnail-photo-grid">
                                {photoPreviewUrls.map((url, i) => (
                                    <div
                                        key={i}
                                        className={`thumbnail-photo-option ${selectedPhoto === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedPhoto(url)}
                                    >
                                        <img src={url} alt={`사진 ${i + 1}`} />
                                    </div>
                                ))}
                            </div>
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

                            {/* ── 스타일 섹션 ── */}
                            <div className="thumbnail-section-label">스타일</div>
                            <div className="thumbnail-controls">
                                <div className="thumbnail-control-row">
                                    <label>스타일</label>
                                    <select value={style} onChange={e => setStyle(e.target.value)}>
                                        {THUMBNAIL_STYLES.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
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

                            {/* ── 텍스트 섹션 ── */}
                            {showTextControls && (
                                <>
                                    <div className="thumbnail-section-label">텍스트</div>
                                    <div className="thumbnail-text-inputs">
                                        <input
                                            type="text"
                                            value={mainText}
                                            onChange={e => setMainText(e.target.value)}
                                            placeholder="메인 텍스트 (10자 이내)"
                                            maxLength={12}
                                        />
                                        <div className="thumbnail-char-hint">{mainText.length}/10</div>
                                        <input
                                            type="text"
                                            value={subText}
                                            onChange={e => setSubText(e.target.value)}
                                            placeholder="서브 텍스트 (15자 이내)"
                                            maxLength={17}
                                        />
                                        <div className="thumbnail-char-hint">{subText.length}/15</div>
                                        <button
                                            className="thumbnail-btn-ai"
                                            onClick={handleGenerateText}
                                            disabled={isGeneratingText || !title}
                                        >
                                            {isGeneratingText ? 'AI 생성 중...' : '✦ AI 텍스트 생성'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* ── 글꼴 & 스타일링 섹션 ── */}
                            {showTextControls && (
                                <>
                                    <div className="thumbnail-section-label">글꼴 &amp; 스타일링</div>
                                    <div className="thumbnail-styling-section">
                                        <div className="thumbnail-control-row">
                                            <label>폰트</label>
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
                                        </div>
                                        <div className="thumbnail-slider-row">
                                            <label>메인 크기</label>
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
                                        <div className="thumbnail-slider-row">
                                            <label>서브 크기</label>
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
                                        <div className="thumbnail-font-color-row">
                                            <label>색상</label>
                                            <div className="thumbnail-color-picker">
                                                <input
                                                    type="color"
                                                    value={fontColor || '#ffffff'}
                                                    onChange={e => setFontColor(e.target.value)}
                                                />
                                                <span>{fontColor || '자동'}</span>
                                            </div>
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
                                </>
                            )}

                            {/* 하단 내보내기 버튼 */}
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
