import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainContainer from '../components/layout/MainContainer';
import { useEditor } from '../context/EditorContext';
import { useToast } from '../components/common/Toast';
import { getTemplateById } from '../data/templates';
import { AIService } from '../services/openai';
import { formatParagraphs } from '../utils/analysis';
import { humanizeText } from '../utils/humanness';
import ImageSeoGuide from '../components/editor/ImageSeoGuide';
import ImageGeneratorPanel from '../components/editor/ImageGeneratorPanel';
import WizardStepTopic from '../components/editor/WizardStepTopic';
import WizardStepKeywords from '../components/editor/WizardStepKeywords';
import WizardStepPhotos from '../components/editor/WizardStepPhotos';
import WizardStepOutline from '../components/editor/WizardStepOutline';
import GenerationLoadingScreen from '../components/editor/GenerationLoadingScreen';
import { CATEGORIES, getToneForCategory } from '../data/categories';
import '../styles/components.css';
import '../styles/ImageSeoGuide.css';

const EditorPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { openPost, posts, currentPostId, updateMainKeyword, updateSubKeywords, setSuggestedTone, setContent, content, setTargetLength, editorRef, lastCursorPosRef, closeSession, recordAiAction, updatePostMeta, setPhotoPreviewUrls } = useEditor();
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
    const [aiStep, setAiStep] = useState(1); // 1: 주제, 2: 키워드+설정, 3: 이미지, 4: 아웃라인+생성

    // Step 1: 키워드 상태 (제안형 + 선택형)
    const [mainKeyword, setMainKeyword] = useState('');
    const [suggestedKeywords, setSuggestedKeywords] = useState([]); // AI가 제안한 키워드 목록
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

    // Step 4: 아웃라인 상태
    const [outlineItems, setOutlineItems] = useState([]); // [{level: 'h2'|'h3', title: '...'}]


    // 이미지 SEO 가이드 드로어 상태
    const [showSeoDrawer, setShowSeoDrawer] = useState(false);

    // AI 이미지 생성 드로어 상태
    const [showImageGenDrawer, setShowImageGenDrawer] = useState(false);

    // Close session on unmount (route change)
    useEffect(() => {
        return () => { closeSession(); };
    }, [closeSession]);

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

    // 키워드 문자열 추출 헬퍼 (객체 또는 문자열 대응)
    const getKw = (item) => item?.keyword || item;

    // Step 1 → 2 이동 가능 여부
    const canProceedToStep1 = isNewPost ? (selectedCategory && topicInput.trim()) : mainKeyword.trim();
    const canProceedToStep2 = mainKeyword.trim() && selectedKeywords.length >= 3;

    // Step 2 → 3 이동 가능 여부 (사진 없어도 진행 가능)
    const hasAnyPhotos = Object.values(photoData.metadata).filter(v => v > 0).length >= 1;

    // API 전송용: 512px로 리사이즈하여 이미지 토큰 절감
    const fileToBase64 = (file, maxSize = 512) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl.split(',')[1]);
                URL.revokeObjectURL(img.src);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    // Streaming Logic
    const streamContentToEditor = async (fullHtml) => {
        // 0. JSON 잔여 문자열 제거
        let injectedHtml = fullHtml
            .replace(/^\s*\{\s*"html"\s*:\s*"/i, '')
            .replace(/"\s*\}\s*$/, '');
        // 슬롯 이름 매핑 (카테고리별 범용)
        const SLOT_CONFIG = {
            food: {
                order: ['entrance', 'menu', 'food', 'interior', 'parking', 'extra'],
                aliases: { entrance: 'entrance', 외관: 'entrance', 간판: 'entrance', 첫인상: 'entrance', menu: 'menu', 메뉴: 'menu', 메뉴판: 'menu', food: 'food', 음식: 'food', 요리: 'food', interior: 'interior', 인테리어: 'interior', 내부: 'interior', parking: 'parking', 주차: 'parking', extra: 'extra', 기타: 'extra' },
                labels: { entrance: '외관/간판', menu: '메뉴판', food: '음식', interior: '인테리어', parking: '주차장', extra: '추가' },
            },
            shopping: {
                order: ['unboxing', 'product', 'detail', 'usage', 'compare', 'extra'],
                aliases: { unboxing: 'unboxing', 언박싱: 'unboxing', 포장: 'unboxing', 택배: 'unboxing', product: 'product', 제품: 'product', 외관: 'product', detail: 'detail', 디테일: 'detail', 클로즈업: 'detail', 소재: 'detail', usage: 'usage', 실사용: 'usage', 착용: 'usage', 사용: 'usage', compare: 'compare', 비교: 'compare', extra: 'extra', 기타: 'extra', 추가: 'extra' },
                labels: { unboxing: '언박싱', product: '제품 외관', detail: '디테일', usage: '실사용', compare: '비교', extra: '추가' },
            },
            tips: {
                order: ['problem', 'tools', 'step', 'result', 'compare', 'extra'],
                aliases: { problem: 'problem', 문제: 'problem', before: 'problem', 현재: 'problem', tools: 'tools', 준비물: 'tools', 재료: 'tools', 도구: 'tools', step: 'step', 과정: 'step', 방법: 'step', 단계: 'step', result: 'result', 결과: 'result', after: 'result', 완성: 'result', compare: 'compare', 비교: 'compare', 전후: 'compare', extra: 'extra', 추가: 'extra', 팁: 'extra' },
                labels: { problem: '문제 상황', tools: '준비물', step: '과정', result: '결과', compare: '비교', extra: '추가 팁' },
            },
            travel: {
                order: ['transport', 'accommodation', 'spot', 'restaurant', 'scenery', 'extra'],
                aliases: { transport: 'transport', 교통: 'transport', 이동: 'transport', accommodation: 'accommodation', 숙소: 'accommodation', 호텔: 'accommodation', 펜션: 'accommodation', spot: 'spot', 명소: 'spot', 관광: 'spot', 포토존: 'spot', restaurant: 'restaurant', 맛집: 'restaurant', 먹거리: 'restaurant', 음식: 'restaurant', scenery: 'scenery', 풍경: 'scenery', 야경: 'scenery', 자연: 'scenery', extra: 'extra', 기념품: 'extra', 기타: 'extra' },
                labels: { transport: '교통', accommodation: '숙소', spot: '명소', restaurant: '맛집', scenery: '풍경', extra: '기념품' },
            },
            recipe: {
                order: ['ingredients', 'prep', 'cooking', 'complete', 'plating', 'extra'],
                aliases: { ingredients: 'ingredients', 재료: 'ingredients', 식재료: 'ingredients', 양념: 'ingredients', prep: 'prep', 손질: 'prep', 준비: 'prep', cooking: 'cooking', 조리: 'cooking', 요리: 'cooking', 볶기: 'cooking', complete: 'complete', 완성: 'complete', 결과: 'complete', plating: 'plating', 플레이팅: 'plating', 담기: 'plating', 세팅: 'plating', extra: 'extra', 보관: 'extra', 팁: 'extra' },
                labels: { ingredients: '재료', prep: '손질', cooking: '조리', complete: '완성', plating: '플레이팅', extra: '보관팁' },
            },
            tutorial: {
                order: ['setup', 'config', 'step1', 'step2', 'result', 'extra'],
                aliases: { setup: 'setup', 준비: 'setup', 설치: 'setup', config: 'config', 설정: 'config', step1: 'step1', 단계1: 'step1', step2: 'step2', 단계2: 'step2', result: 'result', 결과: 'result', 완성: 'result', extra: 'extra', 트러블슈팅: 'extra', 팁: 'extra' },
                labels: { setup: '준비', config: '설정', step1: '단계1', step2: '단계2', result: '결과', extra: '트러블슈팅' },
            },
            comparison: {
                order: ['productA', 'productB', 'spec', 'usage', 'detail', 'extra'],
                aliases: { productA: 'productA', 제품A: 'productA', producta: 'productA', productB: 'productB', 제품B: 'productB', productb: 'productB', spec: 'spec', 스펙: 'spec', 사양: 'spec', 성능: 'spec', usage: 'usage', 실사용: 'usage', 사용: 'usage', detail: 'detail', 디테일: 'detail', 차이: 'detail', extra: 'extra', 가격: 'extra', 추가: 'extra' },
                labels: { productA: '제품A', productB: '제품B', spec: '스펙비교', usage: '실사용', detail: '디테일', extra: '추가' },
            },
            parenting: {
                order: ['baby', 'product', 'activity', 'milestone', 'tip', 'extra'],
                aliases: { baby: 'baby', 아이: 'baby', 아기: 'baby', product: 'product', 용품: 'product', 제품: 'product', activity: 'activity', 활동: 'activity', 놀이: 'activity', 체험: 'activity', milestone: 'milestone', 성장: 'milestone', 기록: 'milestone', tip: 'tip', 꿀팁: 'tip', 노하우: 'tip', extra: 'extra', 기타: 'extra' },
                labels: { baby: '아이', product: '육아용품', activity: '활동', milestone: '성장', tip: '꿀팁', extra: '추가' },
            },
            pet: {
                order: ['pet', 'daily', 'walk', 'food', 'product', 'extra'],
                aliases: { pet: 'pet', 반려동물: 'pet', 강아지: 'pet', 고양이: 'pet', daily: 'daily', 일상: 'daily', 집: 'daily', walk: 'walk', 산책: 'walk', 외출: 'walk', food: 'food', 사료: 'food', 간식: 'food', product: 'product', 용품: 'product', 장난감: 'product', extra: 'extra', 병원: 'extra', 기타: 'extra' },
                labels: { pet: '반려동물', daily: '일상', walk: '산책', food: '사료/간식', product: '용품', extra: '추가' },
            },
            info: {
                order: ['main', 'data', 'detail', 'example', 'reference', 'extra'],
                aliases: { main: 'main', 대표: 'main', 썸네일: 'main', data: 'data', 데이터: 'data', 그래프: 'data', 통계: 'data', detail: 'detail', 상세: 'detail', example: 'example', 사례: 'example', 예시: 'example', reference: 'reference', 참고: 'reference', 출처: 'reference', extra: 'extra', 기타: 'extra' },
                labels: { main: '대표', data: '데이터', detail: '상세', example: '사례', reference: '참고', extra: '추가' },
            },
            daily: {
                order: ['main', 'scene1', 'scene2', 'food', 'selfie', 'extra'],
                aliases: { main: 'main', 메인: 'main', scene1: 'scene1', 장면1: 'scene1', scene2: 'scene2', 장면2: 'scene2', food: 'food', 먹거리: 'food', 음식: 'food', selfie: 'selfie', 셀피: 'selfie', 인물: 'selfie', extra: 'extra', 기타: 'extra' },
                labels: { main: '메인', scene1: '장면1', scene2: '장면2', food: '먹거리', selfie: '셀피', extra: '추가' },
            },
        };
        // 카테고리 → 슬롯 설정 매핑 (공유 카테고리 처리)
        const configKey = { cafe: 'food', review: 'shopping', tech: 'shopping', economy: 'info', medical: 'info', law: 'info' }[categoryId] || categoryId;
        const slotCfg = SLOT_CONFIG[configKey] || SLOT_CONFIG.food;
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

        // 2. [[VIDEO]] → 동영상 TIP 박스 변환 ([VIDEO] 단일 대괄호도 대응)
        injectedHtml = injectedHtml.replace(/\[{1,2}VIDEO\]{1,2}/gi, '<blockquote>🎬 TIP: 동영상을 추가하면 더 좋아요!</blockquote>');

        // 3. [대괄호 팁] → <blockquote> TIP 박스 변환
        injectedHtml = injectedHtml.replace(/\[([^\]]*사진[^\]]*추가[^\]]*)\]/g, '<blockquote>💡 TIP: $1</blockquote>');
        injectedHtml = injectedHtml.replace(/\[([^\]]*TIP[^\]]*)\]/gi, '<blockquote>💡 $1</blockquote>');

        // 3. 후처리: 긴 문단 강제 분리 (AI가 규칙 안 따라도 보장)
        injectedHtml = formatParagraphs(injectedHtml);

        // 3.5. AI 패턴 후처리: 금지 표현 자동 교정 + 종결어미 변환
        injectedHtml = humanizeText(injectedHtml, selectedTone || 'friendly');

        // 4. 이모지 전용 <p> 태그를 다음 문단과 병합 (이모지가 별도 줄로 분리되는 현상 방지)
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
        const effectiveWizardData = wizardData || location.state;

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
                    .filter(([_, count]) => count > 0)
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
                outlineItems.length > 0 ? outlineItems : null
            );

            console.log('[AI Generate] API 응답:', result);

            const htmlContent = result?.html || result?.text;
            if (htmlContent) {
                await streamContentToEditor(htmlContent);
                // 메인 키워드 업데이트
                updateMainKeyword(mainKeyword);
                // 생성 완료 요약 피드백
                const photoCount = Object.values(photoData.metadata).filter(v => v > 0).length;
                const charCount = htmlContent.replace(/<[^>]*>/g, '').length;
                showToast(`글 생성 완료 — 키워드 ${keywordStrings.length}개 반영, ${charCount.toLocaleString()}자, 이미지 ${photoCount}장`, 'success');
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

    // "직접 작성" 전환 핸들러
    const handleSwitchToDirect = () => {
        if (selectedCategory) {
            const template = getTemplateById(selectedCategory.templateId);
            if (template) setContent(template.content);
            updatePostMeta(id, {
                mode: 'direct',
                categoryId: selectedCategory.id,
                tone: getToneForCategory(selectedCategory.id)
            });
        }
        if (topicInput.trim()) {
            updateMainKeyword(topicInput.trim());
        }
        setEditorMode('direct');
    };


    // AI 모드일 때 전체 페이지로 스텝 UI 렌더링
    if (editorMode === 'ai' && !isGenerating) {
        return (
            <div>
                <div className="wizard-page">
                    <div className="wizard-page-inner">
                        {/* STEP 1: 주제 선택 (카테고리 + 주제) */}
                        {aiStep === 1 && (
                            <WizardStepTopic
                                isNewPost={isNewPost}
                                selectedCategory={selectedCategory}
                                topicInput={topicInput}
                                mainKeyword={mainKeyword}
                                canProceedToStep1={canProceedToStep1}
                                onCategorySelect={(cat) => {
                                    setSelectedCategory(cat);
                                    setToneState(getToneForCategory(cat.id));
                                    updatePostMeta(id, { categoryId: cat.id, tone: getToneForCategory(cat.id) });
                                }}
                                onTopicChange={(value) => {
                                    setTopicInput(value);
                                    setMainKeyword(value);
                                    updateMainKeyword(value);
                                }}
                                onMainKeywordChange={(value) => setMainKeyword(value)}
                                onNext={() => {
                                    if (isNewPost && !mainKeyword.trim() && topicInput.trim()) {
                                        setMainKeyword(topicInput.trim());
                                        updateMainKeyword(topicInput.trim());
                                    }
                                    setAiStep(2);
                                }}
                                onSwitchToDirect={isNewPost ? handleSwitchToDirect : () => setEditorMode('direct')}
                            />
                        )}

                        {/* STEP 2: 키워드 분석 + 세부 설정 */}
                        {aiStep === 2 && (
                            <WizardStepKeywords
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedKeywords={selectedKeywords}
                                suggestedKeywords={suggestedKeywords}
                                competitorData={competitorData}
                                selectedTone={selectedTone}
                                selectedLength={selectedLength}
                                categoryId={categoryId}
                                wizardData={wizardData}
                                canProceedToStep2={canProceedToStep2}
                                getKw={getKw}
                                getDifficulty={(item) => item?.difficulty || 'medium'}
                                locationState={location.state}
                                onSelectedKeywordsChange={setSelectedKeywords}
                                onSuggestedKeywordsChange={setSuggestedKeywords}
                                onCompetitorDataChange={setCompetitorData}
                                onToneChange={setToneState}
                                onLengthChange={setSelectedLength}
                                onMainKeywordChange={(value) => { setMainKeyword(value); updateMainKeyword(value); }}
                                onPrev={() => setAiStep(1)}
                                onNext={() => setAiStep(3)}
                                recordAiAction={recordAiAction}
                                showToast={showToast}
                            />
                        )}

                        {/* STEP 3: 이미지 업로드 & 분석 */}
                        {aiStep === 3 && (
                            <WizardStepPhotos
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                categoryId={categoryId}
                                photoData={photoData}
                                photoAnalysis={photoAnalysis}
                                imageAlts={imageAlts}
                                imageCaptions={imageCaptions}
                                selectedKeywords={selectedKeywords}
                                selectedTone={selectedTone}
                                hasAnyPhotos={hasAnyPhotos}
                                getKw={getKw}
                                fileToBase64={fileToBase64}
                                onPhotoDataChange={setPhotoData}
                                onPhotoAnalysisChange={setPhotoAnalysis}
                                onImageAltsChange={setImageAlts}
                                onImageCaptionsChange={setImageCaptions}
                                onCachedPhotoAssetsChange={setCachedPhotoAssets}
                                onPrev={() => setAiStep(2)}
                                onNext={() => setAiStep(4)}
                            />
                        )}

                        {/* STEP 4: 아웃라인 + 생성 */}
                        {aiStep === 4 && (
                            <WizardStepOutline
                                mainKeyword={mainKeyword}
                                selectedCategory={selectedCategory}
                                selectedKeywords={selectedKeywords}
                                selectedTone={selectedTone}
                                selectedLength={selectedLength}
                                categoryId={categoryId}
                                photoData={photoData}
                                competitorData={competitorData}
                                outlineItems={outlineItems}
                                getKw={getKw}
                                onOutlineChange={setOutlineItems}
                                onGenerate={handleAiGenerate}
                                onPrev={() => setAiStep(3)}
                                recordAiAction={recordAiAction}
                                showToast={showToast}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 생성 중 로딩 UI (단계별 체크리스트 + 프로그레스 바)
    if (isGenerating) {
        return <GenerationLoadingScreen generationStep={generationStep} />;
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

            {/* AI 이미지 생성 플로팅 버튼 + 드로어 */}
            <button
                className="image-gen-floating-btn"
                onClick={() => setShowImageGenDrawer(true)}
                title="AI 이미지 생성"
                style={{
                    position: 'fixed',
                    bottom: hasUploadedImages ? '140px' : '80px',
                    right: '24px',
                    width: '52px', height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(255, 107, 53, 0.4)',
                    cursor: 'pointer',
                    fontSize: '1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(108, 92, 231, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(108, 92, 231, 0.4)';
                }}
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
        </div>
    );
};

export default EditorPage;
