import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Upload, Info, CheckCircle } from 'lucide-react';
import { AIService } from '../../services/openai';
import { generateSeoFilename } from './ImageSeoGuide';
import { getRecommendedImages } from '../../data/categories';
import ImageCropper from './ImageCropper';
import { addAiWatermark } from '../../utils/watermark';
import '../../styles/PhotoUploader.css';

// ── 카테고리별 이미지 슬롯 정의 ──

const FOOD_SLOTS = [
    { id: 'entrance', label: '🏠 첫인상', desc: '외관/간판', allowMulti: true },
    { id: 'parking', label: '🚗 주차정보', desc: '주차장/발렛', allowMulti: true },
    { id: 'menu', label: '📋 메뉴판', desc: '메뉴/가격표', allowMulti: true },
    { id: 'interior', label: '🪑 인테리어', desc: '내부/좌석', allowMulti: true },
    { id: 'food', label: '🍱 음식/메뉴', desc: '메인 음식 (여러장)', allowMulti: true },
    { id: 'extra', label: '✨ 그 외', desc: '영수증/화장실', allowMulti: true },
];

const SHOPPING_SLOTS = [
    { id: 'unboxing', label: '📦 언박싱', desc: '택배/포장/개봉', allowMulti: true },
    { id: 'product', label: '🏷️ 제품 외관', desc: '전체 모습', allowMulti: true },
    { id: 'detail', label: '🔍 디테일', desc: '소재/마감/라벨', allowMulti: true },
    { id: 'usage', label: '👆 실사용', desc: '착용샷/사용장면', allowMulti: true },
    { id: 'compare', label: '🆚 비교', desc: '타제품 비교', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '구성품/사은품', allowMulti: true },
];

const TIPS_SLOTS = [
    { id: 'problem', label: '🚨 문제 상황', desc: 'Before/현재 상태', allowMulti: true },
    { id: 'tools', label: '🧴 준비물', desc: '필요한 재료/도구', allowMulti: true },
    { id: 'step', label: '📝 과정', desc: '단계별 진행 (여러장)', allowMulti: true },
    { id: 'result', label: '✅ 결과', desc: 'After/완성 상태', allowMulti: true },
    { id: 'compare', label: '🆚 비교', desc: '전후 비교', allowMulti: true },
    { id: 'extra', label: '💡 추가 팁', desc: '보충/주의사항', allowMulti: true },
];

const TRAVEL_SLOTS = [
    { id: 'transport', label: '🚗 교통', desc: '이동수단/경로', allowMulti: true },
    { id: 'accommodation', label: '🏨 숙소', desc: '호텔/펜션/숙소', allowMulti: true },
    { id: 'spot', label: '📍 명소', desc: '관광지/포토존', allowMulti: true },
    { id: 'restaurant', label: '🍽️ 맛집', desc: '현지 먹거리', allowMulti: true },
    { id: 'scenery', label: '🌅 풍경', desc: '자연/야경', allowMulti: true },
    { id: 'extra', label: '🎁 기념품', desc: '쇼핑/기타', allowMulti: true },
];

const RECIPE_SLOTS = [
    { id: 'ingredients', label: '🥬 재료', desc: '식재료/양념', allowMulti: true },
    { id: 'prep', label: '🔪 손질', desc: '재료 준비', allowMulti: true },
    { id: 'cooking', label: '🔥 조리', desc: '조리 과정 (여러장)', allowMulti: true },
    { id: 'complete', label: '🍽️ 완성', desc: '완성된 요리', allowMulti: true },
    { id: 'plating', label: '📸 플레이팅', desc: '담기/세팅', allowMulti: true },
    { id: 'extra', label: '💡 보관팁', desc: '보관/응용', allowMulti: true },
];

