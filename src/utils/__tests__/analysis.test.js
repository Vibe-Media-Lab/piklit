import { describe, it, expect } from 'vitest';
import { formatParagraphs } from '../analysis';

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
