# 고기 레이더 — 1. 개발 준비
> 상태: 사용자 확인 완료 (2026-11-10)
> 입력: design/googi-radar/05-handoff.md, ui/, 01-direction.md, changelog.md / planning/googi-radar/03-spec.md, 02-decisions.md
> 시험 실행: 1~2단계만 (2026-11-10)

## 기술 방식
- 화면: **단일 HTML·CSS·JS 그대로** (사용자 선택 "지금 방식 유지", design/googi-radar/ui 기준). 빌드 도구·프레임워크 없음
- 데이터·로그인·사진: **Supabase** (무료 DB + 로그인 + 파일 저장, 기획 D26-2·D26-4)
- 지도·가게 검색: **카카오 지도 JavaScript SDK** + `libraries=services`(장소 검색)
- 외부 글꼴: Pretendard(jsDelivr), Barlow Condensed(Google Fonts) — 디자인 결정(01 2차 방향)
- 자동 테스트: Node 내장 `node --test` (Node v22.14.0 설치 확인, 추가 설치 없음)
- 로컬 실행: 간단한 로컬 서버(예: `npx serve app`) — 카카오 도메인 등록이 `file://`에서는 동작하지 않음

## 외부 서비스
| 서비스 | 쓰는 이유 (요구사항) | 무료 한도 (조사값, 공식 페이지 재확인 필요) | 필요한 키 | 키 종류 | 가입·설정 |
|---|---|---|---|---|---|
| 카카오 지도 JS SDK | 지도 표시, 실시간 고기집 검색 (R1, R2, D16, D22) | 지도 약 30만 회/일, 로컬 약 10만 회/일, 계정 전체 월 300만 회. **무료 쿼터는 계정의 첫 번째 활성 앱에만** (기획 Q9 조사) | JavaScript 키 | 공개용 (도메인 등록으로 보호) | https://developers.kakao.com |
| Supabase | 운영자 메뉴 데이터 저장, 운영자 로그인, 메뉴판 사진(비공개) (R9, R11, D26-4, D28-12) | DB 500MB, 파일 1GB, 프로젝트 2개. **7일 동안 요청이 없으면 자동 일시정지**(데이터는 남고 대시보드에서 복구) | Project URL, anon public 키 | 공개용 (RLS로 보호) | https://supabase.com |
| (비밀 키) | 이번 구조에서는 **필요 없음** | — | Supabase service_role 키는 쓰지 않음 | 비밀 | 화면 코드·config.js에 절대 넣지 않음 |

## 키 넣는 곳
- **공개용 키:** `app/config.js` ← `app/config.example.js`를 복사해서 빈칸 3개(KAKAO_JS_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)를 채운다
- **비밀 키:** 없음
- **`.gitignore`:** 프로젝트 폴더에 만듦 (`app/config.js`, `.env` 제외). `git check-ignore`로 동작 확인함

