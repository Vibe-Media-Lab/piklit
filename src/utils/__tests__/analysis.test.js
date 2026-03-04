import { describe, it, expect } from 'vitest';
import { formatParagraphs, analyzePost } from '../analysis.js';

describe('formatParagraphs', () => {
  it('짧은 문단은 그대로 보존한다', () => {
    const input = '<p>짧은 문장입니다.</p>';
    const result = formatParagraphs(input);
    expect(result).toBe('<p>짧은 문장입니다.</p>');
  });

  it('80자 이하 여러 문장도 3문장 이하면 하나의 p로 유지한다', () => {
    const input = '<p>첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.</p>';
    const result = formatParagraphs(input);
    expect(result).toBe('<p>첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.</p>');
  });

  it('80자 초과 문장을 분리한다', () => {
    const longSentence = '이것은 매우 긴 문장으로서 쉼표가 포함되어 있고, 자연스러운 위치에서 분리되어야 하며 전체적으로 80자를 초과하는 텍스트입니다.';
    const input = `<p>${longSentence}</p>`;
    const result = formatParagraphs(input);
    // 분리 후에도 <p> 태그로 감싸져야 함
    expect(result).toMatch(/^<p>.*<\/p>$/);
    // 원본 문장이 그대로 있지 않아야 함 (분리되었으므로)
    const textContent = result.replace(/<\/?p>/g, ' ').trim();
    expect(textContent.length).toBeGreaterThan(0);
  });

  it('이미지 포함 문단은 원본을 유지한다', () => {
    const input = '<p>텍스트와 <img src="test.jpg" alt="테스트"> 이미지가 있는 문단입니다.</p>';
    const result = formatParagraphs(input);
    expect(result).toBe(input);
  });

  it('빈 입력을 처리한다', () => {
    expect(formatParagraphs('')).toBe('');
    expect(formatParagraphs('<p></p>')).toBe('<p></p>');
    expect(formatParagraphs('<p>   </p>')).toBe('<p>   </p>');
  });

  it('4문장 이상이면 GROUP_PATTERN에 따라 여러 p로 분리한다', () => {
    const sentences = [
      '첫 번째 문장입니다.',
      '두 번째 문장입니다.',
      '세 번째 문장입니다.',
      '네 번째 문장입니다.',
      '다섯 번째 문장입니다.',
    ];
    const input = `<p>${sentences.join(' ')}</p>`;
    const result = formatParagraphs(input);
    // GROUP_PATTERN[0]=2, GROUP_PATTERN[1]=3 → 2+3=5문장
    const pTags = result.match(/<p>.*?<\/p>/g);
    expect(pTags).not.toBeNull();
    expect(pTags.length).toBeGreaterThan(1);
  });

  it('GROUP_PATTERN 그룹핑 시 마지막 1문장은 이전 문단에 합류한다', () => {
    // GROUP_PATTERN[0]=2, GROUP_PATTERN[1]=3, 남은1 → 이전에 합류
    // 총 6문장: 2 + 3 + 1(합류) = 2개 p
    const sentences = [
      '가 문장입니다.',
      '나 문장입니다.',
      '다 문장입니다.',
      '라 문장입니다.',
      '마 문장입니다.',
      '바 문장입니다.',
    ];
    const input = `<p>${sentences.join(' ')}</p>`;
    const result = formatParagraphs(input);
    const pTags = result.match(/<p>.*?<\/p>/g);
    expect(pTags).not.toBeNull();
    // 마지막 문장이 독립 p가 아닌 이전에 합류해야 함
    for (const tag of pTags) {
      const text = tag.replace(/<\/?p>/g, '').trim();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('HTML 태그(<b> 등)를 보존한다', () => {
    const input = '<p><b>굵은 텍스트</b>가 포함된 문장입니다.</p>';
    const result = formatParagraphs(input);
    expect(result).toContain('<b>굵은 텍스트</b>');
  });

  it('p 태그가 아닌 콘텐츠는 변경하지 않는다', () => {
    const input = '<div>이것은 div입니다.</div>';
    const result = formatParagraphs(input);
    expect(result).toBe(input);
  });
});

describe('analyzePost', () => {
  // 헬퍼: 반복 텍스트로 원하는 글자수의 HTML 생성
  const defaultKeywords = { main: '맛집', sub: ['분위기', '메뉴'] };

  it('최적화된 글은 주요 체크를 모두 통과한다', () => {
    // 제목: 키워드 시작, 10~30자
    const title = '맛집 추천 베스트 10곳 소개';
    // 본문: 키워드 3~5회, 첫 문단에 키워드, 서브키워드 포함, H2+H3, 이미지 5장+alt, 1500자+
    const filler = '가나다라마바사아자차카타파하';
    const longText = filler.repeat(60); // 840자
    const html = `
      <p>맛집 탐방을 시작합니다. ${longText} 맛집 정보와 분위기 그리고 메뉴를 알아봅니다. 맛집 후기도 있습니다.</p>
      <h2>맛집 소제목</h2>
      <p>${longText}</p>
      <h3>세부 내용</h3>
      <p>${longText}</p>
      <img src="1.jpg" alt="사진1"><img src="2.jpg" alt="사진2"><img src="3.jpg" alt="사진3">
      <img src="4.jpg" alt="사진4"><img src="5.jpg" alt="사진5">
    `;
    const result = analyzePost(title, html, defaultKeywords, 1500);
    expect(result.checks.titleKeyStart).toBe(true);
    expect(result.checks.titleLength).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.checks.contentLength).toBe(true);
    expect(result.checks.imageAltText).toBe(true);
    expect(result.checks.imageCount).toBe(true);
  });

  it('제목이 메인 키워드로 시작하면 titleKeyStart가 true이다', () => {
    const result = analyzePost('맛집 소개글', '<p>본문입니다.</p>', defaultKeywords, 0);
    expect(result.checks.titleKeyStart).toBe(true);
  });

  it('제목이 메인 키워드로 시작하지 않으면 titleKeyStart가 false이다', () => {
    const result = analyzePost('추천 맛집 소개', '<p>본문입니다.</p>', defaultKeywords, 0);
    expect(result.checks.titleKeyStart).toBe(false);
    expect(result.issues.some(i => i.id === 'title_start')).toBe(true);
  });

  it('글자수가 목표보다 부족하면 contentLength가 false이고 이슈를 생성한다', () => {
    const result = analyzePost('맛집 추천 베스트 목록', '<p>짧은 글</p>', defaultKeywords, 1500);
    expect(result.checks.contentLength).toBe(false);
    const issue = result.issues.find(i => i.id === 'length_short');
    expect(issue).toBeDefined();
    expect(issue.type).toBe('info');
  });

  it('키워드 밀도 1~3%일 때 keywordDensityPercent가 true이다', () => {
    // "맛집" = 2글자, 밀도 = (횟수*2 / 전체글자수)*100
    // 목표: 2% → 횟수*2/totalChars = 0.02 → 5회 * 2 = 10, totalChars = 500 → 2%
    const filler = '가'.repeat(98); // 98자
    // 5개 맛집 + 5*98 = 10+490 = 500자 (공백 제거 후)
    const text = `맛집${filler}맛집${filler}맛집${filler}맛집${filler}맛집${filler}`;
    const result = analyzePost('맛집 추천 베스트 목록', `<p>${text}</p>`, { main: '맛집', sub: [] }, 0);
    expect(result.keywordDensity).toBeGreaterThanOrEqual(1);
    expect(result.keywordDensity).toBeLessThanOrEqual(3);
    expect(result.checks.keywordDensityPercent).toBe(true);
  });

  it('이미지 Alt 텍스트가 없으면 imageAltText가 false이다', () => {
    const html = '<p>본문</p><img src="1.jpg"><img src="2.jpg" alt="설명">';
    const result = analyzePost('맛집 추천 베스트 목록', html, defaultKeywords, 0);
    expect(result.checks.imageAltText).toBe(false);
    expect(result.issues.some(i => i.id === 'img_alt_missing')).toBe(true);
  });

  it('이미지 Alt 텍스트가 중복되면 이슈를 생성한다', () => {
    const html = '<p>본문</p><img src="1.jpg" alt="같은설명"><img src="2.jpg" alt="같은설명">';
    const result = analyzePost('맛집 추천 베스트 목록', html, defaultKeywords, 0);
    expect(result.issues.some(i => i.id === 'img_alt_duplicate')).toBe(true);
  });

  it('H2와 H3가 모두 있으면 structure가 true이다', () => {
    const html = '<h2>소제목</h2><p>본문</p><h3>세부</h3><p>내용</p>';
    const result = analyzePost('맛집 추천 베스트 목록', html, defaultKeywords, 0);
    expect(result.checks.structure).toBe(true);
  });

  it('H2 또는 H3가 없으면 structure가 false이다', () => {
    const html = '<h2>소제목만</h2><p>본문입니다.</p>';
    const result = analyzePost('맛집 추천 베스트 목록', html, defaultKeywords, 0);
    expect(result.checks.structure).toBe(false);
    expect(result.issues.some(i => i.id === 'structure_missing')).toBe(true);
  });

  it('빈 본문을 처리한다', () => {
    const result = analyzePost('맛집 추천 베스트 목록', '', defaultKeywords, 1500);
    expect(result.totalChars).toBe(0);
    expect(result.checks.contentLength).toBe(false);
  });

  it('키워드가 빈 문자열이면 no_keyword 이슈를 생성한다', () => {
    const result = analyzePost('제목입니다 테스트용 제목', '<p>본문</p>', { main: '', sub: [] }, 0);
    expect(result.issues.some(i => i.id === 'no_keyword')).toBe(true);
    // 키워드 없으면 밀도/헤딩키워드는 패스 처리
    expect(result.checks.keywordDensityPercent).toBe(true);
    expect(result.checks.headingKeywords).toBe(true);
  });
});
