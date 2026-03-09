import React, { useState } from 'react';
import { Camera, Bot, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { fileToBase64 } from '../../utils/image';
import PhotoUploader from '../editor/PhotoUploader';
import ImageSeoGuide from '../editor/ImageSeoGuide';
import { getKw } from './KeywordStep';

const PhotoStep = ({
    mainKeyword,
    selectedCategory,
    selectedKeywords,
    selectedTone,
    photoData,
    photoAnalysis,
    imageAlts,
    imageCaptions,
    categoryId,
    setPhotoData,
    setPhotoAnalysis,
    setImageAlts,
    setImageCaptions,
    setCachedPhotoAssets,
    onPrev,
    onNext,
    renderStepIndicator,
}) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();

    const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);

    const hasAnyPhotos = Object.values(photoData.metadata).filter(v => v > 0).length >= 1;

    // 사진 AI 분석
    const handleAnalyzePhotos = async () => {
        const photoCount = Object.values(photoData.metadata).filter(v => v > 0).length;
        if (photoCount < 1) return showToast('최소 1장의 사진을 업로드해주세요.', 'warning');

        setIsAnalyzingPhotos(true);
        recordAiAction('photoAnalysis');
        try {
            const photoAssets = [];
            for (const slotId in photoData.files) {
                const files = photoData.files[slotId];
                for (const file of files) {
                    const base64 = await fileToBase64(file);
                    photoAssets.push({ slotId, base64, mimeType: 'image/jpeg' });
                }
            }

            setCachedPhotoAssets(photoAssets);
            const result = await AIService.analyzePhotos(photoAssets, mainKeyword);
            if (result) {
                setPhotoAnalysis(result);

                // 사진 분석 완료 후 이미지 ALT 텍스트 자동 생성 (개별 이미지별)
                const uploadedSlots = Object.entries(photoData.metadata)
                    .filter(([, count]) => count > 0)
                    .map(([slot]) => slot);
                const slotCounts = {};
                uploadedSlots.forEach(slot => { slotCounts[slot] = photoData.metadata[slot]; });
                try {
                    const keywordStrings = selectedKeywords.map(k => getKw(k));
                    const altResult = await AIService.generateImageAlts(mainKeyword, keywordStrings, result, uploadedSlots, slotCounts, selectedTone || 'friendly');
                    if (altResult && Object.keys(altResult).length > 0) {
                        const alts = {}, captions = {};
                        for (const [slot, items] of Object.entries(altResult)) {
                            alts[slot] = items.map(i => typeof i === 'string' ? i : i.alt);
                            captions[slot] = items.map(i => typeof i === 'string' ? '' : i.caption);
                        }
                        setImageAlts(alts);
                        setImageCaptions(captions);
                    }
                } catch (altErr) {
                    console.warn('[이미지 ALT] 생성 실패, 기본 ALT 사용:', altErr.message);
                }
            }
        } catch (e) {
            console.error('사진 분석 오류:', e);
            showToast('사진 분석 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsAnalyzingPhotos(false);
        }
    };

    return (
        <div className="wizard-card-wrap">
            {renderStepIndicator()}

            <h2 className="wizard-step-heading">
                <Camera size={20} /> 이미지 업로드
            </h2>
            <p className="wizard-step-desc">
                이미지를 업로드하면 AI가 분석하여 본문 작성에 활용합니다.
            </p>

            <PhotoUploader
                keyword={mainKeyword}
                onUpdate={setPhotoData}
                categoryId={categoryId}
            />

            {hasAnyPhotos && (
                <div className="wizard-section-mt">
                    <button
                        onClick={handleAnalyzePhotos}
                        disabled={isAnalyzingPhotos}
                        className="wizard-btn-accent"
                    >
                        {isAnalyzingPhotos
                            ? <><Loader2 size={16} className="spin" /> 사진 분석 중...</>
                            : <><Bot size={16} /> 사진 AI 분석하기</>
                        }
                    </button>
                </div>
            )}

            {isAnalyzingPhotos && (
                <div className="ai-progress-inline wizard-mt-16">
                    <Loader2 size={16} className="spin" />
                    <span>업로드한 사진을 AI가 분석 중입니다</span>
                </div>
            )}

            {(photoAnalysis || Object.keys(imageAlts).length > 0) && (
                <div className="wizard-mt-16">
                    <ImageSeoGuide
                        mainKeyword={mainKeyword}
                        imageAlts={imageAlts}
                        imageCaptions={imageCaptions}
                        photoMetadata={photoData.metadata}
                        photoAnalysis={photoAnalysis}
                        photoFiles={photoData.files}
                    />
                </div>
            )}

            <div className="wizard-nav">
                <button
                    onClick={onPrev}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 이전
                </button>
                <button
                    onClick={onNext}
                    className="wizard-btn-primary"
                >
                    {hasAnyPhotos ? '다음' : '건너뛰기'} <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PhotoStep;