## 개발 전 확인 (기획·디자인의 열린 질문)
| 항목 | 확인 결과 | 출처 | 구현에 주는 영향 |
|---|---|---|---|
| Q9 카카오 검색 결과 저장 범위 | **장소 ID, 장소명, place_url만 저장 가능. 좌표·주소·카테고리·전화번호는 저장 불가(실시간 호출만)**라는 카카오 측 답변이 반복됨. 검색 결과를 DB에 쌓는 건 "캐시" 예외에도 해당하지 않는다는 답변. 사용자가 지도에서 **직접 지정한 좌표**는 저장 허용 답변이 있으나, 검색 좌표를 그대로 확정한 경우는 불분명. **약관 원문은 직접 확인하지 못함(확인 불가)** | 카카오 데브톡: [151497](https://devtalk.kakao.com/t/api/151497), [151505](https://devtalk.kakao.com/t/local-api/151505), [151294](https://devtalk.kakao.com/t/sdk-poi/151294), [152392](https://devtalk.kakao.com/t/api-db-1623243/152392), [151720](https://devtalk.kakao.com/t/topic/151720) | **D27(입력한 가게 좌표 저장)과 충돌할 가능성이 큼 → 사용자 결정 필요(아래 Q-D1).** 가게 이름 저장도 "장소명 허용"이라 가능 |
| Q9 쿼터 | 위 표 참고. 1인 사용 규모에서는 충분 | 카카오 쿼터 문서, 데브톡 FAQ (기획 02 Q9) | 초과 걱정 없음. 결제 수단을 등록하지 않으면 초과 시 차단(과금 없음) |
| 고기집만 골라 검색하는 방법 (기획 Q-N7·N11) | JS SDK `Places.categorySearch('FD6', …, { useMapBounds: true })`로 지도 영역의 음식점을 찾을 수 있음(공식 예제). `keywordSearch`에 FD6 필터를 거는 공식 예시는 못 찾음. 카카오 category_name에 "육류,고기" 같은 단계가 있는지는 **구현 때 실제 응답으로 확인** | [카카오 지도 예제: 카테고리 검색](https://apis.map.kakao.com/web/sample/categoryFromBounds/), [로컬 공통 문서](https://developers.kakao.com/docs/latest/ko/local/common) | 2단계 설계에 "카테고리 검색 + 이름·카테고리로 고기집 거르기" 안과 "키워드 검색" 안을 함께 두고, 묶음 1에서 실제 응답을 보고 고른다 |
| Supabase 무료 한도·일시정지 | 500MB DB, 1GB 파일, **7일 무요청 시 일시정지** | 2026년 요금 정리 글 여러 곳(예: [dev.to 정리](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe), [makerkit](https://makerkit.dev/blog/saas/supabase-pricing)). **공식 가격 페이지 원문은 직접 확인 못 함** | 혼자 쓰는 서비스라 일주일 안 쓰면 멈출 수 있음 → 사용자 결정 필요(아래 Q-D2) |
| Q4 참가격 기준 | 이번 단계에서 확인하지 않음 (Should인 R12만 걸림) | — | R12는 마지막 묶음 이후로 미룸 |
| Q2 표기값 ≠ 계산값 | 기획 임시 규칙 유지(계산값 사용 + 안내) | 03-spec R3 | 그대로 구현 |

## 먼저 할 일
- **05-handoff.md가 최신 디자인과 다름:** 핸드오프는 1차 디자인 기준. 실제 기준은 `design/googi-radar/ui/`(2차 디자인: 숯불·라벨, 지도+시트, 탭 지도·목록/비교/즐겨찾기, 운영자는 ⋯ 메뉴) + `01-direction.md` 2차 방향·레이아웃 개편 절. 개발은 **ui/ 코드와 01을 기준**으로 하고, 05-handoff 갱신은 디자인 쪽 할 일로 남긴다.
- **디자인 보류 항목**(changelog 마지막): 접근성 실패 5개(시트에 가려진 핀 포커스, 비교 칩 포커스, 선택 핀 대비, 포커스 순서, 필터 결과 개수 알림·메뉴 aria) + 작은 문제 + 디자인 판단 4개. → 구현 묶음 중 화면을 손볼 때 접근성 5개는 함께 고치기를 제안(사용자 결정).
- **git 저장소 위치 문제:** 이 프로젝트 폴더는 독립된 git 저장소가 아니고, **홈 폴더 전체(`C:\Users\USER`)를 뿌리로 하는 저장소** 안에 들어 있다(커밋 0개). 이대로 커밋하면 경로가 꼬이고, 실수로 홈 폴더 파일을 올릴 위험이 있다. → 사용자 결정 필요(아래 Q-D3).

## 사용자 결정이 필요한 것
- **Q-D1 카카오 좌표 저장(D27)을 어떻게 할까?**
  - (가) **좌표는 저장하지 않고, 지도를 볼 때마다 검색 결과의 좌표를 화면 메모리에서만 쓴다.** 영향: 동네 시세(반경 1km)는 지금 지도 검색에 잡힌 가게끼리만 계산, 카카오 오류 때 "저장된 가게를 지도에" 보여 주던 D28-11은 "목록만"으로 바뀜. **가장 안전 (추천)**
  - (나) 운영자가 입력할 때 **지도에서 직접 핀을 찍은 좌표**를 저장한다. 허용 답변이 있으나 해석이 애매
  - (다) 좌표 대신 "주안 / 구월 / 기타" **상권 꼬리표**를 저장한다(D27의 대체안). 동네 시세는 같은 꼬리표끼리 계산
- **Q-D2 Supabase 7일 일시정지:** (가) 그대로 쓰고, 멈추면 대시보드에서 복구 (추천, 데이터는 남음) / (나) 다른 서비스 검토
- **Q-D3 git:** (가) 이 프로젝트 폴더에 **독립 저장소를 새로 만든다**(`git init`, 내 컴퓨터 안에서만, 공개 아님) (추천) / (나) 지금은 git을 쓰지 않는다

## 사용자 결정 (2026-11-10)
- **Q-D1 → (가)** 좌표는 저장하지 않는다. 지도를 볼 때 카카오 검색 결과의 좌표를 화면 메모리에서만 쓴다. 저장하는 카카오 정보는 장소 ID·장소명·place_url뿐. → 기획 D27을 D31로 대체(planning 02-decisions에 기록)
- **Q-D2 → (가)** Supabase 무료 플랜 그대로. 7일 무요청으로 멈추면 대시보드에서 복구(데이터 유지). 05-release에 복구 방법을 적는다
- **Q-D3 → GitHub 저장소** `https://github.com/Roohyeon/googi-rader.git`(공개, 비어 있었음)에 커밋. 프로젝트 폴더에 독립 git 저장소를 만들고 첫 커밋을 `main`에 올림(빈 저장소라 첫 커밋은 main, 이후 작업은 작업 브랜치 제안). **공개 저장소라 커밋 작성자 이름·이메일(git 설정값)이 공개됨.** `app/config.js`는 .gitignore로 제외

## 사용자가 할 일 (순서대로, 3단계 묶음 1 전에)
1. **카카오 개발자 가입·앱 만들기:** https://developers.kakao.com → 로그인 → 상단 "내 애플리케이션" → "애플리케이션 추가하기" → 앱 이름 "고기 레이더" 입력 → 저장
2. **JavaScript 키 복사:** 만든 앱 → "앱 키" → **JavaScript 키** 복사 → `app/config.js`의 `KAKAO_JS_KEY` 칸에 붙여 넣기 (REST API 키, Admin 키는 쓰지 않음)
3. **사이트 도메인 등록:** 앱 → "플랫폼" → "Web 플랫폼 등록" → 사이트 도메인에 `http://localhost:3000` 입력(로컬 실행 주소, 배포 주소는 5단계에서 추가)
4. **카카오맵 사용 설정:** 앱 → "카카오맵"(또는 제품 설정) 메뉴에서 사용 설정을 켬 (2024년 이후 생성 앱은 활성화가 필요하다는 공지 있음 — 화면 이름은 바뀔 수 있음)
5. **Supabase 가입·프로젝트 만들기:** https://supabase.com → GitHub 계정 등으로 가입 → "New project" → 이름 `googi-radar`, 비밀번호 저장, 지역은 가까운 곳(예: Northeast Asia (Seoul)) → 생성
6. **Supabase 키 복사:** 프로젝트 → "Project Settings" → "API" → **Project URL**을 `SUPABASE_URL`에, **anon public** 키를 `SUPABASE_ANON_KEY`에 붙여 넣기 (**service_role 키는 복사하지 않음**)
7. (2단계 설계 확인 뒤) Supabase에 표와 접근 규칙을 만드는 SQL을 제가 드리면 "SQL Editor"에 붙여 넣고 실행
8. `app/config.example.js`를 같은 폴더에 `config.js`로 복사한 뒤 위 값들을 넣기. 키를 대화창에 붙여 주시면 제가 config.js에만 넣고 기록에는 앞 4자리만 남김