const TUTORIAL_SLOTS = [
    { id: 'setup', label: '📦 준비', desc: '설치/준비물', allowMulti: true },
    { id: 'config', label: '⚙️ 설정', desc: '초기 설정', allowMulti: true },
    { id: 'step1', label: '1️⃣ 단계1', desc: '첫 번째 과정', allowMulti: true },
    { id: 'step2', label: '2️⃣ 단계2', desc: '두 번째 과정', allowMulti: true },
    { id: 'result', label: '✅ 결과', desc: '완성/결과물', allowMulti: true },
    { id: 'extra', label: '🔧 트러블슈팅', desc: '문제해결/팁', allowMulti: true },
];

const COMPARISON_SLOTS = [
    { id: 'productA', label: '🅰️ 제품A', desc: '첫 번째 제품', allowMulti: true },
    { id: 'productB', label: '🅱️ 제품B', desc: '두 번째 제품', allowMulti: true },
    { id: 'spec', label: '📊 스펙비교', desc: '사양/성능 비교', allowMulti: true },
    { id: 'usage', label: '👆 실사용', desc: '사용 비교', allowMulti: true },
    { id: 'detail', label: '🔍 디테일', desc: '세부 차이점', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '가격/구매처', allowMulti: true },
];

const PARENTING_SLOTS = [
    { id: 'baby', label: '👶 아이', desc: '아이 사진', allowMulti: true },
    { id: 'product', label: '🍼 육아용품', desc: '제품/용품', allowMulti: true },
    { id: 'activity', label: '🎨 활동', desc: '놀이/체험', allowMulti: true },
    { id: 'milestone', label: '📅 성장', desc: '성장 기록', allowMulti: true },
    { id: 'tip', label: '💡 꿀팁', desc: '육아 노하우', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '기타 사진', allowMulti: true },
];

const INFO_SLOTS = [
    { id: 'main', label: '📸 대표', desc: '대표/썸네일', allowMulti: true },
    { id: 'data', label: '📊 데이터', desc: '그래프/도표/통계', allowMulti: true },
    { id: 'detail', label: '📝 상세', desc: '상세 설명 이미지', allowMulti: true },
    { id: 'example', label: '💡 사례', desc: '사례/예시', allowMulti: true },
    { id: 'reference', label: '🔗 참고', desc: '출처/캡처', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '기타 이미지', allowMulti: true },
];

const PET_SLOTS = [
    { id: 'pet', label: '🐾 반려동물', desc: '우리 아이 사진', allowMulti: true },
    { id: 'daily', label: '🏠 일상', desc: '집/일상 모습', allowMulti: true },
    { id: 'walk', label: '🌳 산책', desc: '산책/외출', allowMulti: true },
    { id: 'food', label: '🍖 사료/간식', desc: '먹거리/영양', allowMulti: true },
    { id: 'product', label: '🧸 용품', desc: '장난감/용품', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '병원/기타', allowMulti: true },
];

const DAILY_SLOTS = [
    { id: 'main', label: '📸 메인', desc: '오늘의 사진', allowMulti: true },
    { id: 'scene1', label: '🌅 장면1', desc: '첫 번째 장면', allowMulti: true },
    { id: 'scene2', label: '🌆 장면2', desc: '두 번째 장면', allowMulti: true },
    { id: 'food', label: '🍽️ 먹거리', desc: '오늘 먹은 것', allowMulti: true },
    { id: 'selfie', label: '🤳 셀피', desc: '인물 사진', allowMulti: true },
    { id: 'extra', label: '✨ 추가', desc: '기타', allowMulti: true },
];

const SLOT_MAP = {
    food: FOOD_SLOTS,
    cafe: FOOD_SLOTS,
    shopping: SHOPPING_SLOTS,
    review: SHOPPING_SLOTS,
    tech: SHOPPING_SLOTS,
    tips: TIPS_SLOTS,
    travel: TRAVEL_SLOTS,
    recipe: RECIPE_SLOTS,
    tutorial: TUTORIAL_SLOTS,
    comparison: COMPARISON_SLOTS,
    parenting: PARENTING_SLOTS,
    pet: PET_SLOTS,
    economy: INFO_SLOTS,
    medical: INFO_SLOTS,
    law: INFO_SLOTS,
    daily: DAILY_SLOTS,
};

