import { callGeminiProxy, callGeminiImageProxy } from './firebase';

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
        try { return JSON.parse(text); } catch (e) { /* 계속 */ }

        // 전략 2: {...} 또는 [...] 패턴 추출
        const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (e) { /* 계속 */ }
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
                // Firebase Functions의 resource-exhausted 에러 (무료 체험 소진)
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
                throw error;
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

    async analyzeKeywords(topic, excludeKeywords = '') {
        const excludeInstruction = excludeKeywords
            ? `\n다음 키워드는 반드시 제외: ${excludeKeywords}`
            : '';

        // 시즌/트렌드 반영을 위한 날짜·계절 변수
        const now = new Date();
        const month = now.getMonth() + 1;
        const seasonMap = {12:'겨울',1:'겨울',2:'겨울',3:'봄',4:'봄',5:'봄',6:'여름',7:'여름',8:'여름',9:'가을',10:'가을',11:'가을'};
        const season = seasonMap[month];
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextSeason = seasonMap[nextMonth];

        const prompt = `너는 네이버 블로그 SEO 키워드 전문가야.
"${topic}"에 대해 네이버 검색 유입을 극대화할 키워드를 추천해줘.
구글 검색으로 "${topic}" 관련 블로그, 카페, 리뷰를 조사해.
${excludeInstruction}

[키워드 추천 규칙]
1. 브랜드명 단독 키워드 금지 (예: "김선문 메뉴" ❌)
2. "지역+카테고리+수식어" 조합 우선 (예: "제주 애월 파인다이닝" ✅)
3. 일반 사용자가 실제로 검색할 법한 키워드
4. 롱테일 키워드 포함 (3~5어절)
5. 메인 키워드는 검색량이 가장 많을 핵심 키워드

[시즌/트렌드 반영]
현재: ${now.getFullYear()}년 ${month}월 (${season}). 다음 달: ${nextMonth}월 (${nextSeason}).
6. 현재 시즌(${season})과 다가올 시즌(${nextSeason})에 검색량이 오를 키워드를 2~3개 포함
7. 명절·방학·연휴 등 시기적 이벤트 관련 롱테일 키워드 우선 고려

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
- 각 키워드에 추천 이유(reason)와 검색 피크 시기(timing) 포함

Output strictly a valid JSON:
{"seasonKeywords":[{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"}]}`;

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

---
${rawText.slice(0, 3000)}
---

Output strictly a valid JSON:
{"seasonKeywords":[{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"},{"keyword":"시즌 키워드","reason":"추천 이유","timing":"검색 피크 시기"}]}`;
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
    async analyzeCompetitors(keyword) {
        // 캐시에 같은 키워드 데이터가 있고, 블로그 3개 이상이면 즉시 반환
        if (this._competitorCache.keyword === keyword && this._competitorCache.data) {
            const cachedBlogs = this._competitorCache.data.blogs || [];
            if (cachedBlogs.length >= 3) {
                console.log('[경쟁 분석] 캐시 사용:', keyword, `(${cachedBlogs.length}개)`);
                return this._competitorCache.data;
            }
            console.log(`[경쟁 분석] 캐시 데이터 부족 (${cachedBlogs.length}개), 재분석`);
        }

        const prompt = `너는 네이버 블로그 SEO 분석 전문가야.
구글 검색으로 "${keyword}" 관련 상위 네이버 블로그 글 5개를 찾아 분석해줘.

[분석 항목]
각 글의 제목(title), 추정 글자수(charCount), 이미지수(imageCount), 소제목수(headingCount).
글자수는 100단위 반올림. average는 5개 블로그의 평균값.

[중요]
- 반드시 5개 블로그를 찾아서 blogs 배열에 5개 항목을 넣어야 함
- 실제 검색 결과를 바탕으로 현실적인 수치를 넣을 것
- 예시의 숫자를 그대로 복사하지 말 것
- 반드시 JSON만 출력할 것. 설명이나 부가 텍스트 금지.

Output strictly a valid JSON:
{"blogs":[{"title":"블로그1 제목","charCount":2100,"imageCount":12,"headingCount":7},{"title":"블로그2 제목","charCount":1800,"imageCount":9,"headingCount":5},{"title":"블로그3 제목","charCount":2400,"imageCount":15,"headingCount":8},{"title":"블로그4 제목","charCount":1600,"imageCount":7,"headingCount":4},{"title":"블로그5 제목","charCount":2000,"imageCount":10,"headingCount":6}],"average":{"charCount":1980,"imageCount":11,"headingCount":6}}`;

        // thinkingBudget 제거: google_search + 복잡 JSON 조합에서 thinking 활성화 필요
        const result = await this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }]
        }, '경쟁 블로그 분석');

        // 정상 응답: blogs 배열이 있는 경우
        if (result?.blogs && Array.isArray(result.blogs)) {
            this._competitorCache = { keyword, data: result };
            return result;
        }

        // fallback 응답({ html, text })에서 JSON 재추출 시도
        const rawText = result?.text || result?.html || '';
        if (rawText) {
            const jsonMatch = rawText.match(/\{[\s\S]*"blogs"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.blogs && Array.isArray(parsed.blogs)) {
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

        const prompt = `
            너는 블로그 사진 분석 전문가야.
            
            주제: "${mainKeyword}"
            
            첨부된 ${photoAssets.length}장의 사진을 분석해줘.
            
            [분석 항목]
            - 각 사진에서 보이는 주요 요소
            - 색상, 분위기, 특징적인 부분
            - 블로그 글에서 어떻게 활용하면 좋을지
            
            간결하고 실용적으로 한국어로 분석 결과를 작성해줘.
            각 사진별로 2-3문장으로 요약해.
        `;

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

    // 공통 톤 지시문
    _toneMap: {
        'friendly': '친근한 이웃 톤. "~해요", "~했답니다" 체. 이모지 활용.',
        'professional': '전문 정보형 톤. "~입니다" 합쇼체. 분석적, 신뢰감.',
        'honest': '내돈내산 솔직 리뷰 톤. 단호한 문체, 장단점 명확.',
        'emotional': '감성 에세이 톤. "~다" 평어체. 감성적, 서정적.',
        'guide': '단계별 가이드 톤. "~하세요" 권유형. 명확한 단계와 팁.'
    },

    // 공통 HTML 규칙 (본문 생성 프롬프트에서 공유)
    _htmlRules(keyword) {
        return `[HTML규칙] <p>당 2~3문장만. <b>로 강조. <h2>/<h3> 계층 구조. 이미지([[IMAGE:...]])는 별도 <p>. h1 금지. "${keyword}" 본문 3~5회 반복, 첫 <p>에 필수 포함.
[문장 규칙 — 필수!!!] 한 문장은 반드시 80자(한글 기준) 이내로 작성. 80자를 넘길 것 같으면 두 문장으로 나눠. 짧고 읽기 쉬운 문장이 핵심. 쉼표로 문장을 늘리지 말고 마침표로 끊어.
[반복 금지] 동일한 표현·문구·문장 구조를 반복하지 마. 각 문단마다 다른 표현과 시작어를 사용. 같은 내용을 다른 말로 바꿔 쓰는 것도 반복임.`;
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
    _photoPrompt(photoAnalysis, photoAssets, category) {
        const slots = this._getSlotsForCategory(category);
        const slotTags = slots.map(s => `[[IMAGE:${s}]]`).join(', ');
        if (photoAnalysis) {
            return `\n[사진 분석 결과]\n${photoAnalysis}\n사진 위치: ${slotTags}`;
        }
        if (photoAssets.length > 0) {
            return `\n[사진] 첨부 ${photoAssets.length}장의 시각적 특징을 본문에 녹여줘. 위치: ${slotTags}`;
        }
        return '';
    },

    // 서브 키워드 필수 포함 프롬프트 헬퍼
    _subKeywordPrompt(subKeywords) {
        if (!subKeywords || subKeywords.length === 0) return '';
        const list = subKeywords.map((kw, i) => `  ${i + 1}. "${kw}" — 최소 1회 이상`).join('\n');
        return `\n[서브 키워드 — 반드시 전부 포함!!!]
아래 서브 키워드를 본문에 빠짐없이 자연스럽게 녹여야 합니다. 하나라도 누락하면 안 됩니다.
${list}
→ 각 서브 키워드를 소제목(h2/h3) 또는 본문 <p> 안에 최소 1회씩 포함할 것. <b> 태그로 강조하면 SEO에 유리합니다.`;
    },

    // 경쟁 블로그 분석 결과 프롬프트 생성 헬퍼
    _competitorPrompt(competitorData) {
        if (!competitorData || !competitorData.average) return '';

        const { average, blogs = [] } = competitorData;
        const blogSummary = blogs.map((b, i) =>
            `  ${i + 1}. "${b.title}" — ${b.charCount}자, 이미지 ${b.imageCount}장, 소제목 ${b.headingCount}개`
        ).join('\n');

        return `\n[경쟁 블로그 분석 결과]
상위 블로그 평균: 글자수 ${average.charCount}자 | 이미지 ${average.imageCount}장 | 소제목 ${average.headingCount}개
${blogSummary}
→ 평균 이상의 글자수와 소제목 수를 확보하여 상위 노출에 최적화된 글을 작성할 것.`;
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
            : 'H2 3~5개, 각 H2 아래 H3 1~3개 배치.';

        const prompt = `너는 네이버 블로그 SEO 전문가야.

키워드: ${mainKeyword}
서브 키워드: ${subKeywords.join(', ') || '없음'}
카테고리: ${category}
톤: ${this._toneMap[tone] || this._toneMap['friendly']}

[작업]
"${mainKeyword}" 주제로 블로그 글의 소제목 아웃라인(H2/H3 구조)을 생성해줘.

[규칙]
1. ${headingTarget}
2. H2는 글의 큰 섹션, H3는 H2 아래 세부 항목
3. 메인 키워드를 H2에 1~2회 자연스럽게 포함
4. 서브 키워드도 소제목에 적절히 반영
5. 독자가 훑어보기 좋은 논리적 흐름 유지
6. 각 소제목은 10~25자 이내

Output strictly a valid JSON:
{"outline":[{"level":"h2","title":"소제목"},{"level":"h3","title":"소제목"}]}`;

        return this.generateContent([{ text: prompt }], {
            thinkingBudget: 0
        }, '아웃라인 생성');
    },

    // 아웃라인을 본문 생성 프롬프트에 삽입하는 헬퍼
    _outlinePrompt(outline) {
        if (!outline || !Array.isArray(outline) || outline.length === 0) return '';
        const tree = outline.map(item =>
            `${item.level === 'h3' ? '  - ' : '- '}[${item.level.toUpperCase()}] ${item.title}`
        ).join('\n');
        return `\n[아웃라인 — 반드시 이 소제목 구조를 따를 것!!!]
${tree}
→ 위 아웃라인의 소제목을 그대로 HTML h2/h3 태그로 사용하고, 각 섹션에 맞는 내용을 채울 것.`;
    },

    async generateFullDraft(category, mainKeyword, tone, imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null) {
        if (category === 'cafe' || category === 'food' || category === '맛집' || category === '카페&맛집') {
            return this.generateRestaurantDraft(mainKeyword, tone, imageMetadata, photoAssets, subKeywords, targetLength, photoAnalysis, competitorData, outline);
        }
        if (category === 'shopping' || category === '쇼핑') {
            return this.generateShoppingDraft(mainKeyword, tone, imageMetadata, photoAssets, subKeywords, targetLength, photoAnalysis, competitorData, outline);
        }

        // 카테고리별 슬롯 확인
        const categorySlots = this._getSlotsForCategory(category);
        const uploadedSlots = categorySlots
            .filter(s => (imageMetadata[s] || 0) > 0);
        const imageInstructions = uploadedSlots.length > 0
            ? uploadedSlots.map(s => `[[IMAGE:${s}]]`).join(', ')
            : '이미지 없음';
        const exampleSlot = categorySlots[0] || 'extra';

        const prompt = `너는 네이버 블로그 SEO 전문가야.
${this._htmlRules(mainKeyword)}
주제: ${category} | 키워드: ${mainKeyword} | 글자수: ${targetLength}
톤: ${this._toneMap[tone] || this._toneMap['friendly']}
${this._subKeywordPrompt(subKeywords)}
${this._photoPrompt(photoAnalysis, photoAssets, category)}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:${exampleSlot}]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[작업] 구글 검색으로 '${mainKeyword}' 실제 정보를 찾아 HTML 블로그 글 작성. 위 서브 키워드를 빠짐없이 본문에 포함할 것. [[VIDEO]] 1개 배치.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType || 'image/jpeg', data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }]
        }, '본문 생성 (일반)');
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

    async generateRestaurantDraft(keyword, tone = 'friendly', imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null) {
        const { entrance = 0, parking = 0, menu = 0, interior = 0, food = 0, extra = 0 } = imageMetadata;
        const photoDesc = photoAnalysis
            ? `\n[사진 분석 결과]\n${photoAnalysis}\n이 내용 바탕으로 실물 묘사.`
            : '첨부 이미지 보고 실물 기반 묘사 ("검정색 간판이~", "육즙 가득한~").';

        const slots = [['entrance',entrance],['parking',parking],['menu',menu],['interior',interior],['food',food],['extra',extra]]
            .map(([s,c]) => `${s}:${c > 0 ? 'O' : 'X'}`).join(' ');

        // 업로드된 슬롯만 필수 이미지로 지정
        const uploadedSlots = [['entrance',entrance],['parking',parking],['menu',menu],['interior',interior],['food',food],['extra',extra]]
            .filter(([_, count]) => count > 0)
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

        const infoCard = `<h3>📍 ${keyword}</h3><p><b>주소:</b> ${placeInfo.address}</p><p><b>영업시간:</b> ${placeInfo.hours}</p><p><b>인기메뉴:</b> ${placeInfo.menu}</p><p><b>주차:</b> ${placeInfo.parking}</p><p><b>예약:</b> ${placeInfo.reservation}</p><hr>`;

        const prompt = `너는 네이버 블로그 맛집 전문 블로거야.
${this._htmlRules(keyword)}
키워드: ${keyword} | 톤: ${this._toneMap[tone] || this._toneMap['friendly']} | 글자수: ${targetLength}
사진: ${slots}
${this._subKeywordPrompt(subKeywords)}
${photoDesc}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}
누락 사진은 <blockquote>💡 TIP: 사진 추가 권장!</blockquote>

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:food]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[정보카드 — 최상단 필수, 아래 HTML을 그대로 맨 위에 삽입]
${infoCard}

[흐름] 정보카드 다음에 첫인상→매장소개→메뉴후기→총평. 각 섹션에 h2/h3 사용. 위 서브 키워드를 빠짐없이 본문에 포함할 것. [[VIDEO]] 1개 배치.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType, data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }]
        }, '본문 생성 (맛집)');
    },

    /**
     * 제품 정보 검색 (쇼핑 본문 생성 전 별도 호출)
     */
    async searchProductInfo(keyword) {
        const prompt = `구글 검색으로 "${keyword}"의 실제 제품 정보를 찾아줘.
Output strictly a valid JSON:
{"brand":"브랜드명","productName":"제품명","price":"가격","specs":"주요 스펙","whereToBuy":"구매처","releaseDate":"출시일"}
못 찾은 항목은 "정보 확인 필요"로 채워.`;

        return this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '제품 정보 검색');
    },

    async generateShoppingDraft(keyword, tone = 'friendly', imageMetadata = {}, photoAssets = [], subKeywords = [], targetLength = '1200~1800자', photoAnalysis = null, competitorData = null, outline = null) {
        const { unboxing = 0, product = 0, detail = 0, usage = 0, compare = 0, extra = 0 } = imageMetadata;
        const photoDesc = photoAnalysis
            ? `\n[사진 분석 결과]\n${photoAnalysis}\n이 내용 바탕으로 실물 묘사.`
            : '첨부 이미지 보고 실물 기반 묘사 ("깔끔한 포장이~", "실제 색감은~").';

        const slots = [['unboxing',unboxing],['product',product],['detail',detail],['usage',usage],['compare',compare],['extra',extra]]
            .map(([s,c]) => `${s}:${c > 0 ? 'O' : 'X'}`).join(' ');

        const uploadedSlots = [['unboxing',unboxing],['product',product],['detail',detail],['usage',usage],['compare',compare],['extra',extra]]
            .filter(([_, count]) => count > 0)
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

        const prompt = `너는 네이버 블로그 쇼핑 리뷰 전문 블로거야.
${this._htmlRules(keyword)}
키워드: ${keyword} | 톤: ${this._toneMap[tone] || this._toneMap['friendly']} | 글자수: ${targetLength}
사진: ${slots}
${this._subKeywordPrompt(subKeywords)}
${photoDesc}
${this._competitorPrompt(competitorData)}
${this._outlinePrompt(outline)}

[이미지 배치 — 필수!!!]
다음 이미지 태그를 반드시 HTML 본문 안에 각각 별도 <p> 태그로 삽입해:
${imageInstructions}
예시: <p>[[IMAGE:product]]</p>
이미지 태그를 빠뜨리면 안 됨! 텍스트→이미지→텍스트 패턴으로 배치.

[제품 정보카드 — 최상단 필수, 아래 HTML을 그대로 맨 위에 삽입]
${infoCard}

[장단점 섹션 — 필수]
본문 후반부에 장점과 아쉬운 점을 <h3>✅ 장점</h3>과 <h3>❌ 아쉬운 점</h3> 소제목 아래 <ul><li> 리스트로 각각 3~5개씩 정리.

[흐름] 정보카드 → 구매계기&첫인상 → 제품소개&스펙 → 디테일리뷰 → 실사용후기 → 장단점 → 총평&추천대상. 각 섹션에 h2/h3 사용. 위 서브 키워드를 빠짐없이 본문에 포함할 것. [[VIDEO]] 1개 배치.
Output strictly a valid JSON: {"html": "..."}`;

        const parts = [{ text: prompt }];
        if (!photoAnalysis) {
            photoAssets.forEach(asset => {
                parts.push({ inline_data: { mime_type: asset.mimeType, data: asset.base64 } });
            });
        }

        return this.generateContent(parts, {
            tools: [{ google_search: {} }]
        }, '본문 생성 (쇼핑)');
    },

    /**
     * Flow 1: Direct Write Refinement (Expand manual draft using Search)
     */
    async refineManualDraft(currentHtml, keyword, tone) {
        const prompt = `
            사용자가 직접 작성한 블로그 초안(HTML)이 있습니다.
            이 내용을 유지하면서, **구글 검색**을 통해 얻은 실제 사실(영업시간, 위치, 특징 등)을 보완하여 훨씬 풍성하고 완벽한 블로그 글(1500자 이상)로 완성해주세요.
            
            주제 키워드: ${keyword}
            선택한 톤: ${tone}
            
            [미션]
            1. 사용자가 쓴 문장을 최대한 살리되, 문맥을 자연스럽게 다듬는다.
            2. 자연스러운 흐름으로 내용을 확장한다.
            3. 검색 결과를 바탕으로 메뉴 가격, 가는 길, 꿀팁 등 실질적인 정보 Paragraph를 추가한다.
            4. <h3>, <p>, <br> 태그를 사용하여 네이버 블로그 스타일로 깔끔하게 구성한다.
            
            [원본 내용]
            ${currentHtml}
            
            Output strictly a valid JSON string wrapped in a markdown code block.
            DO NOT output any conversational text.
            Example:
            \`\`\`json
            {
              "html": "..."
            }
            \`\`\`
        `;

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
    async rewriteSelection(selectedText, surroundingContext, keyword, mode) {
        const modePrompts = {
            expand: `다음 텍스트를 원본의 2~3배 분량으로 확장해줘. 구체적인 디테일, 예시, 부연 설명을 추가해.`,
            condense: `다음 텍스트를 원본의 40~60% 분량으로 압축해줘. 핵심 내용만 남기고 불필요한 수식어와 반복을 제거해.`,
            factboost: `다음 텍스트에 구글 검색으로 찾은 실제 팩트(수치, 통계, 구체적 정보)를 보강해줘. 원본 흐름은 유지하면서 신뢰도를 높여.`,
            polish: `다음 텍스트의 가독성과 흐름을 개선해줘. 의미는 변경하지 말고 표현만 자연스럽게 다듬어.`
        };

        const toneInstruction = this._toneMap
            ? `원본의 톤과 문체를 유지해.`
            : '';

        const prompt = `너는 블로그 글 부분 재작성 전문가야.

${modePrompts[mode] || modePrompts['polish']}

[키워드] ${keyword || '없음'}
[주변 문맥] ...${surroundingContext}...
[재작성 대상 텍스트]
${selectedText}

${toneInstruction}
결과는 재작성된 텍스트만 출력해. HTML 태그 없이 순수 텍스트로. 앞뒤 설명이나 따옴표 없이 바로 결과만.`;

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
    async generateImageAlts(mainKeyword, subKeywords = [], photoAnalysis = null, uploadedSlots = [], slotCounts = {}) {
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

        const prompt = `너는 네이버 블로그 이미지 SEO 전문가야.

메인 키워드: ${mainKeyword}
서브 키워드: ${subKeywords.join(', ') || '없음'}
${analysisSection}

[업로드된 이미지 슬롯과 장수]
${slotList}

[작업]
각 이미지 슬롯의 이미지 개수만큼 개별 ALT 텍스트를 생성해줘.
같은 슬롯이라도 각 이미지의 ALT는 서로 다른 내용으로 작성해야 함.

[규칙]
1. 각 ALT 텍스트에 메인 키워드를 반드시 포함
2. 5~7단어, 15~30자 이내로 간결하게 작성
3. 사진 분석 결과가 있으면 실제 내용을 반영
4. 자연스러운 한국어 문장 (예: "제주 김선문 식당 외관 전경")
5. 서브 키워드를 각 ALT에 분산 배치하여 SEO 최적화
6. 같은 슬롯의 이미지끼리 다른 관점/요소를 묘사

Output strictly a valid JSON object (각 슬롯은 ALT 텍스트 배열):
${JSON.stringify(exampleOutput)}`;

        const result = await this.generateContent([{ text: prompt }], {
            thinkingBudget: 0
        }, '이미지 ALT 생성');

        // 결과 검증 및 정규화: 문자열이면 [문자열]로 변환
        if (result && typeof result === 'object') {
            const normalized = {};
            for (const slot of uploadedSlots) {
                if (Array.isArray(result[slot])) {
                    normalized[slot] = result[slot];
                } else if (typeof result[slot] === 'string') {
                    normalized[slot] = [result[slot]];
                } else {
                    normalized[slot] = [`${mainKeyword} ${slotLabels[slot] || slot}`];
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
    async generateIntroAlternatives(currentIntro, mainKeyword, subKeywords = [], title = '', tone = 'friendly', bodyText = '') {
        const toneDesc = this._toneMap[tone] || this._toneMap['friendly'];

        // 본문이 있으면 본문 톤 우선, 없으면 설정 톤 사용
        const toneSection = bodyText
            ? `[본문 실제 문체 — 반드시 이 문체를 따를 것!!!]
아래 본문을 읽고 어미·문체·분위기를 정확히 파악해. 도입부도 동일한 어미를 사용해야 함.
본문이 "~다/~했다" 체면 도입부도 "~다/~했다"로 끝내야 하고,
본문이 "~해요/~했어요" 체면 도입부도 "~해요/~했어요"로 끝내야 함.
이모지를 안 쓰면 도입부에도 이모지 금지. 쓰면 도입부에도 사용.

${bodyText}`
            : `[톤앤무드]\n${toneDesc}`;

        const prompt = `너는 네이버 블로그 SEO 전문가야. 네이버 검색 결과에서 클릭률(CTR)을 극대화하는 도입부를 작성해.

[현재 게시글 정보]
- 제목: ${title || '없음'}
- 메인 키워드: ${mainKeyword}
- 서브 키워드: ${subKeywords.join(', ') || '없음'}
- 톤앤무드: ${toneDesc}

${toneSection}

[현재 도입부]
${currentIntro}

[작업]
위 톤앤무드와 본문 문체를 모두 반영하여 대안 도입부 3개를 작성해.

[규칙]
1. **[글자수 — 가장 중요!!!]** 각 도입부는 반드시 한글 기준 140자 이상 160자 이하.
   - 공백·이모지 포함 전체 글자수 기준.
   - 100자 이하는 절대 불가! 3~4문장으로 충분히 길게 작성할 것.
   - 참고: "의왕 카포커피클럽은 반려견과 함께 방문하기 좋은 애견동반 카페입니다." = 약 38자. 이런 문장 4개를 이어 써야 140자가 됨.
   - 작성 후 반드시 글자수를 세어 140자 미만이면 문장을 추가하고, 160자 초과면 줄일 것.
2. 첫 문장에 메인 키워드("${mainKeyword}") 반드시 포함
3. 네이버 검색 미리보기에 노출되는 첫 2문장에 핵심 정보 담기
4. 각 도입부는 서로 다른 전략 사용:
   - 첫 번째: 핵심 정보 선행형 (결론/정보를 먼저 제시)
   - 두 번째: 공감 유도형 (독자 상황에 공감하며 시작)
   - 세 번째: 궁금증 유발형 (질문이나 의외의 사실로 시작)
5. **[절대 규칙]** 본문의 어미를 100% 따라할 것. 본문이 "~다"로 끝나면 "~해요/~합니다/~거예요" 절대 금지. 본문이 "~해요"로 끝나면 "~다/~했다" 절대 금지.
6. **[중복 금지]** 위 본문에 이미 있는 표현·문장을 그대로 반복하지 말 것. 도입부는 본문과 다른 시각·표현으로 시작해야 함. 본문 첫 문단과 내용이 겹치면 안 됨.

Output strictly a valid JSON:
{"alternatives":[{"text":"도입부 텍스트","strategy":"전략 설명"},{"text":"도입부 텍스트","strategy":"전략 설명"},{"text":"도입부 텍스트","strategy":"전략 설명"}]}`;

        return this.generateContent([{ text: prompt }], {
            thinkingBudget: 2048
        }, '도입부 최적화');
    },

    async recommendTitles(mainKeyword, subKeywords = [], content = '') {
        const subKeywordStr = Array.isArray(subKeywords)
            ? subKeywords.filter(k => k && k.trim()).join(', ')
            : '';
        const contextHint = content
            ? `\nContent Summary: ${content.substring(0, 300)}`
            : '';
        const prompt = `
      너는 네이버 블로그 SEO 전문가야.

      메인 키워드: ${mainKeyword}
      ${subKeywordStr ? `서브 키워드: ${subKeywordStr}` : ''}${contextHint}

      [작업]
      1. 구글 검색으로 '${mainKeyword}'에 대한 실제 정보를 확인해.
      2. 검색 결과와 본문 내용을 바탕으로 클릭률 높은 SEO 제목 5개를 만들어.

      [규칙]
      - 제목은 반드시 '${mainKeyword}'으로 시작할 것
      - 실제 정보(메뉴, 위치, 특징 등)를 반영할 것
      - 25자 이내로 작성할 것

      Return strictly a JSON array of strings.
    `;
        return this.generateContent([{ text: prompt }], {
            tools: [{ google_search: {} }],
            thinkingBudget: 0
        }, '제목 추천');
    },

    async extractTags(content) {
        const prompt = `
      Extract 10 SEO hashtags for Naver Blog from this text.
      Content: ${content.substring(0, 1000)}...

      Return strictly a JSON array of strings.
    `;
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

    async recommendKeywords(subject) {
        const prompt = `
      Analyze SEO keywords for Naver Blog about '${subject}'.
      Target: Korean users.

      Task:
      1. Recommend 3 "Main Keywords".
      2. Recommend 10 "Sub Keywords".

      Return strictly a JSON object.
    `;
        return this.generateContent([{ text: prompt }], { thinkingBudget: 0 }, '키워드 추천');
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
