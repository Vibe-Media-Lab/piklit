import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../../context/EditorContext';

const MobileFab = () => {
    const { isLoggedIn } = useAuth();
    const { createPost } = useEditor();
    const navigate = useNavigate();
    const location = useLocation();

    // 에디터 페이지나 랜딩, 가이드에서는 숨김
    const isEditor = location.pathname.startsWith('/editor/');
    const isLanding = location.pathname === '/';
    const isGuide = location.pathname === '/beta-guide';

    if (!isLoggedIn || isEditor || isLanding || isGuide) return null;

    const handleCreate = () => {
        const newId = createPost({ mode: 'ai' });
        navigate(`/editor/${newId}`, { state: { isNew: true } });
    };

    return (
        <button
            className="mobile-fab"
            onClick={handleCreate}
            aria-label="새 글 작성"
        >
            <Plus size={24} strokeWidth={2.5} />
        </button>
    );
};

export default MobileFab;
