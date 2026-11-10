# 고기 레이더

고기집마다 1인분 무게와 가격이 달라서 어디가 싼지 비교하기 어렵다. 고기 레이더는 메뉴판 가격을 **100g당 가격**으로 바꿔서, 지도 위에서 바로 비교할 수 있게 해 주는 모바일 웹 서비스다.

- 서비스 주소: https://googi-radar.vercel.app
- 지역: 인천 미추홀구·남동구(주안역, 구월동 로데오거리 주변)부터
- 상태: 1인 운영, 비상업 개인 프로젝트

## 할 수 있는 것
- **지도·목록:** 지금 보이는 지도 영역의 고기집을 카카오 지도에서 찾고, 메뉴를 확인한 가게는 100g당 가격 핀으로 보여 준다. 목록은 100g당 싼 순.
- **필터:** 부위(삼겹살·목살) / 종류(생고기·냉동·대패) / 원산지(국내산·수입).
- **비교:** 최대 3곳을 골라 가게마다 메뉴를 정하고 100g당 가격, 1인분, 동네 시세 대비를 나란히 본다. 결론과 "몇 원 이득인지" 문장을 먼저 보여 준다.
- **가게 상세:** 메뉴별 100g당 가격, 메뉴 확인일(6개월이 지나면 "오래된 정보" 표시), 카카오맵 리뷰 링크.
- **즐겨찾기:** 그 브라우저에만 저장(서버에 보내지 않음).
- **운영자 입력(로그인한 운영자만):** 가게 검색, 메뉴 여러 개 한 번에 입력, 수정, 메뉴판 사진(운영자만 볼 수 있음), 상권별 중량 표기 비율.

100g당 가격 = 1인분 가격 ÷ 1인분 중량(g) × 100. 예: 160g 14,000원 → 100g당 8,750원.

## 기술
- 화면: HTML·CSS·JavaScript (빌드 도구 없음)
- 지도·장소 검색: 카카오 지도 JavaScript SDK
- 데이터·로그인·사진: Supabase (Postgres + RLS, 이메일 로그인, 비공개 Storage)
- 배포: Vercel (정적 사이트)
- 테스트: Node 내장 테스트 러너

## 폴더 구조
```
app/                 서비스 코드 (이 폴더가 그대로 배포됨)
  index.html, styles.css
  js/calc.js         100g당 계산·비교 규칙 (순수 함수, 자동 테스트 대상)
  js/kakao.js        카카오 지도, 장소 검색, 핀
  js/db.js           Supabase 읽기·쓰기·로그인
  js/app.js          화면
  js/sample.js       샘플 데이터 (?demo=1 일 때만)
  vendor/            supabase-js 2.118.0 (버전 고정, MIT)
  config.example.js  키 자리 예시 → config.js로 복사해서 사용 (config.js는 git에 올리지 않음)
  vercel.json        배포 보안 헤더 (CSP 등)
  tests/             자동 테스트
dev/googi-radar/     개발 기록 (준비·설계·구현·검증·배포), sql/ DB 만들기 SQL
design/googi-radar/  디자인 방향·리뷰·핸드오프
planning/googi-radar/ 기획 (결정 기록, PRD)
```

## 로컬에서 실행하기
1. 키 파일 만들기: `app/config.example.js`를 복사해서 `app/config.js`로 저장하고 빈칸을 채운다.
   - `KAKAO_JS_KEY`: 카카오 개발자 > 앱 > [플랫폼 키] > JavaScript 키
   - `SUPABASE_URL`: Supabase > Project Settings > Data API > Project URL
   - `SUPABASE_ANON_KEY`: Supabase > Project Settings > API Keys > **Publishable key** (`sb_publishable_`로 시작)
   - **비밀 키(Secret key, `sb_secret_`, service_role)는 절대 넣지 않는다.** 넣으면 앱이 연결을 거부한다.
2. 카카오 개발자 > JavaScript SDK 도메인에 `http://localhost:3000` 등록.
3. 로컬 서버 실행 (`file://`로 열면 카카오 도메인 확인이 안 됨):
   ```
   python -m http.server 3000 --directory app
   ```
4. 브라우저에서 http://localhost:3000 을 연다.
   - 키 없이 화면만 보려면 http://localhost:3000/?demo=1 (샘플 데이터)

## DB 준비 (Supabase SQL Editor에서 순서대로)
| 파일 | 하는 일 |
|---|---|
| `dev/googi-radar/sql/01-schema.sql` | 표, 권한, RLS(누구나 읽기·운영자만 쓰기), 비공개 사진 저장소 |
| `dev/googi-radar/sql/04-add-admin.sql` | 운영자 등록 (Authentication > Users에서 계정을 먼저 만들고, 이메일 자리만 바꿔서 실행) |
| `dev/googi-radar/sql/05-more-parts.sql` | 입력 부위에 오겹살·갈비 추가 |
| `dev/googi-radar/sql/06-safe-save.sql` | 저장을 한 번에 처리하는 함수, 사진 경로는 운영자만 |
| `02-test-data.sql` / `03-remove-test-data.sql` | 시험 데이터 넣기 / 지우기 (선택) |

그다음 Authentication 설정에서 **새 가입을 끈다** (운영자는 대시보드에서 직접 만든다).

보안 점검: `node dev/googi-radar/sql/check-security.mjs` → 로그인하지 않은 사람으로 읽기·쓰기를 실제로 시도해 보고 모두 막히는지 확인한다(키 값은 출력하지 않음).

## 테스트
```
node --test "app/tests/*.test.js"
```
기획서의 예시 숫자(8,750원, 750원 이득, 6개월 경계 등)를 그대로 테스트한다.

## 배포
```
cd app
npx vercel@65.14.0 deploy --prod --yes --name googi-radar
```
- `app/config.js`(공개용 키)는 배포 파일에는 들어가지만 git에는 들어가지 않는다.
- 배포 주소를 바꾸면 카카오 JavaScript SDK 도메인에 그 주소를 추가해야 지도가 뜬다.
- 자세한 운영 방법(키 교체, 백업, 무료 한도, 남은 이슈): `dev/googi-radar/05-release.md`

## 보안 원칙
- 브라우저에 있는 키는 공개용뿐이다. 카카오 키는 등록한 도메인에서만, Supabase 키는 DB 규칙(RLS)으로 막힌다.
- 쓰기·사진은 `private.admins`에 등록된 운영자 계정만 가능하다. 화면이 아니라 DB가 막는다.
- 카카오 검색 결과의 좌표·주소는 저장하지 않는다(장소 ID·이름·카카오맵 링크만).
- 보는 사람의 즐겨찾기·방문 기록은 서버에 저장하지 않는다.
- 화면에 넣는 모든 값은 이스케이프하고, CSP로 허용한 곳의 스크립트만 실행한다.

## 데이터 출처
- 장소 검색·지도: 카카오 지도 API
- 메뉴·가격: 운영자가 매장 메뉴판을 직접 확인해 입력 (리뷰·별점은 저장하지 않고 카카오맵 링크로 연결)
