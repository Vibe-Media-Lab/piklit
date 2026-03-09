import React from 'react';
import { useParams } from 'react-router-dom';
import TitleInput from './TitleInput';
import TiptapEditor from './TiptapEditor';
import IntroOptimizer from './IntroOptimizer';

const EditorContainer = () => {
    const { id } = useParams(); // Key to force remount

    return (
        <div className="editor-container">
            <TitleInput />
            <IntroOptimizer />
            <TiptapEditor key={id} />
        </div>
    );
};

export default EditorContainer;
