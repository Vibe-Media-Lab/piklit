import React, { useState, useRef, useCallback } from 'react';
import { X, Link, ImagePlus, Sparkles, Trash2, ChevronDown, ChevronUp, Save, AlertCircle } from 'lucide-react';
import { AIService } from '../../services/openai';
import { getPresets, savePreset, getPresetLimit } from '../../utils/wannabeStyle';

const GROUP_LABELS = {
    tone: '톤',
    structure: '구조',
    vocabulary: '어휘',
    seo: 'SEO',
};

/** 체크리스트 그룹 (접이식) */
const ChecklistGroup = ({ groupKey, items, onToggle }) => {
    const [open, setOpen] = useState(true);
    const label = GROUP_LABELS[groupKey] || groupKey;

    return (
        <div className="wannabe-checklist-group">
            <button className="wannabe-group-header" onClick={() => setOpen(!open)}>
                <span>{label} ({items.filter(i => i.checked).length}/{items.length})</span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open && (
                <div className="wannabe-group-items">
                    {items.map(item => (
                        <label key={item.key} className="wannabe-check-item">
                            <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => onToggle(groupKey, item.key)}
                            />
                            <span className="wannabe-check-label">{item.label}</span>
                            <span className="wannabe-check-value">{item.value}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * 워너비 스타일 분석 모달
 * - URL 입력 + 스크린샷 첨부 → AI 분석 → 체크리스트 → 프리셋 저장
 */
export default function WannabeStylePanel({ isOpen, onClose, onSave, userPlan = 'free' }) {
    const [url, setUrl] = useState('');
    const [screenshots, setScreenshots] = useState([]); // [{file, preview, base64, mimeType}]
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null); // { summary, sampleSentences, checklist }
    const [presetName, setPresetName] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const presets = getPresets();
    const limit = getPresetLimit(userPlan);
    const canSave = presets.length < limit;

    // 스크린샷 추가
    const handleScreenshots = useCallback((e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                setScreenshots(prev => [...prev, {
                    file,
                    preview: URL.createObjectURL(file),
                    base64,
                    mimeType: file.type || 'image/jpeg',
                }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }, []);

    const removeScreenshot = useCallback((idx) => {
        setScreenshots(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[idx].preview);
            next.splice(idx, 1);
            return next;
        });
    }, []);

    // AI 분석 실행
    const handleAnalyze = async () => {
        if (!url && screenshots.length === 0) {
            setError('URL 또는 스크린샷을 입력해주세요.');
            return;
        }
        setError('');
        setAnalyzing(true);
        try {
            const shotAssets = screenshots.map(s => ({ base64: s.base64, mimeType: s.mimeType }));
            const analysisResult = await AIService.analyzeWannabeStyle(
                url || null,
                shotAssets.length > 0 ? shotAssets : null
            );
            setResult(analysisResult);
            // 프리셋 이름 자동 제안
            if (analysisResult.summary && !presetName) {
                setPresetName(analysisResult.summary.slice(0, 20));
            }
        } catch (err) {
            setError(err.message || '분석 중 오류가 발생했습니다.');
        } finally {
            setAnalyzing(false);
        }
    };

    // 체크리스트 토글
    const handleToggle = (group, key) => {
        setResult(prev => {
            const updated = { ...prev, checklist: { ...prev.checklist } };
            updated.checklist[group] = updated.checklist[group].map(item =>
                item.key === key ? { ...item, checked: !item.checked } : item
            );
            return updated;
        });
    };

    // 프리셋 저장
    const handleSave = () => {
        if (!result) return;
        if (!presetName.trim()) {
            setError('프리셋 이름을 입력해주세요.');
            return;
        }
        try {
            const preset = savePreset({
                name: presetName.trim(),
                summary: result.summary,
                sampleSentences: result.sampleSentences,
                sourceUrl: url || null,
                checklist: result.checklist,
            }, userPlan);
            onSave?.(preset);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="wannabe-overlay" onClick={onClose}>
            <div className="wannabe-modal" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="wannabe-modal-header">
                    <h3>워너비 스타일 분석</h3>
                    <button className="wannabe-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="wannabe-modal-body">
                    {!result ? (
                        /* 입력 단계 */
                        <>
                            {/* URL 입력 */}
                            <div className="wannabe-input-section">
                                <label className="wannabe-input-label">
                                    <Link size={14} /> 블로그 URL
                                </label>
                                <input
                                    type="url"
                                    className="wannabe-url-input"
                                    placeholder="https://blog.naver.com/..."
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                />
                                <p className="wannabe-notice">
                                    <AlertCircle size={12} />
                                    전체공개 글만 분석 가능합니다
                                </p>
                            </div>

                            {/* 스크린샷 */}
                            <div className="wannabe-input-section">
                                <label className="wannabe-input-label">
                                    <ImagePlus size={14} /> 스크린샷 첨부 (선택)
                                </label>
                                <div className="wannabe-screenshots">
                                    {screenshots.map((shot, i) => (
                                        <div key={i} className="wannabe-screenshot-thumb">
                                            <img src={shot.preview} alt={`스크린샷 ${i + 1}`} />
                                            <button onClick={() => removeScreenshot(i)}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="wannabe-add-screenshot"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus size={20} />
                                        <span>추가</span>
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    hidden
                                    onChange={handleScreenshots}
                                />
                            </div>

                            {error && <p className="wannabe-error">{error}</p>}

                            <button
                                className="wannabe-analyze-btn"
                                onClick={handleAnalyze}
                                disabled={analyzing || (!url && screenshots.length === 0)}
                            >
                                {analyzing ? (
                                    <>
                                        <Sparkles size={16} className="wannabe-spinner" />
                                        스타일 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        스타일 분석하기
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        /* 결과 단계 */
                        <>
                            {/* 한 줄 요약 */}
                            <div className="wannabe-summary">
                                <span className="wannabe-summary-badge">스타일 특징</span>
                                <p>{result.summary}</p>
                            </div>

                            {/* 대표 문장 */}
                            {result.sampleSentences?.length > 0 && (
                                <div className="wannabe-samples">
                                    <span className="wannabe-samples-label">대표 문장</span>
                                    {result.sampleSentences.map((s, i) => (
                                        <blockquote key={i} className="wannabe-sample-quote">"{s}"</blockquote>
                                    ))}
                                </div>
                            )}

                            {/* 체크리스트 */}
                            <div className="wannabe-checklist">
                                <p className="wannabe-checklist-desc">
                                    적용할 스타일 항목을 선택하세요
                                </p>
                                {Object.entries(result.checklist).map(([group, items]) => (
                                    <ChecklistGroup
                                        key={group}
                                        groupKey={group}
                                        items={items}
                                        onToggle={handleToggle}
                                    />
                                ))}
                            </div>

                            {/* 프리셋 저장 */}
                            <div className="wannabe-save-section">
                                <input
                                    type="text"
                                    className="wannabe-preset-name"
                                    placeholder="프리셋 이름 (예: 감성 맛집 블로거)"
                                    value={presetName}
                                    onChange={e => setPresetName(e.target.value)}
                                    maxLength={30}
                                />
                                {!canSave && (
                                    <p className="wannabe-limit-notice">
                                        프리셋 저장 한도에 도달했습니다 ({presets.length}/{limit}개).
                                        기존 프리셋을 삭제해주세요.
                                    </p>
                                )}
                            </div>

                            {error && <p className="wannabe-error">{error}</p>}

                            <div className="wannabe-actions">
                                <button
                                    className="wannabe-btn-secondary"
                                    onClick={() => { setResult(null); setError(''); }}
                                >
                                    다시 분석
                                </button>
                                <button
                                    className="wannabe-btn-primary"
                                    onClick={handleSave}
                                    disabled={!canSave || !presetName.trim()}
                                >
                                    <Save size={14} />
                                    프리셋 저장
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** 프리셋 카드 (Step 2에서 선택용) */
export function WannabePresetCard({ preset, selected, onSelect, onDelete }) {
    return (
        <div
            className={`wannabe-preset-card ${selected ? 'selected' : ''}`}
            onClick={() => onSelect(preset)}
        >
            <div className="wannabe-preset-card-header">
                <span className="wannabe-preset-card-name">{preset.name}</span>
                <button
                    className="wannabe-preset-delete"
                    onClick={e => { e.stopPropagation(); onDelete(preset.id); }}
                    title="삭제"
                >
                    <Trash2 size={12} />
                </button>
            </div>
            <p className="wannabe-preset-card-summary">{preset.summary}</p>
        </div>
    );
}
