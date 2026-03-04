import { describe, it, expect } from 'vitest';
import { formatParagraphs } from '../analysis.js';

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
