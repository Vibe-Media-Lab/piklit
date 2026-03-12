import { callGeminiProxy, callGeminiImageProxy } from './firebase';
import { getRecommendedImages } from '../data/categories';

export const AIService = {
    // 누적 토큰 집계
    _tokenStats: {
        totalPrompt: 0,
        totalCandidates: 0,
        totalTokens: 0,
        callCount: 0,
        history: [],  // 호출별 기록
    },

    getTokenStats() {
        return { ...this._tokenStats };
    },

    resetTokenStats() {
        this._tokenStats = { totalPrompt: 0, totalCandidates: 0, totalTokens: 0, callCount: 0, history: [] };
        console.log('[토큰 집계] 초기화됨');
    },

    _recordTokenUsage(usage, label) {
        const prompt = usage.promptTokenCount ?? 0;
        const candidates = usage.candidatesTokenCount ?? 0;
        const total = usage.totalTokenCount ?? 0;

        this._tokenStats.totalPrompt += prompt;
        this._tokenStats.totalCandidates += candidates;
        this._tokenStats.totalTokens += total;
        this._tokenStats.callCount += 1;
        this._tokenStats.history.push({
            label,
            prompt,
            candidates,
            total,
            time: new Date().toLocaleTimeString(),
        });

        console.log(
            `[토큰] ${label || 'API 호출'} — 입력: ${prompt} | 출력: ${candidates} | 소계: ${total}`
        );
        console.log(
            `[토큰 누적] ${this._tokenStats.callCount}회 호출 — 입력: ${this._tokenStats.totalPrompt} | 출력: ${this._tokenStats.totalCandidates} | 총합: ${this._tokenStats.totalTokens}`
        );
    },

    // BYOK: 사용자가 직접 등록한 API 키 (없으면 null → 서버 키 사용)
    getUserApiKey: () => {
        return localStorage.getItem('openai_api_key') || null;
    },

    /**
     * JSON 파싱 헬퍼 — google_search 응답에서 JSON이 깨지는 경우 대응
     * 전략 1: 전체 텍스트 직접 파싱
     * 전략 2: {...} 패턴 추출 후 파싱
     * 전략 3: "html" 키의 값을 직접 추출 (JSON 문자열 내 줄바꿈으로 파싱 실패 시)
     */
    _tryParseJson(text) {
        // 전략 1: 직접 파싱
        try { return JSON.parse(text); } catch { /* 계속 */ }

        // 전략 2: {...} 또는 [...] 패턴 추출
        const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch { /* 계속 */ }
        }

        // 전략 3: "html": "..." 패턴에서 값 직접 추출 (줄바꿈으로 JSON 깨진 경우)
        const htmlValueMatch = text.match(/"html"\s*:\s*"([\s\S]*)"\s*\}?\s*$/);
        if (htmlValueMatch) {
            let htmlValue = htmlValueMatch[1];
            // 이스케이프된 문자 처리: \" → ", \n → <br>
            htmlValue = htmlValue
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '<br>');
            console.log('[JSON 파싱] "html" 값 직접 추출 성공');
            return { html: htmlValue };
        }

        return null;
    },

    async generateContent(contentParts, options = {}, label = '') {
        const maxRetries = 5;
        let attempt = 0;

        if (typeof contentParts === 'string') {
            contentParts = [{ text: contentParts }];
        }

        while (attempt < maxRetries) {
            try {
                const generationConfig = { ...options.generationConfig };
                if (options.thinkingBudget !== undefined) {
                    generationConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
                }

                const body = {
                    contents: [{ parts: contentParts }],
                    generationConfig
                };

                if (options.tools) {
                    body.tools = options.tools;
                }

                // Firebase Functions 프록시를 통해 호출
                const userApiKey = this.getUserApiKey();
                const result = await callGeminiProxy({
                    body,
                    model: 'gemini-2.5-flash',
                    userApiKey,
                    action: label || undefined,
                });

                const data = result.data;

                // 토큰 사용량 누적 집계
                if (data.usageMetadata) {
                    this._recordTokenUsage(data.usageMetadata, label);
                }

                // google_search 사용 시 parts가 여러 개일 수 있으므로 모든 parts에서 text 추출
                const parts = data.candidates?.[0]?.content?.parts || [];
                const text = parts.map(p => p.text).filter(Boolean).join('\n');

                if (!text) {
                    console.error('AI Response missing text:', data);
                    throw new Error('AI 응답에서 텍스트를 찾을 수 없습니다.');
                }

                const cleanText = text.replace(/```json|```html|```/g, '').trim();

                // rawText 모드: JSON 파싱 없이 텍스트 그대로 반환
                if (options.rawText) {
                    return { text: cleanText };
                }

                // JSON 파싱 시도 (여러 전략)
                const parsed = this._tryParseJson(cleanText);
                if (parsed) return parsed;

                // 최종 fallback: raw text를 html로 반환
                console.warn('JSON Parse failed. Using raw text as HTML fallback:', cleanText.substring(0, 100));
                return { html: cleanText, text: cleanText };

            } catch (error) {
                // 무료 체험 소진 (429 QUOTA_EXCEEDED) — 재시도 안 함
                if (error.status === 429 && error.code === 'QUOTA_EXCEEDED') {
                    throw error;
                }
                // BYOK 필요 (403) — 재시도 안 함
                if (error.status === 403 && error.code === 'BYOK_REQUIRED') {
                    throw error;
                }
                // Firebase Functions의 resource-exhausted 에러 (레거시 호환)
                if (error.code === 'functions/resource-exhausted') {
                    throw new Error(error.message);
                }
                // Rate limit 재시도
                if (error.message?.includes('429') || error.code === 'functions/internal') {
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error('이용량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
                    }
                    const delay = (2000 * Math.pow(2, attempt - 1)) + (Math.random() * 1000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                console.error('AI Error:', error);
                const msg = error.message || '';
                if (msg.includes('high demand') || msg.includes('overloaded') || msg.includes('503')) {
                    throw new Error('AI 서버가 일시적으로 바쁩니다. 잠시 후 다시 시도해 주세요.');
                }
                if (msg.includes('quota') || msg.includes('limit')) {
                    throw new Error('이용량이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
                }
                throw new Error(msg ? `AI 분석 오류: ${msg.slice(0, 80)}` : 'AI 요청 중 오류가 발생했습니다.');
            }
        }
    },

    /**
     * 주제를 분석하여 메인/서브 키워드 제안 (google_search + JSON 응답을 1회 호출로 통합)
     * @param {string} topic - 분석할 주제
     * @param {string} excludeKeywords - 제외할 키워드 (쉼표로 구분)
     * @returns {Promise<{mainKeyword: string, subKeywords: string[]}>}
     */
    // 경쟁 분석 캐시 (키워드 분석 통합 호출에서 함께 수신한 데이터)
    _competitorCache: { keyword: null, data: null },

    async analyzeKeywords(topic, excludeKeywords = '', categoryId = '') {
        const excludeInstruction = excludeKeywords
            ? `\n다음 키워드는 반드시 제외: ${excludeKeywords}`
            : '';

        // 카테고리 라벨 매핑
        const categoryLabels = { cafe: '카페&맛집', travel: '여행', review: '솔직후기', recipe: '레시피', parenting: '육아', shopping: '쇼핑', pet: '반려동물', tips: '생활꿀팁', tech: '테크', comparison: '제품비교', economy: '경제', medical: '의학', law: '법률', tutorial: '튜토리얼', daily: '일상' };
        const categoryLabel = categoryLabels[categoryId] || '';
        const categoryInstruction = categoryLabel
            ? `\n이 주제의 카테고리: "${categoryLabel}". 반드시 이 카테고리와 직접 관련된 키워드만 추천해. 카테고리와 무관한 키워드(숙소, 관광지, 축제 등)는 절대 포함하지 마.`
            : '';

        // 시즌/트렌드 반영을 위한 날짜·계절 변수
        const now = new Date();
        const month = now.getMonth() + 1;
        const seasonMap = {12:'겨울',1:'겨울',2:'겨울',3:'봄',4:'봄',5:'봄',6:'여름',7:'여름',8:'여름',9:'가을',10:'가을',11:'가을'};
        const season = seasonMap[month];
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextSeason = seasonMap[nextMonth];

        const prompt = `너는 네이버 블로그 SEO 키워드 전문가야.
"${topic}"에 대해 네이버 검색 유입을 최대한 끌어올릴 키워드를 추천해줘.
구글 검색으로 "${topic}" 관련 블로그, 카페, 리뷰를 조사해.
${excludeInstruction}${categoryInstruction}

[키워드 추천 규칙]
1. 브랜드명 단독 키워드 금지 (예: "김선문 메뉴" ❌)
2. "지역+카테고리+수식어" 조합 우선 (예: "제주 애월 파인다이닝" ✅)
3. 일반 사용자가 실제로 검색할 법한 키워드
4. 롱테일 키워드 포함 (3~5어절)
5. 메인 키워드는 검색량이 가장 많을 핵심 키워드
6. 주제의 카테고리와 무관한 키워드 금지 (예: 맛집인데 "숙소", "명소" ❌)

[시즌/트렌드 반영]
현재: ${now.getFullYear()}년 ${month}월 (${season}). 다음 달: ${nextMonth}월 (${nextSeason}).
7. 현재 시즌(${season})과 다가올 시즌(${nextSeason})에 검색량이 오를 키워드를 2~3개 포함
8. 명절·방학·연휴 등 시기적 이벤트 관련 롱테일 키워드 우선 고려

[출력]
- 메인 키워드 1개
- 서브 키워드 10개

Output strictly a valid JSON:
{"mainKeyword": "메인 키워드", "subKeywords": ["서브1","서브2","서브3","서브4","서브5","서브6","서브7","서브8","서브9","서브10"]}`;

        // 1차 시도: google_search + thinkingBudget 0
        let result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '키워드 분석');

        // google_search 응답이 JSON이 아닌 텍스트인 경우
        // → 검색 결과 텍스트를 컨텍스트로 전달하여 JSON 변환 (실시간 검색 데이터 보존)
        if (!result?.subKeywords || !Array.isArray(result.subKeywords)) {
            const rawText = result?.text || result?.html || '';
            console.log('[키워드 분석] 검색 데이터 기반 JSON 변환 재시도...');
            const formatPrompt = `아래는 "${topic}"에 대한 네이버 SEO 키워드 분석 결과야.
이 내용을 기반으로 메인 키워드 1개와 서브 키워드 10개를 JSON으로 정리해.
원문의 키워드를 그대로 활용하고, 임의로 새 키워드를 만들지 마.

---
${rawText.slice(0, 3000)}
---

Output strictly a valid JSON:
{"mainKeyword": "메인 키워드", "subKeywords": ["서브1","서브2","서브3","서브4","서브5","서브6","서브7","서브8","서브9","서브10"]}`;
            result = await this.generateContent([{ text: formatPrompt }], {
                generationConfig: { responseMimeType: 'application/json' },
                thinkingBudget: 0
            }, '키워드 분석 (JSON 변환)');
        }

        // 후처리: 문자열 배열 → {keyword} 객체 배열로 변환 (difficulty는 별도 확인)
        if (result?.subKeywords && Array.isArray(result.subKeywords)) {
            result.subKeywords = result.subKeywords.map(kw => {
                const word = typeof kw === 'string' ? kw : (kw.keyword || kw);
                return { keyword: word };
            });
        }

        return result;
    },

    /**
     * 시즌/트렌드 키워드 추천 (방향 B — 사용자 명시적 트리거)
     * @param {string} topic - 주제
     * @param {string} category - 카테고리 ID
     * @param {string[]} existingKeywords - 이미 선택/제안된 키워드 (중복 방지)
     * @returns {Promise<{seasonKeywords: Array<{keyword: string, reason: string, timing: string}>}>}
     */
    async analyzeSeasonKeywords(topic, category = 'daily', existingKeywords = []) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const seasonMap = {12:'겨울',1:'겨울',2:'겨울',3:'봄',4:'봄',5:'봄',6:'여름',7:'여름',8:'여름',9:'가을',10:'가을',11:'가을'};
        const season = seasonMap[month];
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextSeason = seasonMap[nextMonth];

        const excludeList = existingKeywords.length > 0
            ? `\n다음 키워드와 중복되지 않게 해: ${existingKeywords.join(', ')}`
            : '';

        const prompt = `너는 네이버 블로그 SEO 시즌 키워드 전문가야.
구글 검색으로 "${topic}" (카테고리: ${category}) 관련 시즌/트렌드 키워드를 조사해.

현재: ${now.getFullYear()}년 ${month}월 (${season}). 다음 달: ${nextMonth}월 (${nextSeason}).
${excludeList}

[작업]
1. 현재 시즌(${season})과 다가올 시즌(${nextSeason})에 "${topic}" 관련 검색량이 급증하는 키워드 5개 추천
2. 명절·방학·연휴·시즌 이벤트 관련 롱테일 키워드 우선
3. 1~2개월 후 검색 피크를 맞을 키워드도 포함 (선제적 SEO)

[규칙]
- 각 키워드는 3~5어절의 구체적인 롱테일 키워드
- 일반 사용자가 실제로 검색할 법한 표현
- reason은 반드시 15자 이내 한 줄 요약 (예: "벚꽃 시즌 검색 급증")
- timing은 "3월 초~4월 말" 형태로 간결하게

Output strictly a valid JSON:
{"seasonKeywords":[{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"}]}`;

        // 1차 시도: google_search + thinkingBudget 0
        let result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '시즌 키워드 추천');

        // google_search 응답이 JSON이 아닌 텍스트인 경우
        // → 검색 결과 텍스트를 컨텍스트로 전달하여 JSON 변환 (실시간 검색 데이터 보존)
        if (!result?.seasonKeywords || !Array.isArray(result.seasonKeywords)) {
            const rawText = result?.text || result?.html || '';
            console.log('[시즌 키워드] 검색 데이터 기반 JSON 변환 재시도...');
            const formatPrompt = `아래는 "${topic}" 관련 시즌/트렌드 키워드 분석 결과야.
이 내용을 기반으로 시즌 키워드 5개를 JSON으로 정리해.
원문의 키워드와 분석 내용을 그대로 활용하고, 임의로 새 키워드를 만들지 마.
reason은 반드시 15자 이내 한 줄 요약으로 작성해.

---
${rawText.slice(0, 3000)}
---

Output strictly a valid JSON:
{"seasonKeywords":[{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"},{"keyword":"시즌 키워드","reason":"15자 이내 요약","timing":"3월~4월"}]}`;
            result = await this.generateContent([{ text: formatPrompt }], {
                generationConfig: { responseMimeType: 'application/json' },
                thinkingBudget: 0
            }, '시즌 키워드 추천 (JSON 변환)');
        }

        // 후처리: 기존 키워드와 중복 필터
        if (result?.seasonKeywords && Array.isArray(result.seasonKeywords)) {
            result.seasonKeywords = result.seasonKeywords
                .map(item => ({
                    keyword: item.keyword || item,
                    reason: item.reason || '',
                    timing: item.timing || ''
                }))
                .filter(item => !existingKeywords.includes(item.keyword));
        }

        return result;
    },

    /**
     * 경쟁 블로그 분석 — 캐시 우선, 없으면 단독 호출
     */
    async analyzeCompetitors(keyword, category = 'daily') {
        // 캐시에 같은 키워드 데이터가 있고 average가 있으면 즉시 반환
        if (this._competitorCache.keyword === keyword && this._competitorCache.data?.average) {
            console.log('[경쟁 분석] 캐시 사용:', keyword);
            return this._competitorCache.data;
        }

        const prompt = `너는 네이버 블로그 SEO 분석 전문가야.
"${keyword} site:blog.naver.com"을 검색하여 상위 네이버 블로그 글 5개를 찾아 분석해줘.

[분석 항목]
각 글의 추정 글자수(charCount)와 소제목수(headingCount)만 분석.
글자수는 100단위 반올림. average는 5개 블로그의 평균값.
이미지수는 검색으로 확인 불가하므로 분석하지 마.

[중요]
- 반드시 5개 블로그를 분석하여 평균값을 산출할 것
- 실제 검색 결과를 바탕으로 현실적인 수치를 넣을 것
- 예시의 숫자를 그대로 복사하지 말 것
- 검색 결과가 전혀 없어도 반드시 아래 JSON 형식만 출력할 것
- 설명이나 부가 텍스트 절대 금지. JSON만 출력.

Output strictly a valid JSON:
{"average":{"charCount":1980,"headingCount":6}}`;

        const result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }]
        }, '경쟁 블로그 분석');

        // 카테고리별 권장 이미지 수 주입 (categories.js SSOT)
        const recommendedImages = getRecommendedImages(category);

        // 정상 응답: average 객체가 있는 경우
        if (result?.average) {
            result.average.imageCount = recommendedImages;
            result.average._imageIsRecommendation = true;
            this._competitorCache = { keyword, data: result };
            return result;
        }

        // 레거시 호환: blogs 배열이 있으면 average 계산
        if (result?.blogs && Array.isArray(result.blogs)) {
            const blogs = result.blogs;
            const avg = {
                charCount: Math.round(blogs.reduce((s, b) => s + (b.charCount || 0), 0) / blogs.length),
                imageCount: recommendedImages,
                _imageIsRecommendation: true,
                headingCount: Math.round(blogs.reduce((s, b) => s + (b.headingCount || 0), 0) / blogs.length),
            };
            const data = { average: avg };
            this._competitorCache = { keyword, data };
            return data;
        }

        // fallback 응답({ html, text })에서 JSON 재추출 시도
        const rawText = result?.text || result?.html || '';
        if (rawText) {
            const jsonMatch = rawText.match(/\{[\s\S]*"average"\s*:\s*\{[\s\S]*\}[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.average) {
                        this._competitorCache = { keyword, data: parsed };
                        console.log('[경쟁 분석] fallback 재파싱 성공');
                        return parsed;
                    }
                } catch (e) {
                    console.warn('[경쟁 분석] fallback 재파싱 실패:', e.message);
                }
            }
        }

        throw new Error('경쟁 블로그 분석 결과를 파싱할 수 없습니다. 다시 시도해주세요.');
    },

    /**
     * 업로드된 사진들을 AI로 분석
     * @param {Array} photoAssets - 사진 배열 [{slotId, base64, mimeType}]
     * @param {string} mainKeyword - 메인 키워드
     * @returns {Promise<string>} 분석 결과 텍스트
     */
    async analyzePhotos(photoAssets, mainKeyword) {
        if (!photoAssets || photoAssets.length === 0) {
            throw new Error('분석할 사진이 없습니다.');
        }

        const slotLabels = {
            entrance: '외관/간판', menu: '메뉴판', food: '음식',
            interior: '인테리어', parking: '주차장', extra: '기타',
            unboxing: '언박싱', product: '제품 전체', detail: '상세',
            usage: '사용 모습', compare: '비교', problem: '문제 상황',
            tools: '도구/재료', step: '과정', result: '결과',
            transport: '교통', accommodation: '숙소', spot: '관광지',
            restaurant: '맛집', scenery: '풍경', ingredients: '재료',
            prep: '손질', cooking: '조리', complete: '완성',
        };

        const photoList = photoAssets.map((asset, i) => {
            const label = slotLabels[asset.slotId] || asset.slotId || '미분류';
            return `사진 ${i + 1}: [${label}] 슬롯`;
        }).join('\n');

        const prompt = `너는 블로그 사진 분석 전문가야.
주제: "${mainKeyword}"
첨부된 ${photoAssets.length}장의 사진을 분석해줘.

[사진 슬롯 정보]
${photoList}

[분석 항목]
- 주요 요소: 사진에서 보이는 핵심 요소
- 분위기: 색상, 분위기, 특징적인 부분
- 활용 방안: 블로그 글에서 어떻게 활용하면 좋을지 (슬롯 용도에 맞게)

간결하고 실용적으로 한국어로 분석 결과를 작성해줘.
각 사진별로 2-3문장으로 요약해.

반드시 아래 형식으로 출력해:

### 사진 1: 제목
주요 요소: ...
분위기: ...
활용 방안: "..."

### 사진 2: 제목
주요 요소: ...
분위기: ...
활용 방안: "..."`;

        const parts = [{ text: prompt }];
        photoAssets.forEach(asset => {
            parts.push({
                inline_data: {
                    mime_type: asset.mimeType || 'image/jpeg',
                    data: asset.base64
                }
            });
        });

        const result = await this.generateContent(parts, { rawText: true }, '사진 분석');
        return result?.text || '';
    },

    /**
     * 사진 분석 결과의 구체적 이름을 google_search로 검증
     * 정확한 이름 > 제너럴 명칭 > 모호한 표현 우선순위 적용
     * @param {string} photoAnalysis - analyzePhotos() 결과 텍스트
     * @param {string} mainKeyword - 메인 키워드 (검색 쿼리용)
     * @param {string} category - 카테고리
     * @returns {Promise<string>} 검증된 정보가 포함된 보강 텍스트
     */
    async verifyPhotoDetails(photoAnalysis, mainKeyword, category) {
        if (!photoAnalysis) return '';

        const categoryGuide = {
            food: { target: '메뉴명', search: '메뉴', example: '정확한 메뉴명(예: "제주한우 타르트덮밥")을 찾을 수 없으면 일반 명칭(예: "육회 비빔밥")으로' },
            cafe: { target: '메뉴명/음료명', search: '메뉴', example: '정확한 음료명(예: "제주 한라봉 에이드")을 찾을 수 없으면 일반 명칭(예: "과일 에이드")으로' },
            travel: { target: '장소명/관광지명', search: '관광지', example: '정확한 장소명(예: "협재해수욕장")을 찾을 수 없으면 일반 명칭(예: "해변")으로' },
            shopping: { target: '제품명/모델명', search: '제품', example: '정확한 제품명(예: "다이슨 에어랩 HS05")을 찾을 수 없으면 일반 명칭(예: "헤어 스타일러")으로' },
            pet: { target: '사료명/용품명', search: '반려동물 용품', example: '정확한 제품명(예: "로얄캐닌 인도어")을 찾을 수 없으면 일반 명칭(예: "실내용 사료")으로' },
            daily: { target: '장소명/제품명', search: '', example: '파악된 이름이 있으면 사용, 없으면 일반 명칭으로' },
        };

        const catKey = (category === '카페&맛집' || category === '맛집') ? 'food'
            : category === 'cafe' ? 'cafe'
            : category === 'travel' ? 'travel'
            : category === 'shopping' ? 'shopping'
            : (category === 'pet' || category === '반려동물') ? 'pet'
            : 'daily';

        const guide = categoryGuide[catKey] || categoryGuide.daily;

        // 일상 카테고리는 검색 불필요 — 분석 그대로 반환
        if (catKey === 'daily' && !guide.search) return '';

        const prompt = `너는 블로그 팩트체커야.

[사진 분석 결과]
${photoAnalysis}

[작업]
"${mainKeyword}" 검색 결과를 참고하여, 사진 분석에서 언급된 ${guide.target}이 실제로 맞는지 검증해줘.

[우선순위 규칙 — 필수]
1. 검색으로 정확한 이름이 확인되면 → 정확한 이름 사용
2. 확인 안 되면 → 사진에서 보이는 형태 기반 일반 명칭 사용
3. ${guide.example}
4. 절대 추측으로 구체적 고유명사를 만들어내지 마

Output strictly a valid JSON:
{"verified":[{"original":"사진 분석에서 나온 이름","verified_name":"검증된 이름 또는 일반 명칭","confidence":"high|medium|low"}]}`;

        try {
            const result = await this.generateContent([{ text: prompt }], {
                tools: [{ google_search: {} }],
                thinkingBudget: 0
            }, '사진 정보 검증');

            if (result?.verified && Array.isArray(result.verified)) {
                return result.verified
                    .map(v => `• ${v.verified_name} (${v.confidence === 'high' ? '확인됨' : v.confidence === 'medium' ? '추정' : '일반 명칭'})`)
                    .join('\n');
            }
            return '';
        } catch {
            return '';
        }
    },

    // 공통 톤 지시문
    _toneMap: {
        'friendly': `친근한 이웃 톤.
[어미] "~했는데", "~더라고요", "~거든요", "~이에요/예요" 해요체 기본.
[금지 어미] "~입니다", "~됩니다", "~하였습니다" 합쇼체 절대 금지. "~다", "~했다" 평어체도 금지.
[감탄사] "헐", "대박", "진짜", "와" — 글 전체에서 3~5회 이내. 문단마다 넣지 말 것.
[이모지] 소제목당 0~1개, 본문 전체 5개 이내. 문장 끝이 아닌 소제목이나 강조 포인트에만.
[DO] "여기 진짜 숨은 맛집이에요. 제가 3번이나 갔는데 매번 웨이팅 있더라고요."
[DO] "이거 써보니까 확실히 다르더라고요. 피부 속건조가 줄었거든요."
[DON'T] "본 제품은 우수한 성능을 자랑합니다." (합쇼체+AI패턴)
[DON'T] "이번 포스팅에서는 다양한 메뉴를 살펴보겠습니다." (안내형 서술 금지)`,

        'professional': `전문 정보형 톤.
[어미] "~입니다", "~됩니다" 합쇼체 기본. 3~4문장마다 "~인데요", "~거든요" 1회 섞어 딱딱함 완화.
[금지 어미] "~이에요", "~더라고요" 해요체 금지. "~다", "~했다" 평어체도 금지.
[감탄사] "헐", "대박" 절대 금지. "주목할 점은", "실제로" 정도만 허용.
[이모지] 본문에서 이모지 사용 금지. 소제목에서만 아이콘 성격으로 0~2개 허용.
[DO] "이 제품의 핵심은 발열 성능입니다. 실측해보니 30분 만에 20도까지 올라가더군요."
[DO] "2024년 기준 시장 점유율 34%를 기록했습니다. 전년 대비 12% 상승한 수치인데요."
[DON'T] "여기 진짜 대박이에요! 완전 추천합니다~" (해요체+감탄사)
[DON'T] "다양한 기능이 풍부하게 탑재되어 있어서 놀랍습니다." (AI패턴 나열)`,

        'honest': `내돈내산 솔직 리뷰 톤.
[어미] "~했는데", "~인 거 같아요", "~이에요" 해요체 기본.
[금지 어미] "~입니다", "~됩니다" 합쇼체 금지. 평어체도 금지.
[핵심] 장점 먼저 쓰되 단점도 반드시 명시. 장단점 비율 6:4.
[감탄사] "솔직히", "근데", "사실" 자주 사용. "대박", "헐"은 1~2회 이내.
[이모지] 본문 전체 3개 이내. 없어도 됨.
[DO] "맛은 괜찮은데 가격이 좀 있어요. 1인분에 15,000원이면 이 동네 물가 감안해도 비싼 편."
[DO] "포장은 깔끔한데 솔직히 양이 좀 적어요. 성인 남자 기준으로 부족합니다."
[DON'T] "완벽한 제품입니다! 모든 면에서 만족스럽습니다." (광고성 칭찬)
[DON'T] "이 제품의 놀라운 성능을 살펴보겠습니다." (AI패턴+안내형)`,

        'emotional': `감성 에세이 톤.
[어미] "~다", "~았다", "~했다" 평어체(반말 문어체) 기본.
[금지 어미] "~입니다", "~됩니다" 합쇼체 금지. "~이에요", "~거든요" 해요체도 금지.
[핵심] 짧은 문장(20~40자)과 여운 있는 마무리. 오감 묘사 중심. 감정을 직접 말하지 말고 장면으로 보여줘.
[감탄사] 사용 금지. 감정은 묘사로 전달.
[이모지] 사용 금지. 문장의 여백으로 감성 전달.
[DO] "창밖으로 노을이 번졌다. 커피잔을 감싸 쥔 손끝이 따뜻했다."
[DO] "골목을 돌아서자 낯익은 간판이 보였다. 3년 만이었다."
[DON'T] "정말 감동적인 경험이었어요! 너무 좋았습니다~" (감정 직접 서술+해요체)
[DON'T] "이곳은 특별한 매력이 있는 놀라운 공간입니다." (AI패턴+합쇼체)`,

        'guide': `단계별 가이드 톤.
[어미] "~하세요", "~해보세요", "~됩니다" 권유형 + 정중체 혼합.
[금지 어미] "~다", "~했다" 평어체 금지. "~거든요", "~더라고요" 최소화(3회 이내).
[핵심] 각 단계마다 실전 팁 1줄. "참고로", "꿀팁:", "주의:" 같은 라벨 활용.
[감탄사] "참고로", "꿀팁" 정도만. "대박", "헐" 금지.
[이모지] 단계 구분용 소제목에 1개씩 허용. 본문은 3개 이내.
[DO] "먼저 재료를 준비하세요. 꿀팁: 양파는 반달 모양으로 썰면 식감이 살아요."
[DO] "설정 > 알림에서 '푸시 알림'을 켜세요. 이렇게 하면 실시간 알림을 받을 수 있습니다."
[DON'T] "여기서 대박 꿀팁 알려드릴게요~~ 진짜 미쳤어요!!" (과도한 감탄사)
[DON'T] "다양한 방법을 종합적으로 살펴보겠습니다." (AI패턴+안내형)`
    },

    // 공통 HTML 규칙 (본문 생성 프롬프트에서 공유)
    _paragraphRule(style) {
        if (style === 'oneline') return '<p>당 1문장만. 한 줄에 한 문장씩 끊어서 작성. 파워블로거 스타일로 짧고 리듬감 있게.';
        if (style === 'long') return '<p>당 4~5문장. 에세이처럼 깊이 있는 문단. 문장 간 연결이 자연스럽게.';
        return '<p>당 1~3문장(길이 변주).';
    },

    _htmlRules(keyword, paragraphStyle = 'normal') {
        return `[HTML규칙] ${this._paragraphRule(paragraphStyle)} <b>로 강조 (글 전체 3~5개 이내, 핵심 키워드·수치·결론만). <h2>만 사용 (h3 금지). 이미지([[IMAGE:...]])는 별도 <p>. h1 금지. "${keyword}" 키워드 밀도 1~2% 유지 (소제목 포함, 자연스럽게 분산. 연속 문단에 같은 키워드 반복 금지). 첫 <p>에 필수 포함.
[문장 규칙 — 필수!!!] 한 문장은 반드시 80자(한글 기준) 이내로 작성. 80자를 넘길 것 같으면 두 문장으로 나눠. 짧고 읽기 쉬운 문장이 핵심. 쉼표로 문장을 늘리지 말고 마침표로 끊어.
[반복 금지] 동일한 표현·문구·문장 구조를 반복하지 마. 각 문단마다 다른 표현과 시작어를 사용. 같은 내용을 다른 말로 바꿔 쓰는 것도 반복임.
[AI 패턴 표현 — 절대 금지!!!] 아래 단어·표현을 쓰면 안 돼. 반드시 대체 예시처럼 구체적으로 바꿔 써:
- "다양한" → "5가지 종류의" / "세 곳을 비교해본"
- "풍부한" → "간장 맛이 진하게 배어든" / "토핑이 수북하게 올라간"
- "완벽한" → "흠잡을 데 없는" / "기대한 그대로인"
- "특별한" → "여기서만 맛볼 수 있는" / "직접 로스팅한"
- "놀라운" → "예상보다 2배 빠른" / "30분 만에 끝나는"
- "인상적인" → "눈에 확 들어오는" / "한번 보면 기억에 남는"
- "독특한" → "처음 보는 조합인" / "이런 메뉴는 여기뿐인"
- "매력적인" → "자꾸 손이 가는" / "한 번 가면 또 가게 되는"
- "효과적인" → "3일 만에 차이가 보이는" / "바로 체감 가능한"
- "핵심적인" → "가장 중요한 한 가지" / "이것만 알면 되는"
- "필수적인" → "빠지면 안 되는" / "이건 꼭 챙겨야 하는"
- "최적의" → "가성비가 가장 좋은" / "이 조건에 딱 맞는"
- "한층 더" → "확실히" / "눈에 띄게"
- "그야말로" → 삭제하거나 구체적 수치·비유로 대체
- "무엇보다" → "가장 좋았던 건" / "제일 먼저 눈에 들어온 건"
- "안성맞춤" → "딱 맞는" / "이 상황에 제격인"
[금지 문형] "살펴보겠습니다", "알아보겠습니다", "소개해 드리겠습니다", "결론적으로", "종합적으로", "이번 포스팅에서는" — 모두 금지. 바로 본론으로 들어갈 것.`;
    },

    // 카테고리+톤 조합별 보정 지시문 (맥락에 맞는 표현 차별화)
    _categoryToneBoost(category, tone) {
        const boostMap = {
            'cafe+friendly': '카페 분위기를 오감으로 전달해. "커피 향이 코끝을 스치는", "통유리 너머 햇살이 테이블 위로" 같은 감각 묘사. 메뉴 가격은 자연스럽게 녹여.',
            'cafe+professional': '원두 산지, 로스팅 방식, 추출 온도 등 커피 전문 정보를 포함해. 맛 표현은 "산미가 높은", "바디감이 묵직한" 등 전문 용어 활용.',
            'food+friendly': '음식 맛을 구체적 감각으로 표현해. "국물이 뜨끈하게 목을 타고 넘어가는", "고기 한 점 올리니까 지글지글 소리가" 같은 현장감.',
            'food+professional': '식재료 원산지, 조리 방식, 가격 대비 구성을 객관적으로 분석해. "숙성 48시간", "저온 조리 63도" 같은 수치 포함.',
            'economy+professional': '수치·통계를 반드시 포함해. "전년 대비 12% 상승", "3분기 기준 34조 원". 전문 용어 사용하되 괄호로 쉬운 설명 병기.',
            'tech+professional': '스펙·벤치마크 수치를 근거로 분석해. "긱벤치6 멀티코어 7,200점", "배터리 실측 9시간 42분". 체감 성능도 함께 서술.',
            'tech+friendly': '어려운 용어를 쉽게 풀어써. "RAM 16GB면 크롬 탭 30개 띄워도 거뜬해요" 식으로 일상 비유 활용.',
            'medical+professional': '의학적 근거(논문, 가이드라인)를 언급해. "대한의학회 권고 기준", "2024년 메타분석 결과". 단정적 진단 표현 금지, "~할 수 있습니다" 사용.',
            'law+professional': '관련 법조문·판례를 구체적으로 인용해. "민법 제750조", "대법원 2023다12345". 법률 용어 뒤에 괄호로 쉬운 설명.',
            'parenting+friendly': '육아 일상 공감 표현 사용. "밤새 깨서 멘붕이었는데", "이유식 거부하는 아기 앞에서 좌절". 전문가 팁은 부드럽게 녹여.',
        };
        const key = `${category}+${tone}`;
        return boostMap[key] || '';
    },

    // 카테고리별 도입부 SEO 프롬프트 (네이버 검색 스니펫 최적화)
    _introPromptByCategory(category, keyword) {
        const intros = {
            food: `1. 도입부 <p>: 150~200자(공백 포함), 2~4문장. 반드시 150자 이상 작성할 것!
   구조: [방문 계기/상황] → [가게명 "${keyword}" + 지역명] → [대표 메뉴·분위기 한 줄 요약]
   첫 문장에 지역명+가게명 필수 포함. 주소/영업시간/주차 등 상세 정보는 넣지 않음.
   "직접 가봤다"는 경험 신호를 담되, 감성적 경험 문장이어야 함.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
            cafe: `1. 도입부 <p>: 150~200자(공백 포함), 2~4문장. 반드시 150자 이상 작성할 것!
   구조: [방문 계기/상황] → [카페명 "${keyword}" + 지역명] → [분위기·시그니처 메뉴 한 줄 요약]
   첫 문장에 지역명+카페명 필수 포함. 주소/영업시간/주차 등 상세 정보는 넣지 않음.
   "직접 가봤다"는 경험 신호를 담되, 감성적 경험 문장이어야 함.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
            travel: `1. 도입부 <p>: 150~200자(공백 포함), 2~4문장. 반드시 150자 이상 작성할 것!
   구조: [여행 동기/계절 배경] → [여행지명 "${keyword}" + 여행 기간] → [하이라이트 1개 예고]
   첫 문장에 여행지명 필수 포함. "이 글에서 다룰 내용"을 암시하여 체류시간 유도.
   일정표 나열이 아닌, 설렘/기대감을 전하는 개인 서사로 작성.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
            daily: `1. 도입부 <p>: 100~150자(공백 포함), 2~3문장. 반드시 100자 이상 작성할 것!
   구조: [공감 유도 질문 또는 상황 묘사] → [주제 키워드 "${keyword}" 제시] → [해결책/정보 예고]
   짧고 임팩트 있게. 롱테일 키워드를 자연스럽게 녹이기.
   "~에 대해 알아보겠습니다" 식 빈 문장 금지. 독자 상황에 공감하며 시작.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
            pet: `1. 도입부 <p>: 150~200자(공백 포함), 2~4문장. 반드시 150자 이상 작성할 것!
   구조: [반려동물 에피소드/고민] → ["${keyword}" 핵심 키워드 포함 주제 제시] → [경험 기반 해결 예고]
   반려동물 이름/종류 + 상황 묘사로 감정적 연결. 제품 스펙 나열로 시작하지 말 것.
   애정이 담긴 일상적 문체와 정보성의 균형.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
            shopping: `1. 도입부 <p>: 150~200자(공백 포함), 2~4문장. 반드시 150자 이상 작성할 것!
   구조: [문제/고민 제시] → [제품명 "${keyword}" + 카테고리 언급] → [사용 기간·한줄 결론 미리보기]
   "3개월간 사용해본 결과..." 같은 구체적 수치가 신뢰도를 높임.
   가격/스펙 나열이 아닌, 구매 동기와 첫인상 문장이어야 함.
   메인 키워드 "${keyword}"를 도입부에 1~2회 자연스럽게 포함. 키워드 밀도 1~2% 유지.
   이것이 네이버 검색 스니펫(80~160자)으로 노출됨.`,
        };
        // 카테고리 매핑 (한글 → 키)
        const aliasMap = { '카페&맛집': 'food', '맛집': 'food', '쇼핑': 'shopping', '여행': 'travel', '일상': 'daily', '반려동물': 'pet' };
        const key = aliasMap[category] || category;
        return intros[key] || intros.daily;
    },

    // 카테고리별 슬롯 순서
    _categorySlots: {
        food: ['entrance', 'parking', 'menu', 'interior', 'food', 'extra'],
        cafe: ['entrance', 'parking', 'menu', 'interior', 'food', 'extra'],
        shopping: ['unboxing', 'product', 'detail', 'usage', 'compare', 'extra'],
        review: ['unboxing', 'product', 'detail', 'usage', 'compare', 'extra'],
        tech: ['unboxing', 'product', 'detail', 'usage', 'compare', 'extra'],
        tips: ['problem', 'tools', 'step', 'result', 'compare', 'extra'],
        travel: ['transport', 'accommodation', 'spot', 'restaurant', 'scenery', 'extra'],
        recipe: ['ingredients', 'prep', 'cooking', 'complete', 'plating', 'extra'],
        tutorial: ['setup', 'config', 'step1', 'step2', 'result', 'extra'],
        comparison: ['productA', 'productB', 'spec', 'usage', 'detail', 'extra'],
        parenting: ['baby', 'product', 'activity', 'milestone', 'tip', 'extra'],
        pet: ['pet', 'daily', 'walk', 'food', 'product', 'extra'],
        economy: ['main', 'data', 'detail', 'example', 'reference', 'extra'],
        medical: ['main', 'data', 'detail', 'example', 'reference', 'extra'],
        law: ['main', 'data', 'detail', 'example', 'reference', 'extra'],
        daily: ['main', 'scene1', 'scene2', 'food', 'selfie', 'extra'],
    },

    _getSlotsForCategory(category) {
        return this._categorySlots[category] || this._categorySlots.food;
    },

    // 사진 관련 프롬프트 생성 헬퍼
    _photoPrompt(photoAnalysis, photoAssets, category, verifiedDetails = '') {
        const slots = this._getSlotsForCategory(category);
        const slotTags = slots.map(s => `[[IMAGE:${s}]]`).join(', ');
        const experienceRule = `\n[1인칭 체험 전환 — 필수] 사진 속 내용을 객관적으로 나열하지 말고, 1인칭 경험으로 전환해서 써.
예시: "빨간 국물 사진" → "국물 한 숟갈 떠보니 칼칼한 맛이 확 올라왔다"
예시: "카페 외관 사진" → "골목 끝에 숨어있는 이 가게, 간판이 작아서 두 번이나 지나쳤다"
사진을 '본' 게 아니라 '겪은' 것처럼 써.`;
        const verifiedSection = verifiedDetails
            ? `\n[검증된 이름 정보 — 본문에 반드시 사용할 것]\n${verifiedDetails}\n→ "확인됨"은 그대로 사용, "추정"/"일반 명칭"은 자연스럽게 활용.`
            : '';
        if (photoAnalysis) {
            return `\n[사진 분석 결과]\n${photoAnalysis}${verifiedSection}\n사진 위치: ${slotTags}${experienceRule}`;
        }
        if (photoAssets.length > 0) {
            return `\n[사진] 첨부 ${photoAssets.length}장의 시각적 특징을 본문에 녹여줘. 위치: ${slotTags}${experienceRule}`;
        }
        return '';
    },

    // 서브 키워드 필수 포함 프롬프트 헬퍼
    _subKeywordPrompt(subKeywords) {
        if (!subKeywords || subKeywords.length === 0) return '';
        const list = subKeywords.map((kw, i) => `  ${i + 1}. "${kw}"`).join('\n');
        return `\n[서브 키워드 — 자연스럽게 녹이기]
아래 서브 키워드 중 70% 이상을 문맥에 맞게 자연스럽게 포함해. 문맥에 안 맞는 키워드는 생략 가능.
${list}
→ 키워드를 억지로 나열하지 말고, 문장 속에 녹여넣어. 한 문장에 키워드 2개 이상 우겨넣기 금지. <b> 태그 강조는 2~3개만.`;
    },

    // 경쟁 블로그 분석 결과 프롬프트 생성 헬퍼
    _competitorPrompt(competitorData) {
        if (!competitorData || !competitorData.average) return '';

        const { average, blogs = [] } = competitorData;
        const blogSummary = blogs.map((b, i) =>
            `  ${i + 1}. "${b.title}" — ${b.charCount}자, 소제목 ${b.headingCount}개`
        ).join('\n');

        return `\n[경쟁 블로그 분석 결과]
상위 블로그 평균: 글자수 ${average.charCount}자 | 소제목 ${average.headingCount}개 | 권장 이미지 ${average.imageCount}장
${blogSummary}
→ 평균 이상의 글자수와 소제목 수를 확보하여 상위 노출에 맞는 글을 작성할 것.`;
    },

    /**
     * 글 구조 아웃라인 생성 (H2/H3 트리)
     * @param {string} mainKeyword
     * @param {string[]} subKeywords
     * @param {string} tone
     * @param {string} category
     * @param {Object|null} competitorData
     * @returns {Promise<{outline: Array<{level: 'h2'|'h3', title: string}>}>}
     */
    async generateOutline(mainKeyword, subKeywords = [], tone = 'friendly', category = 'daily', competitorData = null) {
        const headingTarget = competitorData?.average?.headingCount
            ? `경쟁 블로그 평균 소제목 ${competitorData.average.headingCount}개 이상 확보할 것.`
            : 'H2 3~5개 배치.';

        const prompt = `너는 네이버 블로그 SEO 전문가야.
구글 검색으로 "${mainKeyword}" 관련 상위 블로그 글의 소제목 구조를 참고해서 아웃라인을 생성해줘.

키워드: ${mainKeyword}
서브 키워드: ${subKeywords.join(', ') || '없음'}
카테고리: ${category}
톤: ${this._toneMap[tone] || this._toneMap['friendly']}

[작업]
"${mainKeyword}" 주제로 블로그 글의 소제목 아웃라인을 H2로만 생성해줘.

[규칙]
1. ${headingTarget}
2. H2만 사용 (H3 사용 금지)
3. 메인 키워드, 서브 키워드를 H2에 자연스럽게 포함
4. 독자가 훑어보기 좋은 논리적 흐름 유지
5. 각 소제목은 10~25자 이내
6. 검색 결과의 상위 블로그 소제목 패턴을 참고하되 그대로 복사하지 말 것

Output strictly a valid JSON:
{"outline":[{"level":"h2","title":"소제목1"},{"level":"h2","title":"소제목2"},{"level":"h2","title":"소제목3"}]}`;

        return this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '아웃라인 생성');
    },

    // 아웃라인을 본문 생성 프롬프트에 삽입하는 헬퍼
    _outlinePrompt(outline) {
        if (!outline || !Array.isArray(outline) || outline.length === 0) return '';
        const tree = outline.map(item =>
            `- [H2] ${item.title}`
        ).join('\n');
        return `\n[아웃라인 — 반드시 이 소제목 구조를 따를 것!!!]
${tree}
→ 위 아웃라인의 소제목 텍스트를 그대로 HTML <h2> 태그로 사용할 것. 소제목을 임의로 변경하거나 생략하면 안 됨.
→ 각 섹션에 맞는 내용을 채우되, 첫 문단에서 바로 핵심 경험을 던져.`;
    },

    async generateFullDraft(category, mainKeyword, tone, imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null, wannabeStyleRules = '', paragraphStyle = 'normal', verifiedDetails = '') {
        if (category === 'cafe' || category === 'food' || category === '맛집' || category === '카페&맛집') {
            return this.generateRestaurantDraft(mainKeyword, tone, imageMetadata, photoAssets, subKeywords, targetLength, photoAnalysis, competitorData, outline, wannabeStyleRules, paragraphStyle, verifiedDetails);
        }
        if (category === 'shopping' || category === '쇼핑') {
            return this.generateShoppingDraft(mainKeyword, tone, imageMetadata, photoAssets, subKeywords, targetLength, photoAnalysis, competitorData, outline, wannabeStyleRules, paragraphStyle, verifiedDetails);
        }

        // 카테고리별 슬롯 확인
        const categorySlots = this._getSlotsForCategory(category);
        const uploadedSlots = categorySlots
            .filter(s => (imageMetadata[s] || 0) > 0);
        const imageInstructions = uploadedSlots.length > 0
            ? uploadedSlots.map(s => `[[IMAGE:${s}]]`).join(', ')
            : '이미지 없음';
        const exampleSlot = categorySlots[0] || 'extra';

        const toneBoost = this._categoryToneBoost(category, tone);
        const prompt = `너는 네이버 블로그 SEO 전문가야.
${this._htmlRules(mainKeyword, paragraphStyle)}
주제: ${category} | 키워드: ${mainKeyword} | 글자수: ${targetLength}
톤: ${this._toneMap[tone] || this._toneMap['friendly']}${toneBoost ? `\n[카테고리 맞춤 톤 보정] ${toneBoost}` : ''}${wannabeStyleRules}
${this._subKeywordPrompt(subKeywords)}
${this._photoPrompt(photoAnalysis, photoAssets, category, verifiedDetails)}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:${exampleSlot}]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[구조 — 반드시 이 순서!!!]
${this._introPromptByCategory(category, mainKeyword)}
2. 본문: h2 사용. 구글 검색으로 '${mainKeyword}' 실제 정보를 찾아 작성. 서브 키워드는 문맥에 맞게 자연스럽게 녹여넣기. [[VIDEO]] 1개 배치.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType || 'image/jpeg', data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }],
            thinkingBudget: 2048
        }, '본문 생성');
    },

    /**
     * 업장 정보 검색 (본문 생성 전 별도 호출)
     */
    async searchPlaceInfo(keyword) {
        const prompt = `구글 검색으로 "${keyword}"의 실제 정보를 찾아줘.
Output strictly a valid JSON:
{"address":"주소","hours":"영업시간","menu":"인기메뉴 상위 3~5개만 (메뉴명 가격원 형식, 예: 아메리카노 4,500원)","parking":"주차 정보","reservation":"예약 정보"}
규칙:
- menu는 가장 많이 언급되는 대표 메뉴 3~5개만. 절대 6개 이상 넣지 마.
- 가격은 반드시 숫자,숫자원 형식 (예: 3,800원). 마침표(.) 사용 금지.
- 못 찾은 항목은 "정보 확인 필요"로 채워.`;

        const result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '업장 정보 검색');

        // 가격 포맷 후처리: "3,.800" → "3,800", "3.800" → "3,800" 등
        if (result && result.menu) {
            result.menu = result.menu
                .replace(/(\d)[,.][\s]*\.(\d)/g, '$1,$2')   // "3,. 800" or "3,.800"
                .replace(/(\d)\.(\d{3})/g, '$1,$2')          // "3.800" → "3,800"
                .replace(/(\d),\s+(\d)/g, '$1,$2');           // "3, 800" → "3,800"
        }

        return result;
    },

    async generateRestaurantDraft(keyword, tone = 'friendly', imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null, wannabeStyleRules = '', paragraphStyle = 'normal', verifiedDetails = '') {
        const { entrance = 0, parking = 0, menu = 0, interior = 0, food = 0, extra = 0 } = imageMetadata;

        const slots = [['entrance',entrance],['parking',parking],['menu',menu],['interior',interior],['food',food],['extra',extra]]
            .map(([s,c]) => `${s}:${c > 0 ? 'O' : 'X'}`).join(' ');

        // 업로드된 슬롯만 필수 이미지로 지정
        const uploadedSlots = [['entrance',entrance],['parking',parking],['menu',menu],['interior',interior],['food',food],['extra',extra]]
            .filter(([, count]) => count > 0)
            .map(([s]) => s);
        const imageInstructions = uploadedSlots.length > 0
            ? uploadedSlots.map(s => `[[IMAGE:${s}]]`).join(', ')
            : '이미지 없음';

        // 업장 정보를 먼저 검색 (별도 API 호출)
        let placeInfo = { address: '정보 확인 필요', hours: '정보 확인 필요', menu: '정보 확인 필요', parking: '정보 확인 필요', reservation: '정보 확인 필요' };
        try {
            const info = await this.searchPlaceInfo(keyword);
            if (info && info.address) placeInfo = info;
        } catch (e) {
            console.warn('[업장 정보 검색] 실패, 기본값 사용:', e.message);
        }

        const infoCard = `<h2>📍 찾아가는 길</h2><p><b>가게명:</b> ${keyword}</p><p><b>주소:</b> ${placeInfo.address}</p><p><b>영업시간:</b> ${placeInfo.hours}</p><p><b>인기메뉴:</b> ${placeInfo.menu}</p><p><b>주차:</b> ${placeInfo.parking}</p><p><b>예약:</b> ${placeInfo.reservation}</p>`;

        const toneBoost = this._categoryToneBoost('food', tone);
        const prompt = `너는 네이버 블로그 맛집 전문 블로거야.
${this._htmlRules(keyword, paragraphStyle)}
키워드: ${keyword} | 톤: ${this._toneMap[tone] || this._toneMap['friendly']}${toneBoost ? `\n[카테고리 맞춤 톤 보정] ${toneBoost}` : ''}${wannabeStyleRules} | 글자수: ${targetLength}
사진: ${slots}
${this._subKeywordPrompt(subKeywords)}
${this._photoPrompt(photoAnalysis, photoAssets, 'food', verifiedDetails)}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}
누락 사진은 <blockquote>💡 TIP: 사진 추가 권장!</blockquote>

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:food]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[구조 — 반드시 이 순서!!!]
${this._introPromptByCategory('food', keyword)}
2. 본문: 아웃라인의 h2 소제목을 반드시 그대로 사용. 각 섹션에 서브 키워드를 자연스럽게 포함. [[VIDEO]] 1개 배치.
3. 가게 정보카드 — 글 하단 마무리에 배치 (아래 HTML 그대로 삽입):
${infoCard}
→ 가게 정보는 반드시 글의 맨 마지막에 위치해야 함. 도입부나 본문 중간에 넣지 말 것. 독자가 글을 끝까지 읽고 방문을 결심한 후 확인하는 정보임.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType, data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }],
            thinkingBudget: 2048
        }, '맛집 본문 생성');
    },

    /**
     * 제품 정보 검색 (쇼핑 본문 생성 전 별도 호출)
     */
    async searchProductInfo(keyword) {
        const prompt = `구글 검색으로 "${keyword}"의 실제 제품 정보를 찾아줘.
Output strictly a valid JSON:
{"brand":"브랜드명","productName":"제품명","price":"가격","specs":"주요 스펙","whereToBuy":"구매처","releaseDate":"출시일"}
규칙:
- 가격은 반드시 숫자,숫자원 형식 (예: 39,800원). 마침표(.) 사용 금지.
- 못 찾은 항목은 "정보 확인 필요"로 채워.`;

        const result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '제품 정보 검색');

        // 가격 포맷 후처리: "39.800" → "39,800" 등
        if (result && result.price) {
            result.price = result.price
                .replace(/(\d)[,.][\s]*\.(\d)/g, '$1,$2')
                .replace(/(\d)\.(\d{3})/g, '$1,$2')
                .replace(/(\d),\s+(\d)/g, '$1,$2');
        }

        return result;
    },

    async generateShoppingDraft(keyword, tone = 'friendly', imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null, wannabeStyleRules = '', paragraphStyle = 'normal', verifiedDetails = '') {
        const { unboxing = 0, product = 0, detail = 0, usage = 0, compare = 0, extra = 0 } = imageMetadata;

        const slots = [['unboxing',unboxing],['product',product],['detail',detail],['usage',usage],['compare',compare],['extra',extra]]
            .map(([s,c]) => `${s}:${c > 0 ? 'O' : 'X'}`).join(' ');

        const uploadedSlots = [['unboxing',unboxing],['product',product],['detail',detail],['usage',usage],['compare',compare],['extra',extra]]
            .filter(([, count]) => count > 0)
            .map(([s]) => s);
        const imageInstructions = uploadedSlots.length > 0
            ? uploadedSlots.map(s => `[[IMAGE:${s}]]`).join(', ')
            : '이미지 없음';

        // 제품 정보를 먼저 검색 (별도 API 호출)
        let productInfo = { brand: '정보 확인 필요', productName: '정보 확인 필요', price: '정보 확인 필요', specs: '정보 확인 필요', whereToBuy: '정보 확인 필요', releaseDate: '정보 확인 필요' };
        try {
            const info = await this.searchProductInfo(keyword);
            if (info && info.productName) productInfo = info;
        } catch (e) {
            console.warn('[제품 정보 검색] 실패, 기본값 사용:', e.message);
        }

        const infoCard = `<h3>🏷️ ${productInfo.productName || keyword}</h3><p><b>브랜드:</b> ${productInfo.brand}</p><p><b>가격:</b> ${productInfo.price}</p><p><b>주요 스펙:</b> ${productInfo.specs}</p><p><b>구매처:</b> ${productInfo.whereToBuy}</p><hr>`;

        const toneBoost = this._categoryToneBoost('shopping', tone);
        const prompt = `너는 네이버 블로그 쇼핑 리뷰 전문 블로거야.
${this._htmlRules(keyword, paragraphStyle)}
키워드: ${keyword} | 톤: ${this._toneMap[tone] || this._toneMap['friendly']}${toneBoost ? `\n[카테고리 맞춤 톤 보정] ${toneBoost}` : ''}${wannabeStyleRules} | 글자수: ${targetLength}
사진: ${slots}
${this._subKeywordPrompt(subKeywords)}
${this._photoPrompt(photoAnalysis, photoAssets, 'shopping', verifiedDetails)}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:product]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[구조 — 반드시 이 순서!!!]
${this._introPromptByCategory('shopping', keyword)}
2. 제품 정보카드 (아래 HTML 그대로 삽입):
${infoCard}
3. 본문: 가장 기억에 남는 경험부터 시작. h2 사용. 구매계기·실사용·장단점을 자유 순서로 구성. [[VIDEO]] 1개 배치.

