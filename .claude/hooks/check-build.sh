#!/bin/bash
# check-build.sh — src/ 파일 수정 시 자동 빌드 확인
# PostToolUse 훅에서 Edit/Write 후 실행됨

TOOL_INPUT="$1"

# src/ 또는 index.html 수정 시에만 빌드 실행
if echo "$TOOL_INPUT" | grep -qE '(src/|index\.html)'; then
  echo "🔨 src/ 파일 변경 감지 — 빌드 확인 중..."

  BUILD_OUTPUT=$(npm run build 2>&1)
  BUILD_EXIT=$?

  if [ $BUILD_EXIT -ne 0 ]; then
    echo "❌ 빌드 실패! 즉시 수정 필요:"
    echo "$BUILD_OUTPUT" | tail -20
    exit 1
  else
    echo "✅ 빌드 성공"
  fi
else
  # docs, CLAUDE.md, .claude/ 등 비코드 파일은 무시
  exit 0
fi
