// DB 보안 점검: "로그인 안 한 사람"(= 웹사이트를 연 아무나)이 할 수 있는 일을 실제로 시도해 본다.
// 실행: node dev/googi-radar/sql/check-security.mjs   (프로젝트 폴더에서)
// - app/config.js의 공개용 키만 쓴다. 키 값은 화면에 출력하지 않는다.
// - 쓰기 시도는 모두 "막혀야 통과"다. 혹시 통과되면 바로 알려 준다.
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../../../app/config.js', import.meta.url), 'utf8'), ctx);
const { SUPABASE_URL, SUPABASE_ANON_KEY } = ctx.window.APP_CONFIG || {};
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.log('app/config.js에 Supabase 키가 없어요.'); process.exit(1); }
if (/^sb_secret_/.test(SUPABASE_ANON_KEY)) { console.log('위험: SUPABASE_ANON_KEY에 비밀 키가 들어 있어요. Publishable key로 바꾸고 비밀 키를 재발급하세요.'); process.exit(1); }

const base = SUPABASE_URL.replace(/\/$/, '');
const H = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
const call = async (path, opt = {}) => { const r = await fetch(base + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } }); let body = ''; try { body = await r.text(); } catch {} return { status: r.status, body }; };

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? '통과' : '위험'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

// 1. 읽기: 되어야 함
let r = await call('/rest/v1/stores?select=id,name&limit=1');
check('누구나 가게 목록을 읽을 수 있다', r.status === 200, 'HTTP ' + r.status);
r = await call('/rest/v1/menus?select=id,name&limit=1');
check('누구나 메뉴를 읽을 수 있다', r.status === 200, 'HTTP ' + r.status);

// 2. 숨긴 칸: 사진 경로는 못 읽어야 함
r = await call('/rest/v1/stores?select=photo_path&limit=1');
check('누구나 메뉴판 사진 경로(photo_path)는 못 읽는다', r.status >= 400, 'HTTP ' + r.status);

// 3. 쓰기: 모두 막혀야 함
r = await call('/rest/v1/stores', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ kakao_place_id: '1', name: '해킹 시험', area: '기타', checked_at: '2026-01-01' }) });
check('로그인 안 하면 가게를 추가할 수 없다', r.status >= 400, 'HTTP ' + r.status);
r = await call('/rest/v1/menus', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ store_id: '00000000-0000-0000-0000-000000000000', name: 'x', part: '기타', kind: '기타', origin: '국내산', price: 1 }) });
check('로그인 안 하면 메뉴를 추가할 수 없다', r.status >= 400, 'HTTP ' + r.status);
r = await call('/rest/v1/stores?id=not.is.null', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: '바꿔치기' }) });
check('로그인 안 하면 가게를 고칠 수 없다', r.status >= 400 || r.body.trim() === '[]', 'HTTP ' + r.status + (r.status < 400 ? ', 바뀐 행 ' + r.body.trim() : ''));
r = await call('/rest/v1/menus?id=not.is.null', { method: 'DELETE', headers: { Prefer: 'return=representation' } });
check('로그인 안 하면 메뉴를 지울 수 없다', r.status >= 400 || r.body.trim() === '[]', 'HTTP ' + r.status + (r.status < 400 ? ', 지워진 행 ' + r.body.trim() : ''));

// 4. 운영자 명단·함수: 밖에서 보이면 안 됨
r = await call('/rest/v1/admins?select=*');
check('운영자 명단(admins)이 밖에서 안 보인다', r.status >= 400, 'HTTP ' + r.status);
r = await call('/rest/v1/rpc/is_admin', { method: 'POST', body: '{}' });
check('운영자 확인 함수가 밖에서 안 보인다', r.status >= 400, 'HTTP ' + r.status);

// 5. 메뉴판 사진 저장소: 목록 보기·올리기 막혀야 함
r = await call('/storage/v1/object/list/menu-photos', { method: 'POST', body: JSON.stringify({ prefix: '', limit: 10 }) });
check('로그인 안 하면 사진 목록을 볼 수 없다', r.status >= 400 || r.body.trim() === '[]', 'HTTP ' + r.status);
r = await call('/storage/v1/object/menu-photos/hack-test.png', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array([137, 80, 78, 71]) });
check('로그인 안 하면 사진을 올릴 수 없다', r.status >= 400, 'HTTP ' + r.status);
r = await call('/storage/v1/object/public/menu-photos/x.png');
check('사진 저장소가 공개 주소로 열리지 않는다', r.status >= 400, 'HTTP ' + r.status);

// 6. 새 가입이 막혀 있는지
r = await call('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: `check-${Date.now()}@example.invalid`, password: 'Xx-' + Math.random().toString(36).slice(2) + '-9!' }) });
{ // 가입이 "꺼져 있다"는 답(signup_disabled)이 와야만 통과. 다른 이유로 실패하면 확인 불가로 본다
  let code = ''; try { const j = JSON.parse(r.body); code = j.error_code || j.code || j.msg || ''; } catch {}
  const off = /signup_disabled|not allowed|disabled/i.test(String(code) + r.body);
  if (off) check('아무나 새 계정을 만들 수 없다(가입 막힘)', true, 'HTTP ' + r.status);
  else if (r.status < 300) check('아무나 새 계정을 만들 수 없다(가입 막힘)', false, '가입이 열려 있어요! Authentication에서 새 가입을 끄세요');
  else if (/email_address_invalid/.test(String(code))) check('아무나 새 계정을 만들 수 없다(가입 막힘)', false, '가입이 아직 켜져 있어요 → Authentication에서 새 가입을 끄세요');
  else check('아무나 새 계정을 만들 수 없다(가입 막힘)', false, '확인 불가: HTTP ' + r.status + ' ' + String(code).slice(0, 40) + ' → 대시보드에서 직접 확인');
}

const bad = results.filter(x => !x.pass);
console.log(bad.length ? `\n위험 ${bad.length}개: 위 "위험" 줄을 확인하세요.` : `\n전부 통과 (${results.length}개)`);
process.exit(bad.length ? 2 : 0);
