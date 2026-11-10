-- 입력할 수 있는 부위 늘리기: 오겹살, 갈비 (2026-11-10 사용자 요청)
-- 지도 필터·순위는 그대로 삼겹살·목살만 쓴다. 나머지는 가게 상세의 "다른 메뉴"로 보인다.
alter table public.menus drop constraint if exists menus_part_check;
alter table public.menus add constraint menus_part_check
  check (part in ('삼겹살', '오겹살', '목살', '항정살', '갈매기살', '갈비', '기타'));
