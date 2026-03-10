import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { callListBetaUsers } from '../services/firebase';
import '../styles/components.css';

const AdminBetaPage = () => {
    const { isAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, active, expired

    useEffect(() => {
        if (!isAdmin) return;
        setLoading(true);
        callListBetaUsers()
            .then(result => setData(result.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [isAdmin]);

    if (!isAdmin) {
        return <div className="admin-bugs-center">접근 권한이 없습니다.</div>;
    }

    if (loading) {
        return <div className="admin-bugs-center">로딩 중...</div>;
    }

    if (error) {
        return <div className="admin-bugs-center admin-bugs-center--error">오류: {error}</div>;
    }

    const users = data?.users || [];
    const filtered = filter === 'all' ? users
        : filter === 'active' ? users.filter(u => u.active)
        : users.filter(u => !u.active);

    return (
        <div className="admin-bugs-page">
            <div className="admin-bugs-header">
                <h2>Beta Testers ({data?.total || 0} / {data?.maxUsers || 100})</h2>
                <div className="admin-beta-summary">
                    <span
                        className={`admin-beta-filter ${filter === 'all' ? 'admin-beta-filter--active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        전체 {data?.total || 0}
                    </span>
                    <span
                        className={`admin-beta-filter ${filter === 'active' ? 'admin-beta-filter--active' : ''}`}
                        onClick={() => setFilter('active')}
                        style={{ color: '#27AE60' }}
                    >
                        활성 {data?.active || 0}
                    </span>
                    <span
                        className={`admin-beta-filter ${filter === 'expired' ? 'admin-beta-filter--active' : ''}`}
                        onClick={() => setFilter('expired')}
                        style={{ color: '#EB5757' }}
                    >
                        만료 {data?.expired || 0}
                    </span>
                </div>
            </div>

            {/* 진행 바 */}
            <div className="admin-beta-progress">
                <div className="admin-beta-progress-track">
                    <div
                        className="admin-beta-progress-bar"
                        style={{ width: `${Math.min(((data?.total || 0) / (data?.maxUsers || 100)) * 100, 100)}%` }}
                    />
                </div>
                <span className="admin-beta-progress-label">
                    {data?.activatedCount || 0} / {data?.maxUsers || 100}명 등록
                </span>
            </div>

            {filtered.length === 0 ? (
                <div className="admin-bugs-empty">
                    {filter === 'all' ? '아직 베타 테스터가 없습니다.' : `${filter === 'active' ? '활성' : '만료'} 테스터가 없습니다.`}
                </div>
            ) : (
                <div className="admin-beta-table-wrap">
                    <table className="admin-beta-table">
                        <thead>
                            <tr>
                                <th>이름</th>
                                <th>소속</th>
                                <th>활성화일</th>
                                <th>상태</th>
                                <th>글 생성</th>
                                <th>이미지</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(user => (
                                <tr key={user.id}>
                                    <td className="admin-beta-name">{user.name}</td>
                                    <td className="admin-beta-affiliation">{user.affiliation}</td>
                                    <td className="admin-beta-date">{formatDate(user.activatedAt)}</td>
                                    <td>
                                        {user.active ? (
                                            <span className="admin-beta-badge admin-beta-badge--active">
                                                D-{user.daysLeft}
                                            </span>
                                        ) : (
                                            <span className="admin-beta-badge admin-beta-badge--expired">
                                                만료
                                            </span>
                                        )}
                                    </td>
                                    <td className="admin-beta-count">{user.draftCount} / 21</td>
                                    <td className="admin-beta-count">{user.imageCount} / 5</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default AdminBetaPage;
