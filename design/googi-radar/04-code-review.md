> 상태: 사용자 확인 완료 (2026-11-10)
> 연동 없이 진행: (없음) — code-auditor 에이전트(web-design-guidelines 스킬) 사용
> 검토 회차: 1차 (2026-11-10) · 아래 본문은 에이전트 보고서 원문 그대로

# 코드 가이드라인 검수
> 검토 대상: C:\Users\USER\OneDrive\바탕 화면\My\Career camp\googi radar\design\googi-radar\ui\ (index.html, app.js, styles.css)
> 가이드라인: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md · 받아온 시각: 2026-11-10 (시:분은 확인하지 못함) · 받아오기: 성공
> 참고: WebFetch 도구가 원문 그대로를 주지 않고 규칙을 항목별로 풀어 쓴 형태로 돌려줬습니다. 규칙 목록(17개 분류와 안티패턴)과 출력 형식은 모두 받았고, 그 내용을 기준으로 검사했습니다.

## 요약 (위반 38건, 파일 3개)
- index.html 5건, app.js 21건, styles.css 12건
- 많이 나온 문제: hover 상태가 전혀 없음, 화면·필터 상태가 URL에 남지 않음, 운영자 입력 폼의 name·autocomplete·오류 표시, 날짜·퍼센트·통화를 직접 문자열로 만듦, 터치 관련 CSS 없음, 하단 탭바에 safe-area 처리 없음

## 결과

### design/googi-radar/ui/index.html

