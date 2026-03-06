import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 재사용 바텀 시트
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {number[]} snapPoints - 예: [0.4, 0.75, 0.9]
 * @param {string} title
 * @param {ReactNode} children
 */
const BottomSheet = ({ isOpen, onClose, snapPoints = [0.4, 0.75, 0.9], title, children }) => {
    const sheetRef = useRef(null);
    const dragRef = useRef({ startY: 0, currentY: 0, isDragging: false });
    const [snapIndex, setSnapIndex] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const getHeight = useCallback(() => {
        const vh = window.visualViewport?.height || window.innerHeight;
        return vh * snapPoints[snapIndex];
    }, [snapIndex, snapPoints]);

    // 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setSnapIndex(0);
            setTranslateY(0);
        }
    }, [isOpen]);

    // 배경 스크롤 방지
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    const handleDragStart = (e) => {
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        dragRef.current = { startY: y, currentY: y, isDragging: true };
        setIsDragging(true);
    };

    const handleDragMove = useCallback((e) => {
        if (!dragRef.current.isDragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = y - dragRef.current.startY;
        dragRef.current.currentY = y;
        // 아래로만 드래그 허용 (위로는 스냅으로 처리)
        setTranslateY(Math.max(0, delta));
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragRef.current.isDragging) return;
        dragRef.current.isDragging = false;
        setIsDragging(false);

        const delta = dragRef.current.currentY - dragRef.current.startY;

        if (delta > 100) {
            // 아래로 많이 드래그 → 닫기
            onClose();
        } else if (delta < -60 && snapIndex < snapPoints.length - 1) {
            // 위로 드래그 → 다음 스냅
            setSnapIndex(prev => prev + 1);
        }
        setTranslateY(0);
    }, [onClose, snapIndex, snapPoints.length]);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e) => handleDragMove(e);
        const onEnd = () => handleDragEnd();
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        return () => {
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    if (!isOpen) return null;

    const height = getHeight();

    return (
        <>
            <div className="bottomsheet-overlay" onClick={onClose} />
            <div
                ref={sheetRef}
                className="bottomsheet"
                style={{
                    height: `${height}px`,
                    transform: `translateY(${translateY}px)`,
                    transition: isDragging ? 'none' : 'transform var(--transition-sheet), height var(--transition-sheet)',
                }}
            >
                <div
                    className="bottomsheet-handle-area"
                    onTouchStart={handleDragStart}
                    onMouseDown={handleDragStart}
                >
                    <div className="bottomsheet-handle" />
                    <button className="bottomsheet-close" onClick={onClose} aria-label="닫기">
                        &times;
                    </button>
                </div>
                {title && <div className="bottomsheet-title">{title}</div>}
                <div className="bottomsheet-content">
                    {children}
                </div>
            </div>
        </>
    );
};

export default BottomSheet;
