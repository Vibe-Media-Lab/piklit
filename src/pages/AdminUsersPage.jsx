import React from 'react';
import { useAuth } from '../context/AuthContext';
import ADMIN_EMAILS from '../data/adminEmails';
import '../styles/components.css';

const AdminUsersPage = () => {
    const { isAdmin } = useAuth();

    if (!isAdmin) {
        return <div className="admin-bugs-center">접근 권한이 없습니다.</div>;
    }

    return (
        <div className="admin-bugs-page">
            <div className="admin-bugs-header">
                <h2>관리자 목록 ({ADMIN_EMAILS.length}명)</h2>
            </div>

            <div className="admin-beta-table-wrap">
                <table className="admin-beta-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>권한</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ADMIN_EMAILS.map(admin => (
                            <tr key={admin.email}>
                                <td className="admin-beta-name">{admin.name}</td>
                                <td className="admin-beta-affiliation">{admin.email}</td>
                                <td>
                                    <span className="admin-beta-badge admin-beta-badge--active">
                                        마스터
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsersPage;
