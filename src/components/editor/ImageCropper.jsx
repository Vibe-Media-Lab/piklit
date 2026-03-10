import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/components.css';

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
        <div className="cropper-wrapper">
            {/* Crop area */}
            <div
                ref={containerRef}
                className="cropper-container"
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
                    className="cropper-img"
                />
                {renderOverlay()}
            </div>

            {/* Crop action buttons */}
            <div className="cropper-actions">
                <button
                    onClick={performCrop}
                    disabled={!hasValidSelection}
                    className="cropper-btn-crop"
                >
                    ✂️ 크롭하기
                </button>
                <button
                    onClick={onClose}
                    className="cropper-btn-back"
                >
                    돌아가기
                </button>
            </div>

            {/* Cropped images grid */}
            {croppedImages.length > 0 && (
                <div className="cropper-results">
                    <div className="cropper-results-label">
                        크롭된 이미지 ({croppedImages.length}장)
                    </div>
                    <div className="cropper-grid">
                        {croppedImages.map((item, index) => (
                            <div key={index} className="cropper-grid-item">
                                <img
                                    src={item.url}
                                    alt={`크롭 ${index + 1}`}
                                />
                                {/* Remove button */}
                                <button
                                    onClick={() => removeCropped(index)}
                                    className="cropper-btn-remove"
                                >
                                    ✕
                                </button>
                                {/* Use button */}
                                <button
                                    onClick={() => handleApplyOne(item)}
                                    className="cropper-btn-use"
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
                            className="cropper-btn-apply-all"
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
