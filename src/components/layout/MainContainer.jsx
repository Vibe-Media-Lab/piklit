import React from 'react';
import './Layout.css';
import EditorContainer from '../editor/EditorContainer';
import AnalysisSidebar from '../analysis/AnalysisSidebar';

const MainContainer = () => {
    return (
        <main className="main-container">
            <section className="editor-section">
                <EditorContainer />
            </section>
            <aside className="analysis-section">
                <AnalysisSidebar />
            </aside>
        </main>
    );
};

export default MainContainer;
