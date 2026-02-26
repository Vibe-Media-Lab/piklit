import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useEditor } from '../../context/EditorContext';
import { copyToClipboard, exportAsMarkdown, exportAsHtml, exportAsText } from '../../utils/clipboard';
import { Save, Copy, Download, Check, ChevronDown } from 'lucide-react';

const PAGE_TITLES = {
    '/posts': '내 글',
    '/dashboard': '성장 리포트',
};

const TopBar = () => {
    const { title, content, savePost, currentPostId } = useEditor();
    const location = useLocation();
    const { id } = useParams();
    const [copyStatus, setCopyStatus] = useState('idle');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => {
        if (!exportOpen) return;
        const handleClickOutside = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportOpen]);

    const handleSave = () => {
        const success = savePost();
        if (success) {
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    const handleCopy = async () => {
        const success = await copyToClipboard(title, content);
        if (success) {
            setCopyStatus('success');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } else {
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    };

    // 페이지 타이틀 결정 — URL params 기반 (currentPostId 설정 지연과 무관하게 즉시 표시)
    const getPageTitle = () => {
        if (id) return title || '새 글';
        return PAGE_TITLES[location.pathname] || '';
    };

    const isEditor = !!id;

    return (
        <div className="app-topbar">
            <h2 className="topbar-title">{getPageTitle()}</h2>

            {isEditor && (
                <div className="topbar-actions">
                    <button className="topbar-btn" onClick={handleSave}>
                        {saveStatus === 'success'
                            ? <><Check size={15} /> 저장됨</>
                            : <><Save size={15} /> 저장</>
                        }
                    </button>
                    <button className="topbar-btn topbar-btn-primary" onClick={handleCopy}>
                        {copyStatus === 'success'
                            ? <><Check size={15} /> 복사됨</>
                            : <><Copy size={15} /> 블로그로 복사</>
                        }
                    </button>
                    <div className="export-dropdown" ref={exportRef}>
                        <button className="topbar-btn" onClick={() => setExportOpen(prev => !prev)}>
                            <Download size={15} /> 내보내기 <ChevronDown size={14} />
                        </button>
                        {exportOpen && (
                            <div className="export-dropdown-menu">
                                <button onClick={() => { exportAsMarkdown(title, content); setExportOpen(false); }}>
                                    Markdown (.md)
                                </button>
                                <button onClick={() => { exportAsHtml(title, content); setExportOpen(false); }}>
                                    HTML (.html)
                                </button>
                                <button onClick={() => { exportAsText(title, content); setExportOpen(false); }}>
                                    텍스트 (.txt)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopBar;
