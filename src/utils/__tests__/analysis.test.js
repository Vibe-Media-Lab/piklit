import { describe, it, expect, beforeAll } from 'vitest';
import { formatParagraphs, analyzePost } from '../analysis';

describe('formatParagraphs', () => {
  it('단일 짧은 문단을 그대로 반환한다', () => {
    const input = '<p>짧은 문장입니다.</p>';
    expect(formatParagraphs(input)).toBe('<p>짧은 문장입니다.</p>');
  });

  it('<img> 포함 문단은 수정하지 않는다', () => {
    const input = '<p>텍스트 <img src="test.jpg" /> 이미지 포함 문단입니다.</p>';
    expect(formatParagraphs(input)).toBe(input);
  });

  it('80자 초과 문장이 분리된다', () => {
    // 쉼표가 있는 80자 초과 문장 (HTML 태그 제외 텍스트가 80자 초과해야 함)
    const longSentence = '이것은 매우 긴 문장으로 작성되었으며 다양한 내용을 포함하고 있는 문장이고, 쉼표를 기준으로 자연스럽게 분리되어야 하는 아주 긴 테스트용 문장입니다.';
    const input = `<p>${longSentence}</p>`;
    const result = formatParagraphs(input);
    // 원본보다 더 많은 내용이 생성되거나 분리되어야 함
    expect(result).not.toBe(input);
    expect(result).toContain('<p>');
  });

  it('빈 입력 시 빈 문자열을 반환한다', () => {
    expect(formatParagraphs('')).toBe('');
  });

  it('4문장 이상일 때 GROUP_PATTERN에 따라 <p>로 분리된다', () => {
    const sentences = [
      '첫 번째 문장입니다.',
      '두 번째 문장입니다.',
      '세 번째 문장입니다.',
      '네 번째 문장입니다.',
      '다섯 번째 문장입니다.',
    ];
    const input = `<p>${sentences.join(' ')}</p>`;
    const result = formatParagraphs(input);
    // GROUP_PATTERN[0]=2이므로 첫 그룹은 2문장, 다음은 3문장
    // 총 5문장 → 2 + 3 = 2개의 <p> 태그
    const pCount = (result.match(/<p>/g) || []).length;
    expect(pCount).toBe(2);
    // 첫 번째 <p>에 2문장 포함
    expect(result).toMatch(/<p>첫 번째 문장입니다\. 두 번째 문장입니다\.<\/p>/);
  });

  it('p 태그가 아닌 내용은 그대로 유지된다', () => {
    const input = '<h2>제목</h2><p>내용입니다.</p>';
    const result = formatParagraphs(input);
    expect(result).toContain('<h2>제목</h2>');
  });
});

describe('analyzePost', () => {
  const makeKeywords = (main, sub = []) => ({ main, sub });

  it('제목이 메인 키워드로 시작하면 titleKeyStart=true', () => {
    const result = analyzePost(
      '맛집 추천 베스트 10곳 소개합니다',
      '<p>맛집 관련 콘텐츠입니다. 맛집을 찾아보세요. 맛집 정보를 드립니다.</p>',
      makeKeywords('맛집')
    );
    expect(result.checks.titleKeyStart).toBe(true);
  });

  it('제목 길이 10~30자일 때 titleLength=true', () => {
    const title = '맛집 추천 베스트 10곳'; // 11자
    const result = analyzePost(
      title,
      '<p>내용</p>',
      makeKeywords('맛집')
    );
    expect(result.checks.titleLength).toBe(true);
  });

  it('콘텐츠 길이가 targetLength 미달 시 length_short 이슈 생성', () => {
    const result = analyzePost(
      '짧은 글 테스트 제목입니다 열자이상',
      '<p>짧은 내용</p>',
      makeKeywords('짧은'),
      1500
    );
    expect(result.checks.contentLength).toBe(false);
    const issue = result.issues.find(i => i.id === 'length_short');
    expect(issue).toBeDefined();
    expect(issue.type).toBe('info');
  });

  it('메인 키워드 3~5회 반복 시 mainKeyDensity=true', () => {
    const keyword = '카페';
    // 카페를 정확히 4번 포함
    const content = '<p>카페 방문 후기입니다. 이 카페는 분위기가 좋습니다. 카페 메뉴도 다양하고 카페 인테리어도 예쁩니다.</p>';
    const result = analyzePost(
      '카페 추천 분위기 좋은 곳 모음집',
      content,
      makeKeywords(keyword)
    );
    expect(result.checks.mainKeyDensity).toBe(true);
  });

  it('빈 mainKeyword 시 no_keyword 에러 이슈 생성', () => {
    const result = analyzePost(
      '제목입니다 테스트용 제목이에요',
      '<p>내용입니다.</p>',
      makeKeywords('')
    );
    const issue = result.issues.find(i => i.id === 'no_keyword');
    expect(issue).toBeDefined();
    expect(issue.type).toBe('error');
  });

  it('H2와 H3 모두 존재 시 structure=true', () => {
    const content = '<h2>소제목</h2><p>내용</p><h3>하위 소제목</h3><p>추가 내용</p>';
    const result = analyzePost(
      '구조화된 글 테스트 제목입니다',
      content,
      makeKeywords('구조화')
    );
    expect(result.checks.structure).toBe(true);
  });

  it('이미지 5~15장 범위일 때 imageCount=true', () => {
    const imgs = Array.from({ length: 7 }, (_, i) =>
      `<img src="img${i}.jpg" alt="이미지${i}" />`
    ).join('');
    const content = `<p>내용</p>${imgs}`;
    const result = analyzePost(
      '이미지 테스트 제목이 됩니다',
      content,
      makeKeywords('이미지')
    );
    expect(result.checks.imageCount).toBe(true);
    expect(result.imageCount).toBe(7);
  });
});
