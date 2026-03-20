/**
 * 80자 초과 문장을 자연스러운 위치에서 2개로 분리
 * 쉼표/접속사/조사 등 자연스러운 끊김 지점에서 분리
 */
const splitLongSentence = (sentence) => {
    const textOnly = sentence.replace(/<[^>]*>/g, '');
    if (textOnly.length <= 80) return [sentence];

    // 자연스러운 분리 지점 패턴 (우선순위순)
    const splitPatterns = [
        /,\s*(?!\d)/,                    // 쉼표 (숫자 앞 제외 — 16,000 보호)
        /\s+(그리고|또한|하지만|그러나|따라서|그래서|반면|또|및)\s+/,  // 접속사
        /\s+(때문에|으로써|에서는|에서도|하면서|하는데)\s*/,          // 연결어미 뒤
    ];

    for (const pattern of splitPatterns) {
        const match = sentence.match(pattern);
        if (match && match.index) {
            const midpoint = sentence.length / 2;
            // 여러 매치 중 중간 지점에 가장 가까운 것 선택
            let bestIdx = match.index;
            let bestDist = Math.abs(match.index - midpoint);
            const regex = new RegExp(pattern.source, 'g');
            let m;
            while ((m = regex.exec(sentence)) !== null) {
                const dist = Math.abs(m.index - midpoint);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = m.index;
                }
            }
            const splitAt = bestIdx + sentence.slice(bestIdx).match(pattern)[0].length;
            const first = sentence.slice(0, splitAt).trim();
            const second = sentence.slice(splitAt).trim();
            // 분리 결과가 너무 짧으면(10자 미만) 분리하지 않음
            const firstText = first.replace(/<[^>]*>/g, '');
            const secondText = second.replace(/<[^>]*>/g, '');
            if (firstText.length >= 10 && secondText.length >= 10) {
                // 첫 문장이 마침표로 안 끝나면 추가
                const firstEnds = /[.!?…]$/.test(first.replace(/<[^>]*>/g, '').trim());
                return [firstEnds ? first : first.replace(/\s*$/, '.'), second];
            }
        }
    }

    // 패턴 매칭 실패 시 공백 기준 중간 지점에서 분리
    const words = sentence.split(/(\s+)/);
    let charCount = 0;
    let splitIdx = 0;
    const half = textOnly.length / 2;
    for (let i = 0; i < words.length; i++) {
        charCount += words[i].replace(/<[^>]*>/g, '').length;
        if (charCount >= half) {
            splitIdx = i;
            break;
        }
    }
    if (splitIdx > 0) {
        const first = words.slice(0, splitIdx + 1).join('').trim();
        const second = words.slice(splitIdx + 1).join('').trim();
        if (first && second) {
            const firstEnds = /[.!?…]$/.test(first.replace(/<[^>]*>/g, '').trim());
            return [firstEnds ? first : first + '.', second];
        }
    }

    return [sentence];
};

/**
 * AI 생성 HTML 후처리: 긴 <p> 태그를 문단 스타일에 맞게 분리 + 80자 초과 문장 분리
 * @param {string} html
 * @param {'oneline'|'normal'|'long'} paragraphStyle
 */
