# 고기 레이더 — 2. 설계
> 상태: 사용자 확인 완료 (2026-11-10)
> 입력: dev/googi-radar/01-setup.md(Q-D1~3 결정), planning/googi-radar/03-spec.md(R1~R17, D1~D31), design/googi-radar/ui/, 01-direction.md

## 데이터 구조 (Supabase Postgres)

### stores — 운영자가 메뉴를 확인한 가게만 [R11, D23, D31]
| 칸 | 형식 | 필수 | 설명 | 근거 |
|---|---|---|---|---|
| id | uuid (기본값 gen_random_uuid()) | 예 | 내부 번호 | — |
| kakao_place_id | text, unique | 예 | 카카오 장소 ID. 지도 검색 결과와 연결하는 열쇠 | R1, D31(저장 허용 항목) |
| name | text | 예 | 장소명(카카오 허용 항목) | R11, D31 |
| place_url | text | 아니오 | 카카오맵 상세 링크(허용 항목) | R8 |
| area | text, ('주안','구월','기타') | 예 | **상권 꼬리표.** 좌표를 저장하지 않으므로(D31) 상권별 집계(R14·G2)에 필요 → **새로 필요해진 칸, 확인 필요(아래 P-1)** | R14, D26-14 |
| checked_at | date | 예 | 메뉴 확인일 | R10 |
| memo | text | 아니오 | "2인분 이상 주문" 등 | R15 |
| photo_path | text | 아니오 | 비공개 저장소의 메뉴판 사진 경로 | D28-12 |
| updated_at | timestamptz (기본값 now()) | 예 | 마지막 수정 | — |

### menus — 가게의 메뉴 [R3, R9, D15, D17, D24]
| 칸 | 형식 | 필수 | 설명 | 근거 |
|---|---|---|---|---|
| id | uuid | 예 | — | — |
| store_id | uuid → stores.id (가게 삭제 시 같이 삭제) | 예 | — | — |
| name | text | 예 | 메뉴판 그대로 | R9 |
| part | text ('삼겹살','목살','항정살','갈매기살','기타') | 예 | 부위 | R4, D26-15 |
| kind | text ('생고기','냉동','대패','기타') | 예 | 종류 | D11, D26-15 |
| aged | boolean (기본 false) | 예 | 숙성 체크 | D24 |
| origin | text ('국내산','수입') | 예 | 원산지 | D4 |
| price_per_100g | integer > 0 | 아니오 | 메뉴판의 100g당 가격 | D17 |
| weight_g | integer > 0 | 아니오 | 1인분 중량 | R3 |
| price | integer > 0 | 아니오 | 1인분 가격 | D15 |
| 규칙 | `price_per_100g` 또는 `price` 중 하나는 있어야 함 (중량만은 거부) | | DB에서도 막음 | D26-9 |

### admins — 쓰기 권한이 있는 운영자
| 칸 | 형식 | 설명 |
|---|---|---|
| user_id | uuid → auth.users.id | 운영자 본인 계정 1개 |

### 저장하지 않는 것
- 카카오 검색 결과의 **좌표·주소·카테고리·전화번호** (D31, 카카오 정책)
- 지도에 보이는 **가게 목록 전체**(대량 수집 금지, D16)
- 보는 사람의 **즐겨찾기·방문 기록** (D23 — 즐겨찾기는 그 폰의 localStorage에만)
- 맛 평가·리뷰 (D5)

## 권한 (Supabase RLS)
| 누가 | 무엇을 | 읽기 | 쓰기 | 규칙 |
|---|---|---|---|---|
| 누구나(로그인 안 함) | stores, menus | 예 | 아니오 | `select` 허용 정책만 |
| 운영자(admins에 있는 계정) | stores, menus | 예 | 예 | `insert/update/delete`는 `exists (select 1 from admins where user_id = auth.uid())` |
| 운영자 | 메뉴판 사진(저장소 `menu-photos`, 비공개) | 예 | 예 | 저장소 정책도 admins 기준. 누구나 읽기 없음(D28-12) |
| 그 밖의 로그인 계정 | 전부 | 읽기만 | 아니오 | **Supabase 설정에서 새 가입 막기**(사용자 할 일) |

