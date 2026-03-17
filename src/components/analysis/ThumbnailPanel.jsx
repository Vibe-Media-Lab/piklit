import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { generateThumbnail, generateMultiThumbnail, THUMBNAIL_STYLES, CATEGORY_FONT_MAP, getMultiPhotoRegions } from '../../utils/thumbnail';
import { loadGoogleFont, loadGoogleFonts } from '../../utils/fontLoader';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import '../../styles/ThumbnailPanel.css';

const ThumbnailPanel = ({ onLocate } = {}) => {
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

    const [isOpen, setIsOpen] = useState(window.innerWidth < 768);
    const [brokenImgs, setBrokenImgs] = useState(new Set());
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

    // 텍스트 효과
    const [shadow, setShadow] = useState('약하게');
    const [outline, setOutline] = useState('없음');
    const [bgBox, setBgBox] = useState('없음');

    // 다중 사진 (Style H, I)
    const [extraPhotos, setExtraPhotos] = useState([]);
    const [splitDirection, setSplitDirection] = useState('vertical');
    const [gridGap, setGridGap] = useState(8);
    // 사진별 확대/오프셋: [{zoom, ox, oy}, ...]
    const [photoZooms, setPhotoZooms] = useState([]);
    const multiDragRef = useRef(null);

    // 내 스타일
    const [savedStyles, setSavedStyles] = useState(() => {
        try { return JSON.parse(localStorage.getItem('piklit_thumb_styles') || '[]'); } catch { return []; }
    });

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

    // 스타일 변경 시 extraPhotos/photoZooms 초기화
    useEffect(() => {
        setExtraPhotos([]);
        setPhotoZooms([]);
    }, [style]);

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

                let dataUrl;
                if ((style === 'H' || style === 'I') && extraPhotos.length > 0) {
                    dataUrl = await generateMultiThumbnail(
                        [selectedPhoto, ...extraPhotos],
                        {
                            style, mainText, subText, fontFamily,
                            mainFontSize, subFontSize, fontColor,
                            bandColor, bandHeight: style === 'H' ? bandHeight : 0,
                            splitDirection, gridGap,
                            shadow, outline, bgBox,
                            photoZooms,
                        }
                    );
                } else {
                    dataUrl = await generateThumbnail(selectedPhoto, {
                        style: (style === 'H' || style === 'I') ? 'A' : style,
                        mainText, subText, fontFamily,
                        zoom, offsetX, offsetY,
                        mainFontSize, subFontSize, fontColor,
                        bandPosition, bandColor, bandHeight,
                        shadow, outline, bgBox,
                    });
                }
                setPreviewUrl(dataUrl);
            } catch {
                setPreviewUrl(null);
            }
        }, 200);
    }, [selectedPhoto, style, mainText, subText, fontFamily, zoom, offsetX, offsetY, mainFontSize, subFontSize, fontColor, bandPosition, bandColor, bandHeight, shadow, outline, bgBox, extraPhotos, splitDirection, gridGap, photoZooms]);

    useEffect(() => {
        if (isOpen) renderPreview();
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [isOpen, renderPreview]);

    // 스타일 모드 판별 (useEffect 의존성으로 사용되므로 선행 선언 필수)
    const isMultiStyle = style === 'H' || style === 'I';

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
        const drag = dragRef.current;
        if (!drag) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;

        const dx = (clientX - drag.startX) / (rect.width / 2);
        const dy = (clientY - drag.startY) / (rect.height / 2);
        setOffsetX(clamp(drag.startOx - dx, -1, 1));
        setOffsetY(clamp(drag.startOy - dy, -1, 1));
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

    // ── 다중 사진 드래그 패닝 ──
    const handleMultiPointerDown = (e) => {
        if (!isMultiStyle || extraPhotos.length === 0) return;
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rx = (clientX - rect.left) / rect.width;
        const ry = (clientY - rect.top) / rect.height;

        // 어떤 영역을 클릭했는지 감지
        const regions = getMultiPhotoRegions(style, 1 + extraPhotos.length, splitDirection, bandHeight, gridGap);
        let hitIdx = -1;
        for (let i = 0; i < regions.length; i++) {
            const r = regions[i];
            if (rx >= r.x && rx <= r.x + r.w && ry >= r.y && ry <= r.y + r.h) {
                hitIdx = i;
                break;
            }
        }
        if (hitIdx < 0) return;

        const pz = photoZooms[hitIdx] || { zoom: 1, ox: 0, oy: 0 };
        if (pz.zoom <= 1) return; // 확대 안 된 사진은 드래그 불가

        e.preventDefault();
        multiDragRef.current = { startX: clientX, startY: clientY, startOx: pz.ox, startOy: pz.oy, idx: hitIdx };
    };

    const handleMultiPointerMove = useCallback((e) => {
        const drag = multiDragRef.current;
        if (!drag) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;

        const dx = (clientX - drag.startX) / (rect.width / 2);
        const dy = (clientY - drag.startY) / (rect.height / 2);
        const idx = drag.idx;

        setPhotoZooms(prev => {
            const next = [...prev];
            const cur = next[idx] || { zoom: 1, ox: 0, oy: 0 };
            next[idx] = { ...cur, ox: clamp(drag.startOx - dx, -1, 1), oy: clamp(drag.startOy - dy, -1, 1) };
            return next;
        });
    }, []);

    const handleMultiPointerUp = useCallback(() => {
        multiDragRef.current = null;
    }, []);

    useEffect(() => {
        if (!isOpen || !isMultiStyle) return;
        window.addEventListener('mousemove', handleMultiPointerMove);
        window.addEventListener('mouseup', handleMultiPointerUp);
        window.addEventListener('touchmove', handleMultiPointerMove, { passive: false });
        window.addEventListener('touchend', handleMultiPointerUp);
        return () => {
            window.removeEventListener('mousemove', handleMultiPointerMove);
            window.removeEventListener('mouseup', handleMultiPointerUp);
            window.removeEventListener('touchmove', handleMultiPointerMove);
            window.removeEventListener('touchend', handleMultiPointerUp);
        };
    }, [isOpen, isMultiStyle, handleMultiPointerMove, handleMultiPointerUp]);

    // 사진별 확대 변경 헬퍼
    const updatePhotoZoom = (idx, zoom) => {
        setPhotoZooms(prev => {
            const next = [...prev];
            const cur = next[idx] || { zoom: 1, ox: 0, oy: 0 };
            next[idx] = { ...cur, zoom };
            // 줌이 1이면 오프셋 초기화
            if (zoom <= 1) next[idx] = { zoom: 1, ox: 0, oy: 0 };
            return next;
        });
    };

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
        // 항상 문서 맨 앞에 삽입
        editor.chain().insertContentAt(0, { type: 'image', attrs: { src: previewUrl, alt: mainText || '썸네일' } }).focus().run();
        showToast('썸네일이 본문 상단에 삽입되었습니다.', 'success');
        // 모바일: 바텀시트 닫기 + 삽입 위치로 스크롤
        if (onLocate) onLocate(null);
        setTimeout(() => {
            const img = document.querySelector('.tiptap-content-area img[alt="' + (mainText || '썸네일') + '"]');
            if (img) img.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleSaveStyle = () => {
        if (savedStyles.length >= 3) return showToast('최대 3개까지 저장 가능합니다.', 'warning');
        const name = prompt('스타일 이름을 입력하세요:');
        if (!name?.trim()) return;
        const newStyle = {
            name: name.trim(),
            style, fontFamily, fontColor, mainFontSize, subFontSize,
            shadow, outline, bgBox,
        };
        const updated = [...savedStyles, newStyle];
        setSavedStyles(updated);
        localStorage.setItem('piklit_thumb_styles', JSON.stringify(updated));
        showToast(`"${name.trim()}" 스타일이 저장되었습니다.`, 'success');
    };

    const handleLoadStyle = (s) => {
        setStyle(s.style); setFontFamily(s.fontFamily);
        setFontColor(s.fontColor || ''); setMainFontSize(s.mainFontSize || 64);
        setSubFontSize(s.subFontSize || 36);
        setShadow(s.shadow || '없음'); setOutline(s.outline || '없음'); setBgBox(s.bgBox || '없음');
    };

    const handleDeleteStyle = (idx) => {
        const updated = savedStyles.filter((_, i) => i !== idx);
        setSavedStyles(updated);
        localStorage.setItem('piklit_thumb_styles', JSON.stringify(updated));
    };

    const hasPhotos = availablePhotos.length > 0;
    const showTextControls = style !== 'G';
    const maxExtraPhotos = style === 'I' ? 3 : 2; // I: 최대 4장(1+3), H: 3장(1+2)

    const SHADOW_OPTIONS = ['없음', '약하게', '보통', '강하게', '네온'];
    const OUTLINE_OPTIONS = ['없음', '얇은', '보통', '두꺼운'];
    const BGBOX_OPTIONS = ['없음', '검정', '흰색', '커스텀'];

    return (
        <div className="thumbnail-panel">
            <button
                className={`v3-panel-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>썸네일 생성</span>
                <ChevronDown size={16} className={`v3-panel-chevron ${isOpen ? 'open' : ''}`} />
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
                                {availablePhotos.filter(url => !brokenImgs.has(url)).map((url, i) => (
                                    <div
                                        key={i}
                                        className={`thumbnail-photo-option ${selectedPhoto === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedPhoto(url)}
                                    >
                                        <img src={url} alt={`사진 ${i + 1}`} onError={() => setBrokenImgs(prev => new Set(prev).add(url))} />
                                    </div>
                                ))}
                            </div>

                            {/* 미리보기 */}
                            <div
                                ref={previewRef}
                                className={`thumbnail-preview ${(isMultiStyle ? photoZooms.some(z => z?.zoom > 1) : zoom > 1) ? 'thumbnail-preview-draggable' : ''}`}
                                onMouseDown={isMultiStyle ? handleMultiPointerDown : handlePointerDown}
                                onTouchStart={isMultiStyle ? handleMultiPointerDown : handlePointerDown}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="썸네일 미리보기" draggable={false} />
                                ) : (
                                    <div className="thumbnail-preview-empty">미리보기 생성 중...</div>
                                )}
                            </div>

                            {/* 확대 (다중 사진 스타일에서는 숨김) */}
                            {!isMultiStyle && <div className="thumbnail-zoom-row">
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
                            </div>}

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

                            {/* 반분할 옵션 (스타일 H) */}
                            {style === 'H' && (() => {
                                const slotLabels = splitDirection === 'vertical'
                                    ? ['상단', '중단', '하단'] : ['좌측', '중앙', '우측'];
                                const allPhotos = [selectedPhoto, ...extraPhotos];
                                const totalPhotos = allPhotos.length;
                                const otherPhotos = availablePhotos.filter(url => !brokenImgs.has(url) && !allPhotos.includes(url));
                                return (
                                <div className="thumbnail-multi-options">
                                    <div className="thumbnail-section-label">
                                        반분할 설정
                                        <span className="thumbnail-photo-count">{totalPhotos}/{maxExtraPhotos + 1}장</span>
                                    </div>
                                    {/* 슬롯별 사진 선택 */}
                                    {slotLabels.slice(0, totalPhotos < 3 ? 2 : 3).map((label, slotIdx) => (
                                        <div key={slotIdx} className="thumbnail-slot-row">
                                            <span className="thumbnail-slot-label">{label}</span>
                                            <div className="thumbnail-slot-photos">
                                                {slotIdx === 0 ? (
                                                    <div className="thumbnail-photo-option selected mini-slot">
                                                        <img src={selectedPhoto} alt="사진 1" />
                                                        <span className="thumbnail-slot-badge">1</span>
                                                    </div>
                                                ) : extraPhotos[slotIdx - 1] ? (
                                                    <div
                                                        className="thumbnail-photo-option selected mini-slot"
                                                        onClick={() => setExtraPhotos(prev => prev.filter((_, i) => i !== slotIdx - 1))}
                                                    >
                                                        <img src={extraPhotos[slotIdx - 1]} alt={`사진 ${slotIdx + 1}`} />
                                                        <span className="thumbnail-slot-badge">{slotIdx + 1}</span>
                                                        <span className="thumbnail-slot-remove">✕</span>
                                                    </div>
                                                ) : (
                                                    <div className="thumbnail-photo-grid mini">
                                                        {otherPhotos.map((url, i) => (
                                                            <div
                                                                key={i}
                                                                className="thumbnail-photo-option"
                                                                onClick={() => setExtraPhotos(prev => {
                                                                    const next = [...prev];
                                                                    next[slotIdx - 1] = url;
                                                                    return next;
                                                                })}
                                                            >
                                                                <img src={url} alt={`후보 ${i + 1}`} />
                                                            </div>
                                                        ))}
                                                        {otherPhotos.length === 0 && (
                                                            <div className="thumbnail-multi-hint">사진이 부족합니다</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {/* 3번째 슬롯 추가 버튼 */}
                                    {totalPhotos === 2 && otherPhotos.length > 0 && (
                                        <button
                                            className="thumbnail-add-slot-btn"
                                            onClick={() => setExtraPhotos(prev => [...prev, otherPhotos[0]])}
                                        >
                                            + {slotLabels[2]} 사진 추가
                                        </button>
                                    )}
                                    {/* 사진별 확대 */}
                                    {extraPhotos.length > 0 && (
                                        <div className="thumbnail-multi-zooms">
                                            {Array.from({ length: totalPhotos }, (_, idx) => (
                                                <div key={idx} className="thumbnail-zoom-row compact">
                                                    <label>{slotLabels[idx]}</label>
                                                    <input
                                                        type="range" min="1" max="2.5" step="0.1"
                                                        value={(photoZooms[idx]?.zoom) || 1}
                                                        onChange={e => updatePhotoZoom(idx, parseFloat(e.target.value))}
                                                    />
                                                    <span className="thumbnail-zoom-value">{((photoZooms[idx]?.zoom) || 1).toFixed(1)}x</span>
                                                </div>
                                            ))}
                                            <div className="thumbnail-multi-hint">확대 후 미리보기를 드래그하여 위치를 조정하세요</div>
                                        </div>
                                    )}
                                    <div className="thumbnail-band-row">
                                        <label>방향</label>
                                        <div className="thumbnail-seg compact">
                                            <button className={`thumbnail-seg-btn ${splitDirection === 'vertical' ? 'on' : ''}`} onClick={() => setSplitDirection('vertical')}>상하</button>
                                            <button className={`thumbnail-seg-btn ${splitDirection === 'horizontal' ? 'on' : ''}`} onClick={() => setSplitDirection('horizontal')}>좌우</button>
                                        </div>
                                    </div>
                                    <div className="thumbnail-band-row">
                                        <label>색상</label>
                                        <div className="thumbnail-color-picker">
                                            <input type="color" value={bandColor} onChange={e => setBandColor(e.target.value)} />
                                            <span>{bandColor}</span>
                                        </div>
                                    </div>
                                    <div className="thumbnail-band-row">
                                        <label>띠 두께</label>
                                        <input type="range" min="40" max="200" step="10" value={bandHeight} onChange={e => setBandHeight(Number(e.target.value))} />
                                        <span className="thumbnail-slider-value">{bandHeight}px</span>
                                    </div>
                                </div>
                                );
                            })()}

                            {/* 매거진 옵션 (스타일 I) */}
                            {style === 'I' && (
                                <div className="thumbnail-multi-options">
                                    <div className="thumbnail-section-label">
                                        매거진 사진 선택
                                        <span className="thumbnail-photo-count">{1 + extraPhotos.length}/{maxExtraPhotos + 1}장</span>
                                    </div>
                                    <div className="thumbnail-multi-photo-select">
                                        <div className="thumbnail-photo-grid mini">
                                            {availablePhotos.filter(url => url !== selectedPhoto && !brokenImgs.has(url)).map((url, i) => {
                                                const isSelected = extraPhotos.includes(url);
                                                const idx = extraPhotos.indexOf(url);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`thumbnail-photo-option ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setExtraPhotos(prev => prev.filter(u => u !== url));
                                                            } else if (extraPhotos.length < maxExtraPhotos) {
                                                                setExtraPhotos(prev => [...prev, url]);
                                                            }
                                                        }}
                                                    >
                                                        <img src={url} alt={`사진 ${i + 2}`} />
                                                        {isSelected && <span className="thumbnail-multi-badge">{idx + 2}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {availablePhotos.filter(url => url !== selectedPhoto && !brokenImgs.has(url)).length === 0 && (
                                            <div className="thumbnail-multi-hint">사진이 2장 이상 필요합니다</div>
                                        )}
                                    </div>
                                    <div className="thumbnail-band-row">
                                        <label>간격</label>
                                        <input type="range" min="0" max="24" step="2" value={gridGap} onChange={e => setGridGap(Number(e.target.value))} />
                                        <span className="thumbnail-slider-value">{gridGap}px</span>
                                    </div>
                                    {/* 사진별 확대 */}
                                    {extraPhotos.length > 0 && (
                                        <div className="thumbnail-multi-zooms">
                                            {Array.from({ length: 1 + extraPhotos.length }, (_, idx) => (
                                                <div key={idx} className="thumbnail-zoom-row compact">
                                                    <label>사진 {idx + 1}</label>
                                                    <input
                                                        type="range" min="1" max="2.5" step="0.1"
                                                        value={(photoZooms[idx]?.zoom) || 1}
                                                        onChange={e => updatePhotoZoom(idx, parseFloat(e.target.value))}
                                                    />
                                                    <span className="thumbnail-zoom-value">{((photoZooms[idx]?.zoom) || 1).toFixed(1)}x</span>
                                                </div>
                                            ))}
                                            <div className="thumbnail-multi-hint">확대 후 미리보기를 드래그하여 위치를 조정하세요</div>
                                        </div>
                                    )}
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

                            {/* 텍스트 효과 */}
                            {showTextControls && (
                                <div className="thumbnail-effects-section">
                                    <div className="thumbnail-section-label">텍스트 효과 <span className="thumbnail-new-tag">NEW</span></div>
                                    <div className="thumbnail-eff-group">
                                        <div className="thumbnail-eff-label">그림자</div>
                                        <div className="thumbnail-seg">
                                            {SHADOW_OPTIONS.map(opt => (
                                                <button key={opt} className={`thumbnail-seg-btn ${shadow === opt ? 'on' : ''}`} onClick={() => setShadow(opt)}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="thumbnail-eff-group">
                                        <div className="thumbnail-eff-label">윤곽선</div>
                                        <div className="thumbnail-seg">
                                            {OUTLINE_OPTIONS.map(opt => (
                                                <button key={opt} className={`thumbnail-seg-btn ${outline === opt ? 'on' : ''}`} onClick={() => { setOutline(opt); if (opt !== '없음') setBgBox('없음'); }}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="thumbnail-eff-group">
                                        <div className="thumbnail-eff-label">배경박스</div>
                                        <div className="thumbnail-seg">
                                            {BGBOX_OPTIONS.map(opt => (
                                                <button key={opt} className={`thumbnail-seg-btn ${bgBox === opt ? 'on' : ''}`} onClick={() => { setBgBox(opt); if (opt !== '없음') setOutline('없음'); }}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 내 스타일 */}
                            <div className="thumbnail-my-style-section">
                                <div className="thumbnail-section-label">내 스타일 <span className="thumbnail-new-tag">NEW</span></div>
                                <button className="thumbnail-my-style-btn" onClick={handleSaveStyle}>
                                    + 현재 설정을 스타일로 저장 ({savedStyles.length}/3)
                                </button>
                                {savedStyles.length > 0 && (
                                    <div className="thumbnail-my-chips">
                                        {savedStyles.map((s, i) => (
                                            <div key={i} className="thumbnail-my-chip" onClick={() => handleLoadStyle(s)}>
                                                {s.name}
                                                <span className="thumbnail-my-chip-x" onClick={e => { e.stopPropagation(); handleDeleteStyle(i); }}>✕</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

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
