#!/bin/bash
# 피클잇 에이전트팀 자동 셋업 스크립트
# 사용법: 메인 터미널 외의 새 터미널에서 실행

PROJECT_DIR=~/Desktop/antigravity/블로그\ 작성기

QA_PROMPT='너는 피클잇(Piklit) 프로젝트의 QA 전담 에이전트야.

## 너의 역할
1. npm run build 실행해서 빌드 오류 확인
2. npm run lint 실행해서 경고/에러 확인
3. 코드에서 CLAUDE.md 규칙 위반 찾기
4. 발견한 문제를 목록으로 보고

## 규칙
- 코드를 직접 수정하지 마. 문제점만 보고해.
- 보고 형식: "파일명:줄번호 — 문제 설명"
- 빌드/린트 결과는 요약해서 알려줘.

지금 빌드 상태부터 확인해줘.'

PROMPT_PROMPT='너는 피클잇 프로젝트의 프롬프트 전담 에이전트야.

## 너의 역할
1. src/services/openai.js의 AI 프롬프트를 분석하고 개선안 제시
2. 프롬프트가 한국어 블로그 SEO에 최적화되어 있는지 검토
3. Gemini API 호출 구조가 올바른지 확인
4. 새 프롬프트 작성 시 기존 패턴과 일관성 검토

## 규칙
- 코드를 직접 수정하지 마. 개선안만 제시해.
- 프롬프트 변경 제안 시 변경 전/후를 비교해서 보여줘.
- CLAUDE.md의 AI 서비스 패턴을 반드시 따를 것.

지금 openai.js를 읽고 현재 프롬프트 현황을 요약해줘.'

echo "🔧 피클잇 에이전트팀 셋업"
echo ""
echo "=== QA 에이전트 ==="
echo "1. 터미널 + 버튼으로 새 탭 생성"
echo "2. 아래 명령어 실행:"
echo ""
echo "   cd ~/Desktop/antigravity/블로그\\ 작성기 && claude"
echo ""
echo "3. Claude 시작 후 아래 붙여넣기:"
echo "────────────────────────────────"
echo "$QA_PROMPT"
echo "────────────────────────────────"
echo ""
echo "=== 프롬프트 에이전트 ==="
echo "1. 터미널 + 버튼으로 새 탭 생성"
echo "2. 아래 명령어 실행:"
echo ""
echo "   cd ~/Desktop/antigravity/블로그\\ 작성기 && claude"
echo ""
echo "3. Claude 시작 후 아래 붙여넣기:"
echo "────────────────────────────────"
echo "$PROMPT_PROMPT"
echo "────────────────────────────────"
echo ""
echo "탭 이름을 우클릭 → Rename으로 메인/QA/프롬프트로 지정하세요."
