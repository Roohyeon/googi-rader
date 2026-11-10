-- 시험 데이터 1건 (묶음 3 확인용). 확인이 끝나면 03-remove-test-data.sql로 지운다.
-- 가게: 마포주먹고기 (주안역 근처, 카카오 장소 ID 1615804803). 가격은 가짜 값이다.
insert into public.stores (kakao_place_id, name, place_url, area, checked_at, memo)
values ('1615804803', '마포주먹고기', 'https://place.map.kakao.com/1615804803', '주안', current_date, '시험 데이터 - 확인 후 지울 것');

insert into public.menus (store_id, name, part, kind, aged, origin, weight_g, price)
select id, '생삼겹살(시험)', '삼겹살', '생고기', false, '국내산', 160, 14000
from public.stores where kakao_place_id = '1615804803';
