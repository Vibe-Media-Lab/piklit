import { describe, it, expect, vi, beforeEach } from 'vitest';

// firebase.js 모킹 — callGeminiProxy, callGeminiImageProxy
vi.mock('../firebase', () => ({
  callGeminiProxy: vi.fn(),
  callGeminiImageProxy: vi.fn(),
  auth: { currentUser: null },
  googleProvider: {},
  default: {},
}));

// categories.js 모킹 — getRecommendedImages
vi.mock('../../data/categories', () => ({
  getRecommendedImages: vi.fn(() => []),
}));

import { AIService } from '../openai';
import { callGeminiProxy, callGeminiImageProxy } from '../firebase';
import { getRecommendedImages } from '../../data/categories';

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AIService.resetTokenStats();
    // console 스파이 설정 (노이즈 방지)
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // localStorage 모킹
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  describe('토큰 통계 관리', () => {
    it('resetTokenStats로 초기화 후 모든 값이 0이어야 한다', () => {
      const stats = AIService.getTokenStats();
      expect(stats.totalPrompt).toBe(0);
      expect(stats.totalCandidates).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.callCount).toBe(0);
      expect(stats.history).toEqual([]);
    });

    it('_recordTokenUsage로 토큰 사용량이 누적되어야 한다', () => {
      AIService._recordTokenUsage(
        { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        '테스트 호출'
      );
      const stats = AIService.getTokenStats();
      expect(stats.totalPrompt).toBe(10);
      expect(stats.totalCandidates).toBe(20);
      expect(stats.totalTokens).toBe(30);
      expect(stats.callCount).toBe(1);
      expect(stats.history).toHaveLength(1);
      expect(stats.history[0].label).toBe('테스트 호출');
    });
  });

  describe('_tryParseJson', () => {
    it('유효한 JSON 문자열을 파싱해야 한다', () => {
      const result = AIService._tryParseJson('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('코드 블록 없이 중괄호 패턴을 추출해야 한다', () => {
      const result = AIService._tryParseJson('some text {"key": "value"} more text');
      expect(result).toEqual({ key: 'value' });
    });

    it('파싱 불가 시 null을 반환해야 한다', () => {
      const result = AIService._tryParseJson('not json at all');
      expect(result).toBeNull();
    });
  });

  describe('generateContent', () => {
    it('정상 JSON 응답을 파싱해야 한다', async () => {
      callGeminiProxy.mockResolvedValueOnce({
        data: {
          candidates: [{ content: { parts: [{ text: '{"html": "<p>테스트</p>"}' }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10, totalTokenCount: 15 },
        },
      });

      const result = await AIService.generateContent('테스트 프롬프트', {}, '테스트');
      expect(result).toEqual({ html: '<p>테스트</p>' });
      expect(callGeminiProxy).toHaveBeenCalledTimes(1);
    });

    it('rawText 옵션 시 텍스트를 그대로 반환해야 한다', async () => {
      callGeminiProxy.mockResolvedValueOnce({
        data: {
          candidates: [{ content: { parts: [{ text: '원본 텍스트' }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10, totalTokenCount: 15 },
        },
      });

      const result = await AIService.generateContent('테스트', { rawText: true }, '테스트');
      expect(result).toEqual({ text: '원본 텍스트' });
    });

    it('429 QUOTA_EXCEEDED 에러는 재시도 없이 throw해야 한다', async () => {
      const error = new Error('quota exceeded');
      error.status = 429;
      error.code = 'QUOTA_EXCEEDED';
      callGeminiProxy.mockRejectedValueOnce(error);

      await expect(AIService.generateContent('테스트')).rejects.toThrow();
      expect(callGeminiProxy).toHaveBeenCalledTimes(1);
    });
  });
});
