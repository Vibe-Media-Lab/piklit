/**
 * 가독성 점수 분석 (클라이언트 사이드, 실시간)
 * 한국어 블로그 콘텐츠에 최적화된 6가지 지표를 분석하여 0~100점 반환
 */

/**
 * HTML 콘텐츠의 가독성을 분석
 * @param {string} htmlContent - 에디터 HTML 콘텐츠
 * @returns {{ score: number, grade: string, metrics: Object, suggestions: Array }}
 */
export const analyzeReadability = (htmlContent) => {
    if (!htmlContent || htmlContent === '<p></p>') {
        return {
            score: 0,
            grade: '-',
            metrics: {},
            suggestions: [],
            isEmpty: true
        };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const fullText = doc.body.textContent || '';
    const totalChars = fullText.replace(/\s/g, '').length;

    if (totalChars < 100) {
        return {
            score: 0,
            grade: '-',
            metrics: {},
            suggestions: [{ type: 'info', text: '100자 이상 작성 시 가독성 분석이 시작됩니다.', priority: 0 }],
            isEmpty: true
        };
    }

    // 1. 문장 길이 분석 (25점)
    const sentenceMetric = analyzeSentenceLength(doc);
    // 2. 문단 구조 분석 (20점)
    const paragraphMetric = analyzeParagraphStructure(doc);
    // 3. 소제목 활용 분석 (20점)
    const headingMetric = analyzeHeadingUsage(doc, totalChars);
    // 4. 시각 요소 분석 (15점)
    const visualMetric = analyzeVisualElements(doc, totalChars);
    // 5. 텍스트 밀도 분석 (10점)
    const densityMetric = analyzeTextDensity(doc);
    // 6. 강조 표현 분석 (10점)
    const emphasisMetric = analyzeEmphasis(doc, totalChars);

    const metrics = {
        sentenceLength: sentenceMetric,
        paragraphStructure: paragraphMetric,
        headingUsage: headingMetric,
        visualElements: visualMetric,
        textDensity: densityMetric,
        emphasis: emphasisMetric
    };

    const totalScore = Math.round(
        sentenceMetric.score +
        paragraphMetric.score +
        headingMetric.score +
        visualMetric.score +
        densityMetric.score +
        emphasisMetric.score
    );

    const score = Math.min(100, Math.max(0, totalScore));
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : 'D';

    // 개선 제안 수집 및 우선순위 정렬
    const suggestions = [];
    Object.values(metrics).forEach(m => {
        if (m.suggestions) suggestions.push(...m.suggestions);
    });
    suggestions.sort((a, b) => b.priority - a.priority);

    return { score, grade, metrics, suggestions, isEmpty: false };
};

/**
 * 라이브 에디터 DOM에서 제안 항목의 실제 위치를 찾아 스크롤 + 하이라이트
 * @param {string} locateType - 제안 유형
 */
export const locateSuggestion = (locateType) => {
    const editor = document.querySelector('.tiptap-content-area');
    if (!editor) return;

    // 이전 하이라이트 제거
    editor.querySelectorAll('.readability-locate-highlight').forEach(el => {
        el.classList.remove('readability-locate-highlight');
    });

    let target = null;

    switch (locateType) {
        case 'longSentence': {
            // 80자 이상 문장이 포함된 첫 번째 p 태그 찾기
            const paragraphs = editor.querySelectorAll('p');
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (!text) continue;
                const sentences = text.match(/[^.!?…]+[.!?…]+/g) || [text];
                if (sentences.some(s => s.trim().length > 80)) {
                    target = p;
                    break;
                }
            }
            break;
        }
        case 'avgSentenceLength': {
            // 가장 긴 평균 문장을 가진 p를 찾기
            const paragraphs = editor.querySelectorAll('p');
            let longest = null;
            let longestAvg = 0;
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (!text || text.length < 20) continue;
                const sentences = text.match(/[^.!?…]+[.!?…]+/g) || [text];
                const avg = text.length / sentences.length;
                if (avg > longestAvg) {
                    longestAvg = avg;
                    longest = p;
                }
            }
            target = longest;
            break;
        }
        case 'longParagraph': {
            // 5문장 이상인 첫 번째 p 찾기
            const paragraphs = editor.querySelectorAll('p');
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (!text || p.querySelector('img')) continue;
                const sentences = text.match(/[^.!?…]+[.!?…]+/g) || [text];
                if (sentences.length > 4) {
                    target = p;
                    break;
                }
            }
            break;
        }
        case 'avgParagraphLength': {
            // 가장 문장이 많은 p 찾기
            const paragraphs = editor.querySelectorAll('p');
            let most = null;
            let mostCount = 0;
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (!text || p.querySelector('img')) continue;
                const sentences = text.match(/[^.!?…]+[.!?…]+/g) || [text];
                if (sentences.length > mostCount) {
                    mostCount = sentences.length;
                    most = p;
                }
            }
            target = most;
            break;
        }
        case 'noHeading':
        case 'headingGap': {
            // 소제목이 없거나 간격이 넓은 구간 → 가장 긴 텍스트 연속 구간의 중간 p
            const children = Array.from(editor.children);
            let maxRun = [];
            let currentRun = [];
            children.forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'p' && !el.querySelector('img')) {
                    currentRun.push(el);
                } else {
                    if (currentRun.length > maxRun.length) maxRun = currentRun;
                    currentRun = [];
                }
            });
            if (currentRun.length > maxRun.length) maxRun = currentRun;
            if (maxRun.length > 0) {
                target = maxRun[Math.floor(maxRun.length / 2)];
            }
            break;
        }
        case 'textDensity': {
            // 이미지/소제목 없이 연속되는 가장 긴 텍스트 블록의 시작
            const children = Array.from(editor.children);
            let maxRun = [];
            let maxLen = 0;
            let currentRun = [];
            let currentLen = 0;
            children.forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'p' && !el.querySelector('img')) {
                    currentRun.push(el);
                    currentLen += (el.textContent || '').replace(/\s/g, '').length;
                } else {
                    if (currentLen > maxLen) {
                        maxLen = currentLen;
                        maxRun = currentRun;
                    }
                    currentRun = [];
                    currentLen = 0;
                }
            });
            if (currentLen > maxLen) maxRun = currentRun;
            if (maxRun.length > 0) {
                target = maxRun[Math.floor(maxRun.length / 2)];
            }
            break;
        }
        case 'excessEmphasis': {
            // 모든 bold/strong/mark에 하이라이트 (여러 개)
            const emphasisEls = editor.querySelectorAll('b, strong, mark');
            emphasisEls.forEach(el => el.classList.add('readability-locate-highlight'));
            if (emphasisEls.length > 0) {
                emphasisEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return; // 개별 target 대신 여러 요소 하이라이트
        }
        case 'noEmphasis': {
            // 첫 번째 텍스트 p로 스크롤 (강조할 곳 제안)
            const firstP = editor.querySelector('p');
            if (firstP) {
                target = firstP;
            }
            break;
        }
        case 'noImage': {
            // 에디터 중간 지점 p로 스크롤
            const allP = editor.querySelectorAll('p');
            if (allP.length > 0) {
                target = allP[Math.floor(allP.length / 2)];
            }
            break;
        }
        case 'fewImages': {
            // 이미지 없는 가장 긴 구간
            const children = Array.from(editor.children);
            let maxRun = [];
            let currentRun = [];
            children.forEach(el => {
                if (el.querySelector('img') || el.tagName.toLowerCase() === 'img') {
                    if (currentRun.length > maxRun.length) maxRun = currentRun;
                    currentRun = [];
                } else {
                    currentRun.push(el);
                }
            });
            if (currentRun.length > maxRun.length) maxRun = currentRun;
            if (maxRun.length > 0) {
                target = maxRun[Math.floor(maxRun.length / 2)];
            }
            break;
        }
        default:
            break;
    }

    if (target) {
        target.classList.add('readability-locate-highlight');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 2초 후 하이라이트 제거
        setTimeout(() => {
            target.classList.remove('readability-locate-highlight');
        }, 2500);
    }
};