[장단점 섹션 — 필수]
본문 후반부에 장점과 아쉬운 점을 <h2>✅ 장점</h2>과 <h2>❌ 아쉬운 점</h2> 소제목 아래 <ul><li> 리스트로 각각 3~5개씩 정리.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType, data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }],
            thinkingBudget: 2048
        }, '본문 생성 (쇼핑)');
    },

    /**
     * Flow 1: Direct Write Refinement (Expand manual draft using Search)
     */
    async refineManualDraft(currentHtml, keyword, tone, subKeywords = [], category = 'daily', competitorData = null) {
        const toneInstruction = this._toneMap[tone] || this._toneMap['friendly'];
        const toneBoost = this._categoryToneBoost(category, tone);

        const prompt = `너는 네이버 블로그 글 보완 전문가야.
사용자가 직접 작성한 블로그 초안(HTML)을 기반으로, 구글 검색을 통해 실제 사실을 보완하여 1500자 이상의 완성된 글로 만들어줘.

[키워드] ${keyword}

[톤 지시]
${toneInstruction}${toneBoost ? `\n[카테고리 맞춤 톤 보정] ${toneBoost}` : ''}
${this._htmlRules(keyword)}
${this._introPromptByCategory(category, keyword)}
${this._subKeywordPrompt(subKeywords)}
${this._competitorPrompt(competitorData)}

[미션]
1. 사용자가 쓴 문장을 최대한 살리되, 문맥을 자연스럽게 다듬는다.
2. 자연스러운 흐름으로 내용을 확장한다.
3. 검색 결과를 바탕으로 메뉴 가격, 가는 길, 꿀팁 등 실질적인 정보를 추가한다.

[원본 내용]
${currentHtml}

Output strictly a valid JSON: { "html": "..." }`;

        return this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }]
        }, '본문 보완');
    },

    /**
     * 선택 영역 AI 재작성
     * @param {string} selectedText - 선택된 텍스트
     * @param {string} surroundingContext - 선택 영역 앞뒤 ~200자 문맥
     * @param {string} keyword - 메인 키워드
     * @param {'expand'|'condense'|'factboost'|'polish'} mode - 재작성 모드
     * @returns {Promise<{text: string}>}
     */
    async rewriteSelection(selectedText, surroundingContext, keyword, mode, tone = 'friendly') {
        const modePrompts = {
            expand: `다음 텍스트를 원본의 2~3배 분량으로 확장해줘. 구체적인 디테일, 예시, 부연 설명을 추가해.`,
            condense: `다음 텍스트를 원본의 40~60% 분량으로 압축해줘. 핵심 내용만 남기고 불필요한 수식어와 반복을 제거해.`,
            factboost: `다음 텍스트에 구글 검색으로 찾은 실제 팩트(수치, 통계, 구체적 정보)를 보강해줘. 원본 흐름은 유지하면서 신뢰도를 높여.`,
            polish: `다음 텍스트의 가독성과 흐름을 개선해줘. 의미는 변경하지 말고 표현만 자연스럽게 다듬어.`
        };

        const toneInstruction = this._toneMap[tone] || this._toneMap['friendly'];

        const prompt = `너는 블로그 글 부분 재작성 전문가야.

${modePrompts[mode] || modePrompts['polish']}

[톤 지시]
${toneInstruction}

[키워드] ${keyword || '없음'}
[주변 문맥] ...${surroundingContext}...
[재작성 대상 텍스트]
${selectedText}

반드시 위 톤 지시를 따라 재작성해. 결과는 재작성된 텍스트만 출력해. HTML 태그 없이 순수 텍스트로. 앞뒤 설명이나 따옴표 없이 바로 결과만.

[문장 규칙] 한 문장은 반드시 80자(한글 기준) 이내로 작성. 80자를 넘길 것 같으면 두 문장으로 나눠.
[AI 패턴 금지] "다양한", "풍부한", "완벽한", "특별한", "놀라운", "인상적인", "독특한", "매력적인" 등 추상적 수식어 금지. 구체적 수치·감각 표현으로 대체.
[금지 문형] "살펴보겠습니다", "알아보겠습니다", "소개해 드리겠습니다" 금지.`;

        const options = {
            rawText: true,
            thinkingBudget: 0
        };

        if (mode === 'factboost') {
            options.tools = [{ google_search: {} }];
        }

        const result = await this.generateContent([{ text: prompt }], options, `선택 재작성 (${mode})`);
        return result;
    },

    /**
     * 이미지 슬롯별 SEO 최적화 ALT 텍스트 생성 (개별 이미지별)
     * @param {string} mainKeyword - 메인 키워드
     * @param {string[]} subKeywords - 서브 키워드 배열
     * @param {string|null} photoAnalysis - 사진 AI 분석 결과 텍스트
     * @param {string[]} uploadedSlots - 업로드된 슬롯 ID 배열 (예: ['entrance', 'food', 'menu'])
     * @param {Object} slotCounts - 슬롯별 이미지 개수 (예: { entrance: 2, food: 3 })
     * @returns {Promise<Object>} 슬롯별 ALT 텍스트 배열 맵 (예: { entrance: ["ALT1", "ALT2"], food: ["ALT1", "ALT2", "ALT3"] })
     */
    async generateImageAlts(mainKeyword, subKeywords = [], photoAnalysis = null, uploadedSlots = [], slotCounts = {}, tone = 'friendly') {
        if (!uploadedSlots.length) return {};

        const slotLabels = {
            entrance: '외관/간판', menu: '메뉴판/가격표', food: '음식/메뉴',
            interior: '인테리어/내부', parking: '주차장/주차정보', extra: '기타'
        };

        const slotList = uploadedSlots.map(s => {
            const count = slotCounts[s] || 1;
            return `- ${s} (${slotLabels[s] || s}): ${count}장`;
        }).join('\n');
        const analysisSection = photoAnalysis
            ? `\n[사진 분석 결과]\n${photoAnalysis}`
            : '';

        const exampleOutput = {};
        uploadedSlots.forEach(s => {
            const count = slotCounts[s] || 1;
            exampleOutput[s] = Array.from({ length: count }, (_, i) => `ALT 텍스트 ${i + 1}`);
        });

        const captionExampleOutput = {};
        uploadedSlots.forEach(s => {
            const count = slotCounts[s] || 1;
            captionExampleOutput[s] = Array.from({ length: count }, (_, i) => ({
                alt: `ALT 텍스트 ${i + 1}`,
                caption: `캡션 문장 ${i + 1}`
            }));
        });

        const toneGuide = {
            friendly: '해요체/~요 (예: "눈에 띄어요", "느낌이에요")',
            professional: '합쇼체/~니다 (예: "확인할 수 있습니다", "눈에 띕니다")',
            honest: '반말/~다 (예: "눈에 띈다", "느낌이다")',
            emotional: '평어체/반말 (예: "눈길을 끈다", "마음에 남는다")',
            guide: '권유형/~세요 (예: "확인해보세요", "주목할 만해요")',
        }[tone] || '해요체/~요';

        const prompt = `너는 네이버 블로그 이미지 SEO 전문가야.

메인 키워드: ${mainKeyword}
서브 키워드: ${subKeywords.join(', ') || '없음'}
${analysisSection}

[업로드된 이미지 슬롯과 장수]
${slotList}

[작업]
각 이미지 슬롯의 이미지 개수만큼 ALT 텍스트와 캡션을 함께 생성해줘.
같은 슬롯이라도 각 이미지의 ALT와 캡션은 서로 다른 내용으로 작성해야 함.

[규칙]
1. 각 ALT 텍스트에 메인 키워드를 반드시 포함
2. ALT: 5~7단어, 15~30자 이내 (이미지 대체 텍스트)
3. caption: 1~2문장, 30~60자 (본문 이미지 아래 표시될 설명)
4. 사진 분석 결과가 있으면 실제 내용을 반영
5. 자연스러운 한국어 문장
6. 서브 키워드를 ALT와 캡션에 분산 배치하여 SEO 최적화
7. 같은 슬롯의 이미지끼리 다른 관점/요소를 묘사
8. **중요: 캡션 문체는 반드시 ${toneGuide}로 통일** — 본문과 톤이 달라지면 부자연스러움

Output strictly a valid JSON object:
${JSON.stringify(captionExampleOutput)}`;

        const result = await this.generateContent([{ text: prompt }], {
            thinkingBudget: 0
        }, '이미지 ALT 생성');

        // 결과 검증 및 정규화: {alt, caption} 객체 배열로 통일
        if (result && typeof result === 'object') {
            const normalized = {};
            for (const slot of uploadedSlots) {
                const items = result[slot];
                if (Array.isArray(items)) {
                    normalized[slot] = items.map(item => {
                        if (typeof item === 'string') {
                            return { alt: item, caption: '' };
                        }
                        return { alt: item.alt || item, caption: item.caption || '' };
                    });
                } else if (typeof items === 'string') {
                    normalized[slot] = [{ alt: items, caption: '' }];
                } else {
                    normalized[slot] = [{ alt: `${mainKeyword} ${slotLabels[slot] || slot}`, caption: '' }];
                }
            }
            return normalized;
        }
        return {};
    },

    /**
     * 도입부 대안 3개 생성 (네이버 검색 CTR 최적화)
     * @param {string} currentIntro - 현재 도입부 텍스트
     * @param {string} mainKeyword - 메인 키워드
     * @param {string[]} subKeywords - 서브 키워드 배열
     * @param {string} title - 게시글 제목
     * @returns {Promise<{alternatives: Array<{text: string, strategy: string}>}>}
     */
    async generateIntroAlternatives(currentIntro, mainKeyword, subKeywords = [], title = '', tone = 'friendly', bodyText = '', category = 'daily') {
        const toneDesc = this._toneMap[tone] || this._toneMap['friendly'];
        const toneBoost = this._categoryToneBoost(category, tone);

        // 본문이 있으면 본문 톤 우선, 없으면 설정 톤 사용
        const toneSection = bodyText
            ? `[본문 실제 문체 — 반드시 이 문체를 따를 것!!!]
아래 본문을 읽고 어미·문체·분위기를 정확히 파악해. 도입부도 동일한 어미를 사용해야 함.
본문이 "~다/~했다" 체면 도입부도 "~다/~했다"로 끝내야 하고,
본문이 "~해요/~했어요" 체면 도입부도 "~해요/~했어요"로 끝내야 함.
이모지를 안 쓰면 도입부에도 이모지 금지. 쓰면 도입부에도 사용.

${bodyText}`
            : `[톤앤무드]\n${toneDesc}`;

        // 카테고리별 글자수 가이드 & 전략
        const categoryGuides = {
            food: { charMin: 150, charMax: 200, strategies: '첫 번째: 방문 계기·상황 묘사형 (누구와 왜 갔는지)\n   - 두 번째: 대표 메뉴 선행형 (가장 맛있었던 메뉴부터)\n   - 세 번째: 지역 탐방형 (동네·거리 분위기에서 시작)' },
            cafe: { charMin: 150, charMax: 200, strategies: '첫 번째: 방문 계기·상황 묘사형 (누구와 왜 갔는지)\n   - 두 번째: 분위기·인테리어 선행형 (공간 느낌부터)\n   - 세 번째: 시그니처 메뉴 선행형 (메뉴 경험부터)' },
            travel: { charMin: 150, charMax: 200, strategies: '첫 번째: 여행 동기·계절 배경형 (왜 떠났는지)\n   - 두 번째: 하이라이트 선행형 (가장 인상적인 장면부터)\n   - 세 번째: 궁금증 유발형 (의외의 발견·질문으로 시작)' },
            daily: { charMin: 100, charMax: 150, strategies: '첫 번째: 공감 유도형 (독자 상황에 공감하며 시작)\n   - 두 번째: 핵심 정보 선행형 (결론/팁을 먼저 제시)\n   - 세 번째: 궁금증 유발형 (질문이나 의외의 사실로 시작)' },
            pet: { charMin: 150, charMax: 200, strategies: '첫 번째: 에피소드형 (반려동물과의 구체적 에피소드)\n   - 두 번째: 고민 해결형 (겪었던 문제와 해결 과정)\n   - 세 번째: 감정 연결형 (반려동물에 대한 애정에서 시작)' },
            shopping: { charMin: 150, charMax: 200, strategies: '첫 번째: 구매 동기형 (어떤 문제를 해결하려 샀는지)\n   - 두 번째: 결론 선행형 (사용 후 한줄 평가부터)\n   - 세 번째: 비교형 (기존 제품과 비교하며 시작)' },
        };
        const aliasMap = { '카페&맛집': 'food', '맛집': 'food', '쇼핑': 'shopping', '여행': 'travel', '일상': 'daily', '반려동물': 'pet' };
        const catKey = aliasMap[category] || category;
        const guide = categoryGuides[catKey] || categoryGuides.daily;

        const prompt = `너는 네이버 블로그 SEO 전문가야. 네이버 검색 결과에서 클릭률(CTR)을 최대한 끌어올리는 도입부를 작성해.

[현재 게시글 정보]
- 제목: ${title || '없음'}
- 메인 키워드: ${mainKeyword}
- 서브 키워드: ${subKeywords.join(', ') || '없음'}
- 카테고리: ${category}
- 톤앤무드: ${toneDesc}${toneBoost ? `\n- 카테고리 맞춤 톤 보정: ${toneBoost}` : ''}

${toneSection}

[현재 도입부]
${currentIntro}

[작업]
위 톤앤무드와 본문 문체를 모두 반영하여 대안 도입부 3개를 작성해.

[규칙]
1. **[글자수 — 가장 중요!!!]** 각 도입부는 반드시 한글 기준 ${guide.charMin}자 이상 ${guide.charMax}자 이하.
   - 공백·이모지 포함 전체 글자수 기준.
   - ${guide.charMin - 40}자 이하는 절대 불가! 충분히 길게 작성할 것.
   - 참고: "의왕 카포커피클럽은 반려견과 함께 방문하기 좋은 애견동반 카페입니다." = 약 38자. 이런 문장 ${Math.ceil(guide.charMin / 38)}개를 이어 써야 ${guide.charMin}자가 됨.
   - 작성 후 반드시 글자수를 세어 ${guide.charMin}자 미만이면 문장을 추가하고, ${guide.charMax}자 초과면 줄일 것.
2. 첫 문장에 메인 키워드("${mainKeyword}") 반드시 포함
3. 네이버 검색 미리보기에 노출되는 첫 2문장(90자)에 핵심 정보 담기
4. 각 도입부는 서로 다른 전략 사용:
   - ${guide.strategies}
5. **[절대 규칙]** 본문의 어미를 100% 따라할 것. 본문이 "~다"로 끝나면 "~해요/~합니다/~거예요" 절대 금지. 본문이 "~해요"로 끝나면 "~다/~했다" 절대 금지.
6. **[중복 금지]** 위 본문에 이미 있는 표현·문장을 그대로 반복하지 말 것. 도입부는 본문과 다른 시각·표현으로 시작해야 함. 본문 첫 문단과 내용이 겹치면 안 됨.

Output strictly a valid JSON:
{"alternatives":[{"text":"도입부 텍스트","strategy":"전략 설명"},{"text":"도입부 텍스트","strategy":"전략 설명"},{"text":"도입부 텍스트","strategy":"전략 설명"}]}`;

        return this.generateContent([{ text: prompt }], {
            thinkingBudget: 1024
        }, '도입부 최적화');
    },

    async recommendTitles(mainKeyword, subKeywords = [], content = '', tone = 'friendly', category = 'daily') {
        const subKeywordStr = Array.isArray(subKeywords)
            ? subKeywords.filter(k => k && k.trim()).join(', ')
            : '';
        const contextHint = content
            ? `\n본문 요약: ${content.substring(0, 300)}`
            : '';
        const toneHint = this._toneMap[tone] ? `\n톤: ${tone}` : '';
        const prompt = `너는 네이버 블로그 SEO 전문가야.

메인 키워드: ${mainKeyword}
카테고리: ${category}${toneHint}
${subKeywordStr ? `서브 키워드: ${subKeywordStr}` : ''}${contextHint}

[작업]
1. 구글 검색으로 '${mainKeyword}'에 대한 실제 정보를 확인해.
2. 검색 결과와 본문 내용을 바탕으로 클릭률 높은 SEO 제목 5개를 만들어.

[규칙]
- 제목은 반드시 '${mainKeyword}'으로 시작할 것
- 실제 정보(메뉴, 위치, 특징 등)를 반영할 것
- 25자 이내로 작성할 것
- 카테고리와 톤에 맞는 제목 스타일 유지

Output strictly a valid JSON: ["제목1", "제목2", "제목3", "제목4", "제목5"]`;
        return this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '제목 추천');
    },

    async extractTags(content) {
        const prompt = `너는 네이버 블로그 SEO 태그 전문가야.
아래 본문을 분석해서 네이버 블로그에 최적화된 태그 10개를 추출해.

[태그 규칙]
- # 기호 없이 키워드만 반환
- 대중 태그 5개 (검색량 높은 범용 키워드) + 틈새 태그 5개 (구체적, 롱테일 키워드) 배합
- 본문의 메인 키워드를 반드시 포함
- 장소명, 브랜드명이 있으면 태그에 포함
- 한국어 태그만 (영어 브랜드명은 예외)
- 2~6글자 길이 권장, 띄어쓰기 없이 붙여쓰기

[본문]
${content.substring(0, 1500)}

Output strictly a valid JSON: ["태그1", "태그2", ...]`;
        return this.generateContent([{ text: prompt }], { thinkingBudget: 0 }, '태그 추출');
    },

    // ─── AI 이미지 생성 ───

    _imageStyleMap: {
        illustration: 'flat vector illustration, minimal clean style, solid color background, modern Korean blog design, no text overlay',
        infographic: 'clean infographic design, data visualization, modern layout, white background, labeled sections, no text',
        realistic: 'photorealistic, high quality, natural lighting, professional product photography, clean background',
        aesthetic: 'aesthetic lifestyle photography, soft warm lighting, dreamy bokeh, cozy atmosphere, Instagram style',
        diagram: 'technical diagram, clean minimal labeled illustration, blueprint style, white background, no text'
    },

    _slotContextMap: {
        // food / cafe
        entrance: 'restaurant storefront exterior, signage, building facade',
        menu: 'menu board, food menu design, price list',
        food: 'delicious food plating, appetizing Korean dish',
        interior: 'restaurant interior, cozy seating, ambient lighting',
        parking: 'parking area, parking information',
        // shopping / review / tech
        unboxing: 'product unboxing, packaging opened, first reveal moment',
        product: 'product full view, clean white background, product photography',
        detail: 'product close-up detail shot, texture, material quality',
        usage: 'person using the product, lifestyle shot, real usage scene',
        compare: 'product comparison, side by side layout, versus',
        // tips (생활꿀팁)
        problem: 'problem situation, before state, messy or broken scene',
        tools: 'tools and materials laid out, cleaning supplies, preparation items',
        step: 'step by step process, hands doing work, tutorial action shot',
        result: 'clean result, after state, successful outcome, bright and tidy',
        // travel (여행)
        transport: 'transportation, car driving, train station, airport',
        accommodation: 'hotel room, pension, cozy accommodation interior',
        spot: 'tourist attraction, landmark, scenic photo spot',
        restaurant: 'local restaurant, street food, regional cuisine',
        scenery: 'beautiful landscape, sunset, nature, night view',
        // recipe (레시피)
        ingredients: 'fresh ingredients laid out, vegetables, spices, mise en place',
        prep: 'food preparation, chopping, slicing, kitchen work',
        cooking: 'cooking process, pot on stove, stirring, sizzling pan',
        complete: 'completed dish, beautiful plating, finished recipe',
        plating: 'food styling, table setting, aesthetic food photography',
        // tutorial (튜토리얼)
        setup: 'setup and installation, unboxing tools, preparation',
        config: 'configuration screen, settings panel, initial setup',
        step1: 'first step of tutorial, beginning process',
        step2: 'second step of tutorial, continuing process',
        // comparison (제품비교)
        productA: 'first product, product A, standalone product shot',
        productB: 'second product, product B, standalone product shot',
        spec: 'specification comparison, spec sheet, data table',
        // parenting (육아)
        baby: 'cute baby, child photo, happy moment',
        activity: 'child activity, playtime, creative arts, outdoor play',
        milestone: 'baby milestone, growth record, first steps',
        tip: 'parenting tip, nursery organization, baby hack',
        // info (경제/의학/법률)
        main: 'hero image, main visual, representative image',
        data: 'data chart, graph, statistics, infographic',
        example: 'real world example, case study, practical illustration',
        reference: 'reference material, screenshot, source document',
        // daily (일상)
        scene1: 'daily life scene, morning routine, casual moment',
        scene2: 'afternoon scene, evening activity, daily life',
        selfie: 'selfie, portrait, personal photo',
        // common
        extra: 'supplementary visual, additional context image'
    },

    buildImagePrompt(mainKeyword, slotId) {
        const slotContext = this._slotContextMap[slotId] || '';
        return slotContext ? `${mainKeyword}, ${slotContext}` : mainKeyword;
    },

    async enhanceImagePrompt(userInput, style = 'illustration') {

        const styleDesc = this._imageStyleMap[style] || this._imageStyleMap.illustration;
        const prompt = `# Role
Visual Prompt Architect — translates scene descriptions into precise image generation prompts.

# Task
Convert the Korean input below into a single, detailed English image prompt.

Step 1: Extract every element — subject (age, gender, appearance), action/pose, facial expression, location/setting, objects, and situational context.
Step 2: Compose the prompt: subject + action → environment → lighting/mood/color → camera angle/composition.
Step 3: Apply the target style naturally without overriding the scene.

# Input
"${userInput}"

# Style
${styleDesc}

# Constraints
- Every element from the input MUST appear in the output. Omitting any detail is failure.
- No text, letters, watermarks, or UI in the image.
- Output ONLY the final prompt. No labels, quotes, or explanation.`;

        try {
            const result = await this.generateContent(
                [{ text: prompt }],
                { thinkingBudget: 0, rawText: true },
                '이미지 프롬프트 최적화'
            );
            const enhanced = result?.text?.trim() || '';
            return enhanced || userInput;
        } catch {
            return userInput;
        }
    },

    async generateImage(userPrompt, options = {}) {
        const { aspectRatio = '3:4', enhanced = false, style = 'illustration' } = options;
        let fullPrompt;
        if (enhanced) {
            fullPrompt = `Generate this image: ${userPrompt}. No watermark, no text, no words in the image.`;
        } else {
            const styleDesc = this._imageStyleMap[style] || this._imageStyleMap.illustration;
            fullPrompt = `Generate an image: ${styleDesc}. Subject: ${userPrompt}. No watermark, no text overlay, no words in the image.`;
        }

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const userApiKey = this.getUserApiKey();
                const result = await callGeminiImageProxy({
                    body: {
                        contents: [{ parts: [{ text: fullPrompt }] }],
                        generationConfig: {
                            responseModalities: ['TEXT', 'IMAGE'],
                            imageConfig: { aspectRatio }
                        }
                    },
                    userApiKey,
                });

                const data = result.data;
                const parts = data.candidates?.[0]?.content?.parts || [];
                const imagePart = parts.find(p => p.inlineData);

                if (!imagePart) {
                    throw new Error('이미지를 생성하지 못했습니다. 프롬프트를 수정해보세요.');
                }

                console.log(`[이미지 생성] 완료 — 스타일: ${style}`);
                return {
                    base64: imagePart.inlineData.data,
                    mimeType: imagePart.inlineData.mimeType || 'image/png'
                };
            } catch (error) {
                // BYOK 필요 (403) — 재시도 안 함
                if (error.status === 403 && error.code === 'BYOK_REQUIRED') {
                    throw error;
                }
                if (error.code === 'functions/resource-exhausted') {
                    throw new Error(error.message);
                }
                if (error.message?.includes('429')) {
                    attempt++;
                    if (attempt >= maxRetries) throw new Error('이미지 생성 이용량 초과. 잠시 후 다시 시도해주세요.');
                    await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
                    continue;
                }
                console.error('[이미지 생성] 오류:', error);
                throw error;
            }
        }
    },

    /**
     * AI 휴먼라이징 제안 — 본문에서 AI 느낌 나는 부분을 찾아 수정안 제시
     * @param {string} content - 본문 텍스트
     * @param {string} mainKeyword - 메인 키워드 (맥락 제공용)
     * @returns {Promise<{suggestions: Array<{original: string, revised: string, reason: string}>, overallTip: string}>}
     */
    /**
     * 썸네일용 메인/서브 텍스트 추출
     * @param {string} title - 블로그 제목
     * @param {string} mainKeyword - 메인 키워드
     * @returns {Promise<{mainText: string, subText: string}>}
     */
    async generateThumbnailText(title, mainKeyword = '') {
        const prompt = `너는 블로그 썸네일 카피라이터야.
아래 제목에서 썸네일에 들어갈 메인 텍스트와 서브 텍스트를 추출해.

[제목] ${title}
[메인 키워드] ${mainKeyword || '없음'}

[규칙]
1. 메인 텍스트: 10자 이내, 임팩트 있는 핵심 문구. 키워드 포함 권장.
2. 서브 텍스트: 15자 이내, 메인을 보충하는 짧은 설명.
3. 제목을 그대로 복사하지 말고 썸네일에 어울리게 압축·변환.
4. 콜론(:), 특수문자, 이모지 사용 금지. 순수 한글·숫자만 사용.

Output strictly a valid JSON: {"mainText":"메인","subText":"서브"}`;

        const result = await this.generateContent([{ text: prompt }], {
            thinkingBudget: 0,
            generationConfig: { responseMimeType: 'application/json' }
        }, '썸네일 텍스트');

        // 10자/15자 초과 시 트렁케이션
        if (result?.mainText && result.mainText.length > 10) {
            result.mainText = result.mainText.slice(0, 10);
        }
        if (result?.subText && result.subText.length > 15) {
            result.subText = result.subText.slice(0, 15);
        }
        return result || { mainText: '', subText: '' };
    },

    async analyzeHumanness(content, mainKeyword = '', tone = 'friendly', weakMetrics = []) {
        const weakSection = weakMetrics.length > 0
            ? `\n[현재 감점 항목 — 이 항목들을 우선 개선해줘]\n${weakMetrics.map(m => `- ${m.label}: ${m.score}/${m.maxScore}점`).join('\n')}\n`
            : '';

        const prompt = `너는 네이버 블로그 AI 감지 회피 전문가야.
아래 블로그 본문에서 "AI가 쓴 것 같은" 부분을 찾아 사람처럼 고쳐줘.
${mainKeyword ? `주제: "${mainKeyword}"` : ''}
톤앤무드: ${tone} (이 톤에 맞게 수정해줘)
${weakSection}
[분석 기준 — 감점 항목을 최우선으로]
1. AI 단골 표현 ("다양한", "효과적인", "살펴보겠습니다" 등) → 자연스러운 구어체로
2. 너무 균일한 문장 구조 → 길이·톤에 변화 주기
3. 1인칭/경험체 부족 → "제가 직접~", "솔직히~" 추가 제안
4. 과도한 나열 표현 → 대화체로 변환
5. 감정·반응 부재 → 감탄, 질문, 솔직한 감상 추가
6. 이모지/비격식 요소 부족 → ~, !!, 이모지(🍽️ 등), ㅋㅋ 등 자연스럽게 추가 제안

[절대 금지 규칙]
- 소제목(h2, h3) 태그는 절대 변경하지 마. original/revised에 소제목을 포함하지 마.
- 수정 문장은 반드시 80자 이내로 유지해. 원문보다 길어지면 안 됨.
- 여러 문단을 합치거나 구조를 변경하지 마. 문장 단위로만 수정해.

[본문]
${content.substring(0, 4000)}

Output strictly a valid JSON:
{
  "suggestions": [
    {"original": "원문 문장", "revised": "수정한 문장", "reason": "3~5단어 이유"}
  ],
  "overallTip": "전체적인 개선 조언 1문장"
}
suggestions는 최대 5개, 감점 항목 개선이 최우선, 이미 만점인 항목은 건드리지 마.`;

        return this.generateContent(
            [{ text: prompt }],
            { thinkingBudget: 2048 },
            'AI 휴먼라이징'
        );
    },

    /**
     * 다음 글 주제 추천 — 블로그 통계(엑셀) + 작성 기록 기반
     * @param {Object|null} blogStats - 엑셀 파싱 결과 { period, unit, data: [{rank, title, views, publishDate}] }
     * @param {Array} posts - localStorage의 기존 글 목록
     * @returns {Promise<{recommendations: Array}>}
     */
    async recommendNextTopics(blogStats = null, posts = []) {
        const existingTitles = posts.map(p => p.title).filter(Boolean);
        const existingKeywords = posts
            .map(p => [p.keywords?.main, ...(p.keywords?.sub || [])])
            .flat()
            .filter(Boolean);
        const uniqueKeywords = [...new Set(existingKeywords)];

        let statsSection = '';
        if (blogStats && blogStats.data?.length > 0) {
            const top20 = blogStats.data
                .sort((a, b) => b.views - a.views)
                .slice(0, 20);
            const statsList = top20
                .map((d, i) => `${i + 1}. "${d.title}" — 조회수 ${d.views.toLocaleString()}`)
                .join('\n');
            statsSection = `
[블로그 통계 데이터 (${blogStats.unit}, ${blogStats.period || '기간 불명'})]
조회수 상위 글:
${statsList}
`;
        }

        let historySection = '';
        if (existingTitles.length > 0) {
            historySection = `
[이미 작성한 글 목록 (${existingTitles.length}편)]
${existingTitles.slice(0, 30).map(t => `- ${t}`).join('\n')}

[사용한 키워드]
${uniqueKeywords.slice(0, 30).join(', ')}
`;
        }

        const hasStats = !!statsSection;

        const prompt = `너는 네이버 블로그 성장 전략 컨설턴트야.
${hasStats ? '블로그 통계 데이터와 작성 기록을 분석하여' : '블로그 작성 기록을 분석하여'} 다음에 쓰면 좋을 주제를 추천해줘.
${statsSection}${historySection}

[분석 기준]
${hasStats ? '1. 조회수 높은 글의 패턴 (카테고리, 키워드, 시기)' : '1. 작성한 글의 카테고리/키워드 패턴'}
2. 이미 쓴 주제와 중복되지 않는 새로운 주제
3. 현재 시즌/트렌드에 맞는 주제 (검색으로 확인)
4. 네이버 블로그 SEO에 유리한 주제
${hasStats ? '5. 조회수가 낮았던 글의 교훈 (피해야 할 유형)' : ''}

[추천 조건]
- 구체적이고 실행 가능한 주제 (너무 광범위하지 않게)
- 각 추천마다 추천 이유를 명확히 설명
- 예상 핵심 키워드 3~5개 포함
- 난이도 표시 (쉬움/보통/어려움)
- 카테고리는 한국어 (예: 맛집, 여행, 리뷰, 일상, 정보, 뷰티, 육아 등)

Output strictly a valid JSON:
{
  "recommendations": [
    {
      "topic": "추천 주제 제목",
      "category": "카테고리",
      "keywords": ["키워드1", "키워드2", "키워드3"],
      "reason": "왜 이 주제를 추천하는지 2~3문장",
      "difficulty": "쉬움|보통|어려움"
    }
  ],
  "insight": "전반적인 블로그 운영 인사이트 1~2문장"
}
recommendations는 ${hasStats ? '5' : '3'}개.`;

        return this.generateContent(
            [{ text: prompt }],
            {
                tools: [{ google_search: {} }],
                thinkingBudget: 2048,
            },
            '다음 글 추천'
        );
    },

    /**
     * 워너비 블로그 스타일 분석
     * URL(google_search) 또는 스크린샷(이미지 분석) 또는 둘 다로 스타일 프로필 생성
     * @param {string|null} url - 블로그 URL (전체공개)
     * @param {Array|null} screenshots - 스크린샷 base64 배열 [{base64, mimeType}]
     * @returns {Promise<Object>} 스타일 프로필 (checklist 구조)
     */
    async analyzeWannabeStyle(url, screenshots = []) {
        if (!url && (!screenshots || screenshots.length === 0)) {
            throw new Error('스크린샷을 하나 이상 입력해주세요.');
        }

        // 슬롯 위치 라벨 목록 생성
        const positionList = screenshots.map(s => s.position || '미지정').join(', ');

        const prompt = `너는 네이버 블로그 글쓰기 스타일 분석 전문가야.

첨부된 스크린샷 ${screenshots.length}장(${positionList})의 블로그 글 스타일을 분석해줘.
각 스크린샷에는 블로그 글의 위치(상단/중단/하단/추가)가 표시되어 있다. 위치별 특성을 종합하여 분석하라.

[분석 기준 — 아래 항목을 모두 분석하라]

1. 톤 (tone) — 7개 축
- speech (말투): "반말" / "존댓말(~합니다)" / "존댓말(~해요)" / "혼합"
- energy (에너지): "차분한" / "보통" / "활기찬"
- selfReveal (자기 노출): "관찰자 시점" / "보통" / "경험자 시점 (직접 체험 중심)"
- humor (유머): "진지한" / "보통" / "위트 있는 (비유/드립)"
- detail (디테일): "핵심만" / "보통" / "묘사 풍부 (오감 표현)"
- readerRelation (독자 관계): "일방 전달" / "보통" / "대화형 (질문/공감 유도)"
- confidence (확신도/리액션): "조심스러운" / "보통" / "단정적 + 과장 리액션"

2. 구조 (structure)
- introStyle (도입부 방식): "질문형" / "에피소드형" / "정보 요약형" / "공감 유도형"
- headingStyle (소제목 스타일): "이모지+텍스트" / "번호형" / "질문형" / "텍스트만"
- paragraphLength (문단 길이): "짧은 호흡 (1~2줄)" / "보통 (3~4줄)" / "긴 블록 (5줄+)"
- imagePlace (이미지 배치): "문단 사이마다" / "섹션 끝에 모아서" / "혼합"

3. 어휘 (vocabulary)
- emojiUse (이모지 사용): "없음" / "적음 (섹션당 0~1개)" / "보통 (문단당 1~2개)" / "많음 (문장마다)"
- colloquial (구어체 수준): "격식체" / "보통" / "구어체 (진짜, 대박, ㅋㅋ 등)"
- jargon (전문용어): "쉬운 말 위주" / "적절히 혼합" / "전문 표현 다수"

4. SEO
- keywordPlacement (키워드 배치): "자연스럽게 분산" / "제목+도입부 집중" / "소제목마다 반복"
- ctaStyle (CTA 스타일): "없음" / "부드러운 권유" / "직접 유도"

[추가 지시]
- summary: 이 블로거 스타일의 핵심 특징을 한 줄로 요약 (20자 내외)
- sampleSentences: 이 블로거의 스타일을 대표하는 문장 3개를 원문에서 발췌

Output strictly a valid JSON:
{
  "summary": "한 줄 요약",
  "sampleSentences": ["문장1", "문장2", "문장3"],
  "tone": {
    "speech": "값",
    "energy": "값",
    "selfReveal": "값",
    "humor": "값",
    "detail": "값",
    "readerRelation": "값",
    "confidence": "값"
  },
  "structure": {
    "introStyle": "값",
    "headingStyle": "값",
    "paragraphLength": "값",
    "imagePlace": "값"
  },
  "vocabulary": {
    "emojiUse": "값",
    "colloquial": "값",
    "jargon": "값"
  },
  "seo": {
    "keywordPlacement": "값",
    "ctaStyle": "값"
  }
}`;

        const parts = [{ text: prompt }];

        // 슬롯별 이미지 + 위치 라벨 추가
        if (screenshots?.length) {
            screenshots.forEach(shot => {
                parts.push({ text: `[이 스크린샷은 블로그 글의 "${shot.position || '미지정'}" 부분입니다]` });
                parts.push({
                    inline_data: {
                        mime_type: shot.mimeType || 'image/jpeg',
                        data: shot.base64,
                    }
                });
            });
        }

        const options = { thinkingBudget: 2048 };

        const result = await this.generateContent(parts, options, '워너비 스타일 분석');

        // 결과를 체크리스트 형태로 변환
        return this._toStyleChecklist(result);
    },

    /** 분석 결과를 체크리스트 구조로 변환 */
    _toStyleChecklist(raw) {
        const labels = {
            tone: {
                speech: '말투', energy: '에너지', selfReveal: '자기 노출',
                humor: '유머', detail: '디테일', readerRelation: '독자 관계',
                confidence: '확신도/리액션',
            },
            structure: {
                introStyle: '도입부 방식', headingStyle: '소제목 스타일',
                paragraphLength: '문단 길이', imagePlace: '이미지 배치',
            },
            vocabulary: {
                emojiUse: '이모지 사용', colloquial: '구어체 수준',
                jargon: '전문용어 수준',
            },
            seo: {
                keywordPlacement: '키워드 배치', ctaStyle: 'CTA 스타일',
            },
        };

        const checklist = {};
        for (const [group, fields] of Object.entries(labels)) {
            checklist[group] = Object.entries(fields).map(([key, label]) => ({
                key,
                label,
                value: raw?.[group]?.[key] || '분석 불가',
                checked: true, // 기본 전체 선택
            }));
        }

        return {
            summary: raw?.summary || '',
            sampleSentences: raw?.sampleSentences || [],
            checklist,
        };
    },

    /**
     * SEO 체크리스트 이슈 AI 자동 수정
     * @param {string} htmlContent - 현재 본문 HTML
     * @param {string} title - 현재 제목
     * @param {string} mainKeyword - 메인 키워드
     * @param {string[]} subKeywords - 서브 키워드 배열
     * @param {Array} issues - 수정할 이슈 목록 [{ id, text, metric }]
     * @param {string} tone - 글 톤
     * @returns {Promise<{ title: string, content: string, fixes: string[] }>}
     */
    /**
     * 본문 전체 AI 재작성
     * @param {string} htmlContent - 현재 본문 HTML
     * @param {string} mainKeyword - 메인 키워드
     * @param {string} tone - 글 톤
     * @param {string} styleRules - 워너비/내 스타일 규칙 문자열
     * @returns {Promise<{ html: string }>}
     */
    async rewriteFullContent(htmlContent, mainKeyword, tone = 'friendly', styleRules = '') {
        const toneInstruction = this._toneMap[tone] || this._toneMap['friendly'];

        const prompt = `너는 네이버 블로그 전문 작가야. 아래 블로그 글 전체를 같은 주제·구조를 유지하면서 처음부터 다시 작성해줘.

[메인 키워드] ${mainKeyword || '없음'}
[톤] ${toneInstruction}
${styleRules}

[현재 본문 HTML]
${htmlContent}

[재작성 규칙]
1. 소제목(h2, h3) 구조와 이미지(<img>) 태그는 그대로 유지. 텍스트만 재작성.
2. 각 섹션의 주제와 순서를 유지하되, 문장은 완전히 새로 작성.
3. 한 문장은 80자 이내. 80자를 넘길 것 같으면 두 문장으로 나눠.
4. "다양한", "풍부한", "완벽한", "특별한" 등 AI 냄새나는 수식어 금지.
5. "살펴보겠습니다", "알아보겠습니다" 금지.
6. 구체적 수치·감각 표현·개인 경험 톤으로 작성.
7. 결과는 HTML로 출력. <h2>, <h3>, <p>, <img>, <strong>, <em> 태그 사용.

Output strictly valid HTML only. No JSON wrapping, no explanation.`;

        const result = await this.generateContent(
            [{ text: prompt }],
            { rawText: true, thinkingBudget: 4096 },
            '전체 재작성'
        );

        const html = result?.text || '';
        return { html };
    },

    async fixSeoIssues(htmlContent, title, mainKeyword, subKeywords, issues, tone = 'friendly') {
        const issueDescriptions = issues.map(i => `- ${i.id}: ${i.text} ${i.metric || ''}`).join('\n');

        const prompt = `너는 네이버 블로그 SEO 전문가야. 아래 블로그 글의 SEO 문제를 수정해줘.

[메인 키워드] ${mainKeyword}
[서브 키워드] ${subKeywords.join(', ') || '없음'}
[톤] ${this._toneMap[tone] || this._toneMap['friendly']}
[현재 제목] ${title}

[수정할 SEO 이슈]
${issueDescriptions}

[현재 본문 HTML]
${htmlContent}

[수정 규칙]
1. 위 이슈들만 정확히 수정해. 이슈와 무관한 내용은 절대 변경하지 마.
2. 원문의 톤, 스타일, 의미를 최대한 유지해.
3. title_start: 제목을 메인 키워드로 시작하도록 자연스럽게 재배치.
4. title_long/title_short: 제목을 10~30자로 조정.
5. key_density/keyword_density_low: 본문에 메인 키워드를 자연스럽게 추가 삽입.
6. keyword_density_high/key_density(과다): 과도한 키워드 반복을 유의어로 대체.
7. key_first: 첫 문단에 메인 키워드를 자연스럽게 포함.
8. sub_missing: 서브 키워드를 본문에 자연스럽게 녹여넣기.
9. structure_missing: 적절한 위치에 <h2> 소제목 추가.
10. heading_keyword: 소제목 중 하나 이상에 메인 키워드 포함.
11. intro_short: 첫 문단을 140~160자로 확장.
12. intro_long: 첫 문단을 140~160자로 축약.
13. 한 문장은 80자 이내. "다양한", "풍부한" 등 AI 냄새나는 수식어 금지.
14. 이미지(<img>) 태그는 절대 변경하지 마.

Output strictly a valid JSON:
{
  "title": "수정된 제목 (변경 없으면 원본 그대로)",
  "content": "수정된 본문 HTML (변경 없으면 원본 그대로)",
  "fixes": ["수정 내용 1줄 요약", "수정 내용 1줄 요약"]
}`;

        const result = await this.generateContent(
            [{ text: prompt }],
            { thinkingBudget: 1024 },
            'SEO 이슈 수정'
        );

        return {
            title: result?.title || title,
            content: result?.content || htmlContent,
            fixes: result?.fixes || [],
        };
    }
};

// 브라우저 콘솔에서 직접 조회 가능: tokenStats(), tokenReset()
if (typeof window !== 'undefined') {
    window.tokenStats = () => {
        const s = AIService.getTokenStats();
        console.table(s.history);
        console.log(`\n=== 누적 합계 (${s.callCount}회) ===`);
        console.log(`  입력: ${s.totalPrompt.toLocaleString()} 토큰`);
        console.log(`  출력: ${s.totalCandidates.toLocaleString()} 토큰`);
        console.log(`  총합: ${s.totalTokens.toLocaleString()} 토큰`);
        return s;
    };
    window.tokenReset = () => AIService.resetTokenStats();
}
