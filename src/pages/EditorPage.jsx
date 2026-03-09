import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
// Header 제거 — AppLayout의 Sidebar/TopBar로 대체
import MainContainer from '../components/layout/MainContainer';
import { useEditor } from '../context/EditorContext';
import { useToast } from '../components/common/Toast';
import { getTemplateById } from '../data/templates';
import { AIService } from '../services/openai';
import { formatParagraphs } from '../utils/analysis';
import { humanizeText } from '../utils/humanness';
import { buildStyleRules } from '../utils/wannabeStyle';
import { getSlotConfig } from '../data/slotConfig';
import ImageGeneratorPanel from '../components/editor/ImageGeneratorPanel';
import ImageSeoGuide from '../components/editor/ImageSeoGuide';
import StepIndicator from '../components/wizard/StepIndicator';
import TopicStep from '../components/wizard/TopicStep';
import KeywordStep, { recommendLength, getKw } from '../components/wizard/KeywordStep';
import ToneStep from '../components/wizard/ToneStep';
import PhotoStep from '../components/wizard/PhotoStep';
import OutlineStep from '../components/wizard/OutlineStep';
import { fileToBase64 } from '../utils/image';
import { copyToClipboard } from '../utils/clipboard';
import { CATEGORIES } from '../data/categories';
import { callBetaStatus } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import {
    Search, CheckCircle, Tag, Lock,
    Loader2, Sparkles, Copy, Check, PartyPopper, BarChart3, ClipboardCopy
} from 'lucide-react';
import '../styles/components.css';
import '../styles/ImageSeoGuide.css';

const EditorPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { openPost, posts, currentPostId, title, updateMainKeyword, updateSubKeywords, setSuggestedTone, setContent, content, setTargetLength, editorRef, lastCursorPosRef, closeSession, recordAiAction, updatePostMeta, setPhotoPreviewUrls } = useEditor();
    const { showToast } = useToast();

    const locationStateProcessed = useRef(false);

    // DUAL MODE STATE
    const isNewPost = !!location.state?.isNew;
    const [editorMode, setEditorMode] = useState(
        location.state?.isNew ? 'ai' : (location.state?.initialMode || 'direct')
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState(0); // 0~4 단계별 로딩
    const [wizardData, setWizardData] = useState(null);

    // 카테고리 + 주제 (StartWizardPage에서 통합)
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [topicInput, setTopicInput] = useState('');
    // AI 모드 4단계 스텝
    const [aiStep, setAiStepRaw] = useState(1); // 1: 주제, 2: 키워드+설정, 3: 이미지, 4: 아웃라인+생성
    const setAiStep = (step) => {
        setAiStepRaw(step);
        setTimeout(() => {
            const el = document.querySelector('.app-content');
            if (el) el.scrollTo({ top: 0, behavior: 'instant' });
            else window.scrollTo({ top: 0, behavior: 'instant' });
        }, 0);
    };

    // Step 1: 키워드 상태 (제안형 + 선택형)
    const [mainKeyword, setMainKeyword] = useState('');
    const [selectedKeywords, setSelectedKeywords] = useState([]); // 사용자가 선택한 키워드 (최소 3, 최대 5)

    // 경쟁 블로그 분석 상태
    const [competitorData, setCompetitorData] = useState(null);

    // Step 2: 이미지 상태
    const [photoData, setPhotoData] = useState({
        metadata: {},
        previews: {},
        files: {}
    });
    const [photoAnalysis, setPhotoAnalysis] = useState(null);
    const [imageAlts, setImageAlts] = useState({});
    const [imageCaptions, setImageCaptions] = useState({});
    const [cachedPhotoAssets, setCachedPhotoAssets] = useState([]);
    const imageAltsRef = useRef({});

    // photoData.files → Context photoPreviewUrls 동기화 (모든 파일의 ObjectURL 생성)
    useEffect(() => {
        const urls = [];
        for (const slotFiles of Object.values(photoData.files || {})) {
            for (const file of (slotFiles || [])) {
                urls.push(URL.createObjectURL(file));
            }
        }
        setPhotoPreviewUrls(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [photoData.files, setPhotoPreviewUrls]);

    // Step 3: 본문 설정 상태
    const [selectedLength, setSelectedLengthLocal] = useState(null);
    const [selectedTone, setToneState] = useState(null);
    const [paragraphStyle, setParagraphStyle] = useState('normal');
    const [selectedWannabeStyle, setSelectedWannabeStyle] = useState(null);
    const [userPlan, setUserPlan] = useState('free');
    const { user, isAdmin } = useAuth();

    // 관리자/마스터 계정 또는 베타 테스터 상태 확인
    useEffect(() => {
        if (!user) return;
        if (isAdmin) {
            setUserPlan('pro');
            return;
        }
        callBetaStatus()
            .then(result => {
                if (result.data?.active) setUserPlan(result.data.plan || 'pro');
            })
            .catch(() => {});
    }, [user, isAdmin]);

    // Step 4: 아웃라인 상태
    const [outlineItems, setOutlineItems] = useState([]); // [{level: 'h2'|'h3', title: '...'}]
    // 이미지 SEO 가이드 드로어 상태
    const [showSeoDrawer, setShowSeoDrawer] = useState(false);
    const [mobileCopyStatus, setMobileCopyStatus] = useState('idle');

    // AI 이미지 생성 드로어 상태
    const [showImageGenDrawer, setShowImageGenDrawer] = useState(false);

    // 생성 완료 축하 카드 상태
    const [showCompletionCard, setShowCompletionCard] = useState(false);
    const [completionStats, setCompletionStats] = useState(null);

    // 에디터 온보딩 툴팁 상태
    const [showEditorTip, setShowEditorTip] = useState(false);

    // Close session on unmount (route change)
    useEffect(() => {
        return () => { closeSession(); };
    }, [closeSession]);

    // 위자드 이탈 방지 (beforeunload)
    useEffect(() => {
        if (editorMode !== 'ai' || !isNewPost) return;
        const hasInput = mainKeyword.trim() || selectedKeywords.length > 0 || Object.values(photoData.metadata).some(v => v > 0);
        if (!hasInput) return;
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [editorMode, isNewPost, mainKeyword, selectedKeywords, photoData.metadata]);

    // 에디터 첫 진입 온보딩 (한 번만 표시)
    useEffect(() => {
        const seen = localStorage.getItem('piklit_editor_onboarding');
        if (!seen && editorMode === 'direct') {
            setShowEditorTip(true);
            localStorage.setItem('piklit_editor_onboarding', '1');
        }
    }, [editorMode]);

    // 카테고리 ID (쇼핑/맛집 등 분기용)
    const categoryId = selectedCategory?.id || wizardData?.initialCategoryId || location.state?.initialCategoryId || 'daily';

    // 글자수 선택 시 Context의 targetLength도 동기화
    const setSelectedLength = (val) => {
        setSelectedLengthLocal(val);
        const minChars = parseInt(val.match(/\d+/)?.[0] || '1500', 10);
        setTargetLength(minChars);
    };


    // 주제로 초기화
    useEffect(() => {
        if (location.state?.initialMainKeyword && !mainKeyword) {
            setMainKeyword(location.state.initialMainKeyword);
            updateMainKeyword(location.state.initialMainKeyword);
        }
        if (location.state?.initialTone) {
            setToneState(location.state.initialTone);
        }
        // 추천 기능에서 넘어온 프리필
        if (location.state?.prefillTopic && !topicInput) {
            setTopicInput(location.state.prefillTopic);
        }
        if (location.state?.prefillCategory) {
            const catLabel = location.state.prefillCategory;
            const matched = CATEGORIES.find(c =>
                c.label === catLabel || c.label.includes(catLabel) || catLabel.includes(c.label)
            );
            if (matched && !selectedCategory) {
                setSelectedCategory(matched);
            }
        }
    }, [location.state]);

    // mainKeyword 변경 시 Context와 동기화 (분석 체크리스트 연동)
    useEffect(() => {
        if (mainKeyword) {
            updateMainKeyword(mainKeyword);
        }
    }, [mainKeyword, updateMainKeyword]);

    // selectedKeywords 변경 시 Context의 keywords.sub와 동기화 (제목 추천 등에서 활용)
    useEffect(() => {
        const subArray = selectedKeywords.map(k => getKw(k));
        updateSubKeywords(subArray);
    }, [selectedKeywords, updateSubKeywords]);

    // 스텝 변경 시 페이지 상단으로 스크롤
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [aiStep]);

    // imageAltsRef 동기화 (본문 생성 시 최신 값 참조)
    useEffect(() => { imageAltsRef.current = imageAlts; }, [imageAlts]);

    // 경쟁 분석 결과 변경 시 글자수 자동 추천
    useEffect(() => {
        if (competitorData?.average?.charCount) {
            const recommended = recommendLength(competitorData.average.charCount);
            if (recommended) setSelectedLength(recommended);
        }
    }, [competitorData]);


    // Step 1 → 2 이동 가능 여부 (카테고리 선택 + 주제 입력 + 최소 3개 키워드)
    const canProceedToStep1 = isNewPost ? (selectedCategory && topicInput.trim()) : mainKeyword.trim();
    const canProceedToStep2 = mainKeyword.trim() && selectedKeywords.length >= 3;


    // Streaming Logic
    const streamContentToEditor = async (fullHtml) => {
        // 0. JSON 잔여 문자열 제거
        let injectedHtml = fullHtml
            .replace(/^\s*\{\s*"html"\s*:\s*"/i, '')
            .replace(/"\s*\}\s*$/, '');
        // 슬롯 이름 매핑 (카테고리별 범용) — data/slotConfig.js에서 import
        const slotCfg = getSlotConfig(categoryId);
        const slotOrder = slotCfg.order;
        const slotAliases = slotCfg.aliases;
        const slotLabels = slotCfg.labels;

        // [[IMAGE:slot]], [IMAGE:slot], [IMAGE:1] 등 다양한 형식 대응 (공백 포함 슬롯명 지원)
        let slotInsertIndex = 0; // 인식 못 하는 슬롯명은 순서대로 매핑
        const insertedSlots = new Set(); // 중복 삽입 방지
        injectedHtml = injectedHtml.replace(/\[{1,2}IMAGE\s*:\s*([^\]]+)\]{1,2}/gi, (match, rawType) => {
            // 공백 제거 + 숫자면 슬롯 순서로 매핑, 아니면 별칭 매핑
            let slotName = rawType.trim().replace(/\s+/g, '').toLowerCase();
            if (/^\d+$/.test(slotName)) {
                const idx = parseInt(slotName, 10) - 1;
                slotName = slotOrder[idx] || 'extra';
            }
            slotName = slotAliases[slotName] || slotName;

            // 별칭에 없으면 부분 매칭 시도 (예: '카페외관정면' → '외관' 포함 → entrance)
            if (!slotLabels[slotName]) {
                const partialMatch = Object.keys(slotAliases).find(alias => slotName.includes(alias) && alias.length > 1);
                slotName = partialMatch ? slotAliases[partialMatch] : slotOrder[slotInsertIndex] || 'extra';
            }
            slotInsertIndex++;

            // 이미 삽입된 슬롯이면 태그만 제거 (중복 방지)
            if (insertedSlots.has(slotName)) {
                return '';
            }
            insertedSlots.add(slotName);

            const files = photoData.files[slotName];
            if (files && files.length > 0) {
                // SEO 최적화: 개별 이미지별 ALT 배열 + 캡션 → fallback
                const altArr = imageAlts[slotName];
                const captionArr = imageCaptions[slotName];
                return files.map((file, idx) => {
                    const altText = (Array.isArray(altArr) ? altArr[idx] : altArr)
                        || `${mainKeyword} ${slotLabels[slotName] || slotName}`;
                    const caption = Array.isArray(captionArr) ? captionArr[idx] : '';
                    const captionHtml = caption
                        ? `<p style="text-align:center;color:#787774;font-size:0.85rem;margin:4px 0 16px;">${caption}</p>`
                        : '';
                    const imageUrl = URL.createObjectURL(file);
                    return `</p><p><img src="${imageUrl}" alt="${altText}" style="width: 100%; max-width: 800px; border-radius: 8px; margin: 10px 0;" /></p>${captionHtml}<p>`;
                }).join('');
            }
            // 파일 없는 슬롯 → TIP 박스로 변환 (한국어 라벨 사용)
            const label = slotLabels[slotName] || slotName;
            return `</p><blockquote style="border-left: 4px solid #FF6B35; background: #FFF3ED; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; color: #FF6B35; font-size: 0.9rem;">📸 <b>${label}</b> 사진을 추가하면 더 좋아요!</blockquote><p>`;
        });

        // 2. [[VIDEO]] / [[VIDEO:텍스트]] → 동영상 TIP 박스 변환 ([VIDEO] 단일 대괄호도 대응)
        injectedHtml = injectedHtml.replace(/\[{1,2}VIDEO(?::[^\]]*?)?\]{1,2}/gi, '<blockquote style="border-left: 4px solid #2EAADC; background: #EBF7FC; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; color: #2EAADC; font-size: 0.9rem;">🎬 <b>TIP</b> 동영상을 추가하면 체류 시간이 올라갑니다!</blockquote>');

        // 3. [대괄호 팁] → <blockquote> TIP 박스 변환
        injectedHtml = injectedHtml.replace(/\[([^\]]*사진[^\]]*추가[^\]]*)\]/g, '<blockquote>💡 TIP: $1</blockquote>');
        injectedHtml = injectedHtml.replace(/\[([^\]]*TIP[^\]]*)\]/gi, '<blockquote>💡 $1</blockquote>');

        // 3. 후처리: 문단 스타일에 맞게 분리 (AI가 규칙 안 따라도 보장)
        injectedHtml = formatParagraphs(injectedHtml, paragraphStyle || 'normal');

        // 3.5. AI 패턴 후처리: 금지 표현 자동 교정 + 종결어미 변환
        injectedHtml = humanizeText(injectedHtml, selectedTone || 'friendly');

        // 4. 이모지 전용 <p> 태그를 다음 문단과 병합 (이모지가 별도 줄로 분리되는 현상 방지)
        // eslint-disable-next-line no-misleading-character-class
        injectedHtml = injectedHtml.replace(/<p>\s*([\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\s]{1,6})\s*<\/p>\s*<p>/gu, '<p>$1 ');

        const chunkSize = 20;
        let currentPos = 0;
        while (currentPos < injectedHtml.length) {
            const nextChunk = injectedHtml.substring(0, currentPos + chunkSize);
            setContent(nextChunk);
            currentPos += chunkSize;
            await new Promise(r => setTimeout(r, 10));
        }
        setContent(injectedHtml);
    };

    // 본문 생성
    const handleAiGenerate = async () => {
        setIsGenerating(true);
        setGenerationStep(0);
        recordAiAction('fullDraft');
        try {
            // Step 0: 준비 중 (이미지 변환)
            let photoAssets = cachedPhotoAssets;
            if (photoAssets.length === 0) {
                photoAssets = [];
                for (const slotId in photoData.files) {
                    const files = photoData.files[slotId];
                    for (const file of files) {
                        const base64 = await fileToBase64(file);
                        photoAssets.push({ slotId, base64, mimeType: 'image/jpeg' });
                    }
                }
            }

            // 객체 배열에서 키워드 문자열만 추출
            const keywordStrings = selectedKeywords.map(k => getKw(k));

            console.log('[AI Generate] 본문 생성 시작:', {
                mainKeyword,
                subKeywords: keywordStrings,
                tone: selectedTone,
                length: selectedLength,
                photoCount: photoAssets.length
            });

            // 경쟁 분석 없이 생성하는 경우 안내
            if (!competitorData) {
                showToast('경쟁 분석 없이 생성합니다. 더 나은 결과를 위해 경쟁 분석을 권장합니다.', 'info');
            }

            let stepIdx = 0;

            // Step: 사진 분석 중
            setGenerationStep(++stepIdx);

            // 이미지 ALT 텍스트가 없으면 본문 생성 전에 생성 시도 (ref로 최신 값 참조)
            if (Object.keys(imageAltsRef.current).length === 0) {
                const uploadedSlots = Object.entries(photoData.metadata)
                    .filter(([, count]) => count > 0)
                    .map(([slot]) => slot);
                if (uploadedSlots.length > 0) {
                    const slotCounts = {};
                    uploadedSlots.forEach(slot => { slotCounts[slot] = photoData.metadata[slot]; });
                    try {
                        const altResult = await AIService.generateImageAlts(mainKeyword, keywordStrings, photoAnalysis, uploadedSlots, slotCounts, selectedTone || 'friendly');
                        if (altResult && Object.keys(altResult).length > 0) {
                            const alts = {}, captions = {};
                            for (const [slot, items] of Object.entries(altResult)) {
                                alts[slot] = items.map(i => typeof i === 'string' ? i : i.alt);
                                captions[slot] = items.map(i => typeof i === 'string' ? '' : i.caption);
                            }
                            setImageAlts(alts);
                            setImageCaptions(captions);
                            console.log('[이미지 ALT+캡션] 본문 생성 전 생성 완료:', alts, captions);
                        }
                    } catch (altErr) {
                        console.warn('[이미지 ALT] 생성 실패, 기본 ALT 사용:', altErr.message);
                    }
                }
            }

            // Step: ALT 텍스트 생성 중
            setGenerationStep(++stepIdx);

            // Step: 본문 작성 중
            setGenerationStep(++stepIdx);

            const result = await AIService.generateFullDraft(
                categoryId,
                mainKeyword,
                selectedTone || 'friendly',
                photoData.metadata,
                photoAssets,
                keywordStrings,
                selectedLength || '1200~1800자',
                photoAnalysis,
                competitorData,
                outlineItems.length > 0 ? outlineItems : null,
                buildStyleRules(selectedWannabeStyle),
                paragraphStyle || 'normal'
            );

            console.log('[AI Generate] API 응답:', result);

            const htmlContent = result?.html || result?.text;
            if (htmlContent) {
                await streamContentToEditor(htmlContent);
                updateMainKeyword(mainKeyword);
                const photoCount = Object.values(photoData.metadata).filter(v => v > 0).length;
                const charCount = htmlContent.replace(/<[^>]*>/g, '').length;
                // 축하 카드 표시
                setCompletionStats({ charCount, keywordCount: keywordStrings.length, photoCount });
                setShowCompletionCard(true);
            } else {
                showToast('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.', 'error');
            }
        } catch (e) {
            console.error('[AI Generate] 오류:', e);
            showToast("AI 작성 중 오류가 발생했습니다: " + e.message, 'error');
        } finally {
            setIsGenerating(false);
            setEditorMode('direct');
        }
    };

    useEffect(() => {
        if (posts.length === 0) return;
        const postExists = posts.find(p => p.id === id);
        if (postExists) {
            if (currentPostId !== id) openPost(id);
            if (location.state && !locationStateProcessed.current) {
                setWizardData(location.state);
                setTimeout(() => {
                    const { initialMainKeyword, initialTone, initialTemplateId, initialCategoryId, initialMode } = location.state;
                    if (initialMainKeyword) {
                        updateMainKeyword(initialMainKeyword);
                        setMainKeyword(initialMainKeyword);
                    }
                    if (initialTone) {
                        setSuggestedTone(initialTone);
                        setToneState(initialTone);
                    }
                    if (initialTemplateId && initialMode === 'direct') {
                        const template = getTemplateById(initialTemplateId);
                        if (template) setContent(template.content);
                    }
                    // Save metadata to post
                    updatePostMeta(id, {
                        categoryId: initialCategoryId || 'daily',
                        tone: initialTone || 'friendly',
                        mode: initialMode || 'direct',
                    });
                }, 200);
                locationStateProcessed.current = true;
            }
        }
    }, [id, posts, currentPostId, openPost, location.state, updateMainKeyword, setSuggestedTone, setContent]);

    const STEP_LABELS = ['주제 선택', '키워드 + 설정', '톤앤무드', '이미지 업로드', '아웃라인 + 생성'];

    // 카테고리별 placeholder
    // Progress Indicator — 외부 컴포넌트 사용
    const handleStepClick = (step) => {
        if (step < aiStep) setAiStep(step);
    };

    const renderStepIndicator = () => (
        <StepIndicator currentStep={aiStep} labels={STEP_LABELS} onStepClick={handleStepClick} />
    );

    // AI 모드일 때 전체 페이지로 스텝 UI 렌더링
    if (editorMode === 'ai' && !isGenerating) {
        return (
            <div>
                <div className="wizard-page">
                    <div className="wizard-page-inner">
                        {/* STEP 1: 주제 선택 (카테고리 + 주제) */}
                        {aiStep === 1 && (
                            <TopicStep
                                isNewPost={isNewPost}
                                selectedCategory={selectedCategory}
                                topicInput={topicInput}
                                mainKeyword={mainKeyword}
                                setSelectedCategory={setSelectedCategory}
                                setTopicInput={setTopicInput}
                                setMainKeyword={setMainKeyword}
                                setToneState={setToneState}
                                onNext={() => {
                                    if (isNewPost && !mainKeyword.trim() && topicInput.trim()) {
                                        setMainKeyword(topicInput.trim());
                                        updateMainKeyword(topicInput.trim());
                                    }
                                    setAiStep(2);
                                }}
                                canProceed={canProceedToStep1}
                                postId={id}
                                renderStepIndicator={renderStepIndicator}
                            />
                        )}

                        {/* STEP 2: 키워드 분석 + 세부 설정 */}
                        {aiStep === 2 && (
                            <KeywordStep
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedKeywords={selectedKeywords}
                                competitorData={competitorData}
                                categoryId={categoryId}
                                wizardData={wizardData || location.state}
                                setSelectedKeywords={setSelectedKeywords}
                                setCompetitorData={setCompetitorData}
                                onPrev={() => setAiStep(1)}
                                onNext={() => setAiStep(3)}
                                canProceed={canProceedToStep2}
                                renderStepIndicator={renderStepIndicator}
                            />
                        )}

                        {/* STEP 3: 스타일 설정 (경쟁분석 + 글자수 + 톤 + 워너비) */}
                        {aiStep === 3 && (
                            <ToneStep
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedTone={selectedTone}
                                selectedLength={selectedLength}
                                paragraphStyle={paragraphStyle}
                                competitorData={competitorData}
                                setToneState={setToneState}
                                setSelectedLength={setSelectedLength}
                                setParagraphStyle={setParagraphStyle}
                                setCompetitorData={setCompetitorData}
                                selectedWannabeStyle={selectedWannabeStyle}
                                setSelectedWannabeStyle={setSelectedWannabeStyle}
                                userPlan={userPlan || 'free'}
                                onPrev={() => setAiStep(2)}
                                onNext={() => setAiStep(4)}
                                renderStepIndicator={renderStepIndicator}
                            />
                        )}

                        {/* STEP 4: 이미지 업로드 & 분석 */}
                        {aiStep === 4 && (
                            <PhotoStep
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedKeywords={selectedKeywords}
                                selectedTone={selectedTone}
                                photoData={photoData}
                                photoAnalysis={photoAnalysis}
                                imageAlts={imageAlts}
                                imageCaptions={imageCaptions}
                                categoryId={categoryId}
                                setPhotoData={setPhotoData}
                                setPhotoAnalysis={setPhotoAnalysis}
                                setImageAlts={setImageAlts}
                                setImageCaptions={setImageCaptions}
                                setCachedPhotoAssets={setCachedPhotoAssets}
                                onPrev={() => setAiStep(3)}
                                onNext={() => setAiStep(5)}
                                renderStepIndicator={renderStepIndicator}
                            />
                        )}

                        {/* STEP 5: 아웃라인 + 생성 */}
                        {aiStep === 5 && (
                            <OutlineStep
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedKeywords={selectedKeywords}
                                selectedTone={selectedTone}
                                selectedLength={selectedLength}
                                competitorData={competitorData}
                                outlineItems={outlineItems}
                                photoData={photoData}
                                categoryId={categoryId}
                                setOutlineItems={setOutlineItems}
                                onPrev={() => setAiStep(4)}
                                onGenerate={handleAiGenerate}
                                renderStepIndicator={renderStepIndicator}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 생성 중 로딩 UI
    if (isGenerating) {
        const GENERATION_STEPS = [
            { label: '이미지 준비', icon: <Loader2 size={16} /> },
            { label: '사진 분석', icon: <Search size={16} /> },
            { label: '사진 설명 생성', icon: <Tag size={16} /> },
            { label: '본문 작성', icon: <Sparkles size={16} /> },
        ];
        const progressPercent = Math.round((generationStep / GENERATION_STEPS.length) * 100);

        return (
            <div className="generation-loading">
                <div className="generation-icon">
                    <Sparkles size={36} />
                </div>
                <h2 className="generation-title">AI가 글을 작성하고 있어요</h2>
                <p className="generation-subtitle">
                    잠시만 기다려주세요. 곧 완성됩니다!
                </p>

                <div className="generation-progress-track">
                    <div className="generation-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="generation-steps">
                    {GENERATION_STEPS.map((step, idx) => {
                        const isDone = idx < generationStep;
                        const isCurrent = idx === generationStep;
                        return (
                            <div key={idx} className={`generation-step ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                                <span className="generation-step-icon">
                                    {isDone ? <CheckCircle size={16} /> : isCurrent ? step.icon : <span className="generation-step-placeholder" />}
                                </span>
                                <span>{step.label}</span>
                                {isCurrent && (
                                    <span className="generation-step-status">진행 중...</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // AI 이미지 본문 삽입 핸들러 (마지막 커서 위치에 삽입)
    const handleInsertAiImage = (imageUrl, altText) => {
        const editor = editorRef?.current;
        if (editor) {
            const savedPos = lastCursorPosRef?.current;
            if (savedPos != null && savedPos < editor.state.doc.content.size) {
                // 저장된 커서 위치에 삽입
                editor.chain()
                    .insertContentAt(savedPos, {
                        type: 'image',
                        attrs: { src: imageUrl, alt: altText },
                    })
                    .focus()
                    .run();
            } else {
                // 위치 정보 없으면 끝에 삽입
                editor.chain().focus('end').setImage({
                    src: imageUrl,
                    alt: altText,
                }).run();
            }
        } else {
            const imgTag = `<p><img src="${imageUrl}" alt="${altText}" style="width: 100%; max-width: 800px; border-radius: 8px; margin: 10px 0;" /></p>`;
            setContent(prev => prev + imgTag);
        }
    };

    // 업로드된 이미지가 있는지 확인 (플로팅 버튼 표시 조건: metadata 또는 ALT 텍스트 존재)
    const hasUploadedImages = Object.values(photoData.metadata).some(v => v > 0) || Object.keys(imageAlts).length > 0;
    const totalUploadedImages = Object.values(photoData.metadata).reduce((sum, v) => sum + v, 0) || Object.keys(imageAlts).length;

    // 직접 작성 모드 (기존 에디터)
    return (
        <div>
            <MainContainer />

            {/* 생성 완료 축하 카드 */}
            {showCompletionCard && completionStats && (
                <div className="completion-overlay" onClick={() => setShowCompletionCard(false)}>
                    <div className="completion-card" onClick={(e) => e.stopPropagation()}>
                        <div className="completion-icon"><PartyPopper size={32} /></div>
                        <h3 className="completion-title">글이 완성되었습니다!</h3>
                        <p className="completion-hint">
                            제목을 작성하고 본문을 검토해보세요.
                        </p>
                        <button className="completion-cta" onClick={() => setShowCompletionCard(false)}>
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 에디터 온보딩 툴팁 */}
            {showEditorTip && (
                <div className="editor-onboarding-tip">
                    <p>우측 사이드바에서 <strong>SEO 점수</strong>와 <strong>가독성</strong>을 실시간으로 확인할 수 있어요.</p>
                    <button onClick={() => setShowEditorTip(false)}>확인</button>
                </div>
            )}

            {/* 이미지 SEO 가이드 플로팅 버튼 + 드로어 */}
            {hasUploadedImages && (
                <>
                    <button
                        className="image-seo-floating-btn"
                        onClick={() => setShowSeoDrawer(true)}
                        title="이미지 SEO 가이드"
                    >
                        📸
                        <span className="badge">{totalUploadedImages}</span>
                    </button>

                    <div
                        className={`image-seo-drawer-overlay ${showSeoDrawer ? 'open' : ''}`}
                        onClick={() => setShowSeoDrawer(false)}
                    />
                    <div className={`image-seo-drawer ${showSeoDrawer ? 'open' : ''}`}>
                        <div className="image-seo-drawer-header">
                            <h3>📸 {photoAnalysis ? '사진 분석 & SEO 가이드' : '이미지 SEO 가이드'}</h3>
                            <button
                                className="image-seo-drawer-close"
                                onClick={() => setShowSeoDrawer(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="image-seo-drawer-body">
                            <ImageSeoGuide
                                mainKeyword={mainKeyword}
                                imageAlts={imageAlts}
                                imageCaptions={imageCaptions}
                                photoMetadata={photoData.metadata}
                                photoAnalysis={photoAnalysis}
                                photoFiles={photoData.files}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* 모바일 플로팅 복사 버튼 (768px 이하에서만 CSS로 표시) */}
            <button
                className="mobile-floating-copy-btn"
                onClick={async () => {
                    const ok = await copyToClipboard(title, content);
                    if (ok) {
                        setMobileCopyStatus('success');
                        setTimeout(() => setMobileCopyStatus('idle'), 2000);
                    }
                }}
            >
                {mobileCopyStatus === 'success' ? <Check size={20} /> : <Copy size={20} />}
            </button>

            {/* AI 이미지 생성 플로팅 버튼 + 드로어 */}
            {(userPlan === 'pro' || userPlan === 'beta') ? (
                <>
                    <button
                        className={`image-gen-floating-btn${hasUploadedImages ? ' shift-up' : ''}`}
                        onClick={() => setShowImageGenDrawer(true)}
                        title="AI 이미지 생성"
                    >
                        🎨
                    </button>

                    <div
                        className={`image-seo-drawer-overlay ${showImageGenDrawer ? 'open' : ''}`}
                        onClick={() => setShowImageGenDrawer(false)}
                    />
                    <div className={`image-seo-drawer ${showImageGenDrawer ? 'open' : ''}`}>
                        <div className="image-seo-drawer-header">
                            <h3>🎨 AI 이미지 생성</h3>
                            <button
                                className="image-seo-drawer-close"
                                onClick={() => setShowImageGenDrawer(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="image-seo-drawer-body">
                            <ImageGeneratorPanel
                                mainKeyword={mainKeyword}
                                onInsertImage={handleInsertAiImage}
                            />
                        </div>
                    </div>
                </>
            ) : (
                /* Pro 기능 잠금 표시 */
                <button
                    className={`image-gen-floating-btn locked${hasUploadedImages ? ' shift-up' : ''}`}
                    onClick={() => showToast('AI 이미지 생성은 BYOK 요금제부터 사용할 수 있습니다.', 'info')}
                    title="AI 이미지 생성 (Pro)"
                >
                    🎨
                    <span className="floating-lock-badge"><Lock size={10} /></span>
                </button>
            )}

            {/* 플로팅 버튼 간격 정리용 spacer */}
        </div>
    );
};

export default EditorPage;