// ──────────────────────────────────────────────
// 1. 문장 길이 분석 (25점 만점)
// ──────────────────────────────────────────────
function analyzeSentenceLength(doc) {
    const paragraphs = doc.querySelectorAll('p');
    const sentences = [];

    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (!text) return;
        const splits = text.match(/[^.!?…]+[.!?…]+/g) || [text];
        splits.forEach(s => {
            const trimmed = s.trim();
            if (trimmed.length > 5) sentences.push(trimmed);
        });
    });

    if (sentences.length === 0) {
        return { score: 0, label: '문장 길이', maxScore: 25, avg: 0, longCount: 0, total: 0, suggestions: [] };
    }

    const lengths = sentences.map(s => s.length);
    const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    const longCount = lengths.filter(l => l > 80).length;
    const longRatio = longCount / lengths.length;

    let score = 0;

    // 평균 문장 길이 점수 (15점)
    if (avg >= 30 && avg <= 60) {
        score += 15;
    } else if (avg >= 20 && avg <= 80) {
        score += 10;
    } else {
        score += 5;
    }

    // 긴 문장 비율 점수 (10점)
    if (longRatio === 0) {
        score += 10;
    } else if (longRatio < 0.1) {
        score += 8;
    } else if (longRatio < 0.2) {
        score += 5;
    } else {
        score += 2;
    }

    const suggestions = [];
    if (avg > 70) {
        suggestions.push({ type: 'warning', text: `평균 문장 길이가 ${avg}자로 깁니다. 40~60자가 적정합니다.`, priority: 9, locateType: 'avgSentenceLength' });
    }
    if (longCount > 0) {
        suggestions.push({ type: 'warning', text: `80자 이상 긴 문장이 ${longCount}개 있습니다. 나누어 주세요.`, priority: 8, locateType: 'longSentence' });
    }

    return { score, label: '문장 길이', maxScore: 25, avg, longCount, total: sentences.length, suggestions };
}

