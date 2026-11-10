'use strict';
/* 샘플 데이터 (모두 가상). ?demo=1 로 열 때만 쓴다. 실제 서비스 데이터는 카카오 검색 + Supabase (묶음 2·3) */
window.SAMPLE_STORES = [
  { id: 's1', name: '숯불연가', x: 30, y: 40, dist: 180, checked: '2026-10-20', memo: '', menus: [
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 160, price: 14000 },
    { name: '목살', part: '목살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 160, price: 15000 }] },
  { id: 's2', name: '돼지명가', x: 64, y: 30, dist: 320, checked: '2026-10-22', memo: '', menus: [
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 180, price: 15000 },
    { name: '냉동삼겹살', part: '삼겹살', type: '냉동', aged: false, origin: '국내산', p100: null, w: 200, price: 12000 }] },
  { id: 's3', name: '고기한판', x: 40, y: 70, dist: 260, checked: '2026-09-30', memo: '', menus: [
    { name: '냉동삼겹살', part: '삼겹살', type: '냉동', aged: false, origin: '국내산', p100: null, w: 180, price: 11000 },
    { name: '대패삼겹살', part: '삼겹살', type: '대패', aged: false, origin: '국내산', p100: null, w: 200, price: 9000 }] },
  { id: 's4', name: '삼겹공방', x: 78, y: 56, dist: 450, checked: '2026-10-05', memo: '2인분 이상 주문', menus: [
    { name: '숙성 생삼겹살', part: '삼겹살', type: '생고기', aged: true, origin: '국내산', p100: null, w: 150, price: 16000 },
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: 9000, w: 150, price: 14500 }] },
  { id: 's5', name: '목살정원', x: 16, y: 62, dist: 500, checked: '2026-04-02', memo: '', menus: [
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: 8800, w: null, price: null },
    { name: '목살', part: '목살', type: '생고기', aged: false, origin: '국내산', p100: 9300, w: null, price: null }] },
  { id: 's6', name: '구이마당', x: 70, y: 16, dist: 600, checked: '2026-10-28', memo: '', menus: [
    { name: '삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: null, w: null, price: 16000 }] },
  { id: 's7', name: '연탄골목', x: 28, y: 20, dist: 380, checked: '2026-11-01', memo: '', menus: [
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 170, price: 15500 },
    { name: '수입 생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '수입', p100: null, w: 200, price: 13000 }] },
  { id: 's8', name: '참숯쌈', x: 84, y: 78, dist: 700, checked: '2026-10-15', memo: '', menus: [
    { name: '항정살', part: '항정살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 150, price: 18000 }] },
  { id: 's9', name: '대패천국', x: 58, y: 86, dist: 550, checked: '2026-10-10', memo: '', menus: [
    { name: '대패삼겹살', part: '삼겹살', type: '대패', aged: false, origin: '국내산', p100: null, w: 250, price: 9900 },
    { name: '생삼겹살', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: null, w: 160, price: 15200 }] },
  { id: 'g1', name: '○○갈비', x: 10, y: 34, dist: 420, gray: true, menus: [] },
  { id: 'g2', name: '△△고깃집', x: 90, y: 36, dist: 650, gray: true, menus: [] },
  { id: 'g3', name: '□□숯불', x: 22, y: 82, dist: 120, gray: true, menus: [] },
];