export const formatParagraphs = (html, paragraphStyle = 'normal') => {
    return html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner) => {
        if (inner.includes('<img')) return match;

        // 따옴표/괄호 안의 마침표·느낌표에서는 분리하지 않음
        const parts = inner.split(/(?<=[.!?…]['"\u2019\u201D)]*)\s+(?=\S)/).filter(s => s.trim());
        if (parts.length === 0) return match;

        const splitParts = [];
        for (const part of parts) {
            splitParts.push(...splitLongSentence(part));
        }

        // 한 줄 호흡: 1문장 = 1 <p>
        if (paragraphStyle === 'oneline') {
            return splitParts.map(s => `<p>${s.trim()}</p>`).join('');
        }

        // 긴 호흡: 4~5문장씩 그룹핑
        if (paragraphStyle === 'long') {
            if (splitParts.length <= 5) {
                return `<p>${splitParts.join(' ').trim()}</p>`;
            }
            const chunks = [];
            let i = 0;
            while (i < splitParts.length) {
                const remaining = splitParts.length - i;
                const groupSize = remaining <= 6 ? remaining : (i % 2 === 0 ? 4 : 5);
                const chunk = splitParts.slice(i, i + groupSize).join(' ').trim();
                if (chunk) chunks.push(`<p>${chunk}</p>`);
                i += groupSize;
            }
            return chunks.join('');
        }

        // 보통 호흡 (기본): 1~3문장 가변 그룹핑
        if (splitParts.length <= 3) {
            return `<p>${splitParts.join(' ').trim()}</p>`;
        }

        const GROUP_PATTERN = [2, 3, 1, 2, 3, 2, 1, 3];
        const chunks = [];
        let i = 0;
        let patternIdx = 0;
        while (i < splitParts.length) {
            const remaining = splitParts.length - i;
            if (remaining === 1 && chunks.length > 0) {
                const lastChunk = chunks.pop().replace(/<\/?p>/g, '');
                chunks.push(`<p>${lastChunk} ${splitParts[i].trim()}</p>`);
                i++;
            } else {
                const groupSize = Math.min(remaining, GROUP_PATTERN[patternIdx % GROUP_PATTERN.length]);
                patternIdx++;
                const chunk = splitParts.slice(i, i + groupSize).join(' ').trim();
                if (chunk) chunks.push(`<p>${chunk}</p>`);
                i += groupSize;
            }
        }

        return chunks.join('');
    });
};

// 카테고리별 도입부 권장 글자수
const INTRO_LENGTH_BY_CATEGORY = {
    food: { min: 150, max: 200 },
    cafe: { min: 150, max: 200 },
    '카페&맛집': { min: 150, max: 200 },
    travel: { min: 150, max: 200 },
    daily: { min: 100, max: 150 },
    pet: { min: 150, max: 200 },
    shopping: { min: 150, max: 200 },
};

export const analyzePost = (title, htmlContent, keywords, targetLength = 1500, categoryId = 'daily') => {
    const issues = [];
    const checks = {
        titleKeyStart: false,
        titleLength: false,
        mainKeyDensity: false, // 3-5 times (메인 키워드 반복)
        mainKeyFirstPara: false,
        subKeyPresence: false,
        contentLength: false,
        structure: false, // 소제목(H2) 사용
        imageCount: false, // 5-15장 권장
        videoPresence: false, // 동영상 1개 이상 권장 (체류 시간 증가)
        headingKeywords: false, // 소제목에 메인 키워드 포함 여부
        keywordDensityPercent: false, // 키워드 밀도 1~3%
        imageAltText: false, // 이미지 Alt 속성 존재 + 중복 여부
        introParagraphLength: false // 첫 문단 140~160자
    };

    const mainKeyword = keywords.main.trim();
    const subKeywords = keywords.sub.filter(k => k.trim());

    // 1. Title Analysis
    if (!mainKeyword) {
        issues.push({ id: 'no_keyword', type: 'error', text: '메인 키워드 미설정', metric: '' });
    } else {
        const cleanTitle = title.trim();
        if (cleanTitle.toLowerCase().startsWith(mainKeyword.toLowerCase())) {
            checks.titleKeyStart = true;
        } else {
            issues.push({ id: 'title_start', type: 'warning', text: '제목 키워드 시작 필요', metric: '' });
        }
    }

    if (title.length >= 10 && title.length <= 30) {
        checks.titleLength = true;
    } else if (title.length > 30) {
        issues.push({ id: 'title_long', type: 'warning', text: '제목 길이 초과', metric: '30자 이내' });
    } else if (title.length < 10 && title.length > 0) {
        issues.push({ id: 'title_short', type: 'warning', text: '제목 너무 짧음', metric: '' });
    }

    // Parse HTML Content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const fullText = doc.body.textContent || "";
    const totalChars = fullText.replace(/\s/g, '').length;

    // 본문 전용 텍스트 (h2/h3 소제목 제외 — 키워드 밀도 카운팅용)
    const bodyClone = doc.body.cloneNode(true);
    bodyClone.querySelectorAll('h2, h3').forEach(el => el.remove());
    const bodyOnlyText = bodyClone.textContent || "";

    // 2. Content Length
    if (totalChars >= targetLength) {
        checks.contentLength = true;
    } else {
        issues.push({ id: 'length_short', type: 'info', text: '글자 수 부족', metric: `${totalChars}/${targetLength}자` });
    }

    // 3. Keyword Density — 본문(p) 기준, h2/h3 제외
    if (mainKeyword) {
        const escapedKey = mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'gi');
        const matches = bodyOnlyText.match(regex);
        const count = matches ? matches.length : 0;

        // 글자수 비례 적정 반복 횟수
        let minRepeat, maxRepeat;
        if (totalChars < 1500) { minRepeat = 3; maxRepeat = 5; }
        else if (totalChars < 2500) { minRepeat = 4; maxRepeat = 7; }
        else { minRepeat = 6; maxRepeat = 10; }

        if (count >= minRepeat && count <= maxRepeat) {
            checks.mainKeyDensity = true;
        } else if (count < minRepeat) {
            issues.push({ id: 'key_density', type: 'warning', text: '메인 키워드 반복 부족', metric: `${count}회 → ${minRepeat}~${maxRepeat}회`, count, minRepeat, maxRepeat });
        } else {
            issues.push({ id: 'key_density', type: 'warning', text: '메인 키워드 반복 과다', metric: `${count}회 → ${minRepeat}~${maxRepeat}회`, count, minRepeat, maxRepeat });
        }

        // First Paragraph Check — 첫 h2 이전의 <p> 중 텍스트 있는 첫 번째 (도입부)
        const firstH2 = doc.querySelector('h2');
        const allPs = Array.from(doc.querySelectorAll('p'));
        const introPs = firstH2
            ? allPs.filter(p => firstH2.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING)
            : allPs;
        const firstPara = introPs.find(p => p.textContent.trim().length > 10);
        if (firstPara && firstPara.textContent.toLowerCase().includes(mainKeyword.toLowerCase())) {
            checks.mainKeyFirstPara = true;
        } else {
            issues.push({ id: 'key_first', type: 'warning', text: '첫 문단 키워드 누락', metric: '' });
        }
    }

    // 4. Sub Keywords
    if (subKeywords.length > 0) {
        const missingSubs = subKeywords.filter(sub => !bodyOnlyText.toLowerCase().includes(sub.toLowerCase()));
        if (missingSubs.length === 0) {
            checks.subKeyPresence = true;
        } else {
            issues.push({ id: 'sub_missing', type: 'info', text: '서브 키워드 누락', metric: `${missingSubs.length}개`, missingSubs });
        }
    } else {
        checks.subKeyPresence = true;
    }

    // 5. Structure (소제목 H2 사용)
    const hasH2 = !!doc.querySelector('h2');
    if (hasH2) {
        checks.structure = true;
    } else {
        issues.push({ id: 'structure_missing', type: 'info', text: '소제목 구조화 필요', metric: '' });
    }

    // 6. Image Count (5-15장 권장)
    const imageCount = doc.querySelectorAll('img').length;
    if (imageCount >= 5 && imageCount <= 15) {
        checks.imageCount = true;
    } else if (imageCount < 5) {
        issues.push({ id: 'img_count_low', type: 'warning', text: '이미지 부족', metric: `${imageCount}/5장` });
    } else if (imageCount > 15) {
        issues.push({ id: 'img_count_high', type: 'info', text: '이미지 과다', metric: `${imageCount}장 → 15장 이하` });
    }

    // 7. Video Presence (체류 시간 증가용)
    const videoTags = doc.querySelectorAll('video');
    const iframeTags = doc.querySelectorAll('iframe');
    // iframe 중 YouTube, Vimeo 등 동영상 플랫폼 체크
    const videoIframes = Array.from(iframeTags).filter(iframe => {
        const src = iframe.getAttribute('src') || '';
        return src.includes('youtube') || src.includes('youtu.be') ||
            src.includes('vimeo') || src.includes('naver') ||
            src.includes('kakao') || src.includes('dailymotion');
    });
    const hasVideo = videoTags.length > 0 || videoIframes.length > 0;

    if (hasVideo) {
        checks.videoPresence = true;
    } else {
        issues.push({ id: 'video_missing', type: 'info', text: '동영상 추가 권장', metric: '체류 시간↑' });
    }

    // 8. Heading Keywords — 소제목에 메인 키워드 포함 여부
    const headings = doc.querySelectorAll('h2');
    const headingCount = headings.length;
    if (mainKeyword && headingCount > 0) {
        const headingWithKeyword = Array.from(headings).some(
            h => h.textContent.toLowerCase().includes(mainKeyword.toLowerCase())
        );
        if (headingWithKeyword) {
            checks.headingKeywords = true;
        } else {
            issues.push({ id: 'heading_keyword', type: 'warning', text: '소제목 키워드 미포함', metric: '' });
        }
    } else if (!mainKeyword) {
        // 키워드 없으면 체크 스킵 (패스 처리)
        checks.headingKeywords = true;
    } else {
        issues.push({ id: 'heading_keyword', type: 'info', text: '소제목 없음', metric: '' });
    }

    // 9. Keyword Density Percent — 횟수 체크(#3)와 통합하여 밀도%만 참고용으로 계산
    let keywordDensity = 0;
    if (mainKeyword && totalChars > 0) {
        const escapedKey = mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const densityRegex = new RegExp(escapedKey, 'gi');
        const densityMatches = fullText.match(densityRegex);
        const keywordCharTotal = (densityMatches ? densityMatches.length : 0) * mainKeyword.length;
        keywordDensity = Math.round((keywordCharTotal / totalChars) * 1000) / 10;
    }
    // 횟수 체크(#3 key_density)에서 이미 반복 과다/부족을 판단하므로 밀도% 별도 이슈는 생략
    checks.keywordDensityPercent = true;

    // 10. Image Alt Text — 이미지 Alt 속성 존재 + 중복 여부
    const images = doc.querySelectorAll('img');
    if (images.length > 0) {
        const alts = Array.from(images).map(img => img.getAttribute('alt') || '');
        const missingAlt = alts.filter(a => !a.trim()).length;
        const uniqueAlts = new Set(alts.filter(a => a.trim()));
        const hasDuplicates = uniqueAlts.size < alts.filter(a => a.trim()).length;

        if (missingAlt === 0 && !hasDuplicates) {
            checks.imageAltText = true;
        } else {
            if (missingAlt > 0) {
                issues.push({ id: 'img_alt_missing', type: 'warning', text: '이미지 Alt 누락', metric: `${missingAlt}개` });
            }
            if (hasDuplicates) {
                issues.push({ id: 'img_alt_duplicate', type: 'info', text: 'Alt 텍스트 중복', metric: '' });
            }
        }
    } else {
        checks.imageAltText = true; // 이미지 없으면 패스
    }

    // 11. Intro Paragraph Length — 첫 h2 이전 도입부 기준
    const introRange = INTRO_LENGTH_BY_CATEGORY[categoryId] || INTRO_LENGTH_BY_CATEGORY.daily;
    const firstParagraph = firstPara; // key_first에서 이미 계산한 도입부 재사용
    const introLength = firstParagraph ? (firstParagraph.textContent || '').length : 0;
    if (introLength >= introRange.min && introLength <= introRange.max) {
        checks.introParagraphLength = true;
    } else if (introLength > 0 && introLength < introRange.min) {
        issues.push({ id: 'intro_short', type: 'info', text: '도입부 짧음', metric: `${introLength} → ${introRange.min}~${introRange.max}자` });
    } else if (introLength > introRange.max) {
        issues.push({ id: 'intro_long', type: 'info', text: '도입부 길음', metric: `${introLength} → ${introRange.min}~${introRange.max}자` });
    } else {
        checks.introParagraphLength = true; // 본문 없으면 패스
    }

    return { checks, issues, totalChars, imageCount, hasVideo, keywordDensity, introLength, headingCount };
};
