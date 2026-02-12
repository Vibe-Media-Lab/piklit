---
description: End Work - 세션 마무리, 문서화 및 백업 (Git Push)
---

1. `task.md` 및 `walkthrough.md` (brain 아티팩트) 업데이트 및 릴리즈 버전 상향.
   - **[핵심]** `walkthrough.md`는 세션 시작 시점부터 종료 시점까지 **당일 모든 내역을 1시간 단위**로 상세히 기록(사초)하며, 100% 순수 한국어만 사용한다.
2. **[필수]** 사초(National Archive) 완성 후, 의미가 상실된 중간 기록물(진단 스크립트, 임시 파일 등)을 **자동 삭제**하여 시스템 결벽성을 확보한다.
3. **[필수]** 일일 작업 로그 생성: `.agent/scripts/generate_daily_log.py` 실행.
   - **[중요]** 생성된 `execution_YYYYMMDD.log`가 'Gold Standard' 형식을 준수하는지 최종 확인한다.
4. **[필수]** 금일 최종 작업본 백업 (Git Commit & Push).
5. 최종 정렬 확인 및 비즈니스 표준 어조의 세션 종료 보고.
