import React, { useState } from 'react';
import { AIService } from '../../services/openai';
import ImageCropper from './ImageCropper';
import { addAiWatermark } from '../../utils/watermark';
import '../../styles/ImageGeneratorPanel.css';

const STYLE_OPTIONS = [
    { id: 'illustration', label: '일러스트', desc: '깔끔한 벡터' },
    { id: 'realistic', label: '사실적', desc: '포토 리얼리스틱' },
    { id: 'aesthetic', label: '감성적', desc: '라이프스타일' },
    { id: 'infographic', label: '인포그래픽', desc: '정보 시각화' },
    { id: 'diagram', label: '다이어그램', desc: '기술 도표' },
];

const RATIO_OPTIONS = [
    { id: '1:1', label: '1:1', desc: '정사각형' },
    { id: '3:4', label: '3:4', desc: '세로형' },
    { id: '4:3', label: '4:3', desc: '가로형' },
    { id: '16:9', label: '16:9', desc: '와이드' },
];

const ImageGeneratorPanel = ({ mainKeyword, onInsertImage }) => {
    const [userInput, setUserInput] = useState(mainKeyword || '');
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('illustration');
    const [ratio, setRatio] = useState('3:4');
    const [loading, setLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [isCropping, setIsCropping] = useState(false);

    // 프롬프트 최적화
    const handleEnhance = async (input, selectedStyle) => {
        const target = input || userInput;
        const targetStyle = selectedStyle || style;
        if (!target.trim()) return;
        setIsEnhancing(true);
        const enhanced = await AIService.enhanceImagePrompt(target, targetStyle);
        setPrompt(enhanced);
        setIsEnhancing(false);
    };

    // 스타일 변경 시 자동 재최적화
    const handleStyleChange = async (newStyle) => {
        setStyle(newStyle);
        if (userInput.trim()) {
            setIsEnhancing(true);
            const enhanced = await AIService.enhanceImagePrompt(userInput, newStyle);
            setPrompt(enhanced);
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        const finalPrompt = prompt.trim() || userInput.trim();
        if (!finalPrompt) return;

        setLoading(true);
        setError(null);
        setPreview(null);
        try {
            const result = await AIService.generateImage(finalPrompt, {
                aspectRatio: ratio,
                enhanced: !!prompt.trim(),
                style,
            });
            setPreview(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInsert = async () => {
        if (!preview) return;
        const watermarked = await addAiWatermark(preview.base64, preview.mimeType);
        const byteString = atob(watermarked.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: watermarked.mimeType });
        const url = URL.createObjectURL(blob);

        if (onInsertImage) {
            onInsertImage(url, `${mainKeyword || 'AI 생성'} 이미지`);
        }
        setHistory(prev => [{ url, prompt, style, ratio }, ...prev].slice(0, 10));
        setPreview(null);
    };

    const handleDownload = async () => {
        if (!preview) return;
        const watermarked = await addAiWatermark(preview.base64, preview.mimeType);
        const ext = watermarked.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const link = document.createElement('a');
        link.href = `data:${watermarked.mimeType};base64,${watermarked.base64}`;
        link.download = `ai_image_${Date.now()}.${ext}`;
        link.click();
    };

    const handleCropInsert = async (img) => {
        const watermarked = await addAiWatermark(img.base64, img.mimeType);
        const byteString = atob(watermarked.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: watermarked.mimeType });
        const url = URL.createObjectURL(blob);
        if (onInsertImage) {
            onInsertImage(url, `${mainKeyword || 'AI 생성'} 크롭 이미지`);
        }
    };

    const handleCropInsertAll = async (imgs) => {
        for (let i = 0; i < imgs.length; i++) {
            const watermarked = await addAiWatermark(imgs[i].base64, imgs[i].mimeType);
            const byteString = atob(watermarked.base64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) {
                ia[j] = byteString.charCodeAt(j);
            }
            const blob = new Blob([ab], { type: watermarked.mimeType });
            const url = URL.createObjectURL(blob);
            if (onInsertImage) {
                onInsertImage(url, `${mainKeyword || 'AI 생성'} 크롭 이미지 ${i + 1}`);
            }
        }
        setIsCropping(false);
        setPreview(null);
    };

    return (
        <div className="imggen-container">
            {/* 사용자 입력 */}
            <label className="imggen-label">
                원하는 이미지 내용
            </label>
            <div className="imggen-input-row">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEnhance()}
                    placeholder="예: 깔끔하게 정리된 화장실"
                    className="imggen-input"
                />
                <button
                    onClick={() => handleEnhance()}
                    disabled={isEnhancing || !userInput.trim()}
                    className="imggen-enhance-btn"
                    style={{ opacity: isEnhancing ? 0.6 : 1 }}
                >
                    {isEnhancing ? '...' : '최적화'}
                </button>
            </div>

            {/* Style */}
            <label className="imggen-label-section">
                스타일
            </label>
            <div className="imggen-chip-row">
                {STYLE_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => handleStyleChange(opt.id)}
                        disabled={isEnhancing}
                        className={style === opt.id ? 'imggen-chip active' : 'imggen-chip'}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Ratio */}
            <label className="imggen-label-section">
                비율
            </label>
            <div className="imggen-chip-row">
                {RATIO_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setRatio(opt.id)}
                        className={ratio === opt.id ? 'imggen-chip active' : 'imggen-chip'}
                    >
                        {opt.label}
                        <span className="imggen-chip-desc">{opt.desc}</span>
                    </button>
                ))}
            </div>

            {/* 최적화된 프롬프트 */}
            {prompt && (
                <>
                    <label className="imggen-label-section">
                        생성 프롬프트
                        {isEnhancing && <span className="imggen-enhancing-hint">최적화 중...</span>}
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        className="imggen-textarea"
                    />
                </>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading || isEnhancing || (!prompt.trim() && !userInput.trim())}
                className={loading ? 'imggen-generate-btn loading' : 'imggen-generate-btn'}
                style={{ opacity: ((!prompt.trim() && !userInput.trim()) && !loading) ? 0.5 : 1 }}
            >
                {loading ? '생성 중... (10~20초 소요)' : '이미지 생성하기'}
            </button>

            {/* 테스트용: 로컬 이미지로 크롭 테스트 */}
            {!preview && (
                <div className="imggen-local-test">
                    <label className="imggen-local-test-label">
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
                                    setPreview({ base64: b64, mimeType: mime });
                                    setIsCropping(true);
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                        />
                    </label>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="imggen-error">
                    {error}
                </div>
            )}

            {/* Preview */}
            {preview && !isCropping && (
                <div className="imggen-preview-card">
                    <img
                        src={`data:${preview.mimeType};base64,${preview.base64}`}
                        alt="AI 생성 이미지"
                        className="imggen-preview-img"
                    />
                    <div className="imggen-preview-actions">
                        <button onClick={handleGenerate} className="imggen-action-btn">
                            다시 생성
                        </button>
                        <button onClick={handleDownload} className="imggen-action-btn">
                            다운로드
                        </button>
                        <button onClick={() => setIsCropping(true)} className="imggen-action-btn">
                            ✂️ 크롭
                        </button>
                        <button onClick={handleInsert} className="imggen-insert-btn">
                            본문에 삽입
                        </button>
                    </div>
                </div>
            )}

            {/* Crop Mode */}
            {preview && isCropping && (
                <div className="imggen-crop-wrapper">
                    <ImageCropper
                        base64={preview.base64}
                        mimeType={preview.mimeType}
                        onCropApply={handleCropInsert}
                        onApplyAll={handleCropInsertAll}
                        onClose={() => setIsCropping(false)}
                    />
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="imggen-history">
                    <label className="imggen-history-label">
                        최근 생성 이미지
                    </label>
                    <div className="imggen-history-grid">
                        {history.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => onInsertImage && onInsertImage(item.url, `${mainKeyword || 'AI 생성'} 이미지`)}
                                className="imggen-history-item"
                                title="클릭하여 본문에 삽입"
                            >
                                <img
                                    src={item.url}
                                    alt={item.prompt}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGeneratorPanel;
