import React, { useState, useMemo } from 'react';
import './Layout.css';
import EditorContainer from '../editor/EditorContainer';
import AnalysisSidebar from '../analysis/AnalysisSidebar';
import MobileAnalysisBar from '../analysis/MobileAnalysisBar';
import { useEditor } from '../../context/EditorContext';
import { analyzeHumanness } from '../../utils/humanness';
import ThumbnailPanel from '../analysis/ThumbnailPanel';
import AIAnalysisDashboard from '../analysis/AIAnalysisDashboard';

const MobilePanelContent = ({ activeTab, onLocate, humanCache }) => (
    <>
        <div style={{ display: activeTab === 'analysis' ? 'block' : 'none' }}>
            <AIAnalysisDashboard onLocate={onLocate} mode="overview" humanCache={humanCache} />
        </div>
        <div style={{ display: activeTab === 'seo' ? 'block' : 'none' }}>
            <AIAnalysisDashboard onLocate={onLocate} mode="seo" humanCache={humanCache} />
        </div>
        <div style={{ display: activeTab === 'natural' ? 'block' : 'none' }}>
            <AIAnalysisDashboard onLocate={onLocate} mode="natural" humanCache={humanCache} />
        </div>
        <div style={{ display: activeTab === 'thumbnail' ? 'block' : 'none' }}>
            <ThumbnailPanel onLocate={onLocate} />
        </div>
    </>
);

const MainContainer = () => {
    const { analysis, content, suggestedTone } = useEditor();
    const checks = analysis?.checks || {};
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const seoPercentage = Math.round((score / maxScore) * 100);
    const humanResult = useMemo(() => analyzeHumanness(content, suggestedTone), [content, suggestedTone]);
    const totalScore = humanResult.isEmpty
        ? seoPercentage
        : Math.round(seoPercentage * 0.6 + humanResult.score * 0.4);

    // 자연스러움 AI 제안 캐시 (탭 전환 시 소실 방지 — MainContainer 레벨)
    const [cachedAiSuggestions, setCachedAiSuggestions] = useState(null);
    const humanCache = useMemo(() => ({
        cachedAiSuggestions, setCachedAiSuggestions,
    }), [cachedAiSuggestions]);

    return (
        <>
            <main className="main-container">
                <section className="editor-section">
                    <EditorContainer />
                </section>
                <aside className="analysis-section">
                    <AnalysisSidebar />
                </aside>
            </main>
            <MobileAnalysisBar seoScore={totalScore}>
                {(activeTab, onLocate) => <MobilePanelContent activeTab={activeTab} onLocate={onLocate} humanCache={humanCache} />}
            </MobileAnalysisBar>
        </>
    );
};

export default MainContainer;