design/googi-radar/ui/index.html:5 - [Dark Mode & Theming] `<meta name="theme-color">` 없음. 배경색 #E9EBEE와 맞춰 추가
design/googi-radar/ui/index.html:9 - [Accessibility] 본문으로 건너뛰는 링크 없음. 개발용 aside와 appbar를 지나야 main(#screen)에 닿음
design/googi-radar/ui/index.html:18 - [Accessibility] "← 목록으로"의 "←"는 장식용 기호인데 aria-hidden이 없어 화면 낭독기가 읽음
design/googi-radar/ui/index.html:19 - [Locale & i18n] 서비스 이름 "고기 레이더"에 translate="no" 없음
design/googi-radar/ui/index.html:24 - [Navigation & State] 탭 전환(24-26줄)이 `<button>`과 JS 상태로만 동작. `<a href>`나 URL(해시·쿼리)에 반영되지 않아 뒤로가기, 새 탭 열기, 딥링크가 안 됨

### design/googi-radar/ui/app.js

design/googi-radar/ui/app.js:42 - [Locale & i18n] won()/won10()(42-43줄)이 '원'을 직접 붙임. 통화는 Intl.NumberFormat('ko-KR', {style:'currency', currency:'KRW'})로
design/googi-radar/ui/app.js:134 - [Content & Copy] 개수를 "한 곳"처럼 말로 씀. 숫자로("1곳") 쓸 것 (221, 292줄도 같음)
design/googi-radar/ui/app.js:151 - [Locale & i18n] 거리를 `${s.dist}m`로 직접 만듦 (207, 223, 286줄도 같음). Intl.NumberFormat unit:'meter'
design/googi-radar/ui/app.js:160 - [Locale & i18n] 메뉴 확인일을 ISO 문자열('2026-10-20') 그대로 보여 줌 (287, 314줄도 같음). Intl.DateTimeFormat으로
design/googi-radar/ui/app.js:188 - [Locale & i18n] 브랜드 이름 "카카오맵"에 translate="no" 없음 (288, 317줄도 같음)
design/googi-radar/ui/app.js:220 - [Accessibility] 비교 화면이 비어 있을 때(247줄) picker의 `<h3>`가 h1 바로 다음에 나와 h2를 건너뜀
design/googi-radar/ui/app.js:220 - [Content & Copy] "닫기"는 무엇을 닫는지 알 수 없는 라벨. 295줄의 "추가 목록 닫기"와도 다름
design/googi-radar/ui/app.js:235 - [Locale & i18n] 퍼센트를 toFixed(1)+'%'로 직접 만듦 (239, 285, 371줄도 같음). Intl.NumberFormat style:'percent'
design/googi-radar/ui/app.js:245 - [Typography] 곧은 따옴표 "가게 추가" → “가게 추가”
design/googi-radar/ui/app.js:246 - [Accessibility] "+ 가게 추가"의 "+" 장식 기호에 aria-hidden 없음 (295줄도 같음)
design/googi-radar/ui/app.js:280 - [Navigation & State] "빼기"를 누르면 확인이나 되돌리기 없이 비교 목록에서 바로 빠짐 (162줄도 같음). 되돌리기 토스트 등 필요. 정도는 가벼움
design/googi-radar/ui/app.js:316 - [Accessibility] 즐겨찾기 버튼의 ★/☆ 아이콘이 글자와 함께 읽힘. aria-hidden을 단 span으로 감쌀 것
design/googi-radar/ui/app.js:335 - [Typography] 곧은 따옴표 "중량 미표기" → “중량 미표기”
design/googi-radar/ui/app.js:351 - [Forms] 입력하다가 페이지를 떠나거나 새로고침할 때 경고 없음 (beforeunload 없음)
design/googi-radar/ui/app.js:353 - [Forms] 폼 입력 요소(353-365줄의 select, input)에 모두 name 속성이 없음
design/googi-radar/ui/app.js:354 - [Forms] placeholder "예: 생삼겹살"이 …로 끝나지 않음 (359, 360, 361줄도 같음)
design/googi-radar/ui/app.js:359 - [Forms] 인증과 상관없는 입력에 autocomplete="off"가 없음 (359, 360, 361, 363, 364줄. 354줄에는 있음)
design/googi-radar/ui/app.js:362 - [Forms] 오류가 해당 필드 옆이 아니라 #calc 한 줄에만 나옴. 모든 필드가 aria-describedby="calc"를 같이 씀(347줄)
design/googi-radar/ui/app.js:371 - [Content Handling] entered.length가 0이면 "0곳 중 0곳(NaN%)"이 나옴. 빈 상태 처리 없음
design/googi-radar/ui/app.js:441 - [Navigation & State] 필터(441줄), 비교 기준(442줄), 선택한 핀(428줄), 추가 목록 열림(432줄) 상태가 URL에 남지 않음
design/googi-radar/ui/app.js:459 - [Forms] 저장에 실패해도 첫 오류 필드로 포커스가 가지 않음. 메시지에 tabindex만 넣고 focus()는 부르지 않음

### design/googi-radar/ui/styles.css

design/googi-radar/ui/styles.css:21 - [Touch & Interaction] button, a, input에 touch-action: manipulation 없음
design/googi-radar/ui/styles.css:21 - [Touch & Interaction] -webkit-tap-highlight-color를 따로 정하지 않음
design/googi-radar/ui/styles.css:21 - [Touch & Interaction] html에 @media (pointer: fine) { overscroll-behavior: none } 없음
design/googi-radar/ui/styles.css:45 - [Content Handling] .appbar h1이 flex:1인데 min-width:0이나 overflow-wrap이 없음. 상세 화면 제목(가게 이름)이 길면 대응 안 됨
design/googi-radar/ui/styles.css:45 - [Typography] 제목에 text-wrap: balance 없음 (88, 99, 109, 150, 164, 171줄도 같음)
design/googi-radar/ui/styles.css:51 - [Focus States] sticky 하단 탭바(높이 56px)가 포커스된 요소를 가릴 수 있음. html에 scroll-padding-bottom 필요
design/googi-radar/ui/styles.css:51 - [Safe Areas & Layout] 하단 탭바에 env(safe-area-inset-bottom) 없음 (189줄 .toast도 같음)
design/googi-radar/ui/styles.css:56 - [Hover & Interactive States] .btn에 :hover 없음. .dev button(39), .tabbar button(52), .chip(68), .pin(79), .star(111), .remove(144), 링크에도 hover 상태가 전혀 없음
design/googi-radar/ui/styles.css:79 - [Typography] 지도 핀에 가격을 비교하는 숫자가 나오는데 font-variant-numeric: tabular-nums 없음
design/googi-radar/ui/styles.css:109 - [Content Handling] .label__name이 flex:1인데 min-width:0이나 overflow-wrap 없음
design/googi-radar/ui/styles.css:151 - [Content Handling] .sise__row의 이름 칸이 72px로 고정돼 있는데 긴 가게 이름 처리(줄임표나 줄바꿈)가 없음
design/googi-radar/ui/styles.css:167 - [Content Handling] .picker li 안의 이름 span(flex 자식)에 min-width:0 없음

## 코드만으로 판단할 수 없는 규칙
| 규칙 | 이유 |
|---|---|
| Title Case 제목·버튼 (Content & Copy) | 한국어 화면이라 적용할 수 없음 |
| 능동태, 2인칭 사용, 1인칭 피하기 | 한국어 문장은 주어를 생략하는 경우가 많아 영어 기준을 그대로 대기 어려움 |
| 요청 시작 전까지 제출 버튼 활성, 요청 중 스피너 | save()가 동기 목업이라 실제 네트워크 요청이 없음 |
| Hydration Safety (value/onChange, 날짜 hydration, suppressHydrationWarning) | SSR이나 프레임워크가 없는 순수 DOM 코드라 해당 없음 |
| Images (width/height, lazy, fetchpriority) | `<img>`가 없음 |
| Performance (preconnect, 폰트 preload, 50개 넘는 목록 가상화) | 외부 자원이나 웹폰트가 없고 가짜 데이터가 12건뿐. 실제 데이터 규모는 알 수 없음 |
| hover·active·focus 상태가 평소보다 대비가 큰지 | hover 상태 자체가 없음(위에 적음). 대비 수치는 화면에서 재야 함 |
| Animation (prefers-reduced-motion, transform/opacity만 애니메이션) | 애니메이션이 없음. styles.css:192-194에 reduced-motion 처리는 있음 |
| sticky 탭바가 포커스 요소를 실제로 가리는지 | 실제 스크롤 위치에서 확인해야 함 (가능성만 위에 적음) |
| 하이브리드 터치 기기 테스트 | 실제 기기가 필요함 |
| 미디어 자막, 미디어 키보드 조작 | 영상·음성이 없음 |
| Accept-Language / navigator.languages로 언어 감지 | 한국어만 쓰는 앱이라 해당 없음 |
| color-scheme: dark, select 다크 모드 색상 | 밝은 테마만 있음. select에는 배경색과 글자색이 지정돼 있음(styles.css:133, 177) |
| 제스처 대체 수단, 드래그 중 처리 | 드래그·스와이프·핀치 동작이 없음 |

---

## 2차 리뷰 (2026-11-10) · 새 code-auditor 에이전트 · 아래 본문은 보고서 원문 그대로

# 코드 가이드라인 검수
> 검토 대상: C:\Users\USER\OneDrive\바탕 화면\My\Career camp\googi radar\design\googi-radar\ui\ (index.html, styles.css, app.js)
> 가이드라인: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md · 받아온 시각: 2026-11-10 (정확한 시:분은 확인할 수 없음) · 받아오기: 성공
> 참고: WebFetch가 원문을 그대로 돌려주지 않고 요약 모델을 거쳐 돌려줬습니다. 그래서 다시 요청해 섹션별 규칙 목록을 받았고, 몇몇 항목은 원문이 아니라 의역입니다. 이 목록과 문서가 정한 출력 형식(`file:line - issue`)을 기준으로 검사했습니다.

## 요약 (위반 28건, 파일 3개)
- index.html 4건, styles.css 5건, app.js 19건
- 가장 큰 문제 두 가지:
  - 화면 이동을 `<button>`으로 처리하고, 화면 상태를 URL에 반영하지 않습니다.
  - 날짜와 퍼센트 표기를 `Intl`을 쓰지 않고 코드에 직접 고정해 두었습니다.
- 잘 지킨 부분: 접근성 기본기(aria-label, aria-hidden, aria-live, skip link, fieldset/legend, 라벨로 감싼 컨트롤), `:focus-visible`, `prefers-reduced-motion`, `beforeunload`, 제출 시 첫 오류 칸으로 포커스, 빈 화면 처리, `…`와 둥근 따옴표 사용, `tabular-nums`, 하단 safe-area.

## 결과

## index.html

index.html:6 - `theme-color` #FFFFFF가 페이지 배경(`--color-bg` #E9EBEE, styles.css:3·26)과 다름 → 배경색에 맞추기
index.html:21 - "목록으로" 뒤로가기가 화면 이동인데 `<button>`임 → 실제 URL을 가진 `<a href>`로
index.html:22 - 브랜드명 "고기 레이더" h1에 `translate="no"` 없음
index.html:27 - 탭 3개(27~29줄)가 화면 이동용 `<button>`임. URL이 바뀌지 않아 새 탭 열기, 딥링크, 뒤로가기가 안 됨 → `<a href="#map">` 같은 링크와 URL 동기화

## styles.css

styles.css:36 - `.skip:focus` → `:focus-visible` 사용
styles.css:49 - index.html:5에서 `viewport-fit=cover`를 썼는데 `.appbar`에 `env(safe-area-inset-top/left/right)`가 없음 → 노치에 가려질 수 있음
styles.css:54 - `main:focus { outline: none; }` 대체 포커스 표시 없음. main은 프로그램이 포커스를 옮기는 대상(tabindex="-1")이라 의도된 처리로 보이지만, 규칙상 반패턴에 해당하므로 표시해 둠
styles.css:66 - `.btn--primary:hover`가 ink(#1D2A44)에서 muted(#5F6670)로 바뀌어 대비가 오히려 약해짐 → hover가 기본 상태보다 더 눈에 띄어야 함
styles.css:149 - `.cmp-controls select`에 hover 상태 없음(`.field select`는 198줄에 있음)

## app.js

app.js:109 - "카카오맵" 브랜드명에 `translate="no"` 없음
app.js:153 - 가게 이름(고유명사) h3에 `translate="no"` 없음(174·178·289줄의 가게 이름도 같음)
app.js:163 - 메뉴 확인일 `s.checked`를 ISO 문자열(2026-10-20) 그대로 출력 → `Intl.DateTimeFormat`
app.js:166 - "상세 보기"가 화면 이동인데 `<button>`임 → `<a href>` + 딥링크
app.js:180 - "상세 보기"가 화면 이동인데 `<button>`임 → `<a href>`
app.js:215 - "상세 보기"가 화면 이동인데 `<button>`임 → `<a href>`
app.js:244 - 퍼센트를 `toFixed(1) + '%'`로 직접 만듦 → `Intl.NumberFormat({style:'percent'})`
app.js:248 - 퍼센트 직접 포맷(위와 같음)
app.js:255 - "목록으로 가기"가 화면 이동인데 `<button>`임 → `<a href>`
app.js:289 - "빼기"를 누르면 비교에서 바로 빠지고 되돌리기가 없음(처리는 461줄) → 토스트에 "되돌리기" 제공
app.js:294 - 퍼센트 직접 포맷 → `Intl.NumberFormat`
app.js:296 - 메뉴 확인일 ISO 문자열 그대로 출력 → `Intl.DateTimeFormat`
app.js:323 - 메뉴 확인일 ISO 문자열 그대로 출력 → `Intl.DateTimeFormat`
app.js:358 - 숫자 입력 placeholder("예: 9000", "예: 160", "예: 14000", 370~372줄에서 사용)가 `…`로 끝나지 않음
app.js:361 - 비율 퍼센트를 `Math.round(...) + '%'`로 직접 만듦 → `Intl.NumberFormat`
app.js:365 - placeholder "예: 생삼겹살"이 `…`로 끝나지 않음
app.js:373 - 검증 오류가 칸마다 붙지 않고 `#calc` 한 줄에 모여 있음. 100g당 가격(370줄) 오류가 해당 칸과 두 칸 떨어진 곳에 표시됨 → 오류난 칸 바로 아래에 표시
app.js:458 - 탭(화면) 상태가 `ST`에만 있고 URL에 반영되지 않음 → 해시나 쿼리로 동기화
app.js:473 - 필터(부위·종류·원산지), 비교 기준(474줄), 열린 핀(459줄)이 URL에 반영되지 않아 공유·새로고침하면 상태가 사라짐

## 코드만으로 판단할 수 없는 규칙
| 규칙 | 이유 |
|---|---|
| Title Case (Chicago style) | 한국어 문구라 적용할 수 없음 |
| 능동태 / 2인칭, 1인칭 피하기 | 영어 문체 기준이라 한국어 존댓말("보여 드릴게요", "계산해 드려요")에 그대로 적용할 수 없음. 문구 담당이 판단해야 함 |
| 언어 감지(`navigator.languages`) | 41·43줄에 'ko-KR'이 고정돼 있음. 한국어 전용 서비스라면 의도된 것일 수 있어 기획 확인이 필요함 |
| 제출 중 스피너 / 요청 시작 전까지 버튼 활성 | 저장(384줄)이 가짜 동기 처리라 실제 요청 흐름이 없음 |
| 큰 목록 가상화(>50개) | 가짜 데이터는 12곳뿐임. 실제 데이터 규모를 알 수 없음 |
| sticky 탭바가 포커스를 가리지 않는지 | `scroll-padding-bottom`(styles.css:24)은 있으나, 실제로 가려지는지는 브라우저에서 확인해야 함. fixed 토스트(styles.css:211)도 같음 |
| Hydration Safety 전반 | SSR이나 React 없이 순수 DOM 렌더라 해당 없음 |
| 이미지 크기·lazy·priority, GIF/비디오 | `<img>`나 미디어가 없음 |
| 애니메이션 관련(transform/opacity, 중단 가능 여부 등) | 애니메이션이나 transition이 없음. 감속 모드 처리(styles.css:214)는 있음 |
| preconnect / 폰트 preload | 웹폰트나 외부 에셋이 없음(카카오는 외부 링크뿐) |
| 다크 모드(`color-scheme`, select 색상) | 다크 테마가 없음. select의 배경색과 글자색은 명시돼 있음(styles.css:27·149·197) |
| hover 대비 증가의 실제 체감 | 색 값만으로 판단했음. 실제 대비는 화면에서 확인해야 함 |
| safe-area 실제 동작 | 노치 기기에서 직접 확인해야 함 |

## 받아온 문서 안의 검사 외 지시
없음. 파일 생성·수정, 다른 주소 접속, 범위 밖 파일 읽기 같은 지시는 없었습니다. 문서에 채워지지 않은 `$ARGUMENTS` 자리 표시자가 있었고, 호출한 쪽이 준 경로로 대신했습니다.

---

## 2차 디자인 리뷰 1회차 (2026-11-10) · 01 "2차 디자인 방향" 적용 후 · 새 code-auditor 에이전트 · 아래 본문은 보고서 원문 그대로

# 코드 가이드라인 검수
> 검토 대상: C:\Users\USER\OneDrive\바탕 화면\My\Career camp\googi radar\design\googi-radar\ui\ (index.html, styles.css, app.js)
> 가이드라인: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md · 받아온 시각: 2026-11-10 (시:분은 확인할 수 없음) · 받아오기: 성공
> 참고: WebFetch는 원문을 그대로 주지 않고 요약해서 돌려줬습니다. 그래서 같은 주소를 한 번 더 받아와 규칙을 하나씩 다시 받았습니다. 아래 검사는 그렇게 정리한 규칙 목록(15개 분류와 피해야 할 패턴)을 기준으로 했습니다.

## 요약 (위반 18건, 파일 3개)
- index.html 4건 · styles.css 5건 · app.js 9건
- 꼭 고칠 것: 남색 머리띠 위 버튼의 포커스 링이 보이지 않음(styles.css:44), 화면 상태가 URL에 남지 않음(app.js:471-488)

## 결과

### index.html
- index.html:6 - Dark Mode & Theming: theme-color `#2E2724`가 실제 페이지 바탕(body `--color-bg-deep` `#241E1B`, styles.css:36)과 다름. `.app` 밖 바탕색과 맞출 것
- index.html:11-12 - Performance: 핵심 글꼴(Pretendard, Barlow Condensed)에 `<link rel="preload">`가 없음. preconnect만 있음
- index.html:26, 35-37 - Navigation & State: "목록으로" 버튼과 하단 탭 3개가 클릭 핸들러로 화면을 바꾸는 `<button>`임. 탐색인데 링크(`<a href>`)가 아니어서 URL이 바뀌지 않고 Ctrl+클릭·가운데 클릭도 안 됨
- index.html:29 - Locale & i18n: 서비스 이름 "고기 레이더"에 `translate="no"`가 없음

### styles.css
- styles.css:2 - Dark Mode & Theming: 어두운 테마인데 `:root`(또는 `html`)에 `color-scheme: dark`가 없음. 기본 스크롤바, 날짜 선택기, 파일 입력이 밝은 모양으로 나옴
- styles.css:44 (+165) - Focus States: `.bubble :focus-visible`가 테두리 색을 남색(`--color-ink`)으로 바꿈. 그런데 핀 패널의 "닫기" 버튼은 남색 머리띠(`.bubble__head`, 128줄) 안에 있어서 포커스 링이 바탕에 묻혀 보이지 않음
- styles.css:44 (+226) - Focus States: 같은 문제. `.picker` 안의 "추가 목록 닫기" 버튼이 남색 `.picker__head`(224줄) 위에 있어 남색 포커스 링이 보이지 않음
- styles.css:121 - Focus States: 펼친 핀 표시(`aria-expanded="true"`: 3px 숯불색 테두리, 간격 2px)가 `:focus-visible`(43줄)과 똑같음. 키보드 사용자는 포커스가 펼친 핀에 있는지 다른 핀에 있는지 알 수 없음
- styles.css:226 - Hover & Interactive States: `.picker__head .btn { background: transparent }`가 78줄 `.btn:hover`와 우선순위가 같고 뒤에 있어서 hover 배경을 덮어씀. 이 버튼에는 hover 반응이 없음(165-166줄 `.bubble__head`와 달리 hover 규칙이 빠짐)

### app.js
- app.js:170, 304, 332 - Locale & i18n: 메뉴 확인일 `s.checked`("2026-10-20")를 그대로 출력함. `Intl.DateTimeFormat`을 쓰지 않음
- app.js:252, 256, 302, 379 - Locale & i18n: 퍼센트를 `toFixed(1)`/`Math.round`에 `'%'`를 붙여 직접 만듦. `Intl.NumberFormat(..., { style: 'percent' })`를 쓰지 않음
- app.js:376, 383 - Forms: placeholder("예: 9000", "예: 생삼겹살" 등)가 `…`로 끝나지 않음
- app.js:393 - Forms: 인증과 관계없는 date 입력에 `autocomplete="off"`가 없음(382, 384-386줄 select도 같음)
- app.js:471-488 - Navigation & State: 화면(map/cmp/detail/admin), 상세 가게 id, 필터(492줄), 비교 목록, 펼친 핀이 메모리(`ST`)에만 있고 URL에 반영되지 않음. 딥링크·새로고침·뒤로 가기가 안 됨
- app.js:263 - Navigation & State: "목록으로 가기"가 탐색인데 `<button data-act="tab">`임
- app.js:297 - Navigation & State: 비교표의 "빼기"가 확인이나 되돌리기 없이 바로 실행됨(데이터를 잃지는 않아서 심각도는 낮음. 알림에 "되돌리기"를 넣는 것을 권장)
- app.js:172-173, 223 - Content & Copy: 카드마다 "비교에 넣기"/"상세 보기"가 가게 이름 없이 반복됨. 버튼 목록으로 탐색하면 구분이 안 됨(161, 238, 297줄처럼 `aria-label`이나 `sr-only`로 가게 이름을 넣을 것)
- app.js:109, 159 - Locale & i18n: 브랜드 "카카오맵"과 가게 이름(고유명사)에 `translate="no"`가 없음

## 코드만으로 판단할 수 없는 규칙
| 규칙 | 이유 |
|---|---|
| 글꼴 swap 표시(font-display) | Barlow는 `display=swap`을 확인함. Pretendard는 외부 CDN CSS(index.html:11) 안의 설정이라 이 폴더에서 확인할 수 없음 |
| 제출 버튼은 요청이 시작될 때까지 켜 두고 시작 후 스피너 표시 | save()(app.js:402)가 동기 가짜 저장이라 실제 요청 중 상태가 없음. 서버를 붙일 때 확인 필요 |
| 긴 내용 처리(아주 긴 가게 이름·숫자) | `overflow-wrap`/`min-width:0`은 대부분 있으나, 좁은 화면(320px)에서 `.cells .unit dd` 40px 숫자(styles.css:148)가 넘치는지는 실제로 그려 봐야 앎 |
| 큰 목록은 가상화(50개 넘을 때) | 가짜 데이터가 12곳이라 해당 없음. 실제 가게 수에 따라 다시 볼 것 |
| 손가락 제스처의 탭·키보드 대안 | 가짜 SVG 지도라 제스처가 없음. 실제 카카오 지도의 끌기·확대 대안은 붙인 뒤 확인 필요(지금은 목록이 대안 역할) |
| fine pointer에만 overscroll 막기, 하이브리드 기기 테스트 | 규칙대로 작성됨(styles.css:35). 실제 기기 테스트는 코드로 판단 불가 |
| 안전 영역(노치) | 위·아래 inset은 적용됨(styles.css:62, 71, 257). 가로 모드 좌우 노치는 실제 기기에서 확인 필요 |
| hover·active·focus가 기본 상태보다 눈에 띄는지 | 색 대비를 눈으로 비교해야 함 |
| 언어를 IP가 아닌 브라우저 설정으로 감지 | 한국어 전용(`lang="ko"`)으로 고정되어 있고 감지 로직이 없음. 다국어 계획이 있는지는 코드로 알 수 없음 |
| Title Case, 2인칭 사용 | 한국어 UI라 영어 기준 규칙을 그대로 적용할 수 없음 |
| Hydration 안전성 | 서버 렌더링이 없는 순수 클라이언트 코드라 해당 없음 |

참고(위반 아님): styles.css:45 `main:focus { outline: none; }`는 화면을 바꾼 뒤 포커스를 옮겨 두는 용도의 상호작용 없는 요소라 문제로 보지 않았습니다. 알림 영역(index.html:40)과 로딩 문구(app.js:212)의 `role="status"`, 건너뛰기 링크, 하단 탭에 가려지지 않게 한 `scroll-padding-bottom`, 숫자 칸 `tabular-nums`, `prefers-reduced-motion`, 저장하지 않은 입력이 있을 때의 경고(app.js:517), 첫 오류 칸으로 포커스 이동(app.js:515)은 규칙에 맞습니다.

(받아온 문서에는 검사 외 지시가 없었습니다. 파일을 만들거나 고치라는 지시, 다른 주소 접속 지시 모두 없었습니다.)

---

## 2차 디자인 리뷰 2회차 (2026-11-10) · 레이아웃 개편 후 · 새 code-auditor 에이전트 · 아래 본문은 보고서 원문 그대로

# 코드 가이드라인 검수
> 검토 대상: C:\Users\USER\OneDrive\바탕 화면\My\Career camp\googi radar\design\googi-radar\ui\ (index.html, styles.css, app.js)
> 가이드라인: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md · 받아온 시각: 2026-11-10 (시:분은 확인할 수 없음) · 받아오기: 성공
> 참고: WebFetch 도구가 문서 원문을 그대로 돌려주지 않고 항목별로 풀어 쓴 목록을 돌려줬습니다. 항목 목록(17개 분야와 Anti-patterns 14개)과 출력 형식(`file:line - issue`, 파일별로 묶음, 위반 없는 파일은 `✓ pass`)은 모두 받았습니다. 이 목록을 기준으로 검사했습니다.

## 요약 (위반 18건, 파일 3개)
기본기는 대부분 잘 지켜져 있습니다. 포커스 표시(:focus-visible), 움직임 줄이기 설정(prefers-reduced-motion), 노치 여백(safe-area), color-scheme와 theme-color, 입력칸 라벨과 autocomplete, 칸별 오류 표시와 첫 오류로 포커스 이동, 나가기 전 경고(beforeunload), 브랜드명 translate="no", 숫자 폭 고정(tabular-nums) 모두 들어가 있습니다. 남은 문제는 아래와 같습니다.
- URL 상태와 링크 구조: 화면 상태가 주소에 남지 않고, 화면 이동을 링크가 아닌 버튼으로 처리함
- Intl을 쓰지 않은 날짜·퍼센트·통화 표기
- 다시 그릴 때 새로 만들어지는 알림 영역(live region)
- 시트 높이 애니메이션
- 시트에 가려지는 지도 핀의 포커스
- 그 밖의 작은 문구·상태 표시 문제

## 결과

## index.html
index.html:11 - Performance(글꼴 미리 불러오기): Pretendard와 Barlow Condensed 글꼴 파일에 `<link rel="preload" as="font">`가 없음. 가격 숫자에 쓰는 Barlow Condensed는 핵심 글꼴이니 preload 추가 필요
index.html:33 - Accessibility(ARIA보다 시맨틱 HTML): `aria-haspopup="true"`는 menu 역할을 뜻하는데, #menu-list는 role="menu"도 아니고 화살표 키 이동도 없음 → aria-haspopup를 지우고 aria-expanded만 쓰는 펼침(disclosure) 방식으로
index.html:41-43 - Navigation(화면 이동은 링크로): 지도·목록/비교/즐겨찾기 탭이 `<button>`이라 Ctrl/가운데 클릭으로 새 탭에서 열 수 없고 주소도 바뀌지 않음 → `<a href="#/cmp">` 같은 링크로

## styles.css
styles.css:57,61 - Hover(마우스를 올렸을 때 반응): 개발용 패널의 `.dev summary`와 `.dev button`에 :hover 스타일이 없음 (개발용이라 우선순위 낮음)
styles.css:147 - Animation(transform·opacity만 애니메이션): `transition: height 0.2s`가 매 프레임 레이아웃을 다시 계산하게 함 → transform: translateY로 시트를 움직이는 방식 검토
styles.css:152 - Hover(마우스를 올렸을 때 반응): `.sheet__handle`에 :hover나 :active 반응이 없음. 손잡이를 끌 수 있다는 것이 cursor: grab 말고는 드러나지 않음
styles.css:149 / app.js:215 - Focus(오버레이가 포커스를 가리면 안 됨): 시트가 반쯤 열린 상태(height 54%)에서 지도 아래쪽 핀(top 56~86%, 예: s4, s9, s8)이 시트에 가려진 채 Tab으로 포커스를 받음. 위쪽 핀(y 16~20%)도 필터바와 범례(.legend, top 64px)에 겹칠 수 있음 → 가려진 핀은 tabindex를 빼거나 포커스할 때 시트를 접는 처리 필요

## app.js
app.js:43-44 - Locale(숫자·통화는 Intl.NumberFormat): `fmt(n) + '원'`처럼 문자열을 이어 붙여 통화를 표기함 → Intl.NumberFormat('ko-KR')로 포매터를 하나 만들어 같이 쓰기 (화면에 '원'을 쓰는 것 자체는 유지해도 됨)
app.js:166,324,355 - Locale(날짜는 Intl.DateTimeFormat): 메뉴 확인일을 `2026-10-20` 원본 문자열 그대로 보여 줌 → Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' })
app.js:264,268,322,407 - Locale(숫자는 Intl.NumberFormat): `toFixed(1) + '%'`, `Math.round(...) + '%'`로 퍼센트를 직접 만듦 → Intl.NumberFormat(..., { style: 'percent', maximumFractionDigits: 1 })
app.js:114-120,500 - Navigation(URL에 상태 반영): 화면, 필터(부위·종류·원산지), 고른 핀, 비교 목록, 상세 가게 id가 모두 메모리(ST)에만 있음. 새로고침하거나 공유하거나 뒤로 가기를 누르면 상태가 사라짐 → 쿼리나 해시와 동기화 필요
app.js:144 - Navigation(화면 이동은 링크로): "상세 보기"가 화면을 옮기는데 `<button>`임 → `<a href="#/detail/s1">`
app.js:222,234 - Accessibility(비동기 알림은 live region으로): `#sheet-status`(aria-live)와 카카오 오류 배너(role="status")가 render()가 main.innerHTML을 바꿀 때마다 내용이 든 채로 새로 생김. 이렇게 새로 끼워 넣은 live region은 화면 낭독기가 읽지 않는 경우가 많음 → 영역은 main 밖에 늘 두고 글자만 바꾸기 (#toast처럼)
app.js:336-337 (labelCard app.js:155) - Accessibility(제목 단계 순서): 즐겨찾기 화면에서 h1 다음에 h2 없이 바로 h3(가게 이름)이 옴 → h2를 하나 두거나 이 화면에서는 h2를 쓰기
app.js:411,417,418,419 - Forms(placeholder는 …으로 끝남): `예: 생삼겹살`, `예: 9000`, `예: 160`, `예: 14000` → `예: 14000…`
app.js:530 - Navigation(되돌릴 수 없는 동작은 확인이나 실행 취소): 즐겨찾기 화면에서 ★를 끄면 카드가 바로 사라지고 되살릴 방법이 없음 → "해제했어요 · 되돌리기" 알림 추가
app.js:578-586 - Touch(끄는 동안 텍스트 선택 막기): 시트를 끄는 동안 user-select: none이나 inert 처리가 없어 지도와 목록 글자가 선택될 수 있음 → `.sheet--dragging { user-select: none }` 추가와 setPointerCapture 사용 검토
app.js:138,245,307 - Copy(개수는 숫자로): "한 곳을 빼고", "한 곳만 골랐어요. 한 곳을 더" → "1곳"

## 코드만으로 판단할 수 없는 규칙
| 규칙 | 이유 |
|---|---|
| font-display: swap (Pretendard) | jsdelivr에서 받는 외부 CSS 안에 정의되어 있어 검토 경로 안에서 확인할 수 없음. Barlow는 `&display=swap` 확인함 |
| 오버레이가 포커스를 가리는지 (지도 위쪽 핀, 알림창) | 실제로 겹치는지는 화면 높이에 따라 달라짐. 기기별로 확인 필요 |
| 제출 중 스피너, 요청 시작 전까지 제출 버튼 켜 두기 | save()가 가짜 동기 함수라 실제 요청 흐름이 없음 |
| 50개 넘는 목록은 가상화 | 가짜 데이터는 12곳. 실제 서비스의 목록 크기를 알 수 없음 |
| Title Case, 능동태, 1인칭 피하기 | 영어 기준 규칙이라 한국어 문구에 바로 적용할 수 없음. "보여 드릴게요", "계산해 드려요"(app.js:222,293,307,389)는 서비스가 1인칭으로 말하는 어투로 볼 수 있어 문구 검토 때 판단 필요 |
| Hydration 관련 규칙 3개 | 서버 렌더링 프레임워크가 없는 순수 HTML/JS라 해당 없음 |
| Accept-Language로 언어 감지 | 한국어 전용 화면이라 해당 없음 |
| 이미지·영상·GIF 규칙 | img, video 요소가 없음 |
| 마우스 기기에서만 화면 튕김 막기 (실제 기기 확인) | styles.css:34에 (pointer: fine) 조건으로 처리되어 있음. 터치와 마우스를 같이 쓰는 기기에서의 동작은 직접 확인해야 함 |
| 단위 앞 줄바꿈 없는 공백 | 한국어 표기(160g, 9,000원)는 숫자와 단위를 붙여 써서 띄어 쓴 곳이 없음 |
