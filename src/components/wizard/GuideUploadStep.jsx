import React, { useState, useRef } from 'react';
import { ClipboardList, Upload, ArrowLeft, ArrowRight, Loader2, Check, X, Edit3 } from 'lucide-react';
import { AIService } from '../../services/openai';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';

const GuideUploadStep = ({ onBack, onNext, sponsorGuide, setSponsorGuide, renderStepIndicator }) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();
    const [guideText, setGuideText] = useState('');
    const [guideImages, setGuideImages] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                setGuideImages(prev => [...prev, { base64, mimeType: file.type, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleParse = async () => {
        if (!guideText.trim() && guideImages.length === 0) {
            showToast('가이드 텍스트 또는 이미지를 입력해주세요.', 'warning');
            return;
        }
        setIsParsing(true);
        recordAiAction('parseSponsorGuide');
        try {
            const result = await AIService.parseSponsorGuide(guideText, guideImages);
            setSponsorGuide(result);
            showToast('가이드 분석 완료!', 'success');
        } catch (err) {
            showToast('가이드 분석 실패: ' + err.message, 'error');
        } finally {
            setIsParsing(false);
        }
    };

    const updateField = (field, value) => {
        setSponsorGuide(prev => ({ ...prev, [field]: value }));
    };

    const hasInput = guideText.trim() || guideImages.length > 0;

    // 파싱 전: 가이드 입력 화면
    if (!sponsorGuide) {
        return (
            <div className="wizard-card-wrap">
                {renderStepIndicator()}
                <h2 className="wizard-step-heading">
                    <ClipboardList size={20} /> 가이드 업로드
                </h2>
                <p className="wizard-step-desc">
                    업체에서 받은 체험단/협찬 가이드를 업로드하세요. AI가 필수 요소를 자동으로 추출합니다.
                </p>

                {/* 이미지 업로드 */}
                <div className="wizard-form-group">
                    <label className="wizard-label">
                        <Upload size={16} /> 가이드 이미지 (캡처/사진)
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="guide-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={16} /> 이미지 선택
                    </button>
                    {guideImages.length > 0 && (
                        <div className="guide-image-previews">
                            {guideImages.map((img, i) => (
                                <div key={i} className="guide-image-thumb">
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.name} />
                                    <button className="guide-image-remove" onClick={() => setGuideImages(prev => prev.filter((_, j) => j !== i))}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 텍스트 입력 */}
                <div className="wizard-form-group">
                    <label className="wizard-label">
                        <Edit3 size={16} /> 가이드 텍스트 (복사/붙여넣기)
                    </label>
                    <textarea
                        value={guideText}
                        onChange={e => setGuideText(e.target.value)}
                        placeholder="가이드 내용을 여기에 붙여넣으세요...&#10;&#10;예: 필수 키워드 - ○○호텔, 강남 호텔&#10;필수 문구 - 공식 홈페이지 예약 시 할인&#10;사진 최소 10장..."
                        className="wizard-field guide-textarea"
                        rows={6}
                    />
                </div>

                <div className="wizard-nav">
                    <button onClick={onBack} className="wizard-btn-secondary">
                        <ArrowLeft size={16} /> 이전
                    </button>
                    <button
                        onClick={handleParse}
                        disabled={!hasInput || isParsing}
                        className="wizard-btn-primary"
                    >
                        {isParsing ? <><Loader2 size={16} className="spin" /> 분석 중...</> : <>AI 가이드 분석 <ArrowRight size={16} /></>}
                    </button>
                </div>
            </div>
        );
    }

    // 파싱 후: 결과 확인/수정 화면
    return (
        <div className="wizard-card-wrap">
            {renderStepIndicator()}
            <h2 className="wizard-step-heading">
                <Check size={20} /> 가이드 분석 결과
            </h2>
            <p className="wizard-step-desc">
                추출된 요소를 확인하고 필요하면 수정하세요. {sponsorGuide.brandName && `(${sponsorGuide.brandName})`}
            </p>

            <div className="guide-parsed-cards">
                {/* 필수 키워드 */}
                {sponsorGuide.requiredKeywords?.length > 0 && (
                    <div className="guide-card">
                        <div className="guide-card-label">필수 키워드</div>
                        <div className="guide-card-chips">
                            {sponsorGuide.requiredKeywords.map((kw, i) => (
                                <span key={i} className="guide-chip">{kw}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 필수 문구 */}
                {sponsorGuide.requiredPhrases?.length > 0 && (
                    <div className="guide-card">
                        <div className="guide-card-label">필수 문구</div>
                        {sponsorGuide.requiredPhrases.map((phrase, i) => (
                            <div key={i} className="guide-phrase">"{phrase}"</div>
                        ))}
                    </div>
                )}

                {/* 금지 표현 */}
                {sponsorGuide.forbiddenWords?.length > 0 && (
                    <div className="guide-card guide-card-warn">
                        <div className="guide-card-label">금지 표현</div>
                        <div className="guide-card-chips">
                            {sponsorGuide.forbiddenWords.map((w, i) => (
                                <span key={i} className="guide-chip guide-chip-warn">{w}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 광고 표시 */}
                {sponsorGuide.adDisclosure && (
                    <div className="guide-card">
                        <div className="guide-card-label">광고 표시 ({sponsorGuide.adDisclosurePosition === 'top' ? '글 상단' : '글 하단'})</div>
                        <div className="guide-phrase">"{sponsorGuide.adDisclosure}"</div>
                    </div>
                )}

                {/* 링크 */}
                {sponsorGuide.linkUrl && (
                    <div className="guide-card">
                        <div className="guide-card-label">필수 링크</div>
                        <div className="guide-phrase">{sponsorGuide.linkAnchorText || sponsorGuide.linkUrl}</div>
                    </div>
                )}

                {/* 해시태그 */}
                {sponsorGuide.hashTags?.length > 0 && (
                    <div className="guide-card">
                        <div className="guide-card-label">필수 해시태그</div>
                        <div className="guide-card-chips">
                            {sponsorGuide.hashTags.map((tag, i) => (
                                <span key={i} className="guide-chip">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 기타 요건 */}
                {sponsorGuide.otherRequirements?.length > 0 && (
                    <div className="guide-card">
                        <div className="guide-card-label">기타 요건</div>
                        {sponsorGuide.otherRequirements.map((req, i) => (
                            <div key={i} className="guide-phrase">• {req}</div>
                        ))}
                    </div>
                )}
            </div>

            <div className="wizard-nav">
                <button onClick={() => { setSponsorGuide(null); }} className="wizard-btn-secondary">
                    <ArrowLeft size={16} /> 다시 분석
                </button>
                <button onClick={onNext} className="wizard-btn-primary">
                    다음 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default GuideUploadStep;
