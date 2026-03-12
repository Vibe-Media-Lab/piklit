import React, { useState, useRef, useCallback } from 'react';
import { X, ImagePlus, Sparkles, Trash2, ChevronDown, ChevronUp, Save, Camera } from 'lucide-react';
import { AIService } from '../../services/openai';
import { getPresets, savePreset, getPresetLimit } from '../../utils/wannabeStyle';
import { fileToBase64 } from '../../utils/image';

const GROUP_LABELS = {
    tone: '톤',
    structure: '구조',
    vocabulary: '어휘',
    seo: 'SEO',
};

const SLOTS = [
    { id: 'top', label: '상단', desc: '제목·도입부', required: true, icon: '↑' },
    { id: 'mid', label: '중단', desc: '본문 스타일', required: true, icon: '≡' },
    { id: 'bottom', label: '하단', desc: '마무리·CTA', required: false, icon: '↓' },
];

const MAX_EXTRA = 3;

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
 * 워너비 / 내 스타일 분석 모달
 * - 슬롯형 스크린샷 (상단/중단/하단 + 추가 3장) → AI 분석 → 체크리스트 → 프리셋 저장
 */
export default function WannabeStylePanel({ isOpen, onClose, onSave, userPlan = 'free', initialType = 'wannabe' }) {
    const [styleType, setStyleType] = useState(initialType);
    // 슬롯 데이터: { top: [{preview, base64, mimeType}, ...], mid: [...], bottom: [...] }
    const [slots, setSlots] = useState({});
    // 추가 이미지: [{preview, base64, mimeType}]
    const [extras, setExtras] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [presetName, setPresetName] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const activeSlotRef = useRef(null); // 현재 클릭한 슬롯 ID

    const presets = getPresets();
    const limit = getPresetLimit(userPlan);
    const canSave = presets.length < limit;

    const hasRequired = slots.top?.length > 0 && slots.mid?.length > 0;

    // 파일 선택 핸들러 (압축 적용)
    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const base64 = await fileToBase64(file, 512);
        const preview = URL.createObjectURL(file);
        const data = { preview, base64, mimeType: 'image/jpeg' };

        const slotId = activeSlotRef.current;
        if (slotId === 'extra') {
            setExtras(prev => [...prev, data]);
        } else {
            setSlots(prev => ({
                ...prev,
                [slotId]: [...(prev[slotId] || []), data],
            }));
        }
        e.target.value = '';
    }, []);

    const triggerFileInput = (slotId) => {
        activeSlotRef.current = slotId;
        fileInputRef.current?.click();
    };

    const removeSlotImage = (slotId, idx) => {
        setSlots(prev => {
            const arr = prev[slotId] || [];
            if (arr[idx]?.preview) URL.revokeObjectURL(arr[idx].preview);
            const next = arr.filter((_, i) => i !== idx);
            return { ...prev, [slotId]: next };
        });
    };

    const removeExtra = (idx) => {
        setExtras(prev => {
            URL.revokeObjectURL(prev[idx].preview);
            return prev.filter((_, i) => i !== idx);
        });
    };

    // AI 분석 실행
    const handleAnalyze = async () => {
        if (!hasRequired) {
            setError('상단, 중단 스크린샷은 필수입니다.');
            return;
        }
        setError('');
        setAnalyzing(true);
        try {
            // 슬롯별 이미지 + 위치 라벨 조합
            const slotAssets = [];
            SLOTS.forEach(s => {
                (slots[s.id] || []).forEach((img, i) => {
                    slotAssets.push({
                        base64: img.base64,
                        mimeType: img.mimeType,
                        position: `${s.label}${(slots[s.id]?.length || 0) > 1 ? ` ${i + 1}` : ''}`,
                    });
                });
            });
            extras.forEach((ex, i) => {
                slotAssets.push({
                    base64: ex.base64,
                    mimeType: ex.mimeType,
                    position: `추가 ${i + 1}`,
                });
            });

            const analysisResult = await AIService.analyzeWannabeStyle(null, slotAssets);
            setResult(analysisResult);
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
                type: styleType,
                summary: result.summary,
                sampleSentences: result.sampleSentences,
                checklist: result.checklist,
            }, userPlan);
            onSave?.(preset);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    // 모달 닫을 때 초기화
    const handleClose = () => {
        // base64 메모리 해제
        Object.values(slots).forEach(arr => (arr || []).forEach(s => s?.preview && URL.revokeObjectURL(s.preview)));
        extras.forEach(e => e?.preview && URL.revokeObjectURL(e.preview));
        setSlots({});
        setExtras([]);
        setResult(null);
        setPresetName('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    const typeLabel = styleType === 'mystyle' ? '내 스타일' : '워너비 스타일';

    return (
        <div className="wannabe-overlay" onClick={handleClose}>
            <div className="wannabe-modal" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="wannabe-modal-header">
                    <h3>스타일 분석</h3>
                    <button className="wannabe-close-btn" onClick={handleClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="wannabe-modal-body">
                    {/* 타입 세그먼트 */}
                    <div className="wannabe-type-segment">
                        <button
                            className={`wannabe-type-btn ${styleType === 'wannabe' ? 'active' : ''}`}
                            onClick={() => setStyleType('wannabe')}
                        >
                            <Sparkles size={14} /> 워너비 스타일
                        </button>
                        <button
                            className={`wannabe-type-btn ${styleType === 'mystyle' ? 'active' : ''}`}
                            onClick={() => setStyleType('mystyle')}
                        >
                            <Camera size={14} /> 내 스타일
                        </button>
                    </div>

                    <p className="wannabe-type-desc">
                        {styleType === 'wannabe'
                            ? '따라하고 싶은 블로거의 글을 스크린샷으로 올려주세요.'
                            : '내가 평소 쓰던 블로그 글을 스크린샷으로 올려주세요.'
                        }
                    </p>

                    {!result ? (
                        /* 입력 단계 */
                        <>
                            {/* 슬롯형 스크린샷 */}
                            <div className="wannabe-slot-grid">
                                {SLOTS.map(slot => {
                                    const images = slots[slot.id] || [];
                                    return (
                                        <div key={slot.id} className="wannabe-slot">
                                            <div className="wannabe-slot-label">
                                                <span className="wannabe-slot-icon">{slot.icon}</span>
                                                {slot.label}
                                                {slot.required && <span className="wannabe-slot-required">필수</span>}
                                            </div>
                                            {images.length > 0 ? (
                                                <div className="wannabe-slot-images">
                                                    {images.map((img, i) => (
                                                        <div key={i} className="wannabe-slot-thumb">
                                                            <img src={img.preview} alt={`${slot.label} ${i + 1}`} />
                                                            <button className="wannabe-slot-remove" onClick={() => removeSlotImage(slot.id, i)}>
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        className="wannabe-slot-add-more"
                                                        onClick={() => triggerFileInput(slot.id)}
                                                    >
                                                        <ImagePlus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="wannabe-slot-empty"
                                                    onClick={() => triggerFileInput(slot.id)}
                                                >
                                                    <ImagePlus size={20} />
                                                    <span>{slot.desc}</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 추가 이미지 */}
                            <div className="wannabe-extras">
                                <div className="wannabe-extras-label">
                                    추가 스크린샷 ({extras.length}/{MAX_EXTRA})
                                </div>
                                <div className="wannabe-extras-row">
                                    {extras.map((ex, i) => (
                                        <div key={i} className="wannabe-slot-thumb small">
                                            <img src={ex.preview} alt={`추가 ${i + 1}`} />
                                            <button className="wannabe-slot-remove" onClick={() => removeExtra(i)}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {extras.length < MAX_EXTRA && (
                                        <button
                                            className="wannabe-slot-empty small"
                                            onClick={() => triggerFileInput('extra')}
                                        >
                                            <ImagePlus size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleFileSelect}
                            />

                            {error && <p className="wannabe-error">{error}</p>}

                            <button
                                className="wannabe-analyze-btn"
                                onClick={handleAnalyze}
                                disabled={analyzing || !hasRequired}
                            >
                                {analyzing ? (
                                    <>
                                        <Sparkles size={16} className="wannabe-spinner" />
                                        {typeLabel} 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        {typeLabel} 분석하기
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        /* 결과 단계 */
                        <>
                            {/* 한 줄 요약 */}
                            <div className="wannabe-summary">
                                <span className="wannabe-summary-badge">{typeLabel} 특징</span>
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
                                    placeholder={styleType === 'mystyle' ? '내 스타일 이름 (예: 내 맛집 리뷰 톤)' : '프리셋 이름 (예: 감성 맛집 블로거)'}
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
    const isMyStyle = (preset.type || 'wannabe') === 'mystyle';
    return (
        <div
            className={`wannabe-preset-card ${selected ? 'selected' : ''} ${isMyStyle ? 'mystyle' : ''}`}
            onClick={() => onSelect(preset)}
        >
            <div className="wannabe-preset-card-header">
                <span className="wannabe-preset-card-name">
                    {isMyStyle ? '👤 ' : '✨ '}{preset.name}
                </span>
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
