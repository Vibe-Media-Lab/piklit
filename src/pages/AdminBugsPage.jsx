import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { callListBugReports, callUpdateBugStatus } from '../services/firebase';

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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-text-sub)' }}>
                접근 권한이 없습니다.
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-text-sub)' }}>
                로딩 중...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#EB5757' }}>
                오류: {error}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0 }}>Bug Reports ({reports.length})</h2>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                    {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
                        const count = reports.filter(r => r.status === key).length;
                        return (
                            <span key={key} style={{ color, fontWeight: 600 }}>
                                {label}: {count}
                            </span>
                        );
                    })}
                </div>
            </div>

            {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-sub)' }}>
                    아직 버그 리포트가 없습니다.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reports.map(report => {
                        const status = STATUS_LABELS[report.status] || STATUS_LABELS.new;
                        const isExpanded = expandedId === report.id;
                        const showScreenshot = screenshotId === report.id;

                        return (
                            <div key={report.id} style={{
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                background: 'white',
                            }}>
                                {/* 헤더 */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                    style={{
                                        padding: '14px 16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: isExpanded ? '#FAFAFA' : 'white',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                color: status.color,
                                                background: status.bg,
                                            }}>
                                                {status.label}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)' }}>
                                                {report.email}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#B0AFA8' }}>
                                                {formatDate(report.createdAt)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                            {report.description?.substring(0, 100) || '(설명 없음)'}
                                            {report.description?.length > 100 ? '...' : ''}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)' }}>
                                        {isExpanded ? '▲' : '▼'}
                                    </span>
                                </div>

                                {/* 상세 */}
                                {isExpanded && (
                                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
                                        {/* 설명 */}
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={labelStyle}>설명</label>
                                            <p style={{ margin: '4px 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                                {report.description}
                                            </p>
                                        </div>

                                        {/* URL + 브라우저 */}
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            <div>
                                                <label style={labelStyle}>URL</label>
                                                <p style={valueStyle}>{report.url || '-'}</p>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>브라우저</label>
                                                <p style={valueStyle}>{formatUserAgent(report.userAgent)}</p>
                                            </div>
                                        </div>

                                        {/* 스크린샷 */}
                                        {report.screenshot && (
                                            <div style={{ marginTop: '12px' }}>
                                                <label style={labelStyle}>
                                                    스크린샷{' '}
                                                    <button
                                                        onClick={() => setScreenshotId(showScreenshot ? null : report.id)}
                                                        style={{ fontSize: '0.75rem', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {showScreenshot ? '숨기기' : '보기'}
                                                    </button>
                                                </label>
                                                {showScreenshot && (
                                                    <img
                                                        src={report.screenshot}
                                                        alt="screenshot"
                                                        style={{
                                                            maxWidth: '100%',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid var(--color-border)',
                                                            marginTop: '8px',
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* 콘솔 로그 */}
                                        {report.consoleLogs && (
                                            <div style={{ marginTop: '12px' }}>
                                                <label style={labelStyle}>콘솔 로그</label>
                                                <pre style={{
                                                    background: '#1E1E1E',
                                                    color: '#D4D4D4',
                                                    padding: '12px',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: '0.75rem',
                                                    maxHeight: '200px',
                                                    overflow: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all',
                                                    marginTop: '4px',
                                                }}>
                                                    {formatConsoleLogs(report.consoleLogs)}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 상태 변경 */}
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                            {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleStatusChange(report.id, key)}
                                                    disabled={report.status === key}
                                                    style={{
                                                        padding: '6px 14px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        borderRadius: 'var(--radius-md)',
                                                        border: report.status === key ? 'none' : `1px solid ${color}`,
                                                        background: report.status === key ? color : 'white',
                                                        color: report.status === key ? 'white' : color,
                                                        cursor: report.status === key ? 'default' : 'pointer',
                                                        opacity: report.status === key ? 1 : 0.8,
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

const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-sub)', textTransform: 'uppercase' };
const valueStyle = { margin: '2px 0', fontSize: '0.8rem', color: 'var(--color-primary)' };

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