const getSlots = (categoryId) => SLOT_MAP[categoryId] || FOOD_SLOTS;

const STYLE_OPTIONS = [
    { id: 'illustration', label: '일러스트', desc: '깔끔한 벡터 일러스트' },
    { id: 'realistic', label: '사실적', desc: '포토 리얼리스틱' },
    { id: 'aesthetic', label: '감성적', desc: '라이프스타일 감성샷' },
    { id: 'infographic', label: '인포그래픽', desc: '정보 시각화' },
    { id: 'diagram', label: '다이어그램', desc: '기술 도표 스타일' },
];

const resizeImage = (file, maxWidth = 1200) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const base64ToFile = (base64, mimeType, fileName) => {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
};

const PhotoUploader = ({ keyword, onUpdate, categoryId }) => {
    const slots = useMemo(() => getSlots(categoryId), [categoryId]);

    const initFiles = () => {
        const obj = {};
        slots.forEach(s => { obj[s.id] = []; });
        return obj;
    };
    const initPreviews = () => {
        const obj = {};
        slots.forEach(s => { obj[s.id] = null; });
        return obj;
    };

    const [files, setFiles] = useState(initFiles);
    const [previews, setPreviews] = useState(initPreviews);

    // AI generation modal state
    const [aiModal, setAiModal] = useState({
        open: false,
        slotId: null,
        slotLabel: '',
        userInput: '',       // 사용자 원본 입력 (한국어)
        prompt: '',          // AI가 최적화한 프롬프트 (영어)
        style: 'illustration',
        loading: false,
        isEnhancing: false,  // 프롬프트 최적화 중
        preview: null,       // { base64, mimeType }
        error: null,
        isCropping: false,
    });

    useEffect(() => {
        const metadata = {};
        slots.forEach(s => { metadata[s.id] = (files[s.id] || []).length; });
        onUpdate({ metadata, previews, files });
    }, [files, previews, onUpdate]);

    const handleFileProcess = async (slotId, rawFiles) => {
        const processedFiles = [];
        const newPreviews = [];

        const existingCount = (files[slotId] || []).length;
        for (let i = 0; i < rawFiles.length; i++) {
            const file = rawFiles[i];
            try {
                const resizedBlob = await resizeImage(file);
                const newName = generateSeoFilename(keyword || 'myblog', slotId, existingCount + i);
                const newFile = new File([resizedBlob], newName, { type: 'image/jpeg' });
                processedFiles.push(newFile);
                newPreviews.push(URL.createObjectURL(newFile));
            } catch (err) {
                console.error("Image processing failed", err);
            }
        }

        setFiles(prev => {
            const slotConfig = slots.find(s => s.id === slotId);
            if (slotConfig.allowMulti) {
                return { ...prev, [slotId]: [...(prev[slotId] || []), ...processedFiles] };
            } else {
                return { ...prev, [slotId]: [processedFiles[0]] };
            }
        });

        setPreviews(prev => {
            const slotConfig = slots.find(s => s.id === slotId);
            if (slotConfig.allowMulti) {
                return { ...prev, [slotId]: newPreviews[newPreviews.length - 1] };
            } else {
                return { ...prev, [slotId]: newPreviews[0] };
            }
        });
    };

    const handleDrop = async (e, slotId) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await handleFileProcess(slotId, Array.from(e.dataTransfer.files));
        }
    };

    const handleInput = async (e, slotId) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleFileProcess(slotId, Array.from(e.target.files));
        }
        e.target.value = '';
    };

    const removeFile = (e, slotId) => {
        e.stopPropagation();
        setFiles(prev => ({ ...prev, [slotId]: [] }));
        setPreviews(prev => ({ ...prev, [slotId]: null }));
    };

    // ── AI Image Generation ──

    const closeAiModal = () => {
        setAiModal(prev => ({ ...prev, open: false, loading: false, preview: null, error: null }));
    };

    // 스타일 변경 시 프롬프트 재최적화
    const handleStyleChange = async (newStyle) => {
        setAiModal(prev => ({ ...prev, style: newStyle, isEnhancing: true }));
        const enhanced = await AIService.enhanceImagePrompt(aiModal.userInput, newStyle);
        setAiModal(prev => ({ ...prev, prompt: enhanced, isEnhancing: false }));
    };

    // 사용자 입력 변경 후 수동 최적화
    const handleEnhancePrompt = async () => {
        setAiModal(prev => ({ ...prev, isEnhancing: true }));
        const enhanced = await AIService.enhanceImagePrompt(aiModal.userInput, aiModal.style);
        setAiModal(prev => ({ ...prev, prompt: enhanced, isEnhancing: false }));
    };

    const handleAiGenerate = async () => {
        setAiModal(prev => ({ ...prev, loading: true, error: null, preview: null }));
        try {
            const result = await AIService.generateImage(aiModal.prompt, {
                aspectRatio: '3:4',
                enhanced: true,
            });
            setAiModal(prev => ({ ...prev, loading: false, preview: result }));
        } catch (err) {
            setAiModal(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const handleApplyAiImage = async () => {
        if (!aiModal.preview || !aiModal.slotId) return;
        const watermarked = await addAiWatermark(aiModal.preview.base64, aiModal.preview.mimeType);
        const ext = watermarked.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const cleanKeyword = keyword ? keyword.replace(/\s+/g, '_') : 'myblog';
        const fileName = `${cleanKeyword}_${aiModal.slotId}_ai_${Date.now()}.${ext}`;
        const file = base64ToFile(watermarked.base64, watermarked.mimeType, fileName);
        const previewUrl = URL.createObjectURL(file);

        setFiles(prev => ({
            ...prev,
            [aiModal.slotId]: [...(prev[aiModal.slotId] || []), file]
        }));
        setPreviews(prev => ({
            ...prev,
            [aiModal.slotId]: previewUrl
        }));
        closeAiModal();
    };

    const handleApplyCroppedImage = async (img) => {
        if (!aiModal.slotId) return;
        const watermarked = await addAiWatermark(img.base64, img.mimeType);
        const ext = watermarked.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const cleanKeyword = keyword ? keyword.replace(/\s+/g, '_') : 'myblog';
        const fileName = `${cleanKeyword}_${aiModal.slotId}_crop_${Date.now()}.${ext}`;
        const file = base64ToFile(watermarked.base64, watermarked.mimeType, fileName);
        const previewUrl = URL.createObjectURL(file);

        setFiles(prev => ({
            ...prev,
            [aiModal.slotId]: [...(prev[aiModal.slotId] || []), file]
        }));
        setPreviews(prev => ({
            ...prev,
            [aiModal.slotId]: previewUrl
        }));
    };

    const handleApplyAllCrops = async (imgs) => {
        if (!aiModal.slotId || !imgs.length) return;
        const cleanKeyword = keyword ? keyword.replace(/\s+/g, '_') : 'myblog';
        const watermarkedImgs = await Promise.all(imgs.map(img => addAiWatermark(img.base64, img.mimeType)));
        const newFiles = watermarkedImgs.map((img, i) => {
            const ext = img.mimeType === 'image/jpeg' ? 'jpg' : 'png';
            const fileName = `${cleanKeyword}_${aiModal.slotId}_crop_${i + 1}_${Date.now()}.${ext}`;
            return base64ToFile(img.base64, img.mimeType, fileName);
        });
        const lastPreviewUrl = URL.createObjectURL(newFiles[newFiles.length - 1]);

        setFiles(prev => ({
            ...prev,
            [aiModal.slotId]: [...(prev[aiModal.slotId] || []), ...newFiles]
        }));
        setPreviews(prev => ({
            ...prev,
            [aiModal.slotId]: lastPreviewUrl
        }));
        closeAiModal();
    };

    const recommendedCount = useMemo(() => getRecommendedImages(categoryId), [categoryId]);
    const totalUploaded = useMemo(() => {
        return Object.values(files).reduce((sum, arr) => sum + arr.length, 0);
    }, [files]);
    const isSufficient = totalUploaded >= recommendedCount;
    const progressPercent = Math.min((totalUploaded / recommendedCount) * 100, 100);

    return (
        <div className="photo-uploader-container">
            <div className={`photo-progress-guide ${isSufficient ? 'sufficient' : ''}`}>
                <div className="photo-progress-text">
                    {isSufficient ? (
                        <><CheckCircle size={15} /> {totalUploaded}장 업로드 — 충분해요!</>
                    ) : (
                        <>📸 {totalUploaded}/{recommendedCount}장</>
                    )}
                </div>
                <div className="photo-progress-bar">
                    <div className="photo-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            <div className="photo-grid-compact">
                {slots.map(slot => {
                    const hasImage = (files[slot.id] || []).length > 0;
                    const previewUrl = previews[slot.id];
                    const count = (files[slot.id] || []).length;

                    return (
                        <div
                            key={slot.id}
                            className={`photo-slot-compact ${hasImage ? 'has-image' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => handleDrop(e, slot.id)}
                            onClick={() => document.getElementById(`file-input-${slot.id}`).click()}
                        >
                            <input
                                type="file"
                                id={`file-input-${slot.id}`}
                                className="hidden-input"
                                multiple={slot.allowMulti}
                                accept="image/*"
                                onChange={(e) => handleInput(e, slot.id)}
                            />

                            {hasImage ? (
                                <div className="image-preview-wrapper-compact">
                                    <img src={previewUrl} alt={slot.label} className="image-preview" />
                                    <button className="remove-btn-compact" onClick={(e) => removeFile(e, slot.id)}>✕</button>
                                    {count > 1 && <span className="multi-image-count-compact">+{count - 1}</span>}
                                    <span className="slot-label-overlay">{slot.label.split(' ').slice(1).join(' ')}</span>
                                </div>
                            ) : (
                                <div className="slot-content-compact">
                                    <span className="slot-icon-compact">{slot.label.split(' ')[0]}</span>
                                    <span className="slot-label-compact">{slot.label.split(' ').slice(1).join(' ')}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="photo-upload-note">
                <p>· 클릭하거나 드래그하여 사진을 업로드해 주세요</p>
                <p>· 업로드한 사진은 AI가 본문에 자동 배치합니다</p>
            </div>

            {/* AI Image Generation Modal */}
            {aiModal.open && (
                <div className="ai-modal-overlay" onClick={closeAiModal}>
                    <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-header">
                            <h3>AI 이미지 생성</h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-sub, #787774)' }}>{aiModal.slotLabel}</span>
                            <button className="ai-modal-close" onClick={closeAiModal}>✕</button>
                        </div>

                        <div className="ai-modal-body">
                            {/* 사용자 입력 */}
                            <label className="ai-modal-label">원하는 이미지 내용</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={aiModal.userInput}
                                    onChange={(e) => setAiModal(prev => ({ ...prev, userInput: e.target.value }))}
                                    placeholder="예: 화장실 곰팡이가 심한 상태"
                                    style={{
                                        flex: 1, border: '1px solid #e0e0e0', borderRadius: '8px',
                                        padding: '10px 12px', fontSize: '0.85rem', fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={aiModal.isEnhancing || !aiModal.userInput.trim()}
                                    style={{
                                        padding: '8px 14px', background: '#FF6B35', color: 'white',
                                        border: 'none', borderRadius: '8px', fontSize: '0.78rem',
                                        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                        opacity: aiModal.isEnhancing ? 0.6 : 1
                                    }}
                                >
                                    {aiModal.isEnhancing ? '...' : '최적화'}
                                </button>
                            </div>

                            {/* Style Selector */}
                            <label className="ai-modal-label">스타일</label>
                            <div className="ai-style-grid">
                                {STYLE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`ai-style-chip ${aiModal.style === opt.id ? 'active' : ''}`}
                                        onClick={() => handleStyleChange(opt.id)}
                                        disabled={aiModal.isEnhancing}
                                    >
                                        <span className="ai-style-chip-label">{opt.label}</span>
                                        <span className="ai-style-chip-desc">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 최적화된 프롬프트 */}
                            <label className="ai-modal-label">
                                생성 프롬프트
                                {aiModal.isEnhancing && <span style={{ color: '#FF6B35', marginLeft: '8px', fontWeight: 400 }}>최적화 중...</span>}
                            </label>
                            <textarea
                                className="ai-modal-textarea"
                                value={aiModal.prompt}
                                onChange={(e) => setAiModal(prev => ({ ...prev, prompt: e.target.value }))}
                                rows={3}
                                placeholder={aiModal.isEnhancing ? '프롬프트 최적화 중...' : '최적화된 프롬프트가 여기에 표시됩니다'}
                                style={{ fontSize: '0.8rem', color: '#555', background: '#f9f9f9' }}
                            />

                            {/* Generate Button */}
                            <button
                                className="ai-modal-generate-btn"
                                onClick={handleAiGenerate}
                                disabled={aiModal.loading || aiModal.isEnhancing || !aiModal.prompt.trim()}
                            >
                                {aiModal.loading ? (
                                    <span>생성 중... (10~20초 소요)</span>
                                ) : (
                                    <span>이미지 생성하기</span>
                                )}
                            </button>

                            {/* 테스트용: 로컬 이미지로 크롭 테스트 */}
                            {!aiModal.preview && (
                                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                                    <label
                                        style={{
                                            display: 'inline-block', padding: '8px 16px',
                                            fontSize: '0.78rem', color: '#888', cursor: 'pointer',
                                            border: '1px dashed #ccc', borderRadius: '8px',
                                        }}
                                    >
                                        🖼️ 로컬 이미지로 크롭 테스트
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const dataUrl = ev.target.result;
                                                    const [header, b64] = dataUrl.split(',');
                                                    const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
                                                    setAiModal(prev => ({
                                                        ...prev,
                                                        preview: { base64: b64, mimeType: mime },
                                                        isCropping: true,
                                                    }));
                                                };
                                                reader.readAsDataURL(file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Error */}
                            {aiModal.error && (
                                <div className="ai-modal-error">{aiModal.error}</div>
                            )}

                            {/* Preview */}
                            {aiModal.preview && !aiModal.isCropping && (
                                <div className="ai-modal-preview">
                                    <img
                                        src={`data:${aiModal.preview.mimeType};base64,${aiModal.preview.base64}`}
                                        alt="AI 생성 이미지"
                                    />
                                    <div className="ai-modal-preview-actions">
                                        <button className="ai-modal-retry-btn" onClick={handleAiGenerate}>
                                            다시 생성
                                        </button>
                                        <button
                                            className="ai-modal-crop-btn"
                                            onClick={() => setAiModal(prev => ({ ...prev, isCropping: true }))}
                                        >
                                            ✂️ 크롭
                                        </button>
                                        <button className="ai-modal-apply-btn" onClick={handleApplyAiImage}>
                                            이 이미지 사용하기
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Crop Mode */}
                            {aiModal.preview && aiModal.isCropping && (
                                <div style={{ marginTop: '16px' }}>
                                    <ImageCropper
                                        base64={aiModal.preview.base64}
                                        mimeType={aiModal.preview.mimeType}
                                        onCropApply={handleApplyCroppedImage}
                                        onApplyAll={handleApplyAllCrops}
                                        onClose={() => setAiModal(prev => ({ ...prev, isCropping: false }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoUploader;
