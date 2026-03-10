#!/bin/bash
# pre-commit-build.sh — git commit 실행 직전에만 빌드 확인
# PreToolUse 훅에서 Bash 호출 시 실행됨

TOOL_INPUT="$1"

# git commit 명령인 경우에만 빌드 실행
if echo "$TOOL_INPUT" | grep -qE 'git commit'; then
  echo "🔨 커밋 전 빌드 확인 중..."

  BUILD_OUTPUT=$(npm run build 2>&1)
  BUILD_EXIT=$?

  if [ $BUILD_EXIT -ne 0 ]; then
    echo "❌ 빌드 실패! 커밋 중단. 즉시 수정 필요:"
    echo "$BUILD_OUTPUT" | tail -20
    exit 1
  else
    echo "✅ 빌드 성공 — 커밋 진행"
  fi
else
  exit 0
fi
