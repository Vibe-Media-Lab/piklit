import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { callListBugReports, callUpdateBugStatus } from '../services/firebase';
import '../styles/components.css';

const STATUS_LABELS = {
    new: { label: '신규', color: '#EB5757', bg: '#FFF0F0' },
    checked: { label: '확인', color: '#E67E22', bg: '#FFF8F0' },
    resolved: { label: '해결', color: '#27AE60', bg: '#F0FFF4' },
};

const AdminBugsPage = () => {
    const { isAdmin } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [screenshotId, setScreenshotId] = useState(null);

    useEffect(() => {
        if (!isAdmin) return;
        setLoading(true);
        callListBugReports()
            .then(result => setReports(result.data?.reports || []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [isAdmin]);

    const handleStatusChange = async (reportId, newStatus) => {
        try {
            await callUpdateBugStatus(reportId, newStatus);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
        } catch (err) {
            alert('상태 변경 실패: ' + err.message);
        }
    };

    if (!isAdmin) {
        return (
            <div className="admin-bugs-center">
                접근 권한이 없습니다.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-bugs-center">
                로딩 중...
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-bugs-center admin-bugs-center--error">
                오류: {error}
            </div>
        );
    }

    return (
        <div className="admin-bugs-page">
            <div className="admin-bugs-header">
                <h2>Bug Reports ({reports.length})</h2>
                <div className="admin-bugs-status-summary">
                    {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
                        const count = reports.filter(r => r.status === key).length;
                        return (
                            <span key={key} className="admin-bugs-status-count" style={{ color }}>
                                {label}: {count}
                            </span>
                        );
                    })}
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="admin-bugs-empty">
                    아직 버그 리포트가 없습니다.
                </div>
            ) : (
                <div className="admin-bugs-list">
                    {reports.map(report => {
                        const status = STATUS_LABELS[report.status] || STATUS_LABELS.new;
                        const isExpanded = expandedId === report.id;
                        const showScreenshot = screenshotId === report.id;

                        return (
                            <div key={report.id} className="admin-bugs-card">
                                {/* 헤더 */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                    className={`admin-bugs-card-header ${isExpanded ? 'admin-bugs-card-header--expanded' : ''}`}
                                >
                                    <div className="admin-bugs-card-body">
                                        <div className="admin-bugs-meta">
                                            <span
                                                className="admin-bugs-badge"
                                                style={{ color: status.color, background: status.bg }}
                                            >
                                                {status.label}
                                            </span>
                                            <span className="admin-bugs-email">
                                                {report.email}
                                            </span>
                                            <span className="admin-bugs-date">
                                                {formatDate(report.createdAt)}
                                            </span>
                                        </div>
                                        <div className="admin-bugs-preview">
                                            {report.description?.substring(0, 100) || '(설명 없음)'}
                                            {report.description?.length > 100 ? '...' : ''}
                                        </div>
                                    </div>
                                    <span className="admin-bugs-toggle">
                                        {isExpanded ? '▲' : '▼'}
                                    </span>
                                </div>

                                {/* 상세 */}
                                {isExpanded && (
                                    <div className="admin-bugs-detail">
                                        {/* 설명 */}
                                        <div className="admin-bugs-section">
                                            <label className="admin-bugs-label">설명</label>
                                            <p className="admin-bugs-description">
                                                {report.description}
                                            </p>
                                        </div>

                                        {/* URL + 브라우저 */}
                                        <div className="admin-bugs-row">
                                            <div>
                                                <label className="admin-bugs-label">URL</label>
                                                <p className="admin-bugs-value">{report.url || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="admin-bugs-label">브라우저</label>
                                                <p className="admin-bugs-value">{formatUserAgent(report.userAgent)}</p>
                                            </div>
                                        </div>

                                        {/* 스크린샷 */}
                                        {report.screenshot && (
                                            <div className="admin-bugs-section">
                                                <label className="admin-bugs-label">
                                                    스크린샷{' '}
                                                    <button
                                                        onClick={() => setScreenshotId(showScreenshot ? null : report.id)}
                                                        className="admin-bugs-screenshot-toggle"
                                                    >
                                                        {showScreenshot ? '숨기기' : '보기'}
                                                    </button>
                                                </label>
                                                {showScreenshot && (
                                                    <img
                                                        src={report.screenshot}
                                                        alt="screenshot"
                                                        className="admin-bugs-screenshot-img"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* 콘솔 로그 */}
                                        {report.consoleLogs && (
                                            <div className="admin-bugs-section">
                                                <label className="admin-bugs-label">콘솔 로그</label>
                                                <pre className="admin-bugs-console">
                                                    {formatConsoleLogs(report.consoleLogs)}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 상태 변경 */}
                                        <div className="admin-bugs-actions">
                                            {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleStatusChange(report.id, key)}
                                                    disabled={report.status === key}
                                                    className="admin-bugs-status-btn"
                                                    style={{
                                                        border: report.status === key ? 'none' : `1px solid ${color}`,
                                                        background: report.status === key ? color : 'white',
                                                        color: report.status === key ? 'white' : color,
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatUserAgent(ua) {
    if (!ua) return '-';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    return ua.substring(0, 30);
}

function formatConsoleLogs(raw) {
    try {
        const logs = JSON.parse(raw);
        return logs.map(l => `[${l.level}] ${l.time?.substring(11, 19) || ''} ${l.message}`).join('\n');
    } catch {
        return raw;
    }
}

export default AdminBugsPage;
