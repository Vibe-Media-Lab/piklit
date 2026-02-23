import React, { useState, useRef, useCallback, useEffect } from 'react';

const ImageCropper = ({ base64, mimeType, onCropApply, onApplyAll, onClose }) => {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selection, setSelection] = useState(null); // { x, y, w, h } in percentage
    const [startPoint, setStartPoint] = useState(null);
    const [croppedImages, setCroppedImages] = useState([]); // [{ base64, mimeType, url }]

    // Get percentage coordinates from mouse/touch event
    const getPercentCoords = useCallback((clientX, clientY) => {
        const container = containerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        };
    }, []);

    const handlePointerDown = useCallback((clientX, clientY) => {
        const coords = getPercentCoords(clientX, clientY);
        if (!coords) return;
        setIsDragging(true);
        setStartPoint(coords);
        setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }, [getPercentCoords]);

    const handlePointerMove = useCallback((clientX, clientY) => {
        if (!isDragging || !startPoint) return;
        const coords = getPercentCoords(clientX, clientY);
        if (!coords) return;
        const x = Math.min(startPoint.x, coords.x);
        const y = Math.min(startPoint.y, coords.y);
        const w = Math.abs(coords.x - startPoint.x);
        const h = Math.abs(coords.y - startPoint.y);
        setSelection({ x, y, w, h });
    }, [isDragging, startPoint, getPercentCoords]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Mouse events
    const onMouseDown = (e) => {
        e.preventDefault();
        handlePointerDown(e.clientX, e.clientY);
    };
    const onMouseMove = (e) => {
        handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
        handlePointerUp();
    };

    // Touch events
    const onTouchStart = (e) => {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            handlePointerDown(t.clientX, t.clientY);
        }
    };
    const onTouchMove = (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            handlePointerMove(t.clientX, t.clientY);
        }
    };
    const onTouchEnd = () => {
        handlePointerUp();
    };

    // Global mouse up listener
    useEffect(() => {
        const up = () => setIsDragging(false);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchend', up);
        };
    }, []);

    // Perform the actual crop using canvas
    const performCrop = useCallback(() => {
        if (!selection || selection.w < 1 || selection.h < 1) return;

        const img = new Image();
        img.onload = () => {
            const sx = (selection.x / 100) * img.naturalWidth;
            const sy = (selection.y / 100) * img.naturalHeight;
            const sw = (selection.w / 100) * img.naturalWidth;
            const sh = (selection.h / 100) * img.naturalHeight;

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(sw);
            canvas.height = Math.round(sh);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), 0, 0, Math.round(sw), Math.round(sh));

            const croppedBase64 = canvas.toDataURL(mimeType).split(',')[1];
            const url = canvas.toDataURL(mimeType);

            setCroppedImages(prev => [...prev, { base64: croppedBase64, mimeType, url }]);
            setSelection(null);
            setStartPoint(null);
        };
        img.src = `data:${mimeType};base64,${base64}`;
    }, [selection, base64, mimeType]);

    const removeCropped = (index) => {
        setCroppedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleApplyOne = (item) => {
        if (onCropApply) onCropApply({ base64: item.base64, mimeType: item.mimeType });
    };

    const handleApplyAll = () => {
        if (onApplyAll && croppedImages.length > 0) {
            onApplyAll(croppedImages.map(c => ({ base64: c.base64, mimeType: c.mimeType })));
        }
    };

    const hasValidSelection = selection && selection.w >= 1 && selection.h >= 1;

    // Overlay clip path: the dark area is everything EXCEPT the selection
    const renderOverlay = () => {
        if (!selection) return null;
        const { x, y, w, h } = selection;
        return (
            <>
                {/* Top */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%',
                    height: `${y}%`, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none',
                }} />
                {/* Bottom */}
                <div style={{
                    position: 'absolute', top: `${y + h}%`, left: 0, width: '100%',
                    bottom: 0, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none',
                }} />
                {/* Left */}
                <div style={{
                    position: 'absolute', top: `${y}%`, left: 0,
                    width: `${x}%`, height: `${h}%`,
                    background: 'rgba(0,0,0,0.5)', pointerEvents: 'none',
                }} />
                {/* Right */}
                <div style={{
                    position: 'absolute', top: `${y}%`, left: `${x + w}%`,
                    right: 0, height: `${h}%`,
                    background: 'rgba(0,0,0,0.5)', pointerEvents: 'none',
                }} />
                {/* Selection border */}
                <div style={{
                    position: 'absolute',
                    top: `${y}%`, left: `${x}%`,
                    width: `${w}%`, height: `${h}%`,
                    border: '2px dashed #fff',
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                }} />
            </>
        );
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Crop area */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    userSelect: 'none',
                    cursor: 'crosshair',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    lineHeight: 0,
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    ref={imgRef}
                    src={`data:${mimeType};base64,${base64}`}
                    alt="크롭할 이미지"
                    draggable={false}
                    style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                />
                {renderOverlay()}
            </div>

            {/* Crop action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                    onClick={performCrop}
                    disabled={!hasValidSelection}
                    style={{
                        flex: 1, padding: '10px', background: hasValidSelection ? '#FF6B35' : '#ccc',
                        color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '0.85rem', fontWeight: 600,
                        cursor: hasValidSelection ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s',
                    }}
                >
                    ✂️ 크롭하기
                </button>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1, padding: '10px', background: 'white',
                        border: '1px solid #ddd', borderRadius: '8px',
                        fontSize: '0.85rem', cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                >
                    돌아가기
                </button>
            </div>

            {/* Cropped images grid */}
            {croppedImages.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{
                        fontSize: '0.8rem', fontWeight: 600, color: '#555',
                        marginBottom: '8px',
                    }}>
                        크롭된 이미지 ({croppedImages.length}장)
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '8px',
                    }}>
                        {croppedImages.map((item, index) => (
                            <div key={index} style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #e0e0e0',
                                aspectRatio: '1',
                            }}>
                                <img
                                    src={item.url}
                                    alt={`크롭 ${index + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                {/* Remove button */}
                                <button
                                    onClick={() => removeCropped(index)}
                                    style={{
                                        position: 'absolute', top: '4px', right: '4px',
                                        background: 'rgba(255,255,255,0.9)', border: '1px solid #ddd',
                                        borderRadius: '50%', width: '20px', height: '20px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: '11px', color: '#555', lineHeight: 1,
                                        padding: 0,
                                    }}
                                >
                                    ✕
                                </button>
                                {/* Use button */}
                                <button
                                    onClick={() => handleApplyOne(item)}
                                    style={{
                                        position: 'absolute', bottom: '4px', left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(255,107,53,0.9)', color: 'white',
                                        border: 'none', borderRadius: '4px',
                                        padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}
                                >
                                    사용
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Apply all button */}
                    {croppedImages.length >= 2 && (
                        <button
                            onClick={handleApplyAll}
                            style={{
                                width: '100%', marginTop: '10px', padding: '10px',
                                background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            모두 사용하기 ({croppedImages.length}장)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageCropper;
