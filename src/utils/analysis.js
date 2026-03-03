/**
 * 80자 초과 문장을 자연스러운 위치에서 2개로 분리
 * 쉼표/접속사/조사 등 자연스러운 끊김 지점에서 분리
 */
const splitLongSentence = (sentence) => {
    const textOnly = sentence.replace(/<[^>]*>/g, '');
    if (textOnly.length <= 80) return [sentence];

    // 자연스러운 분리 지점 패턴 (우선순위순)
    const splitPatterns = [
        /,\s*/,                          // 쉼표
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
 * AI 생성 HTML 후처리: 긴 <p> 태그를 2문장 단위로 강제 분리 + 80자 초과 문장 분리
 * innerHTML 기반으로 <b> 등 HTML 태그 보존
 */
export const formatParagraphs = (html) => {
    return html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner) => {
        // 이미지/blockquote 포함 문단은 건드리지 않음
        if (inner.includes('<img')) return match;

        // innerHTML을 문장 종결 부호(. ! ? …) + 공백 기준으로 분리 (HTML 태그 보존)
        const parts = inner.split(/(?<=[.!?…])\s+/).filter(s => s.trim());
        if (parts.length === 0) return match;

        // 각 문장에서 80자 초과 문장 분리
        const splitParts = [];
        for (const part of parts) {
            splitParts.push(...splitLongSentence(part));
        }

        // 1~3문장 가변 그룹핑으로 <p> 생성 (자연스러운 문단 길이 변주)
        if (splitParts.length <= 3) {
            const joined = splitParts.join(' ').trim();
            return `<p>${joined}</p>`;
        }

        const chunks = [];
        let i = 0;
        while (i < splitParts.length) {
            const remaining = splitParts.length - i;
            // 남은 문장이 1개면 이전 문단에 합류
            if (remaining === 1 && chunks.length > 0) {
                const lastChunk = chunks.pop().replace(/<\/?p>/g, '');
                chunks.push(`<p>${lastChunk} ${splitParts[i].trim()}</p>`);
                i++;
            } else {
                // 1~3문장 랜덤 그룹핑
                const groupSize = Math.min(remaining, Math.floor(Math.random() * 3) + 1);
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
        structure: false, // H2/H3 usage
        imageCount: false, // 5-15장 권장
        videoPresence: false, // 동영상 1개 이상 권장 (체류 시간 증가)
        headingKeywords: false, // H2/H3에 메인 키워드 포함 여부
        keywordDensityPercent: false, // 키워드 밀도 1~3%
        imageAltText: false, // 이미지 Alt 속성 존재 + 중복 여부
        introParagraphLength: false // 첫 문단 140~160자
    };

    const mainKeyword = keywords.main.trim();
    const subKeywords = keywords.sub.filter(k => k.trim());

    // 1. Title Analysis
    if (!mainKeyword) {
        issues.push({ id: 'no_keyword', type: 'error', text: '먼저 메인 키워드를 설정해주세요.' });
    } else {
        const cleanTitle = title.trim();
        if (cleanTitle.toLowerCase().startsWith(mainKeyword.toLowerCase())) {
            checks.titleKeyStart = true;
        } else {
            issues.push({ id: 'title_start', type: 'warning', text: '제목은 메인 키워드로 시작해야 합니다.' });
        }
    }

    if (title.length >= 10 && title.length <= 30) {
        checks.titleLength = true;
    } else if (title.length > 30) {
        issues.push({ id: 'title_long', type: 'warning', text: '제목이 너무 깁니다 (30자 이내 권장).' });
    } else if (title.length < 10 && title.length > 0) {
        issues.push({ id: 'title_short', type: 'warning', text: '제목이 너무 짧습니다.' });
    }

    // Parse HTML Content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const fullText = doc.body.textContent || "";
    const totalChars = fullText.replace(/\s/g, '').length;

    // 2. Content Length
    if (totalChars >= targetLength) {
        checks.contentLength = true;
    } else {
        issues.push({ id: 'length_short', type: 'info', text: `글자 수가 부족합니다 (${totalChars}/${targetLength} 자).` });
    }

    // 3. Keyword Density
    if (mainKeyword) {
        const escapedKey = mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'gi');
        const matches = fullText.match(regex);
        const count = matches ? matches.length : 0;

        if (count >= 3 && count <= 5) {
            checks.mainKeyDensity = true;
        } else {
            issues.push({ id: 'key_density', type: 'warning', text: `메인 키워드 반복 횟수: ${count}회 (목표: 3-5회).` });
        }

        // First Paragraph Check
        const firstPara = doc.querySelector('p');
        if (firstPara && firstPara.textContent.toLowerCase().includes(mainKeyword.toLowerCase())) {
            checks.mainKeyFirstPara = true;
        } else {
            issues.push({ id: 'key_first', type: 'warning', text: '첫 문단에 메인 키워드가 포함되어야 합니다.' });
        }
    }

    // 4. Sub Keywords
    if (subKeywords.length > 0) {
        const missingSubs = subKeywords.filter(sub => !fullText.toLowerCase().includes(sub.toLowerCase()));
        if (missingSubs.length === 0) {
            checks.subKeyPresence = true;
        } else {
            issues.push({ id: 'sub_missing', type: 'info', text: `누락된 서브 키워드: ${missingSubs.join(', ')}` });
        }
    } else {
        checks.subKeyPresence = true;
    }

    // 5. Structure (H2/H3)
    const hasH2 = !!doc.querySelector('h2');
    const hasH3 = !!doc.querySelector('h3');
    if (hasH2 && hasH3) {
        checks.structure = true;
    } else {
        issues.push({ id: 'structure_missing', type: 'info', text: 'H2와 H3 소제목을 모두 사용하여 구조화해주세요.' });
    }

    // 6. Image Count (5-15장 권장)
    const imageCount = doc.querySelectorAll('img').length;
    if (imageCount >= 5 && imageCount <= 15) {
        checks.imageCount = true;
    } else if (imageCount < 5) {
        issues.push({ id: 'img_count_low', type: 'warning', text: `📸 이미지가 부족합니다 (${imageCount}/5장 이상 권장).` });
    } else if (imageCount > 15) {
        issues.push({ id: 'img_count_high', type: 'info', text: `📸 이미지가 너무 많습니다 (${imageCount}장, 15장 이하 권장).` });
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
        issues.push({ id: 'video_missing', type: 'info', text: '🎬 동영상을 추가하면 체류 시간이 증가합니다 (SEO 가점).' });
    }

    // 8. Heading Keywords — H2/H3 텍스트에 메인 키워드 포함 여부
    const headings = doc.querySelectorAll('h2, h3');
    const headingCount = headings.length;
    if (mainKeyword && headingCount > 0) {
        const headingWithKeyword = Array.from(headings).some(
            h => h.textContent.toLowerCase().includes(mainKeyword.toLowerCase())
        );
        if (headingWithKeyword) {
            checks.headingKeywords = true;
        } else {
            issues.push({ id: 'heading_keyword', type: 'warning', text: '소제목(H2/H3)에 메인 키워드를 포함하면 SEO에 유리합니다.' });
        }
    } else if (!mainKeyword) {
        // 키워드 없으면 체크 스킵 (패스 처리)
        checks.headingKeywords = true;
    } else {
        issues.push({ id: 'heading_keyword', type: 'info', text: '소제목이 없어 키워드 포함 여부를 확인할 수 없습니다.' });
    }

    // 9. Keyword Density Percent — 글 길이 대비 키워드 밀도 (적정: 1~3%)
    let keywordDensity = 0;
    if (mainKeyword && totalChars > 0) {
        const escapedKey = mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const densityRegex = new RegExp(escapedKey, 'gi');
        const densityMatches = fullText.match(densityRegex);
        const keywordCharTotal = (densityMatches ? densityMatches.length : 0) * mainKeyword.length;
        keywordDensity = Math.round((keywordCharTotal / totalChars) * 1000) / 10; // 소수점 1자리
        if (keywordDensity >= 1 && keywordDensity <= 3) {
            checks.keywordDensityPercent = true;
        } else if (keywordDensity < 1) {
            issues.push({ id: 'keyword_density_low', type: 'warning', text: `키워드 밀도가 낮습니다 (${keywordDensity}%, 적정: 1~3%).` });
        } else {
            issues.push({ id: 'keyword_density_high', type: 'warning', text: `키워드 밀도가 높습니다 (${keywordDensity}%, 적정: 1~3%). 과최적화 주의.` });
        }
    } else {
        checks.keywordDensityPercent = true; // 키워드 없으면 패스
    }

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
                issues.push({ id: 'img_alt_missing', type: 'warning', text: `${missingAlt}개 이미지에 Alt 텍스트가 없습니다.` });
            }
            if (hasDuplicates) {
                issues.push({ id: 'img_alt_duplicate', type: 'info', text: '이미지 Alt 텍스트가 중복됩니다. 고유한 설명을 사용하세요.' });
            }
        }
    } else {
        checks.imageAltText = true; // 이미지 없으면 패스
    }

    // 11. Intro Paragraph Length — 카테고리별 권장 글자수
    const introRange = INTRO_LENGTH_BY_CATEGORY[categoryId] || INTRO_LENGTH_BY_CATEGORY.daily;
    const firstParagraph = doc.querySelector('p');
    const introLength = firstParagraph ? (firstParagraph.textContent || '').replace(/\s/g, '').length : 0;
    if (introLength >= introRange.min && introLength <= introRange.max) {
        checks.introParagraphLength = true;
    } else if (introLength > 0 && introLength < introRange.min) {
        issues.push({ id: 'intro_short', type: 'info', text: `도입부가 짧습니다 (${introLength}자, 권장: ${introRange.min}~${introRange.max}자).` });
    } else if (introLength > introRange.max) {
        issues.push({ id: 'intro_long', type: 'info', text: `도입부가 깁니다 (${introLength}자, 권장: ${introRange.min}~${introRange.max}자).` });
    } else {
        checks.introParagraphLength = true; // 본문 없으면 패스
    }

    return { checks, issues, totalChars, imageCount, hasVideo, keywordDensity, introLength, headingCount };
};
