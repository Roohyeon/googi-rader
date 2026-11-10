// 계산 규칙 자동 테스트. 실행: node --test app/tests
// 테스트 값은 기획 문서(planning/googi-radar/03-spec.md)의 수용 기준 예시 숫자를 그대로 쓴다.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

const f = { part: '삼겹살', type: '생고기', origin: '국내산' };
const plain = html => html.replace(/<[^>]+>/g, '');

test('R3: 1인분 160g 14,000원 → 100g당 8,750원', () => {
  assert.equal(Math.round(C.unit({ w: 160, price: 14000 }).v), 8750);
});
test('R3: 100g 8,000원 → 8,000원', () => {
  assert.equal(C.unit({ p100: 8000 }).v, 8000);
});
test('R3·Q2 임시 규칙: 100g 9,000원(1인분 150g 14,500원) → 계산값 9,667원 + 불일치 표시', () => {
  const u = C.unit({ p100: 9000, w: 150, price: 14500 });
  assert.equal(Math.round(u.v), 9667);
  assert.equal(u.mismatch, true);
});
test('D26-10: 표기값과 계산값 차이가 10원 미만이면 표기값', () => {
  const u = C.unit({ p100: 8333, w: 180, price: 15000 }); // 계산 8333.3
  assert.equal(u.v, 8333);
  assert.equal(u.mismatch, false);
});
test('R5·D26-9: 1인분 가격만 있으면 중량 미표기(null)', () => {
  assert.equal(C.unit({ price: 16000 }), null);
});

test('D24: 같은 조건 메뉴가 여럿이면 100g당 최저가 메뉴', () => {
  const s = { name: '삼겹공방', menus: [
    { name: '숙성 생삼겹살', part: '삼겹살', type: '생고기', aged: true, origin: '국내산', w: 150, price: 16000 },
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: 9000, w: 150, price: 14500 }] };
  assert.equal(C.bestMenu(s, f).m.name, '생삼겹살');
});
test('R4: 원산지가 다르면 순위에 섞지 않음', () => {
  const s = { name: 'x', menus: [{ name: '수입', part: '삼겹살', type: '생고기', origin: '수입', w: 200, price: 13000 }] };
  assert.equal(C.bestMenu(s, f), null);
});

test('R7·D21: A 160g 14,000원, B 180g 15,000원 → "B가 20g 더 많고 1,000원 더 비싸요. 20g을 A에서 사면 1,750원이라 B가 750원 이득"', () => {
  const A = { s: { name: '숯불연가' }, m: { w: 160, price: 14000 }, u: { v: 8750 } };
  const B = { s: { name: '돼지명가' }, m: { w: 180, price: 15000 }, u: { v: 15000 / 1.8 } };
  assert.equal(plain(C.gainText(B, A)), '돼지명가가 20g 더 많고 1,000원 더 비싸요. 20g을 숯불연가에서 사면 1,750원이라 돼지명가가 750원 이득이에요.');
});
test('R7·D26-12: A 160g 14,000원, B 180g 16,500원 → "B는 20g 더 주지만 750원 비싸게 받는 셈"', () => {
  const A = { s: { name: 'A가게' }, m: { w: 160, price: 14000 }, u: { v: 8750 } };
  const B = { s: { name: 'B가게' }, m: { w: 180, price: 16500 }, u: { v: 16500 / 1.8 } };
  assert.equal(plain(C.gainText(A, B)), 'B가게는 20g 더 주지만 750원 비싸게 받는 셈이에요.');
});
test('D26-12: 더 많고 더 싸면 "B가 20g 더 많고 500원 더 싸요"', () => {
  const A = { s: { name: 'A' }, m: { w: 160, price: 15000 }, u: { v: 9375 } };
  const B = { s: { name: 'B' }, m: { w: 180, price: 14500 }, u: { v: 14500 / 1.8 } };
  assert.equal(plain(C.gainText(A, B)), 'B가 20g 더 많고 500원 더 싸요.');
});
test('R7: 한쪽이 100g당 가격만 있으면 "같은 100g이면 ○원 차이"', () => {
  const A = { s: { name: '목살정원' }, m: { p100: 8800 }, u: { v: 8800 } };
  const B = { s: { name: '숯불연가' }, m: { w: 160, price: 14000 }, u: { v: 8750 } };
  assert.equal(plain(C.gainText(A, B)), '같은 100g이면 숯불연가가 50원 싸요.');
});

test('D20: 8,000원 vs 8,200원 → 2.4% "거의 같아요"', () => {
  assert.equal(Math.round(C.gapRatio(8000, 8200) * 1000) / 10, 2.4);
  assert.equal(C.isRecommend(8000, 8200), false);
});
test('D20: 8,000원 vs 8,750원 → 8.6% "추천"', () => {
  assert.equal(Math.round(C.gapRatio(8000, 8750) * 1000) / 10, 8.6);
  assert.equal(C.isRecommend(8000, 8750), true);
});

test('R10: 오늘 2026-11-10 → 확인일 2026-05-09는 오래된 정보, 2026-05-10은 아님', () => {
  const today = new Date('2026-11-10T12:00:00+09:00');
  assert.equal(C.isStale('2026-05-09', today), true);
  assert.equal(C.isStale('2026-05-10', today), false);
});
test('R10: 08-31 + 6개월은 다음 해 2월 말일', () => {
  assert.equal(C.addMonthsClamp('2026-08-31', 6), '2027-02-28');
  assert.equal(C.addMonthsClamp('2027-08-31', 6), '2028-02-29');
});

test('R7·D26-17: 동네 시세 = 반경 1km 안 가게 최저가의 중간값, 5곳 미만이면 없음', () => {
  const mk = (id, x, p) => ({ id, name: id, x, y: 0, menus: [{ name: 'a', part: '삼겹살', type: '생고기', origin: '국내산', p100: p }] });
  const cands = [mk('a', 0, 8000), mk('b', 100, 8500), mk('c', 200, 9000), mk('d', 300, 9500), mk('e', 400, 10000), mk('far', 5000, 1)];
  const dist = (p, q) => Math.abs(p.x - q.x);
  const center = sel => ({ x: sel.reduce((t, s) => t + s.x, 0) / sel.length, y: 0 });
  assert.equal(C.dongSise([cands[0], cands[4]], cands, f, dist, center), 9000);
  assert.equal(C.dongSise([cands[0]], cands.slice(0, 4), f, dist, center), null);
});
test('D28-7: 비교 가게끼리 2km 넘게 떨어지면 동네 시세 없음', () => {
  const s1 = { x: 0 }, s2 = { x: 2500 };
  assert.equal(C.dongSise([s1, s2], [], f, (p, q) => Math.abs(p.x - q.x), () => ({ x: 0 })), null);
});

test('조사: 받침에 따라 이/가, 은/는', () => {
  assert.equal(C.josa('삼겹공방', '이가'), '삼겹공방이');
  assert.equal(C.josa('숯불연가', '이가'), '숯불연가가');
  assert.equal(C.josa('삼겹공방', '은는'), '삼겹공방은');
});
test('D28-1·2: 핀 종류', () => {
  assert.equal(C.pinInfo({ name: 'g', gray: true }, f).text, '정보 없음');
  assert.equal(C.pinInfo({ name: '항정', menus: [{ part: '항정살', type: '생고기', origin: '국내산', w: 150, price: 18000 }] }, f).text, '다른 메뉴만');
  assert.equal(C.pinInfo({ name: '미표기', menus: [{ part: '삼겹살', type: '생고기', origin: '국내산', price: 16000 }] }, f).text, '중량 미표기');
});