SQL 초안 (묶음 3에서 사용자에게 SQL Editor 실행을 안내):
```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  kakao_place_id text not null unique,
  name text not null,
  place_url text,
  area text not null check (area in ('주안','구월','기타')),
  checked_at date not null,
  memo text,
  photo_path text,
  updated_at timestamptz not null default now()
);
create table menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  part text not null check (part in ('삼겹살','목살','항정살','갈매기살','기타')),
  kind text not null check (kind in ('생고기','냉동','대패','기타')),
  aged boolean not null default false,
  origin text not null check (origin in ('국내산','수입')),
  price_per_100g integer check (price_per_100g > 0),
  weight_g integer check (weight_g > 0),
  price integer check (price > 0),
  constraint has_price check (price_per_100g is not null or price is not null)
);
create table admins (user_id uuid primary key references auth.users(id));
alter table stores enable row level security;
alter table menus  enable row level security;
alter table admins enable row level security;
create policy "read stores" on stores for select using (true);
create policy "read menus"  on menus  for select using (true);
create policy "admin write stores" on stores for all
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));
create policy "admin write menus" on menus for all
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));
-- admins는 정책 없음 = 화면에서 읽기·쓰기 불가. 운영자 등록은 대시보드에서 1번만.
```

## 파일 구조 (app/)
```
app/
  index.html          design/ui/index.html 기반 + config.js, SDK, js 파일 불러오기
  styles.css          design/ui/styles.css 그대로에서 시작
  config.example.js   키 자리 (git 올림)
  config.js           실제 키 (git 제외)
  js/calc.js          계산 규칙(순수 함수): unit, bestMenu, noWeight, isStale, pinInfo, dongSise, gainText, josa
                      — 브라우저와 Node 테스트 양쪽에서 사용
  js/kakao.js         카카오 SDK 불러오기(키는 config에서), 지도 그리기, 지도 영역 고기집 검색, 핀(커스텀 오버레이)
  js/db.js            Supabase 읽기·쓰기·로그인·사진 올리기 (supabase-js를 jsDelivr에서 **정확한 버전 고정**으로 불러옴)
  js/store.js         즐겨찾기 localStorage (R17)
  js/app.js           화면 그리기(design/ui/app.js에서 가짜 데이터·가짜 지도를 걷어 내고 위 모듈 사용)
  tests/calc.test.js  node --test
```

## 화면 → 코드 연결
| 디자인의 가짜 부분 | 실제로 바꿀 것 | 요구사항 |
|---|---|---|
| `STORES` 가짜 배열 | 카카오 검색 결과(이름·좌표·place_url, 메모리만) + Supabase stores/menus를 `kakao_place_id`로 합침 | R1, R11, D31 |
| 가짜 SVG 지도, % 좌표 핀 | 카카오 지도 + 커스텀 오버레이 핀(꼬리표 모양 유지) | R1, D22 |
| 지도 움직여도 그대로인 목록 | 지도 이동이 멈추면(0.5초 뒤) 영역 안 고기집 다시 검색 | R1, Q-N11 |
| 가짜 거리(`dist`) | 내 위치(또는 고른 동네 기준점)와 검색 결과 좌표로 계산 | R6, D26-11 |
| 동네 시세(가짜 좌표 1km) | **지금 검색 결과에 있는 가게** 중 비교 가게들 중심 1km·같은 고기·5곳 이상. 비교 가게가 지금 검색 결과 밖이면 "-" | R7, D31 |
| 카카오 오류 시 "확인해 둔 가게만" | 지도 없이 저장된 가게 목록만(좌표가 없으므로) | D28-11, D31 |
| `ST.favs` 메모리 | localStorage (그 폰에만) | R17, D23 |
| 운영자 "로그인" 버튼 | Supabase 로그인(이메일+비밀번호, 운영자 1명) | D26-4 |
| `save()` 메모리 저장 | Supabase insert/update + 사진 업로드(비공개) | R9, D28-12 |
| 개발용 상태 전환 패널 | **app에서는 제거.** 상태는 실제 상황으로만 나옴 | — |
| 고정된 오늘 날짜(2026-11-10) | 실제 오늘(한국 시간) | R10 |

## 작업 묶음
### 묶음 1: 뼈대와 키 확인 — 끝 기준: `node --test app/tests` 통과, 키 없이 열면 "설정이 필요해요" 안내가 뜸
- [ ] design/ui → app 복사, 개발용 패널 제거
- [ ] 계산 규칙을 js/calc.js로 분리, 기획 예시 숫자로 테스트(8,750원, 750원 이득, 6개월 경계, 3% 기준 등)
- [ ] config.js 읽기 + 빈 키 안내 화면(키 값은 출력하지 않음)
- [ ] 보류된 접근성 문제 5개 중 레이아웃 관련(포커스 순서: 필터→시트→핀, 비교 칩 포커스, 선택 핀 대비, 메뉴 aria) 반영 — 사용자 동의 시
- 사용자 할 일: 없음 (키 없이 가능)

