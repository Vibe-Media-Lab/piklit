import React, { useState } from 'react';
import { AIService } from '../../services/openai';
import ImageCropper from './ImageCropper';
import { addAiWatermark } from '../../utils/watermark';

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
        <div style={{ padding: '20px' }}>
            {/* 사용자 입력 */}
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                원하는 이미지 내용
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEnhance()}
                    placeholder="예: 깔끔하게 정리된 화장실"
                    style={{
                        flex: 1, border: '1px solid #e0e0e0', borderRadius: '8px',
                        padding: '10px 12px', fontSize: '0.85rem', fontFamily: 'inherit'
                    }}
                />
                <button
                    onClick={() => handleEnhance()}
                    disabled={isEnhancing || !userInput.trim()}
                    style={{
                        padding: '8px 14px', background: '#6c5ce7', color: 'white',
                        border: 'none', borderRadius: '8px', fontSize: '0.78rem',
                        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        opacity: isEnhancing ? 0.6 : 1
                    }}
                >
                    {isEnhancing ? '...' : '최적화'}
                </button>
            </div>

            {/* Style */}
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', margin: '16px 0 6px' }}>
                스타일
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STYLE_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => handleStyleChange(opt.id)}
                        disabled={isEnhancing}
                        style={{
                            padding: '6px 12px', borderRadius: '8px',
                            border: style === opt.id ? '2px solid #6c5ce7' : '1px solid #e0e0e0',
                            background: style === opt.id ? '#f0edff' : '#fafafa',
                            cursor: 'pointer', fontSize: '0.78rem',
                            fontWeight: style === opt.id ? 600 : 400,
                            color: style === opt.id ? '#6c5ce7' : '#666'
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Ratio */}
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', margin: '16px 0 6px' }}>
                비율
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
                {RATIO_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setRatio(opt.id)}
                        style={{
                            padding: '6px 12px', borderRadius: '8px',
                            border: ratio === opt.id ? '2px solid #6c5ce7' : '1px solid #e0e0e0',
                            background: ratio === opt.id ? '#f0edff' : '#fafafa',
                            cursor: 'pointer', fontSize: '0.78rem',
                            fontWeight: ratio === opt.id ? 600 : 400,
                            color: ratio === opt.id ? '#6c5ce7' : '#666'
                        }}
                    >
                        {opt.label}
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#999' }}>{opt.desc}</span>
                    </button>
                ))}
            </div>

            {/* 최적화된 프롬프트 */}
            {prompt && (
                <>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', margin: '16px 0 6px' }}>
                        생성 프롬프트
                        {isEnhancing && <span style={{ color: '#6c5ce7', marginLeft: '8px', fontWeight: 400 }}>최적화 중...</span>}
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%', border: '1px solid #e0e0e0', borderRadius: '8px',
                            padding: '10px 12px', fontSize: '0.8rem', resize: 'vertical',
                            fontFamily: 'inherit', boxSizing: 'border-box',
                            background: '#f9f9f9', color: '#555'
                        }}
                    />
                </>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading || isEnhancing || (!prompt.trim() && !userInput.trim())}
                style={{
                    width: '100%', marginTop: '20px', padding: '12px',
                    background: loading ? '#a29bfe' : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: ((!prompt.trim() && !userInput.trim()) && !loading) ? 0.5 : 1
                }}
            >
                {loading ? '생성 중... (10~20초 소요)' : '이미지 생성하기'}
            </button>

            {/* 테스트용: 로컬 이미지로 크롭 테스트 */}
            {!preview && (
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
                <div style={{
                    marginTop: '12px', padding: '10px 14px',
                    background: '#fff3f3', color: '#d63031',
                    borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #ffdddd'
                }}>
                    {error}
                </div>
            )}

            {/* Preview */}
            {preview && !isCropping && (
                <div style={{ marginTop: '16px', border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden' }}>
                    <img
                        src={`data:${preview.mimeType};base64,${preview.base64}`}
                        alt="AI 생성 이미지"
                        style={{ width: '100%', display: 'block' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', padding: '10px', background: '#fafafa', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleGenerate}
                            style={{
                                flex: 1, padding: '8px', background: 'white',
                                border: '1px solid #ddd', borderRadius: '8px',
                                fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            다시 생성
                        </button>
                        <button
                            onClick={handleDownload}
                            style={{
                                flex: 1, padding: '8px', background: 'white',
                                border: '1px solid #ddd', borderRadius: '8px',
                                fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            다운로드
                        </button>
                        <button
                            onClick={() => setIsCropping(true)}
                            style={{
                                flex: 1, padding: '8px', background: 'white',
                                border: '1px solid #ddd', borderRadius: '8px',
                                fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            ✂️ 크롭
                        </button>
                        <button
                            onClick={handleInsert}
                            style={{
                                flex: 2, padding: '8px', background: '#6c5ce7',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            본문에 삽입
                        </button>
                    </div>
                </div>
            )}

            {/* Crop Mode */}
            {preview && isCropping && (
                <div style={{ marginTop: '16px' }}>
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
                <div style={{ marginTop: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
                        최근 생성 이미지
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {history.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => onInsertImage && onInsertImage(item.url, `${mainKeyword || 'AI 생성'} 이미지`)}
                                style={{
                                    borderRadius: '8px', overflow: 'hidden',
                                    border: '1px solid #e0e0e0', cursor: 'pointer',
                                    aspectRatio: '1', position: 'relative'
                                }}
                                title="클릭하여 본문에 삽입"
                            >
                                <img
                                    src={item.url}
                                    alt={item.prompt}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
