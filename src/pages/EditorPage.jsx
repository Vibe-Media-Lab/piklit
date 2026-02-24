import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
// Header 제거 — AppLayout의 Sidebar/TopBar로 대체
import MainContainer from '../components/layout/MainContainer';
import { useEditor } from '../context/EditorContext';
import { useToast } from '../components/common/Toast';
import { getTemplateById } from '../data/templates';
import { AIService } from '../services/openai';
import { formatParagraphs } from '../utils/analysis';
import PhotoUploader from '../components/editor/PhotoUploader';
import ImageSeoGuide from '../components/editor/ImageSeoGuide';
import ImageGeneratorPanel from '../components/editor/ImageGeneratorPanel';
import CompetitorAnalysis from '../components/analysis/CompetitorAnalysis';
import { CATEGORIES, getToneForCategory } from '../data/categories';
import {
    Search, FolderOpen, Edit3, CheckCircle, Tag, Flame, Bot,
    ClipboardList, Camera, Wand2, ArrowLeft, ArrowRight,
    ChevronDown, ChevronUp, Loader2, BarChart3, Settings,
    Sparkles, RefreshCw, Plus, Trash2, Check
} from 'lucide-react';
import '../styles/components.css';
import '../styles/ImageSeoGuide.css';

const EditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { openPost, posts, currentPostId, updateMainKeyword, updateSubKeywords, setSuggestedTone, setContent, content, setTargetLength, editorRef, lastCursorPosRef, closeSession, recordAiAction, updatePostMeta } = useEditor();
    const { showToast } = useToast();

    const loadedRef = useRef(null);
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
    const [showSettings, setShowSettings] = useState(true); // 세부 설정 토글 (기본 펼침)

    // AI 모드 3단계 스텝
    const [aiStep, setAiStep] = useState(1); // 1: 주제+키워드+설정, 2: 이미지, 3: 아웃라인+생성

    // Step 1: 키워드 상태 (제안형 + 선택형)
    const [mainKeyword, setMainKeyword] = useState('');
    const [suggestedKeywords, setSuggestedKeywords] = useState([]); // AI가 제안한 키워드 목록
    const [selectedKeywords, setSelectedKeywords] = useState([]); // 사용자가 선택한 키워드 (최소 3, 최대 5)
    const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false);

    // 키워드 강도 확인 상태
    const [isCheckingDifficulty, setIsCheckingDifficulty] = useState(false);
    const [difficultyChecked, setDifficultyChecked] = useState(false);

    // 시즌 키워드 상태
    const [seasonKeywords, setSeasonKeywords] = useState([]);      // [{keyword, reason, timing}]
    const [isAnalyzingSeason, setIsAnalyzingSeason] = useState(false);

    // 경쟁 블로그 분석 상태
    const [competitorData, setCompetitorData] = useState(null);
    const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);

    // Step 2: 이미지 상태
    const [photoData, setPhotoData] = useState({
        metadata: {},
        previews: {},
        files: {}
    });
    const [photoAnalysis, setPhotoAnalysis] = useState(null);
    const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
    const [imageAlts, setImageAlts] = useState({});
    const [imageCaptions, setImageCaptions] = useState({});
    const [cachedPhotoAssets, setCachedPhotoAssets] = useState([]);
    const imageAltsRef = useRef({});

    // Step 3: 본문 설정 상태
    const [selectedLength, setSelectedLengthLocal] = useState(null);
    const [selectedTone, setToneState] = useState(null);

    // Step 4: 아웃라인 상태
    const [outlineItems, setOutlineItems] = useState([]); // [{level: 'h2'|'h3', title: '...'}]
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

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

    // 경쟁 블로그 평균 글자수 기반 글자수 옵션 자동 추천
    const LENGTH_OPTIONS = ['800~1200자', '1200~1800자', '1800~2500자', '2500~3000자'];
    const LENGTH_MIDPOINTS = [1000, 1500, 2150, 2750];
    const recommendLength = (avgCharCount) => {
        if (!avgCharCount) return null;
        let closest = LENGTH_OPTIONS[0];
        let minDiff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[0]);
        for (let i = 1; i < LENGTH_MIDPOINTS.length; i++) {
            const diff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = LENGTH_OPTIONS[i];
            }
        }
        return closest;
    };

    const TONES = [
        { id: 'friendly', label: '🥳 친근한 이웃형', emoji: '🥳', desc: '해요체, 이모지, 감탄사' },
        { id: 'professional', label: '🔎 전문 정보형', emoji: '🔎', desc: '합쇼체, 개조식 요약, 신뢰감' },
        { id: 'honest', label: '📝 내돈내산 솔직형', emoji: '📝', desc: '단호한 문체, 장단점 명확' },
        { id: 'emotional', label: '☕️ 감성 에세이형', emoji: '☕️', desc: '평어체, 명조체 감성, 여백' },
        { id: 'guide', label: '📚 단계별 가이드형', emoji: '📚', desc: '권유형, 번호표, 팁 박스' }
    ];

    // 주제로 초기화
    useEffect(() => {
        if (location.state?.initialMainKeyword && !mainKeyword) {
            setMainKeyword(location.state.initialMainKeyword);
            updateMainKeyword(location.state.initialMainKeyword);
        }
        if (location.state?.initialTone) {
            setToneState(location.state.initialTone);
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

    // 키워드 AI 분석 (추가 제안 시 이미 선택한 키워드 제외)
    const handleAnalyzeKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || location.state?.initialMainKeyword || mainKeyword;
        if (!topic) return showToast('주제를 먼저 입력해주세요.', 'warning');

        console.log('[키워드 분석] 시작:', { topic, excludeKeywords: selectedKeywords });

        setIsAnalyzingKeywords(true);
        recordAiAction('keywordAnalysis');
        try {
            // 이미 선택한 키워드를 제외하고 새로운 키워드 요청
            const excludeKeywords = selectedKeywords.map(k => getKw(k)).join(', ');
            const result = await AIService.analyzeKeywords(topic, excludeKeywords);

            console.log('[키워드 분석] API 응답:', result);

            if (result) {
                if (result.mainKeyword && !mainKeyword) {
                    setMainKeyword(result.mainKeyword);
                }
                // 통합 응답에서 경쟁 분석 데이터 추출
                if (result.competitors && result.competitors.blogs) {
                    setCompetitorData(result.competitors);
                }
                if (result.subKeywords && Array.isArray(result.subKeywords)) {
                    // 새 형식: [{keyword, difficulty}] 또는 레거시: [string]
                    const normalized = result.subKeywords.map(item =>
                        typeof item === 'string'
                            ? { keyword: item, difficulty: 'medium' }
                            : { keyword: item.keyword || item, difficulty: item.difficulty || 'medium' }
                    );

                    // 중복 제거 (keyword 문자열 기준)
                    const existingKws = [...suggestedKeywords.map(k => k.keyword || k), ...selectedKeywords.map(k => k.keyword || k)];
                    const newKeywords = normalized.filter(kw => !existingKws.includes(kw.keyword));

                    if (newKeywords.length > 0) {
                        // 첫 분석일 때: 상위 5개 자동 선택, 나머지는 제안 목록
                        if (selectedKeywords.length === 0) {
                            const autoSelect = newKeywords.slice(0, 5);
                            const rest = newKeywords.slice(5);
                            setSelectedKeywords(autoSelect);
                            setSuggestedKeywords(prev => [...prev, ...rest]);
                        } else {
                            // 추가 분석: 제안 목록에만 추가
                            setSuggestedKeywords(prev => [...prev, ...newKeywords]);
                        }
                    }
                } else {
                    console.log('[키워드 분석] subKeywords가 없거나 배열이 아님:', result.subKeywords);
                }
            } else {
                console.log('[키워드 분석] result가 없음');
            }
        } catch (e) {
            console.error('키워드 분석 오류:', e);
            showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsAnalyzingKeywords(false);
        }
    };

    // 키워드 강도 확인 (선택사항 — 어절 수 기반 난이도 세팅)
    const handleCheckDifficulty = () => {
        setIsCheckingDifficulty(true);
        const addDifficulty = (kwObj) => {
            const word = kwObj.keyword || kwObj;
            const wordCount = word.trim().split(/\s+/).length;
            let difficulty = 'medium';
            if (wordCount <= 2) difficulty = 'hard';
            else if (wordCount >= 4) difficulty = 'easy';
            return { ...kwObj, difficulty };
        };
        setSelectedKeywords(prev => prev.map(addDifficulty));
        setSuggestedKeywords(prev => prev.map(addDifficulty));
        setDifficultyChecked(true);
        setIsCheckingDifficulty(false);
    };

    // 키워드 선택/해제 토글 (객체 {keyword, difficulty} 기준)
    const handleKeywordToggle = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        const isSelected = selectedKeywords.some(k => (k.keyword || k) === kw);
        if (isSelected) {
            setSelectedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
        } else {
            if (selectedKeywords.length < 5) {
                setSelectedKeywords(prev => [...prev, kwObj]);
                setSuggestedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
            } else {
                showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
            }
        }
    };

    // 선택한 키워드 제거 (isSeason이면 시즌 목록으로, 아니면 제안 목록으로 복귀)
    const handleRemoveSelectedKeyword = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        setSelectedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
        if (kwObj.isSeason) {
            setSeasonKeywords(prev => [...prev, { keyword: kw, reason: kwObj.reason || '', timing: kwObj.timing || '' }]);
        } else {
            setSuggestedKeywords(prev => [...prev, kwObj]);
        }
    };

    // 시즌 트렌드 키워드 분석
    const handleAnalyzeSeasonKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || location.state?.initialMainKeyword || mainKeyword;
        if (!topic) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');

        setIsAnalyzingSeason(true);
        recordAiAction('seasonKeywordAnalysis');
        try {
            const existingKws = [
                ...selectedKeywords.map(k => getKw(k)),
                ...suggestedKeywords.map(k => getKw(k))
            ];
            const result = await AIService.analyzeSeasonKeywords(topic, categoryId, existingKws);
            if (result?.seasonKeywords && Array.isArray(result.seasonKeywords)) {
                // 기존 키워드와 중복 필터
                const existingSet = new Set(existingKws);
                const filtered = result.seasonKeywords.filter(sk => !existingSet.has(sk.keyword));
                setSeasonKeywords(filtered);
            }
        } catch (e) {
            console.error('시즌 키워드 분석 오류:', e);
            showToast('시즌 키워드 분석 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsAnalyzingSeason(false);
        }
    };

    // 시즌 키워드 선택 → selectedKeywords에 추가
    const handleAddSeasonKeyword = (seasonKw) => {
        if (selectedKeywords.length >= 5) {
            return showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
        }
        setSelectedKeywords(prev => [...prev, {
            keyword: seasonKw.keyword,
            difficulty: 'medium',
            isSeason: true,
            reason: seasonKw.reason,
            timing: seasonKw.timing
        }]);
        setSeasonKeywords(prev => prev.filter(sk => sk.keyword !== seasonKw.keyword));
    };

    // 경쟁 블로그 분석 (캐시 우선, 없으면 단독 API 호출)
    const handleAnalyzeCompetitors = async () => {
        if (!mainKeyword.trim()) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');
        setIsAnalyzingCompetitors(true);
        recordAiAction('competitorAnalysis');
        try {
            const result = await AIService.analyzeCompetitors(mainKeyword);
            if (result?.average) {
                setCompetitorData(result);
                // 경쟁 분석 평균 글자수 기반 글자수 자동 선택
                if (result.average.charCount) {
                    const recommended = recommendLength(result.average.charCount);
                    if (recommended) setSelectedLength(recommended);
                }
            } else {
                console.warn('[경쟁 분석] 예상치 못한 응답 형식:', result);
                showToast('분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.', 'error');
            }
        } catch (e) {
            console.error('경쟁 블로그 분석 오류:', e);
            if (e.message?.includes('429')) {
                showToast('API 호출 제한에 걸렸습니다. 잠시 후(약 30초) 다시 시도해주세요.', 'error');
            } else {
                showToast(`경쟁 블로그 분석 중 오류: ${e.message}`, 'error');
            }
        } finally {
            setIsAnalyzingCompetitors(false);
        }
    };

    // 난이도 뱃지 렌더링 헬퍼
    const DifficultyBadge = ({ difficulty }) => {
        const map = {
            easy: { emoji: '🟢', label: '쉬움' },
            medium: { emoji: '🟡', label: '보통' },
            hard: { emoji: '🔴', label: '어려움' },
        };
        const d = map[difficulty] || map.medium;
        return <span title={d.label} style={{ marginLeft: '4px', fontSize: '0.75rem' }}>{d.emoji}</span>;
    };

    // 키워드 문자열 추출 헬퍼 (객체 또는 문자열 대응)
    const getKw = (item) => item?.keyword || item;
    const getDifficulty = (item) => item?.difficulty || 'medium';

    // Step 1 → 2 이동 가능 여부 (카테고리 선택 + 주제 입력 + 최소 3개 키워드)
    const canProceedToStep2 = (isNewPost ? (selectedCategory && topicInput.trim()) : true) && mainKeyword.trim() && selectedKeywords.length >= 3;

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
                    .filter(([_, count]) => count > 0)
                    .map(([slot]) => slot);
                const slotCounts = {};
                uploadedSlots.forEach(slot => { slotCounts[slot] = photoData.metadata[slot]; });
                try {
                    const keywordStrings = selectedKeywords.map(k => getKw(k));
                    const altResult = await AIService.generateImageAlts(mainKeyword, keywordStrings, result, uploadedSlots, slotCounts);
                    if (altResult && Object.keys(altResult).length > 0) {
                        const alts = {}, captions = {};
                        for (const [slot, items] of Object.entries(altResult)) {
                            alts[slot] = items.map(i => typeof i === 'string' ? i : i.alt);
                            captions[slot] = items.map(i => typeof i === 'string' ? '' : i.caption);
                        }
                        setImageAlts(alts);
                        setImageCaptions(captions);
                        console.log('[이미지 ALT+캡션] 생성 완료:', alts, captions);
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

    // Step 2 → 3 이동 가능 여부 (사진 없어도 진행 가능)
    const canProceedToStep3 = true;
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
                        const altResult = await AIService.generateImageAlts(mainKeyword, keywordStrings, photoAnalysis, uploadedSlots, slotCounts);
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

    // 아웃라인 핸들러
    const handleGenerateOutline = async () => {
        setIsGeneratingOutline(true);
        recordAiAction('outlineGenerate');
        try {
            const keywordStrings = selectedKeywords.map(k => getKw(k));
            const effectiveWizardData = wizardData || location.state;
            const result = await AIService.generateOutline(
                mainKeyword, keywordStrings, selectedTone,
                categoryId,
                competitorData
            );
            if (result?.outline && Array.isArray(result.outline)) {
                setOutlineItems(result.outline);
            }
        } catch (e) {
            console.error('[아웃라인] 생성 오류:', e);
            showToast('아웃라인 생성 중 오류가 발생했습니다: ' + e.message, 'error');
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleOutlineEdit = (index, newTitle) => {
        setOutlineItems(prev => prev.map((item, i) => i === index ? { ...item, title: newTitle } : item));
    };

    const handleOutlineToggleLevel = (index) => {
        setOutlineItems(prev => prev.map((item, i) =>
            i === index ? { ...item, level: item.level === 'h2' ? 'h3' : 'h2' } : item
        ));
    };

    const handleOutlineMove = (index, direction) => {
        setOutlineItems(prev => {
            const arr = [...prev];
            const target = index + direction;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
    };

    const handleOutlineDelete = (index) => {
        setOutlineItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleOutlineAdd = (afterIndex) => {
        setOutlineItems(prev => {
            const arr = [...prev];
            arr.splice(afterIndex + 1, 0, { level: 'h3', title: '' });
            return arr;
        });
    };

    const STEP_LABELS = ['주제 + 키워드', '이미지 업로드', '아웃라인 + 생성'];

    // 카테고리별 placeholder
    const CATEGORY_PLACEHOLDERS = {
        food: '예: 제주 김선문 식당',
        cafe: '예: 성수동 카페 온도',
        shopping: '예: 애플 맥미니 M4',
        comparison: '예: 다이슨 에어랩 vs 샤오미 드라이어',
        review: '예: 삼성 갤럭시 S25 울트라',
        travel: '예: 제주도 2박3일 여행',
        tech: '예: 애플 비전프로 개발자 리뷰',
        recipe: '예: 초간단 원팬 파스타',
        parenting: '예: 12개월 아기 이유식',
        tips: '예: 자취방 곰팡이 제거 꿀팁',
    };

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

    // Progress Indicator 컴포넌트
    const StepIndicator = () => (
        <div className="wizard-step-indicator">
            {[1, 2, 3].map(s => (
                <React.Fragment key={s}>
                    <div className="wizard-step-item">
                        <div className={`wizard-step-circle ${s === aiStep ? 'active' : s < aiStep ? 'completed' : 'pending'}`}>
                            {s < aiStep ? <Check size={14} /> : s}
                        </div>
                        <span className={`wizard-step-label ${s === aiStep ? 'active' : s < aiStep ? 'completed' : 'pending'}`}>
                            {STEP_LABELS[s - 1]}
                        </span>
                    </div>
                    {s < 3 && <div className={`wizard-step-connector ${s < aiStep ? 'completed' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );

    // AI 모드일 때 전체 페이지로 스텝 UI 렌더링
    if (editorMode === 'ai' && !isGenerating) {
        return (
            <div>
                <div style={{
                    flex: 1,
                    background: 'var(--color-surface-hover)',
                    padding: '40px 20px',
                    minHeight: 'calc(100vh - 52px)',
                    overflowY: 'auto'
                }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {/* STEP 1: 주제 설정 + 키워드 분석 + 세부 설정 */}
                        {aiStep === 1 && (
                            <div className="wizard-card-wrap">
                                <h1 style={{ marginBottom: '8px' }}>AI 본문 자동 작성</h1>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    {mainKeyword
                                        ? <>주제: <strong>{mainKeyword}</strong></>
                                        : '주제를 입력하고 키워드를 분석해보세요'
                                    }
                                </p>

                                <StepIndicator />

                                <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Search size={20} style={{ color: 'var(--color-brand)' }} /> Step 1: 주제 설정 + 키워드 분석
                                </h2>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    카테고리와 주제를 선택하고, AI가 SEO 최적화 키워드를 제안합니다.
                                </p>

                                {/* 카테고리 그리드 */}
                                {isNewPost && (
                                    <div style={{ marginBottom: '28px' }}>
                                        <label className="wizard-label">
                                            <FolderOpen size={16} /> 카테고리 선택 <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                            gap: '10px'
                                        }}>
                                            {CATEGORIES.map(cat => (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setSelectedCategory(cat);
                                                        setToneState(getToneForCategory(cat.id));
                                                        updatePostMeta(id, { categoryId: cat.id, tone: getToneForCategory(cat.id) });
                                                    }}
                                                    style={{
                                                        padding: '14px 12px',
                                                        borderRadius: 'var(--radius-lg)',
                                                        border: selectedCategory?.id === cat.id
                                                            ? '2px solid var(--color-brand)'
                                                            : '1px solid var(--color-border)',
                                                        background: selectedCategory?.id === cat.id
                                                            ? 'var(--color-brand-light)'
                                                            : 'white',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        transition: 'all 0.2s',
                                                        fontSize: 'var(--font-size-sm)'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.3rem', display: 'block', marginBottom: '4px' }}>{cat.icon}</span>
                                                    <span style={{
                                                        fontWeight: selectedCategory?.id === cat.id ? 'bold' : 'normal',
                                                        color: selectedCategory?.id === cat.id ? 'var(--color-brand)' : 'var(--color-text-main)'
                                                    }}>
                                                        {cat.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 주제 입력 */}
                                {isNewPost && (
                                    <div style={{ marginBottom: '28px' }}>
                                        <label className="wizard-label">
                                            <Edit3 size={16} /> 주제 입력 <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={topicInput}
                                            onChange={e => {
                                                setTopicInput(e.target.value);
                                                setMainKeyword(e.target.value);
                                                updateMainKeyword(e.target.value);
                                            }}
                                            placeholder={CATEGORY_PLACEHOLDERS[selectedCategory?.id] || '예: 작성할 주제를 입력하세요'}
                                            className="wizard-field"
                                            autoFocus
                                        />
                                    </div>
                                )}

                                {/* 메인 키워드 (기존 글 재편집 시 표시) */}
                                {!isNewPost && (
                                    <div style={{ marginBottom: '32px' }}>
                                        <label className="wizard-label">
                                            <Edit3 size={16} /> 메인 키워드 <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={mainKeyword}
                                            onChange={e => setMainKeyword(e.target.value)}
                                            placeholder="예: 제주 김선문 식당"
                                            className="wizard-field"
                                        />
                                    </div>
                                )}

                                {/* 선택된 키워드 */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="wizard-label">
                                        <CheckCircle size={16} /> 선택한 서브 키워드 ({selectedKeywords.length}/5)
                                        {selectedKeywords.length < 3 && (
                                            <span style={{ color: '#EF4444', fontWeight: 'normal', marginLeft: '8px', fontSize: '0.85rem' }}>
                                                최소 3개 선택 필요
                                            </span>
                                        )}
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '40px' }}>
                                        {selectedKeywords.length === 0 ? (
                                            <span style={{ color: 'var(--color-text-sub)', fontSize: 'var(--font-size-sm)' }}>
                                                아래 제안된 키워드를 클릭하여 선택하세요
                                            </span>
                                        ) : (
                                            selectedKeywords.map((kwObj, i) => (
                                                <span
                                                    key={i}
                                                    onClick={() => handleRemoveSelectedKeyword(kwObj)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: kwObj.isSeason ? '#FFEDD5' : 'var(--color-brand-light)',
                                                        color: kwObj.isSeason ? '#C2410C' : '#E8590C',
                                                        border: kwObj.isSeason ? '1px solid #FDBA74' : '1px solid #FFCAB0',
                                                        borderRadius: '20px',
                                                        fontSize: 'var(--font-size-sm)',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {kwObj.isSeason && <Flame size={13} />}{getKw(kwObj)}
                                                    {difficultyChecked && <DifficultyBadge difficulty={getDifficulty(kwObj)} />}
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>×</span>
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* AI 키워드 분석 버튼 */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={handleAnalyzeKeywords}
                                        disabled={isAnalyzingKeywords}
                                        className="wizard-btn-primary"
                                    >
                                        {isAnalyzingKeywords
                                            ? <><Loader2 size={16} className="spin" /> 키워드 분석 중...</>
                                            : suggestedKeywords.length > 0
                                                ? <><RefreshCw size={16} /> 추가 키워드 더 받기</>
                                                : <><Bot size={16} /> AI 키워드 분석하기</>
                                        }
                                    </button>

                                    {/* 키워드 강도 확인 버튼 (선택사항) */}
                                    {(selectedKeywords.length > 0 || suggestedKeywords.length > 0) && !difficultyChecked && (
                                        <button
                                            onClick={handleCheckDifficulty}
                                            disabled={isCheckingDifficulty}
                                            className="wizard-btn-secondary"
                                        >
                                            {isCheckingDifficulty
                                                ? <><Loader2 size={16} className="spin" /> 확인 중...</>
                                                : <><BarChart3 size={16} /> 키워드 강도 확인하기</>
                                            }
                                        </button>
                                    )}
                                    {difficultyChecked && (
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            fontSize: '0.9rem', color: '#FF6B35'
                                        }}>
                                            <CheckCircle size={16} /> 강도 확인 완료
                                        </span>
                                    )}
                                </div>

                                {/* 키워드 분석 프로그레스 */}
                                {isAnalyzingKeywords && (
                                    <div className="ai-progress-card" style={{ marginBottom: '20px' }}>
                                        <div className="ai-progress-header">
                                            <Loader2 size={16} className="spin" />
                                            네이버 검색 데이터를 기반으로 키워드를 분석하고 있습니다
                                            <div className="ai-progress-dots"><span /><span /><span /></div>
                                        </div>
                                        <div className="ai-progress-bar-track">
                                            <div className="ai-progress-bar-fill" />
                                        </div>
                                        <div className="ai-progress-steps">
                                            <div className="ai-progress-step done">
                                                <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                                                검색어 전달 완료
                                            </div>
                                            <div className="ai-progress-step active">
                                                <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                                                네이버 실시간 검색 데이터 수집 중
                                            </div>
                                            <div className="ai-progress-step">
                                                <div className="ai-progress-step-icon"><Search size={14} /></div>
                                                SEO 최적화 키워드 추출
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 제안된 키워드 목록 */}
                                {suggestedKeywords.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label className="wizard-label">
                                            <Tag size={16} /> AI 제안 키워드 (클릭하여 선택)
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {suggestedKeywords.map((kwObj, i) => (
                                                <span
                                                    key={i}
                                                    onClick={() => handleKeywordToggle(kwObj)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'var(--color-surface-hover)',
                                                        color: 'var(--color-text-main)',
                                                        borderRadius: '20px',
                                                        fontSize: 'var(--font-size-sm)',
                                                        cursor: selectedKeywords.length >= 5 ? 'not-allowed' : 'pointer',
                                                        border: '1px solid transparent',
                                                        transition: 'all 0.2s',
                                                        opacity: selectedKeywords.length >= 5 ? 0.5 : 1,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (selectedKeywords.length < 5) {
                                                            e.target.style.background = 'var(--color-brand-light)';
                                                            e.target.style.borderColor = 'var(--color-brand)';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.target.style.background = 'var(--color-surface-hover)';
                                                        e.target.style.borderColor = 'transparent';
                                                    }}
                                                >
                                                    + {getKw(kwObj)}
                                                    {difficultyChecked && <DifficultyBadge difficulty={getDifficulty(kwObj)} />}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 시즌 트렌드 키워드 섹션 */}
                                <div style={{ marginBottom: '24px', marginTop: '8px' }}>
                                    <button
                                        onClick={handleAnalyzeSeasonKeywords}
                                        disabled={isAnalyzingSeason || !mainKeyword.trim()}
                                        className="wizard-btn-primary"
                                        style={{
                                            width: '100%',
                                            opacity: isAnalyzingSeason ? 0.7 : 1,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {isAnalyzingSeason
                                            ? <><Loader2 size={16} className="spin" /> 시즌 트렌드를 분석하고 있습니다...</>
                                            : seasonKeywords.length > 0
                                                ? <><RefreshCw size={16} /> 시즌 트렌드 키워드 다시 추천받기</>
                                                : <><Flame size={16} /> 시즌 트렌드 키워드 추천받기</>
                                        }
                                    </button>

                                    {isAnalyzingSeason && (
                                        <div className="ai-progress-card">
                                            <div className="ai-progress-header">
                                                <Loader2 size={16} className="spin" />
                                                시즌 트렌드 키워드를 분석하고 있습니다
                                                <div className="ai-progress-dots"><span /><span /><span /></div>
                                            </div>
                                            <div className="ai-progress-bar-track">
                                                <div className="ai-progress-bar-fill" />
                                            </div>
                                            <div className="ai-progress-steps">
                                                <div className="ai-progress-step done">
                                                    <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                                                    시즌 데이터 요청 완료
                                                </div>
                                                <div className="ai-progress-step active">
                                                    <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                                                    현재 시즌 트렌드 검색 중
                                                </div>
                                                <div className="ai-progress-step">
                                                    <div className="ai-progress-step-icon"><Flame size={14} /></div>
                                                    트렌드 키워드 추출
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {seasonKeywords.length > 0 && !isAnalyzingSeason && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '20px',
                                            border: '1px solid #FB923C',
                                            borderRadius: 'var(--radius-lg)',
                                            background: '#FFFBF5'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '12px', color: '#C2410C' }}>
                                                <Flame size={16} /> 시즌 트렌드 키워드
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {seasonKeywords.map((sk, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '12px 16px',
                                                        background: 'white',
                                                        borderRadius: '10px',
                                                        border: '1px solid #FED7AA'
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: 'var(--font-size-sm)', color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Flame size={14} /> {sk.keyword}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '4px' }}>
                                                                {sk.reason} · {sk.timing}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddSeasonKeyword(sk)}
                                                            disabled={selectedKeywords.length >= 5}
                                                            style={{
                                                                padding: '6px 14px',
                                                                background: selectedKeywords.length >= 5 ? 'var(--color-border)' : 'var(--color-brand)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-md)',
                                                                cursor: selectedKeywords.length >= 5 ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '500',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            + 선택
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 진행 상태 */}
                                <div style={{
                                    padding: '16px',
                                    background: selectedKeywords.length >= 3 ? '#FFF3ED' : '#FEF3C7',
                                    borderRadius: '12px',
                                    marginTop: '24px',
                                    border: selectedKeywords.length >= 3 ? '1px solid #FFCAB0' : '1px solid #FCD34D'
                                }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.9rem',
                                        color: selectedKeywords.length >= 3 ? '#D4520E' : '#92400E'
                                    }}>
                                        {selectedKeywords.length >= 3
                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <CheckCircle size={16} /> {selectedKeywords.length}개의 서브 키워드가 선택되었습니다. 다음 단계로 진행할 수 있습니다.
                                              </span>
                                            : `${3 - selectedKeywords.length}개의 서브 키워드를 더 선택해주세요.`
                                        }
                                    </p>
                                </div>

                                {/* 경쟁 블로그 분석 */}
                                <div style={{ marginTop: '32px' }}>
                                    <CompetitorAnalysis
                                        data={competitorData}
                                        loading={isAnalyzingCompetitors}
                                        onAnalyze={handleAnalyzeCompetitors}
                                    />
                                </div>

                                {/* 세부 설정 (톤앤무드 + 글자수) — 접힌 상태 */}
                                <div style={{ marginTop: '32px' }}>
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        style={{
                                            width: '100%',
                                            padding: '14px 20px',
                                            background: 'var(--color-surface-hover)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.95rem',
                                            fontWeight: '600',
                                            color: 'var(--color-text-main)'
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <Settings size={16} /> 세부 설정 (톤앤무드 · 글자수)
                                        </span>
                                        <span style={{ transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'flex' }}>
                                            <ChevronDown size={16} />
                                        </span>
                                    </button>

                                    {showSettings && (
                                        <div style={{
                                            padding: '24px',
                                            border: '1px solid var(--color-border)',
                                            borderTop: 'none',
                                            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                                            background: 'white'
                                        }}>
                                            {/* 글자수 선택 */}
                                            <div style={{ marginBottom: '24px' }}>
                                                <label className="wizard-label">
                                                    <Edit3 size={16} /> 글자수 선택
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                                    {LENGTH_OPTIONS.map(l => (
                                                        <button
                                                            key={l}
                                                            style={{
                                                                padding: '14px 8px', borderRadius: 'var(--radius-lg)',
                                                                border: selectedLength === l ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                                                                background: selectedLength === l ? 'var(--color-brand-light)' : 'white',
                                                                cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: selectedLength === l ? '600' : 'normal'
                                                            }}
                                                            onClick={() => setSelectedLength(l)}
                                                        >
                                                            {l}
                                                        </button>
                                                    ))}
                                                </div>
                                                {competitorData?.average?.charCount && (
                                                    <p style={{
                                                        marginTop: '10px',
                                                        fontSize: '0.85rem',
                                                        color: '#FF6B35',
                                                        background: '#FFF3ED',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <BarChart3 size={14} /> 경쟁 블로그 평균 {competitorData.average.charCount.toLocaleString()}자 기준으로 <strong>{recommendLength(competitorData.average.charCount)}</strong>를 추천합니다
                                                        </span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* 톤앤무드 선택 */}
                                            <div>
                                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '12px' }}>
                                                    <Sparkles size={16} /> 톤앤무드 선택
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    {TONES.map(t => (
                                                        <div
                                                            key={t.id}
                                                            style={{
                                                                padding: '16px', borderRadius: 'var(--radius-lg)',
                                                                border: selectedTone === t.id ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                                                                background: selectedTone === t.id ? 'var(--color-brand-light)' : 'white',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setToneState(t.id)}
                                                        >
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{t.label}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '4px' }}>{t.desc}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="wizard-nav">
                                    <button
                                        onClick={isNewPost ? handleSwitchToDirect : () => setEditorMode('direct')}
                                        className="wizard-btn-ghost"
                                    >
                                        <ArrowLeft size={16} /> 직접 작성으로 전환
                                    </button>
                                    <button
                                        onClick={() => setAiStep(2)}
                                        disabled={!canProceedToStep2}
                                        className="wizard-btn-primary"
                                        style={{ opacity: canProceedToStep2 ? 1 : 0.5 }}
                                    >
                                        다음: 이미지 업로드 <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: 이미지 업로드 & 분석 */}
                        {aiStep === 2 && (
                            <div className="wizard-card-wrap">
                                <h1 style={{ marginBottom: '8px' }}>AI 본문 자동 작성</h1>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    주제: <strong>{mainKeyword || '미설정'}</strong>
                                </p>

                                <StepIndicator />

                                <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Camera size={20} style={{ color: 'var(--color-brand)' }} /> Step 2: 이미지 업로드 & AI 분석
                                </h2>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    주제에 맞는 이미지를 업로드하면 AI가 분석하여 본문 작성에 활용합니다.
                                </p>

                                <PhotoUploader
                                    keyword={mainKeyword}
                                    onUpdate={setPhotoData}
                                    categoryId={categoryId}
                                />

                                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                                    <button
                                        onClick={handleAnalyzePhotos}
                                        disabled={isAnalyzingPhotos || !hasAnyPhotos}
                                        className="wizard-btn-primary"
                                        style={{ opacity: hasAnyPhotos ? 1 : 0.5 }}
                                    >
                                        {isAnalyzingPhotos
                                            ? <><Loader2 size={16} className="spin" /> 사진 분석 중...</>
                                            : <><Bot size={16} /> 사진 AI 분석하기</>
                                        }
                                    </button>
                                </div>

                                {isAnalyzingPhotos && (
                                    <div className="ai-progress-card" style={{ marginTop: '16px' }}>
                                        <div className="ai-progress-header">
                                            <Loader2 size={16} className="spin" />
                                            업로드한 사진을 AI가 분석하고 있습니다
                                            <div className="ai-progress-dots"><span /><span /><span /></div>
                                        </div>
                                        <div className="ai-progress-bar-track">
                                            <div className="ai-progress-bar-fill" />
                                        </div>
                                        <div className="ai-progress-steps">
                                            <div className="ai-progress-step done">
                                                <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                                                이미지 전송 완료
                                            </div>
                                            <div className="ai-progress-step active">
                                                <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                                                사진 내용 분석 중
                                            </div>
                                            <div className="ai-progress-step">
                                                <div className="ai-progress-step-icon"><Camera size={14} /></div>
                                                블로그 활용 가이드 생성
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {photoAnalysis && (
                                    <div className="photo-analysis-result">
                                        <h4 className="photo-analysis-header">
                                            <CheckCircle size={16} /> AI 분석 결과
                                        </h4>
                                        <div className="photo-analysis-body">
                                            {(() => {
                                                const raw = typeof photoAnalysis === 'string' ? photoAnalysis : JSON.stringify(photoAnalysis, null, 2);
                                                const blocks = raw.split(/\n{2,}|\n(?=\*{2}\d+\.)/).filter(b => b.trim());
                                                // 사진별로 그룹핑: 제목 블록을 만나면 새 그룹
                                                const groups = [];
                                                let current = null;
                                                blocks.forEach(block => {
                                                    const trimmed = block.trim();
                                                    if (/^-{3,}$/.test(trimmed)) return;
                                                    const titleMatch = trimmed.match(/^\*{0,2}(\d+)\.\s*(?:사진\s*\d*:\s*)?(.+?)\*{0,2}$/);
                                                    if (titleMatch) {
                                                        current = { num: titleMatch[1], title: titleMatch[2].replace(/\*{1,2}/g, ''), items: [] };
                                                        groups.push(current);
                                                    } else if (current) {
                                                        current.items.push(trimmed);
                                                    } else {
                                                        // 제목 없는 항목 (인트로 텍스트 등)
                                                        groups.push({ num: null, title: null, items: [trimmed] });
                                                    }
                                                });
                                                return groups.map((group, gi) => {
                                                    if (!group.num) {
                                                        // 인트로 텍스트
                                                        return <p key={gi} className="photo-analysis-item" style={{ marginBottom: '8px' }}>{group.items.join(' ').replace(/\*{1,2}/g, '')}</p>;
                                                    }
                                                    return (
                                                        <div key={gi} className="photo-analysis-card">
                                                            <h5 className="photo-analysis-section-title">
                                                                <span className="photo-analysis-num">{group.num}</span>
                                                                {group.title}
                                                            </h5>
                                                            {group.items.map((block, bi) => {
                                                                const lines = block.split('\n').filter(l => l.trim());
                                                                return (
                                                                    <div key={bi} className="photo-analysis-items">
                                                                        {lines.map((line, j) => {
                                                                            let text = line.replace(/^\s*[\*\-]\s*/, '').trim();
                                                                            const labelMatch = text.match(/^\*{0,2}([^:*]+)\*{0,2}:\s*(.+)$/);
                                                                            if (labelMatch) {
                                                                                return (
                                                                                    <p key={j} className="photo-analysis-item">
                                                                                        <strong>{labelMatch[1].replace(/\*{1,2}/g, '')}:</strong> {labelMatch[2].replace(/\*{1,2}/g, '')}
                                                                                    </p>
                                                                                );
                                                                            }
                                                                            return <p key={j} className="photo-analysis-item">{text.replace(/\*{1,2}/g, '')}</p>;
                                                                        })}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {(photoAnalysis || Object.keys(imageAlts).length > 0) && (
                                    <div style={{ marginTop: '16px' }}>
                                        <ImageSeoGuide
                                            mainKeyword={mainKeyword}
                                            imageAlts={imageAlts}
                                            imageCaptions={imageCaptions}
                                            photoMetadata={photoData.metadata}
                                        />
                                    </div>
                                )}

                                <div className="wizard-nav">
                                    <button
                                        onClick={() => setAiStep(1)}
                                        className="wizard-btn-ghost"
                                    >
                                        <ArrowLeft size={16} /> 이전: 주제 + 키워드
                                    </button>
                                    <button
                                        onClick={() => setAiStep(3)}
                                        disabled={!canProceedToStep3}
                                        className="wizard-btn-primary"
                                        style={{ opacity: canProceedToStep3 ? 1 : 0.5 }}
                                    >
                                        다음: 아웃라인 + 생성 <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: 아웃라인 + 생성 */}
                        {aiStep === 3 && (
                            <div className="wizard-card-wrap">
                                <h1 style={{ marginBottom: '8px' }}>AI 본문 자동 작성</h1>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    주제: <strong>{mainKeyword || '미설정'}</strong>
                                </p>

                                <StepIndicator />

                                <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Wand2 size={20} style={{ color: 'var(--color-brand)' }} /> Step 3: 아웃라인 + 생성
                                </h2>
                                <p style={{ color: 'var(--color-text-sub)', marginBottom: '32px' }}>
                                    AI가 소제목 구조를 먼저 생성합니다. 순서 변경, 추가/삭제, 수정 후 본문을 생성하세요.
                                </p>

                                {/* 작성 정보 요약 */}
                                <div className="wizard-summary-grid">
                                    <div className="wizard-summary-card">
                                        <div className="summary-label">메인 키워드</div>
                                        <div className="summary-value">{mainKeyword}</div>
                                    </div>
                                    <div className="wizard-summary-card">
                                        <div className="summary-label">서브 키워드</div>
                                        <div className="summary-value">{selectedKeywords.length}개</div>
                                    </div>
                                    <div className="wizard-summary-card">
                                        <div className="summary-label">톤앤무드</div>
                                        <div className="summary-value">{TONES.find(t => t.id === selectedTone)?.label?.replace(/^[^\s]+\s/, '') || '미선택'}</div>
                                    </div>
                                    <div className="wizard-summary-card">
                                        <div className="summary-label">사진</div>
                                        <div className="summary-value">
                                            {(() => {
                                                const total = Object.values(photoData.metadata).reduce((sum, v) => sum + v, 0);
                                                return total > 0 ? `${total}장` : '없음';
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* 아웃라인 생성 버튼 */}
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <button
                                        onClick={handleGenerateOutline}
                                        disabled={isGeneratingOutline}
                                        className="wizard-btn-primary"
                                    >
                                        {isGeneratingOutline
                                            ? <><Loader2 size={16} className="spin" /> 아웃라인 생성 중...</>
                                            : outlineItems.length > 0
                                                ? <><RefreshCw size={16} /> 아웃라인 다시 생성</>
                                                : <><Bot size={16} /> AI 아웃라인 생성하기</>
                                        }
                                    </button>
                                </div>

                                {isGeneratingOutline && (
                                    <div className="ai-progress-card" style={{ marginBottom: '24px' }}>
                                        <div className="ai-progress-header">
                                            <Loader2 size={16} className="spin" />
                                            글의 구조를 설계하고 있습니다
                                            <div className="ai-progress-dots"><span /><span /><span /></div>
                                        </div>
                                        <div className="ai-progress-bar-track">
                                            <div className="ai-progress-bar-fill" />
                                        </div>
                                        <div className="ai-progress-steps">
                                            <div className="ai-progress-step done">
                                                <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                                                키워드·사진 데이터 수집 완료
                                            </div>
                                            <div className="ai-progress-step active">
                                                <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                                                경쟁 블로그 구조 반영 중
                                            </div>
                                            <div className="ai-progress-step">
                                                <div className="ai-progress-step-icon"><ClipboardList size={14} /></div>
                                                소제목 아웃라인 생성
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 아웃라인 편집 UI */}
                                {outlineItems.length > 0 && (
                                    <div className="outline-editor">
                                        <div className="outline-header">
                                            <label>
                                                <ClipboardList size={16} /> 소제목 구조
                                            </label>
                                            <span className="outline-count">
                                                H2 {outlineItems.filter(i => i.level === 'h2').length} / H3 {outlineItems.filter(i => i.level === 'h3').length}
                                            </span>
                                        </div>

                                        <div className="outline-list">
                                            {outlineItems.map((item, idx) => (
                                                <div key={idx} className={`outline-row ${item.level === 'h3' ? 'is-h3' : ''}`}>
                                                    <button
                                                        onClick={() => handleOutlineToggleLevel(idx)}
                                                        className={`outline-level-btn ${item.level}`}
                                                        title="H2/H3 전환"
                                                    >
                                                        {item.level.toUpperCase()}
                                                    </button>

                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => handleOutlineEdit(idx, e.target.value)}
                                                        placeholder="소제목 입력..."
                                                        className={`outline-input ${item.level}`}
                                                    />

                                                    <div className="outline-actions">
                                                        <button
                                                            onClick={() => handleOutlineMove(idx, -1)}
                                                            disabled={idx === 0}
                                                            className="outline-action-btn"
                                                            title="위로 이동"
                                                        ><ChevronUp size={14} /></button>
                                                        <button
                                                            onClick={() => handleOutlineMove(idx, 1)}
                                                            disabled={idx === outlineItems.length - 1}
                                                            className="outline-action-btn"
                                                            title="아래로 이동"
                                                        ><ChevronDown size={14} /></button>
                                                        <button
                                                            onClick={() => handleOutlineAdd(idx)}
                                                            className="outline-action-btn add"
                                                            title="아래에 항목 추가"
                                                        ><Plus size={14} /></button>
                                                        <button
                                                            onClick={() => handleOutlineDelete(idx)}
                                                            disabled={outlineItems.length <= 1}
                                                            className="outline-action-btn delete"
                                                            title="삭제"
                                                        ><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {competitorData?.average?.headingCount && (
                                            <div className={`outline-competitor-bar ${outlineItems.length >= competitorData.average.headingCount ? 'sufficient' : 'insufficient'}`}>
                                                <BarChart3 size={14} />
                                                경쟁 블로그 평균 소제목 {competitorData.average.headingCount}개 — 현재 {outlineItems.length}개
                                                {outlineItems.length >= competitorData.average.headingCount
                                                    ? <><CheckCircle size={14} /> 충분</>
                                                    : ' — 부족'
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="wizard-nav">
                                    <button
                                        onClick={() => setAiStep(2)}
                                        className="wizard-btn-ghost"
                                    >
                                        <ArrowLeft size={16} /> 이전: 이미지 업로드
                                    </button>
                                    <button
                                        onClick={handleAiGenerate}
                                        disabled={outlineItems.length === 0}
                                        className="wizard-btn-primary"
                                        style={{
                                            padding: '18px 36px', fontSize: '1rem',
                                            opacity: outlineItems.length === 0 ? 0.5 : 1
                                        }}
                                    >
                                        <Sparkles size={18} /> AI 본문 생성 시작
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 생성 중 로딩 UI (단계별 체크리스트 + 프로그레스 바)
    if (isGenerating) {
        const GENERATION_STEPS = [
            { label: '준비 중 (이미지 변환)', icon: <Loader2 size={16} /> },
            { label: '사진 분석 중', icon: <Search size={16} /> },
            { label: 'ALT 텍스트 생성 중', icon: <Tag size={16} /> },
            { label: '본문 작성 중', icon: <Sparkles size={16} /> },
        ];
        const progressPercent = Math.round((generationStep / (GENERATION_STEPS.length - 1)) * 100);

        return (
            <div>
                <div className="generation-loading">
                    <div className="generation-card">
                        <div className="generation-icon">
                            <Sparkles size={48} />
                        </div>
                        <h2>AI가 글을 작성하고 있어요</h2>
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
                            <h3>📸 이미지 SEO 가이드</h3>
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
