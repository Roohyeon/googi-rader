-- 시험 데이터 지우기 (메뉴는 가게를 지우면 같이 지워진다)
delete from public.stores where kakao_place_id = '1615804803' and memo = '시험 데이터 - 확인 후 지울 것';
