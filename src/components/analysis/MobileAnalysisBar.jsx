import { useState, useEffect } from 'react';
import { Edit3, BarChart3, BookOpen, Sparkles, Image } from 'lucide-react';
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

    // 키보드 감지 — visualViewport resize
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
        if (tabId === 'editor') {
            setActiveTab('editor');
            return;
        }
        setActiveTab(tabId === activeTab ? 'editor' : tabId);
    };

    const isSheetOpen = activeTab !== 'editor';

    // SEO 점수 뱃지 색상
    const getScoreColor = (score) => {
        if (score >= 80) return '#27AE60';
        if (score >= 60) return '#F59E0B';
        return '#EB5757';
    };

    if (isKeyboardOpen) return null;

    return (
        <>
            {/* dim 오버레이 (에디터 위) */}
            {isSheetOpen && <div className="mobile-analysis-dim" onClick={() => setActiveTab('editor')} />}

            {/* 바텀 시트 */}
            <BottomSheet
                isOpen={isSheetOpen}
                onClose={() => setActiveTab('editor')}
                snapPoints={[0.45, 0.75, 0.9]}
                title={TABS.find(t => t.id === activeTab)?.label}
            >
                {children?.(activeTab)}
            </BottomSheet>

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
                                <Icon size={20} />
                                {tab.id === 'seo' && seoScore != null && (
                                    <span
                                        className="mobile-analysis-seo-badge"
                                        style={{ background: getScoreColor(seoScore) }}
                                    >
                                        {seoScore}
                                    </span>
                                )}
                            </div>
                            {isActive && <span className="mobile-analysis-tab-label">{tab.label}</span>}
                        </button>
                    );
                })}
            </nav>
        </>
    );
};

export default MobileAnalysisBar;
