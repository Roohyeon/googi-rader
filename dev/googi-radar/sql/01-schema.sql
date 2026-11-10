-- 고기 레이더 DB 만들기 (dev 묶음 3)
-- 실행: Supabase > SQL Editor > New query > 이 파일 내용 전체 붙여 넣기 > Run
-- 여러 번 실행해도 안전하게 만들지 않았다. 처음 한 번만 실행한다.
--
-- 보안 원칙
--  1. 모든 표에 RLS(행 단위 규칙)를 켠다. 규칙이 없으면 아무도 못 읽고 못 쓴다.
--  2. 누구나: 가게·메뉴 "읽기"만. 메뉴판 사진 경로(photo_path)는 못 읽는다.
--  3. 쓰기·사진: admins 표에 등록된 운영자 계정만.
--  4. "새 표 자동 공개"를 꺼 두었으므로 표마다 권한(GRANT)을 직접 준다. 필요한 것만.
--  5. 운영자 확인 함수는 Data API에 공개되지 않는 private 스키마에 둔다.
--  6. 값에 길이·범위 제한을 둔다 (잘못된 입력, 화면 깨짐, 링크 바꿔치기 방지).

-- ---------- 운영자 확인 함수 (공개되지 않는 스키마) ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admins enable row level security;  -- 정책 없음 = 화면에서 읽기·쓰기 불가
revoke all on private.admins from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---------- 가게 (운영자가 메뉴를 확인한 가게만, 좌표·주소 저장 안 함 D31) ----------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  kakao_place_id text not null unique check (kakao_place_id ~ '^[0-9]{1,20}$'),
  name text not null check (char_length(name) between 1 and 100),
  place_url text check (place_url ~ '^https://place\.map\.kakao\.com/[0-9]{1,20}$'),
  area text not null check (area in ('주안', '구월', '기타')),
  checked_at date not null check (checked_at between date '2020-01-01' and current_date + 1),
  memo text check (char_length(memo) <= 200),
  photo_path text check (char_length(photo_path) <= 200),
  updated_at timestamptz not null default now()
);

-- ---------- 메뉴 ----------
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  part text not null check (part in ('삼겹살', '목살', '항정살', '갈매기살', '기타')),
  kind text not null check (kind in ('생고기', '냉동', '대패', '기타')),
  aged boolean not null default false,
  origin text not null check (origin in ('국내산', '수입')),
  price_per_100g integer check (price_per_100g between 1 and 1000000),
  weight_g integer check (weight_g between 1 and 5000),
  price integer check (price between 1 and 10000000),
  updated_at timestamptz not null default now(),
  constraint has_price check (price_per_100g is not null or price is not null)  -- 중량만은 거부 (D26-9)
);
create index menus_store_id_idx on public.menus (store_id);

-- 수정 시각 자동 기록
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger stores_touch before update on public.stores for each row execute function private.touch_updated_at();
create trigger menus_touch  before update on public.menus  for each row execute function private.touch_updated_at();

-- ---------- 권한: 필요한 것만 ----------
revoke all on public.stores, public.menus from public, anon, authenticated;
-- 누구나 읽기 (photo_path 칸은 빼고)
grant select (id, kakao_place_id, name, place_url, area, checked_at, memo, updated_at) on public.stores to anon, authenticated;
grant select on public.menus to anon, authenticated;
-- 로그인한 계정만 쓰기 "시도" 가능 → 아래 RLS가 운영자만 통과시킴
grant select (photo_path), insert, update, delete on public.stores to authenticated;
grant insert, update, delete on public.menus to authenticated;

-- ---------- RLS ----------
alter table public.stores enable row level security;
alter table public.menus  enable row level security;

create policy "누구나 가게 읽기" on public.stores for select to anon, authenticated using (true);
create policy "누구나 메뉴 읽기" on public.menus  for select to anon, authenticated using (true);

create policy "운영자 가게 추가" on public.stores for insert to authenticated with check ((select private.is_admin()));
create policy "운영자 가게 수정" on public.stores for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "운영자 가게 삭제" on public.stores for delete to authenticated using ((select private.is_admin()));
create policy "운영자 메뉴 추가" on public.menus  for insert to authenticated with check ((select private.is_admin()));
create policy "운영자 메뉴 수정" on public.menus  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "운영자 메뉴 삭제" on public.menus  for delete to authenticated using ((select private.is_admin()));

-- ---------- 메뉴판 사진: 비공개 저장소, 운영자만 (D28-12) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "운영자 사진 보기"   on storage.objects for select to authenticated using (bucket_id = 'menu-photos' and (select private.is_admin()));
create policy "운영자 사진 올리기" on storage.objects for insert to authenticated with check (bucket_id = 'menu-photos' and (select private.is_admin()));
create policy "운영자 사진 바꾸기" on storage.objects for update to authenticated using (bucket_id = 'menu-photos' and (select private.is_admin())) with check (bucket_id = 'menu-photos' and (select private.is_admin()));
create policy "운영자 사진 지우기" on storage.objects for delete to authenticated using (bucket_id = 'menu-photos' and (select private.is_admin()));
