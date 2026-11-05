# MOVE 2027 — 광교 이사 준비 대시보드

2027년 2월 11일 이사 준비를 위한 정적 웹페이지입니다.

- 웹페이지 경로: `/moving-2027/`
- GitHub Pages 예상 URL: https://woonkyong.github.io/moving-2027/
- 구현: HTML + CSS + JavaScript (외부 라이브러리 없음)
- 기능: D-day, 월별 준비 로드맵, 25개 체크리스트, 견적 4곳 비교, 당일 일정, 메모, 백업(JSON), 인쇄
- 저장 방식: 브라우저의 `localStorage`; 백엔드에 업로드하지 않음
- 보안: 공개 GitHub Pages 저장소이므로 금융 정보 및 연락처는 코드에 직접 기록하지 않음. 방문자와 기기 사이에서 체크리스트는 자동 동기화되지 않음.

## 수정 방법

`index.html`의 CSS와 JavaScript를 편집하고 `main`에 커밋하면 됩니다.

## GitHub Pages 설정

사이트가 게시되지 않는 경우 저장소의 **Settings → Pages**에서 `Deploy from a branch`, `main`, `/(root)` 구성을 확인하세요.

> 개인 이동 일정과 아파트 이름은 페이지에 포함되어 있습니다. 이 저장소는 공개 저장소입니다.
