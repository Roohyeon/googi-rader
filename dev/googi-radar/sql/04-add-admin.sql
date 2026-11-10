-- 운영자 등록 (dev 묶음 4)
-- 1) 먼저 Authentication > Users > Add user > Create new user 로 운영자 계정을 만든다 (Auto Confirm User 체크)
-- 2) 아래 '여기에_이메일' 을 그 계정의 이메일로 바꾼다 (따옴표는 그대로 둔다)
-- 3) Run. 마지막 줄 결과의 "운영자_수"가 1이면 성공
insert into private.admins (user_id)
select id from auth.users where lower(email) = lower('여기에_이메일')
on conflict do nothing;

select count(*) as 운영자_수 from private.admins;
