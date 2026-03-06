import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileFab = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // 에디터 페이지나 랜딩에서는 숨김
    const isEditor = location.pathname.startsWith('/editor/');
    const isLanding = location.pathname === '/';

    if (!isLoggedIn || isEditor || isLanding) return null;

    return (
        <button
            className="mobile-fab"
            onClick={() => navigate('/editor/new')}
            aria-label="새 글 작성"
        >
            <Plus size={24} strokeWidth={2.5} />
        </button>
    );
};

export default MobileFab;