### 묶음 2: 카카오 지도와 실시간 검색 — 끝 기준: 로컬 서버에서 주안역 주변 실제 고기집 핀이 뜨고, 지도를 옮기면 다시 검색됨
- [ ] SDK 동적 로딩(`libraries=services`, `autoload=false`), 실패·쿼터 초과 처리
- [ ] 고기집 거르기: categorySearch(FD6)+이름·카테고리 거르기 vs keywordSearch — **실제 응답을 보고 결정, 03-progress에 기록**(Q-N7·N11)
- [ ] 핀 = 커스텀 오버레이(꼬리표), 정보 없는 가게는 점선 핀
- [ ] 시트에 가려진 핀 키보드 포커스 제외(접근성 보류 1)
- **사용자 할 일: 01-setup 1~4 (카카오 가입, JavaScript 키, 도메인 등록, 카카오맵 사용 설정)**

### 묶음 3: Supabase 읽기와 합치기 — 끝 기준: 대시보드에서 넣은 시험 메뉴 1개가 지도·목록·비교에 100g당 가격으로 나옴
- [ ] supabase-js 불러오기(버전 고정), stores·menus 읽기
- [ ] 검색 결과와 `kakao_place_id`로 합치기 → 순위·비교·동네 시세(D31 방식)
- [ ] 카카오 오류 시 저장된 가게 목록만
- **사용자 할 일: 01-setup 5~7 (Supabase 가입, URL·anon 키, SQL 실행), 새 가입 막기**

### 묶음 4: 운영자 입력 — 끝 기준: 로그인한 운영자만 저장되고, 로그인 안 한 상태로는 DB가 쓰기를 거부함(직접 시험)
- [ ] 로그인/로그아웃, admins 등록 안내
- [ ] 입력 폼 저장(가게가 처음이면 stores도 생성, 상권 꼬리표 선택), 사진 비공개 업로드
- [ ] RLS 시험: 로그인 안 한 상태에서 insert 시도 → 거부 확인
- **사용자 할 일: 운영자 계정 만들고 admins에 1줄 넣기(SQL 안내)**

### 묶음 5: 마무리 — 끝 기준: 즐겨찾기가 새로고침 후에도 남음, 남은 접근성 보류(필터 결과 개수 알림 등) 반영
- [ ] 즐겨찾기 localStorage, 오류·빈 화면 문구 점검(copy.md)
- [ ] 필터 결과 개수 알림, 뒤로 버튼 이름 등 디자인 보류 중 작은 것

## 사용자 결정 (2026-11-10, "전부 추천대로")
- **P-1 → 추가.** stores에 `area`(주안/구월/기타) 칸을 두고, 운영자가 가게를 처음 입력할 때 고른다. 상권별 집계(R14)와 성공 지표(G2)에 쓴다.
- **P-2 → 이대로.** 동네 시세는 지금 지도 검색에 잡힌 가게끼리 계산하고, 써 보며 판단한다.
- **P-3 → 이메일+비밀번호** 로그인(운영자 1명).
- **P-4 → 예.** 묶음 1에서 디자인 보류 접근성 문제(포커스 순서, 비교 칩 포커스, 선택 핀 대비, 메뉴 aria)를 함께 고친다. 시트에 가려진 핀 포커스는 묶음 2(실제 지도)에서, 필터 결과 개수 알림은 묶음 5에서.

## 확인이 필요한 것 (설계 중 새로 생김) — 위에서 모두 결정됨
- **P-1 상권 꼬리표 칸(`area`) 추가:** 좌표를 안 쓰기로 해서(D31), 상권별 중량 표기 비율(R14)과 성공 지표(G2: 주안 20곳·구월 20곳)를 세려면 가게마다 "주안/구월/기타"를 운영자가 입력할 때 골라야 한다. 추천: 추가.
- **P-2 동네 시세의 한계:** 좌표를 저장하지 않으니 동네 시세는 "지금 지도 검색에 잡힌 가게"로만 계산된다. 비교 화면에서 지도 밖 가게를 넣으면 "-"로 나올 수 있다. 추천: 이대로 두고 써 보며 판단.
- **P-3 운영자 로그인 방식:** 이메일+비밀번호(추천, 설정 간단) / 이메일 링크(매직 링크).
- **P-4 묶음 1에서 디자인 보류 접근성 문제 함께 고치기:** 추천: 예.
