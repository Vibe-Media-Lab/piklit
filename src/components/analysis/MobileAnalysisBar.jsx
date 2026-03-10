import { useState, useEffect, useCallback } from 'react';
import { Edit3, BarChart3, BookOpen, Sparkles, Image, ChevronUp } from 'lucide-react';
import { clearLocateHighlight } from '../../utils/readability';
import BottomSheet from '../common/BottomSheet';

const TABS = [
    { id: 'editor', icon: Edit3, label: '글' },
    { id: 'seo', icon: BarChart3, label: 'SEO' },
    { id: 'readability', icon: BookOpen, label: '읽기 쉬움' },
    { id: 'humanness', icon: Sparkles, label: 'AI탐지' },
    { id: 'thumbnail', icon: Image, label: '썸네일' },
];

const MobileAnalysisBar = ({ seoScore, children }) => {
    const [activeTab, setActiveTab] = useState('editor');
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    // 미니바 상태: { text: '제안 텍스트' } or null
    const [miniBar, setMiniBar] = useState(null);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const handleResize = () => {
            const keyboardOpen = vv.height < window.innerHeight * 0.75;
            setIsKeyboardOpen(keyboardOpen);
        };
        vv.addEventListener('resize', handleResize);
        return () => vv.removeEventListener('resize', handleResize);
    }, []);

    const handleTabClick = (tabId) => {
        // 미니바 활성 중 탭 클릭 → 미니바 해제
        if (miniBar) {
            clearLocateHighlight();
            setMiniBar(null);
        }

        if (tabId === 'editor') {
            setActiveTab('editor');
            return;
        }
        setActiveTab(tabId === activeTab ? 'editor' : tabId);
    };

    // "위치 보기" 클릭 시 호출 — 바텀시트 최소화 + 미니바 표시
    const handleLocate = useCallback((suggestionText) => {
        setActiveTab('editor'); // 바텀시트 닫기
        setMiniBar({ text: suggestionText });
    }, []);

    // 미니바에서 "SEO 패널 열기" 클릭
    const handleMiniBarExpand = () => {
        clearLocateHighlight();
        setMiniBar(null);
        setActiveTab('seo');
    };

    // 미니바 닫기
    const handleMiniBarClose = () => {
        clearLocateHighlight();
        setMiniBar(null);
    };

    const isSheetOpen = activeTab !== 'editor';

    const getScoreColor = (score) => {
        if (score >= 80) return '#27AE60';
        if (score >= 60) return '#F59E0B';
        return '#EB5757';
    };

    if (isKeyboardOpen) return null;

    return (
        <>
            {/* dim 오버레이 */}
            {isSheetOpen && <div className="mobile-analysis-dim" onClick={() => setActiveTab('editor')} />}

            {/* 바텀 시트 */}
            <BottomSheet
                isOpen={isSheetOpen}
                onClose={() => setActiveTab('editor')}
                snapPoints={[0.92]}
                title={TABS.find(t => t.id === activeTab)?.label}
            >
                {children?.(activeTab, handleLocate)}
            </BottomSheet>

            {/* 미니바 — 위치 보기 활성 시 탭바 위에 표시 */}
            {miniBar && (
                <div className="mobile-locate-minibar">
                    <span className="mobile-locate-minibar-text">{miniBar.text}</span>
                    <button className="mobile-locate-minibar-btn" onClick={handleMiniBarExpand}>
                        <ChevronUp size={14} /> SEO 열기
                    </button>
                    <button className="mobile-locate-minibar-close" onClick={handleMiniBarClose}>
                        ✕
                    </button>
                </div>
            )}

            {/* 하단 탭바 */}
            <nav className="mobile-analysis-tabbar">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            className={`mobile-analysis-tab${isActive ? ' active' : ''}`}
                            onClick={() => handleTabClick(tab.id)}
                        >
                            <div className="mobile-analysis-tab-icon">
                                <Icon size={24} />
                                {tab.id === 'seo' && seoScore != null && (
                                    <span
                                        className="mobile-analysis-seo-badge"
                                        style={{ background: getScoreColor(seoScore) }}
                                    >
                                        {seoScore}
                                    </span>
                                )}
                            </div>
                            <span className="mobile-analysis-tab-label">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
};

export default MobileAnalysisBar;
