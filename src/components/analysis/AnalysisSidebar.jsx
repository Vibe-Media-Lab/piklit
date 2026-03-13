import React from 'react';
import AIAnalysisDashboard from './AIAnalysisDashboard';
import ThumbnailPanel from './ThumbnailPanel';
import PostHistory from './PostHistory';

const AnalysisSidebar = () => {
    return (
        <div className="v3-sidebar">
            <div className="v3-panel">
                <AIAnalysisDashboard />
            </div>
            <div className="v3-panel">
                <ThumbnailPanel />
            </div>
            <div className="v3-panel">
                <PostHistory />
            </div>
        </div>
    );
};

export default AnalysisSidebar;
