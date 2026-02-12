import React from 'react';
import { useParams } from 'react-router-dom';
import TitleInput from './TitleInput';
import TiptapEditor from './TiptapEditor';
import IntroOptimizer from './IntroOptimizer';
import ReadabilityPanel from '../analysis/ReadabilityPanel';

const EditorContainer = () => {
    const { id } = useParams(); // Key to force remount

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <TitleInput />
            <IntroOptimizer />
            <div className="content-area">
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    본문
                </h3>
                <TiptapEditor key={id} />
            </div>
            <ReadabilityPanel />
        </div>
    );
};

export default EditorContainer;