// ──────────────────────────────────────────────
// 2. 문단 구조 분석 (20점 만점)
// ──────────────────────────────────────────────
function analyzeParagraphStructure(doc) {
    const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => {
        const text = p.textContent.trim();
        return text.length > 10 && !p.querySelector('img');
    });

    if (paragraphs.length === 0) {
        return { score: 0, label: '문단 구조', maxScore: 20, avgSentences: 0, longParas: 0, suggestions: [] };
    }

    const paraSentenceCounts = paragraphs.map(p => {
        const text = p.textContent.trim();
        const splits = text.match(/[^.!?…]+[.!?…]+/g) || [text];
        return splits.length;
    });

    const avgSentences = Math.round((paraSentenceCounts.reduce((a, b) => a + b, 0) / paraSentenceCounts.length) * 10) / 10;
    const longParas = paraSentenceCounts.filter(c => c > 4).length;

    let score = 0;

    // 평균 문단 문장 수 (12점)
    if (avgSentences >= 1.5 && avgSentences <= 3) {
        score += 12;
    } else if (avgSentences >= 1 && avgSentences <= 4) {
        score += 8;
    } else {
        score += 4;
    }

    // 긴 문단 없음 (8점)
    if (longParas === 0) {
        score += 8;
    } else if (longParas <= 2) {
        score += 4;
    } else {
        score += 1;
    }

    const suggestions = [];
    if (avgSentences > 4) {
        suggestions.push({ type: 'warning', text: `평균 문단 길이가 ${avgSentences}문장입니다. 2~3문장이 적정합니다.`, priority: 7, locateType: 'avgParagraphLength' });
    }
    if (longParas > 0) {
        suggestions.push({ type: 'info', text: `5문장 이상의 긴 문단이 ${longParas}개 있습니다. 분리를 권장합니다.`, priority: 5, locateType: 'longParagraph' });
    }

    return { score, label: '문단 구조', maxScore: 20, avgSentences, longParas, suggestions };
}

// ──────────────────────────────────────────────
// 3. 소제목 활용 분석 (20점 만점)
// ──────────────────────────────────────────────
function analyzeHeadingUsage(doc, totalChars) {
    const h2s = doc.querySelectorAll('h2');
    const h3s = doc.querySelectorAll('h3');
    const h2Count = h2s.length;
    const h3Count = h3s.length;
    const headingCount = h2Count + h3Count;

    let score = 0;
    const suggestions = [];

    if (headingCount === 0) {
        score = 2;
        suggestions.push({ type: 'warning', text: 'H2/H3 소제목이 없습니다. 소제목으로 글을 구조화해주세요.', priority: 10, locateType: 'noHeading' });
    } else {
        // H2 존재 (8점)
        if (h2Count >= 2) score += 8;
        else if (h2Count >= 1) score += 5;
        else suggestions.push({ type: 'info', text: 'H2 소제목을 2개 이상 사용하면 구조가 명확해집니다.', priority: 6, locateType: 'noHeading' });

        // H3 존재 (6점)
        if (h3Count >= 2) score += 6;
        else if (h3Count >= 1) score += 4;

        // 소제목 간격 (6점) — 300~500자마다 소제목이 적당
        const avgGap = totalChars / (headingCount + 1);
        if (avgGap >= 200 && avgGap <= 600) {
            score += 6;
        } else if (avgGap >= 100 && avgGap <= 800) {
            score += 3;
        } else {
            if (avgGap > 800) {
                suggestions.push({ type: 'info', text: `소제목 간격이 넓습니다 (평균 ${Math.round(avgGap)}자). 300~500자마다 소제목을 권장합니다.`, priority: 5, locateType: 'headingGap' });
            }
        }
    }

    return { score, label: '소제목 활용', maxScore: 20, h2Count, h3Count, suggestions };
}

