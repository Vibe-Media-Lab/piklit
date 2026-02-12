import React from 'react';
import AIAnalysisDashboard from './AIAnalysisDashboard';

const AnalysisSidebar = () => {
    return (
        <div>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>AI SEO 어드바이저</h3>
            <AIAnalysisDashboard />
        </div>
    );
};

export default AnalysisSidebar;
