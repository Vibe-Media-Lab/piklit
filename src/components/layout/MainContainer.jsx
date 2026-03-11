import React from 'react';
import './Layout.css';
import EditorContainer from '../editor/EditorContainer';
import AnalysisSidebar from '../analysis/AnalysisSidebar';
import MobileAnalysisBar from '../analysis/MobileAnalysisBar';
import { useEditor } from '../../context/EditorContext';
import ReadabilityPanel from '../analysis/ReadabilityPanel';
import HumannessPanel from '../analysis/HumannessPanel';
import ThumbnailPanel from '../analysis/ThumbnailPanel';
import AIAnalysisDashboard from '../analysis/AIAnalysisDashboard';

const MobilePanelContent = ({ activeTab, onLocate }) => {
    switch (activeTab) {
        case 'seo':
            return <AIAnalysisDashboard onLocate={onLocate} compact />;
        case 'readability':
            return <ReadabilityPanel onLocate={onLocate} />;
        case 'humanness':
            return <HumannessPanel onLocate={onLocate} />;
        case 'thumbnail':
            return <ThumbnailPanel />;
        default:
            return null;
    }
};

const MainContainer = () => {
    const { analysis } = useEditor();
    const checks = analysis?.checks || {};
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const seoScore = Math.round((score / maxScore) * 100);

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
            <MobileAnalysisBar seoScore={seoScore}>
                {(activeTab, onLocate) => <MobilePanelContent activeTab={activeTab} onLocate={onLocate} />}
            </MobileAnalysisBar>
        </>
    );
};

export default MainContainer;
