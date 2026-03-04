import { describe, it, expect, vi, beforeEach } from 'vitest';

// 모킹 설정
vi.mock('../firebase', () => ({
    callGeminiProxy: vi.fn(),
    callGeminiImageProxy: vi.fn(),
}));

vi.mock('../../data/categories', () => ({
    getRecommendedImages: vi.fn(() => 10),
    CATEGORIES: [],
}));

// AIService import (모킹 후)
const { AIService } = await import('../openai.js');

describe('AIService 유틸리티 메서드', () => {
    beforeEach(() => {
        AIService.resetTokenStats();
        vi.restoreAllMocks();
    });

    describe('_tryParseJson', () => {
        it('유효 JSON 직접 파싱 성공', () => {
            const result = AIService._tryParseJson('{"key": "value"}');
            expect(result).toEqual({ key: 'value' });
        });

        it('{...} 패턴 추출 후 파싱 성공', () => {
            const text = '여기 결과입니다: {"title": "테스트"} 끝';
            const result = AIService._tryParseJson(text);
            expect(result).toEqual({ title: '테스트' });
        });

        it('"html": "..." 패턴 직접 추출', () => {
            // JSON 문자열 내 줄바꿈으로 파싱 실패하는 케이스
            const text = '{"html": "안녕하세요\n세계"}';
            const result = AIService._tryParseJson(text);
            expect(result).toHaveProperty('html');
            expect(result.html).toContain('안녕하세요');
        });

        it('완전 파싱 불가 시 null 반환', () => {
            const result = AIService._tryParseJson('이것은 JSON이 아닙니다');
            expect(result).toBeNull();
        });
    });

    describe('_recordTokenUsage', () => {
        it('누적 집계 정확성', () => {
            // console.log 억제
            vi.spyOn(console, 'log').mockImplementation(() => {});

            AIService._recordTokenUsage(
                { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
                '첫 번째 호출'
            );
            AIService._recordTokenUsage(
                { promptTokenCount: 200, candidatesTokenCount: 100, totalTokenCount: 300 },
                '두 번째 호출'
            );

            const stats = AIService.getTokenStats();
            expect(stats.totalPrompt).toBe(300);
            expect(stats.totalCandidates).toBe(150);
            expect(stats.totalTokens).toBe(450);
            expect(stats.callCount).toBe(2);
            expect(stats.history).toHaveLength(2);
        });
    });

    describe('getTokenStats', () => {
        it('복사본을 반환하여 원본 불변 보장', () => {
            vi.spyOn(console, 'log').mockImplementation(() => {});

            AIService._recordTokenUsage(
                { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
                '테스트'
            );

            const stats = AIService.getTokenStats();
            stats.totalPrompt = 9999;
            stats.callCount = 9999;

            const original = AIService.getTokenStats();
            expect(original.totalPrompt).toBe(10);
            expect(original.callCount).toBe(1);
        });
    });

    describe('resetTokenStats', () => {
        it('모든 카운터 0 리셋', () => {
            vi.spyOn(console, 'log').mockImplementation(() => {});

            AIService._recordTokenUsage(
                { promptTokenCount: 500, candidatesTokenCount: 250, totalTokenCount: 750 },
                '리셋 전'
            );

            AIService.resetTokenStats();

            const stats = AIService.getTokenStats();
            expect(stats.totalPrompt).toBe(0);
            expect(stats.totalCandidates).toBe(0);
            expect(stats.totalTokens).toBe(0);
            expect(stats.callCount).toBe(0);
            expect(stats.history).toEqual([]);
        });
    });
});