// ──────────────────────────────────────────────
// 4. 시각 요소 분석 (15점 만점)
// ──────────────────────────────────────────────
function analyzeVisualElements(doc, totalChars) {
    const imageCount = doc.querySelectorAll('img').length;
    const blockquoteCount = doc.querySelectorAll('blockquote').length;

    // 500자당 1개 이상 이미지 권장
    const idealImageCount = Math.max(1, Math.floor(totalChars / 500));
    const imageRatio = imageCount / idealImageCount;

    let score = 0;
    const suggestions = [];

    // 이미지 수 (10점)
    if (imageRatio >= 0.8) {
        score += 10;
    } else if (imageRatio >= 0.5) {
        score += 6;
    } else if (imageCount > 0) {
        score += 3;
    } else {
        suggestions.push({ type: 'warning', text: '이미지가 없습니다. 시각적 요소를 추가하면 가독성이 높아집니다.', priority: 7, locateType: 'noImage' });
    }

    // 인용/팁 박스 (5점)
    if (blockquoteCount >= 1) {
        score += 5;
    } else if (totalChars > 500) {
        score += 2;
        suggestions.push({ type: 'info', text: 'TIP 박스(인용 블록)를 추가하면 시각적 변화를 줄 수 있습니다.', priority: 2, locateType: 'textDensity' });
    } else {
        score += 3;
    }

    if (imageCount > 0 && imageCount < idealImageCount) {
        suggestions.push({ type: 'info', text: `이미지가 ${imageCount}개입니다. ${idealImageCount}개 이상이면 더 좋습니다.`, priority: 4, locateType: 'fewImages' });
    }

    return { score, label: '시각 요소', maxScore: 15, imageCount, blockquoteCount, suggestions };
}

// ──────────────────────────────────────────────
// 5. 텍스트 밀도 분석 (10점 만점)
// ──────────────────────────────────────────────
function analyzeTextDensity(doc) {
    // 이미지/소제목 없이 연속되는 텍스트 블록 길이 체크
    const children = Array.from(doc.body.children);
    let maxConsecutive = 0;
    let currentRun = 0;

    children.forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'p' && !el.querySelector('img')) {
            currentRun += (el.textContent || '').replace(/\s/g, '').length;
        } else {
            // 이미지, 소제목, blockquote 등은 시각적 끊김
            if (currentRun > maxConsecutive) maxConsecutive = currentRun;
            currentRun = 0;
        }
    });
    if (currentRun > maxConsecutive) maxConsecutive = currentRun;

    let score = 0;
    const suggestions = [];

    if (maxConsecutive <= 400) {
        score = 10;
    } else if (maxConsecutive <= 600) {
        score = 7;
    } else if (maxConsecutive <= 900) {
        score = 4;
        suggestions.push({ type: 'info', text: `이미지/소제목 없이 ${maxConsecutive}자가 연속됩니다. 중간에 시각 요소를 추가해보세요.`, priority: 6, locateType: 'textDensity' });
    } else {
        score = 2;
        suggestions.push({ type: 'warning', text: `텍스트가 ${maxConsecutive}자 이상 끊김 없이 이어집니다. 이미지나 소제목으로 분리해주세요.`, priority: 8, locateType: 'textDensity' });
    }

    return { score, label: '텍스트 밀도', maxScore: 10, maxConsecutive, suggestions };
}

// ──────────────────────────────────────────────
// 6. 강조 표현 분석 (10점 만점)
// ──────────────────────────────────────────────
function analyzeEmphasis(doc, totalChars) {
    const boldCount = doc.querySelectorAll('b, strong').length;
    const highlightCount = doc.querySelectorAll('mark').length;
    const emphasisTotal = boldCount + highlightCount;

    // 500자당 1~2개 강조가 적당
    const idealCount = Math.max(1, Math.floor(totalChars / 500));

    let score = 0;
    const suggestions = [];

    if (emphasisTotal >= idealCount && emphasisTotal <= idealCount * 3) {
        score = 10;
    } else if (emphasisTotal > 0) {
        score = 6;
        if (emphasisTotal > idealCount * 3) {
            suggestions.push({ type: 'info', text: `강조가 ${emphasisTotal}개로 과도합니다. 핵심만 강조하면 효과적입니다.`, priority: 3, locateType: 'excessEmphasis' });
        }
    } else {
        score = 2;
        suggestions.push({ type: 'info', text: '굵은 글씨(Bold)나 하이라이트를 사용하면 핵심 내용이 눈에 들어옵니다.', priority: 4, locateType: 'noEmphasis' });
    }

    return { score, label: '강조 표현', maxScore: 10, boldCount, highlightCount, suggestions };
}
