-- 저장을 한 번에(트랜잭션) 처리하기 + 사진 경로는 운영자만 (dev 4단계 검증 반영, 2026-11-10)
-- 실행: SQL Editor > New query > 전체 붙여 넣기 > Run. 여러 번 실행해도 괜찮다.
--
-- 왜 필요한가
--  - 지금까지는 "가게 저장 → 메뉴 저장 → (수정 때) 삭제·수정·추가"를 따로 요청해서, 중간에 실패하면 일부만 저장될 수 있었다.
--  - 화면이 가격 정보를 못 불러온 순간에 새로 입력하면 같은 메뉴가 두 번 들어갈 수 있었다.
--  → 아래 함수 하나가 전부를 한 번에 처리한다. 하나라도 실패하면 아무것도 저장되지 않는다.
-- 보안
--  - security invoker: 부르는 사람의 권한으로 실행된다. 그래서 RLS(운영자만 쓰기)가 그대로 적용된다.
--  - 로그인 안 한 사람(anon)은 이 함수를 부를 수 없다.

create or replace function public.save_store_menus(p_store jsonb, p_menus jsonb, p_removed uuid[], p_mode text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  sid uuid;
  n int;
begin
  if p_mode is null or p_mode not in ('new', 'edit') then
    raise exception 'bad mode' using errcode = '22023';
  end if;
  if jsonb_typeof(p_menus) is distinct from 'array' or jsonb_array_length(p_menus) not between 1 and 20 then
    raise exception 'bad menus' using errcode = '22023';
  end if;

  select s.id into sid from public.stores s where s.kakao_place_id = p_store->>'kakao_place_id';

  if p_mode = 'new' then
    -- 이미 메뉴가 있는 가게는 새로 입력할 수 없다 → 수정하기로만
    if sid is not null and exists (select 1 from public.menus m where m.store_id = sid) then
      raise exception 'already entered' using errcode = 'P0001';
    end if;
    insert into public.stores (kakao_place_id, name, place_url, area, checked_at, memo)
    values (p_store->>'kakao_place_id', p_store->>'name', p_store->>'place_url', p_store->>'area',
            (p_store->>'checked_at')::date, nullif(p_store->>'memo', ''))
    on conflict (kakao_place_id) do update
      set name = excluded.name, place_url = excluded.place_url, area = excluded.area,
          checked_at = excluded.checked_at, memo = coalesce(excluded.memo, public.stores.memo)
    returning id into sid;
  else
    if sid is null then
      raise exception 'store not found' using errcode = 'P0002';
    end if;
    update public.stores
      set name = p_store->>'name', area = p_store->>'area', checked_at = (p_store->>'checked_at')::date, memo = nullif(p_store->>'memo', '')
      where id = sid;
    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'not allowed' using errcode = '42501'; -- RLS가 막으면 0행
    end if;
    delete from public.menus m where m.store_id = sid and m.id = any(coalesce(p_removed, '{}'::uuid[]));
  end if;

  -- 있던 메뉴는 고치고(같은 가게의 메뉴만), 새 메뉴는 추가
  update public.menus m
    set name = x.name, part = x.part, kind = x.kind, aged = coalesce(x.aged, false), origin = x.origin,
        price_per_100g = x.price_per_100g, weight_g = x.weight_g, price = x.price
    from jsonb_to_recordset(p_menus) as x(id uuid, name text, part text, kind text, aged boolean, origin text, price_per_100g int, weight_g int, price int)
    where x.id is not null and m.id = x.id and m.store_id = sid;
  insert into public.menus (store_id, name, part, kind, aged, origin, price_per_100g, weight_g, price)
    select sid, x.name, x.part, x.kind, coalesce(x.aged, false), x.origin, x.price_per_100g, x.weight_g, x.price
    from jsonb_to_recordset(p_menus) as x(id uuid, name text, part text, kind text, aged boolean, origin text, price_per_100g int, weight_g int, price int)
    where x.id is null;

  return sid;
end;
$$;
revoke all on function public.save_store_menus(jsonb, jsonb, uuid[], text) from public, anon;
grant execute on function public.save_store_menus(jsonb, jsonb, uuid[], text) to authenticated;

-- ---------- 사진 경로는 운영자만 읽기 (보안 리뷰 4번 참고) ----------
revoke select (photo_path) on public.stores from authenticated;

create or replace function public.menu_photo_path(p_kakao_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.photo_path from public.stores s
  where s.kakao_place_id = p_kakao_id and (select private.is_admin());
$$;
revoke all on function public.menu_photo_path(text) from public, anon;
grant execute on function public.menu_photo_path(text) to authenticated;
