'use strict';
/* 고기 레이더 화면 — 계산 규칙은 planning/googi-radar/03-spec.md (R3, R4, R7, D21, D24, D26, D28)를 따른다.
   레이아웃: 지도 전체 + 아래에서 끌어올리는 목록 시트, 하단 탭 지도·목록/비교/즐겨찾기, 운영자 입력은 메뉴(⋯) 안 (2차 디자인 리뷰 후 사용자 선택) */

// ---------- 가짜 데이터 (모두 가상) ----------
const TODAY = new Date('2026-11-10T00:00:00+09:00');
const STORES = [
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
const PARTS = ['삼겹살', '목살'];
const TYPES = ['생고기', '냉동', '대패'];
const ORIGINS = ['국내산', '수입'];

// ---------- 계산 ----------
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const won = n => fmt(n) + '원';
const won10 = n => (Math.round(n / 10) * 10).toLocaleString('ko-KR') + '원';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nameTag = s => `<span translate="no">${esc(s.name)}</span>`;

function unit(m) { // 100g당 가격 (반올림 전). 중량 미표기면 null (R3, D26-9, D26-10)
  if (m.w && m.price) {
    const calc = m.price / m.w * 100;
    if (m.p100 != null) {
      if (Math.abs(Math.round(calc) - m.p100) >= 10) return { v: calc, mismatch: true, label: m.p100 };
      return { v: m.p100, mismatch: false };
    }
    return { v: calc, mismatch: false };
  }
  if (m.p100 != null) return { v: m.p100, mismatch: false };
  return null;
}
const meatKey = m => `${m.part}·${m.type}·${m.origin}`;
const matches = (m, f) => m.part === f.part && m.type === f.type && m.origin === f.origin;
function bestMenu(s, f) { // 조건에 맞는 메뉴 중 100g당 최저가 (D24)
  let best = null;
  s.menus.filter(m => matches(m, f)).forEach(m => { const u = unit(m); if (u && (!best || u.v < best.u.v)) best = { m, u }; });
  return best;
}
const noWeight = (s, f) => s.menus.filter(m => matches(m, f) && !unit(m));
function isStale(s) { // R10: 확인일 + 6개월보다 뒤
  const d = new Date(s.checked + 'T00:00:00+09:00');
  const lim = new Date(d); lim.setMonth(lim.getMonth() + 6);
  if (lim.getDate() !== d.getDate()) lim.setDate(0);
  return TODAY > lim;
}
function pinInfo(s, f) { // D22, D28-1, D28-2. 가격 있는 핀만 흰 꼬리표, 나머지는 모두 점선(가격 없음)
  if (s.gray) return { kind: 'none', text: '정보 없음', aria: `${s.name}, 정보 없음` };
  const b = bestMenu(s, f);
  if (b) return { kind: 'price', text: fmt(b.u.v), aria: `${s.name}, 100g당 ${won(b.u.v)}` };
  const ranked = s.menus.some(m => PARTS.includes(m.part) && TYPES.includes(m.type) && unit(m));
  if (ranked) return { kind: 'none', text: '필터 밖', aria: `${s.name}, 필터 밖: 이 필터에 맞는 메뉴가 없어요` };
  const onlyNoWeight = s.menus.length > 0 && s.menus.every(m => !unit(m));
  const t = onlyNoWeight ? '중량 미표기' : '다른 메뉴만';
  return { kind: 'none', text: t, aria: `${s.name}, ${t}` };
}
const dist2 = (a, b) => Math.hypot((a.x - b.x) * 20, (a.y - b.y) * 20); // 가짜 지도: 1칸 = 20m
function dongSise(sel, f) { // R7, D18, D26-5, D26-17, D28-7
  for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) if (dist2(sel[i], sel[j]) > 2000) return null;
  const c = { x: sel.reduce((a, s) => a + s.x, 0) / sel.length, y: sel.reduce((a, s) => a + s.y, 0) / sel.length };
  const vals = STORES.filter(s => !s.gray && dist2(s, c) <= 1000).map(s => bestMenu(s, f)).filter(Boolean).map(b => b.u.v).sort((a, b) => a - b);
  if (vals.length < 5) return null;
  const n = vals.length;
  return n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
}
function josa(word, pair) { const c = word.charCodeAt(word.length - 1) - 0xAC00; return word + (c >= 0 && c <= 11171 && c % 28 !== 0 ? pair[0] : pair[1]); }
function gainText(a, b) { // D21, D26-12
  if (!a.m.w || !b.m.w || !a.m.price || !b.m.price) {
    const [c, d] = a.u.v <= b.u.v ? [a, b] : [b, a];
    return `같은 100g이면 <strong>${esc(josa(c.s.name, '이가'))}</strong> ${won10(d.u.v - c.u.v)} 싸요.`;
  }
  if (a.m.w === b.m.w) {
    const [c, d] = a.m.price <= b.m.price ? [a, b] : [b, a];
    return `같은 ${a.m.w}g인데 <strong>${esc(josa(c.s.name, '이가'))}</strong> ${won10(d.m.price - c.m.price)} 싸요.`;
  }
  const [more, less] = a.m.w > b.m.w ? [a, b] : [b, a];
  const g = more.m.w - less.m.w, pd = more.m.price - less.m.price;
  if (pd <= 0) return `<strong>${esc(josa(more.s.name, '이가'))}</strong> ${g}g 더 많고 ${won10(-pd)} 더 싸요.`;
  const value = g * less.u.v / 100, gain = value - pd;
  if (gain >= 0) return `<strong>${esc(josa(more.s.name, '이가'))}</strong> ${g}g 더 많고 ${won10(pd)} 더 비싸요. ${g}g을 ${esc(less.s.name)}에서 사면 ${won10(value)}이라 <strong>${esc(josa(more.s.name, '이가'))} ${won10(gain)} 이득</strong>이에요.`;
  return `<strong>${esc(josa(more.s.name, '은는'))}</strong> ${g}g 더 주지만 ${won10(-gain)} 비싸게 받는 셈이에요.`;
}
const placeUrl = s => `https://place.map.kakao.com/${s.id}`; // 가상 링크 (실제 서비스에서는 카카오 API의 place_url)
const kakaoLink = (s, cls) => `<a class="${cls || 'btn btn--quiet'}" href="${placeUrl(s)}" target="_blank" rel="noopener"><span translate="no">카카오맵</span>에서 리뷰 보기<span class="sr-only"> (${esc(s.name)}, 새 창)</span></a>`;

// ---------- 상태 ----------
const ST = {
  screen: 'map', prev: 'map', mapState: '정상', cmpState: '정상', adminState: '로그인 전',
  filter: { part: '삼겹살', type: '생고기', origin: '국내산' },
  cmpIds: ['s1', 's2', 's3'], cmpMeat: null, basis: '가성비', picker: false,
  pin: null, sheet: 'half', detailId: 's1', favs: { s2: true }, form: null, formMsg: null, saveFails: false, dirty: false,
  showNotes: false, menuOpen: false, toastFrom: null,
};
const DEV = [
  ['map:정상', '지도 정상'], ['map:로딩', '로딩'], ['map:빈 목록', '빈 목록'], ['map:위치 거부', '위치 거부'], ['map:지역 밖', '지역 밖'], ['map:카카오 오류', '카카오 오류'],
  ['cmp:정상', '비교 3곳'], ['cmp:1곳만', '비교 1곳'], ['cmp:비어 있음', '비교 비어 있음'],
  ['fav:있음', '즐겨찾기'], ['fav:없음', '즐겨찾기 없음'],
  ['detail:s1', '상세 정상'], ['detail:s5', '상세 오래된 정보'], ['detail:s4', '상세 표기 불일치'], ['detail:s8', '상세 다른 메뉴만'],
  ['admin:로그인 전', '운영자 로그인 전'], ['admin:입력', '운영자 입력'], ['admin:저장 실패', '운영자 저장 실패'],
];
const openq = text => ST.showNotes ? `<p class="openq">검토용 메모: ${text}</p>` : '';

function toast(msg) { // 저절로 사라지지 않는다 (WCAG 2.2.1). 닫으면 알림을 띄운 요소로 포커스를 돌려준다
  const a = document.activeElement;
  ST.toastFrom = a && a.dataset ? { act: a.dataset.act, id: a.dataset.id || '', from: a.dataset.from || '' } : null;
  document.getElementById('toast').innerHTML = `<span>${esc(msg)}</span><button type="button" data-act="closetoast">닫기<span class="sr-only"> (알림)</span></button>`;
}
function toggleCmp(id) {
  const i = ST.cmpIds.indexOf(id);
  if (i >= 0) ST.cmpIds.splice(i, 1);
  else if (ST.cmpIds.length >= 3) { toast('최대 3곳까지 비교할 수 있어요. 한 곳을 빼고 넣어 주세요.'); return; }
  else ST.cmpIds.push(id);
  ST.cmpMeat = null;
}
const cmpBtn = (s, from, cls) => { const inCmp = ST.cmpIds.includes(s.id);
  return `<button class="btn ${cls || ''}" type="button" data-act="cmp" data-id="${s.id}" data-from="${from}">${inCmp ? '비교에서 빼기' : '비교에 넣기'}<span class="sr-only"> (${esc(s.name)})</span></button>`; };
const detailBtn = (s, from) => `<button class="btn btn--quiet" type="button" data-act="detail" data-id="${s.id}" data-from="${from}">상세 보기<span class="sr-only"> (${esc(s.name)})</span></button>`;
const starBtn = (s, from) => { const fav = !!ST.favs[s.id];
  return `<button class="star" type="button" data-act="fav" data-id="${s.id}" data-from="${from}" aria-pressed="${fav}" aria-label="${esc(s.name)} 즐겨찾기"><span aria-hidden="true">${fav ? '★' : '☆'}</span></button>`; };
const staleTag = s => isStale(s) ? '<span class="warn"><span aria-hidden="true">⚠ </span>오래된 정보일 수 있어요</span>' : '';

// ---------- 라벨 카드 ----------
function labelCard(s, b, rank, from) {
  const m = b.m;
  return `<li class="label">
    <div class="label__head">
      ${rank ? `<span class="label__rank">${rank}<span class="sr-only">위</span></span>` : ''}
      <h3 class="label__name">${nameTag(s)}</h3>
      <span class="label__dist num">${s.dist}m</span>
      ${starBtn(s, from)}
    </div>
    <div class="label__body">
    <p class="label__menu">${esc(m.name)}${m.aged ? '<span class="tag">숙성</span>' : ''} <span class="t-muted">${m.origin}</span></p>
    <dl class="cells">
      <div><dt>중량</dt><dd>${m.w && m.price ? m.w + 'g' : '-'}</dd></div>
      <div class="unit"><dt>100g당</dt><dd>${fmt(b.u.v)}<small>원</small></dd></div>
      <div><dt>판매가</dt><dd>${m.w && m.price ? won(m.price) : '-'}</dd></div>
    </dl>
    <p class="label__meta">메뉴 확인일 ${s.checked} ${staleTag(s)}</p>
    <div class="actions">${cmpBtn(s, from)}${detailBtn(s, from)}</div>
    </div>
  </li>`;
}

// ---------- ① 지도 + 목록 시트 ----------
const MAP_SVG = `<svg class="map__art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <rect x="2" y="3" width="20" height="16" class="blk"/><rect x="26" y="3" width="18" height="16" class="blk"/><rect x="56" y="3" width="16" height="16" class="blk"/><rect x="76" y="3" width="22" height="16" class="blk"/>
  <rect x="2" y="23" width="20" height="20" class="blk"/><rect x="26" y="23" width="18" height="20" class="blk"/><rect x="56" y="23" width="16" height="20" class="blk"/><rect x="76" y="23" width="22" height="20" class="park"/>
  <rect x="2" y="55" width="20" height="18" class="park"/><rect x="26" y="55" width="18" height="18" class="blk"/><rect x="56" y="55" width="16" height="18" class="blk"/><rect x="76" y="55" width="22" height="18" class="blk"/>
  <rect x="2" y="77" width="20" height="20" class="blk"/><rect x="26" y="77" width="18" height="20" class="blk"/><rect x="56" y="77" width="16" height="20" class="blk"/><rect x="76" y="77" width="22" height="20" class="blk"/>
  <rect x="0" y="46" width="100" height="6" class="road"/><rect x="47" y="0" width="6" height="100" class="road"/>
  <line x1="0" y1="45" x2="100" y2="45" class="rail"/>
</svg>`;
function filterRow(f) { // 한 줄 가로 스크롤 칩. 세 묶음은 각각 라디오 그룹
  const grp = (name, legend, vals) => `<fieldset class="fgroup"><legend class="sr-only">${legend}</legend>${vals.map(v => `<label class="chip"><input type="radio" name="${name}" value="${v}" data-act="filter" ${f[name] === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</fieldset>`;
  return `<div class="filterbar" role="group" aria-label="고기 고르기">${grp('part', '부위', PARTS)}<span class="fsep" aria-hidden="true"></span>${grp('type', '종류', TYPES)}<span class="fsep" aria-hidden="true"></span>${grp('origin', '원산지', ORIGINS)}</div>`;
}
function pinView(f) { // 핀을 고르면 시트 안에 그 가게를 보여 준다 (지도를 가리지 않고, 화면 밖으로 밀리지 않음)
  const s = STORES.find(x => x.id === ST.pin), p = pinInfo(s, f), b = bestMenu(s, f);
  const back = `<button class="btn btn--quiet btn--sm" type="button" data-act="closepin">목록으로<span class="sr-only"> (가게 정보 닫기)</span></button>`;
  let body;
  if (b) body = `<ul class="plain" role="list">${labelCard(s, b, 0, 'pin')}</ul>`;
  else body = `<div class="label label--plain"><div class="label__head"><h3 class="label__name">${nameTag(s)}</h3><span class="label__dist num">${s.dist}m</span>${s.gray ? '' : starBtn(s, 'pin')}</div>
    <div class="label__body"><p class="label__menu">${s.gray ? '정보 없음. 아직 메뉴를 확인하지 않은 가게예요.' : p.text === '필터 밖' ? '이 필터에 맞는 메뉴가 없어요.' : p.text}</p>
    <div class="actions">${s.gray ? kakaoLink(s) : detailBtn(s, 'pin')}</div></div></div>`;
  return `<div class="sheet__title"><h2 id="sheet-title">선택한 가게</h2>${back}</div>${body}`;
}
function listView(f, visible) {
  const ranked = visible.filter(s => !s.gray).map(s => ({ s, b: bestMenu(s, f) })).filter(x => x.b).sort((a, b) => a.b.u.v - b.b.u.v);
  const nw = visible.filter(s => !s.gray && !bestMenu(s, f)).map(s => ({ s, ms: noWeight(s, f) })).filter(x => x.ms.length);
  let h = `<div class="sheet__title"><h2 id="sheet-title">100g당 싼 순</h2><p>${f.part} ${f.type} ${f.origin} ${ranked.length}곳</p></div>`;
  if (ST.mapState === '빈 목록' || (!ranked.length && !nw.length)) return h + `<div class="empty"><p>이 조건의 메뉴를 확인한 가게가 아직 없어요.</p><p>다른 부위나 종류를 골라 보세요.</p></div>`;
  h += `<ol class="ranked" role="list">${ranked.map((x, i) => labelCard(x.s, x.b, i + 1, 'list')).join('')}</ol>`;
  if (nw.length) {
    h += `<h3 class="group-title">중량 미표기</h3><p class="group-note">100g당 가격을 계산할 수 없어요.</p><ul class="plain" role="list">${nw.map(x => `<li class="label label--plain">
      <div class="label__head"><h4 class="label__name">${nameTag(x.s)}</h4><span class="label__dist num">${x.s.dist}m</span></div>
      <div class="label__body">${x.ms.map(m => `<p class="label__menu">${esc(m.name)} 1인분 <span class="num">${won(m.price)}</span></p>`).join('')}
      <div class="actions">${detailBtn(x.s, 'list')}</div></div></li>`).join('')}</ul>`;
  }
  return h;
}
function viewMap() {
  const st = ST.mapState, f = ST.filter;
  const visible = st === '카카오 오류' ? STORES.filter(s => !s.gray) : STORES;
  let pins = '';
  if (st === '정상' || st === '빈 목록' || st === '카카오 오류') {
    pins = visible.map(s => { const p = pinInfo(s, f);
      return `<button class="pin pin--${p.kind}" type="button" style="left:${s.x}%;top:${s.y}%" data-act="pin" data-id="${s.id}" data-from="map" aria-label="${esc(p.aria)}" aria-expanded="${ST.pin === s.id}"${ST.pin === s.id ? ' aria-controls="sheet"' : ''}>${p.text}</button>`; }).join('');
  }
  let sheet;
  if (st === '위치 거부' || st === '지역 밖') {
    const msg = st === '위치 거부' ? '위치를 쓰지 않아도 괜찮아요. 어느 동네부터 볼까요?' : '아직 이 지역은 준비 중이에요. 지금은 인천 미추홀구·남동구만 볼 수 있어요.';
    sheet = `<div class="empty"><p>${msg}</p><div class="actions"><button class="btn btn--primary" type="button" data-act="area">주안역 주변 보기</button><button class="btn" type="button" data-act="area">구월동 보기</button></div></div>`;
  } else if (st === '로딩') sheet = `<p class="loading" role="status">주변 고기집을 찾고 있어요…</p>`;
  else sheet = (st === '카카오 오류' ? `<div class="banner" role="status"><strong>지금은 가게 목록을 불러올 수 없어요. 확인해 둔 가게만 보여 드릴게요.</strong><button class="btn btn--sm" type="button" data-act="retry">다시 불러오기</button></div>` : '')
    + (ST.pin ? pinView(f) : listView(f, visible));
  const tray = ST.cmpIds.length ? `<div class="tray"><span>비교 ${ST.cmpIds.length}곳</span><button class="btn btn--primary btn--sm" type="button" data-act="tab" data-tab="cmp" data-from="tray">비교 보기</button></div>` : '';
  const sheetLabel = { peek: '목록 펼치기', half: '목록 더 펼치기', full: '목록 접기' }[ST.sheet];
  return `<div class="mapview">
    <section class="map" aria-label="고기집 지도 (가상)">${MAP_SVG}<span class="station">주안역</span>${pins}</section>
    ${filterRow(f)}
    <p class="legend"><span class="legend__price">8,333</span> 100g당 가격 <span class="legend__none">점선</span> 가격 없음</p>
    <section class="sheet sheet--${ST.sheet}" id="sheet" aria-labelledby="sheet-title">
      <button class="sheet__handle" type="button" data-act="sheet" aria-label="${sheetLabel}"><span aria-hidden="true"></span></button>
      <div class="sheet__body" id="sheet-body">${sheet}</div>${tray}
    </section>
    <p class="sr-only" aria-live="polite" id="sheet-status">${ST.pin ? `${esc(STORES.find(s => s.id === ST.pin).name)} 정보를 목록 자리에 보여 줘요` : ''}</p>
  </div>`;
}

// ---------- ② 비교 (결론 먼저) ----------
function pickerHtml(f) { // D29
  const full = ST.cmpIds.length >= 3;
  const cands = STORES.filter(s => !s.gray && !ST.cmpIds.includes(s.id)).map(s => ({ s, b: bestMenu(s, f) }))
    .sort((a, b) => (a.b ? a.b.u.v : 1e9) - (b.b ? b.b.u.v : 1e9));
  return `<section class="picker" id="picker" aria-labelledby="picker-title">
    <div class="picker__head"><h2 id="picker-title">비교에 넣을 가게</h2><button class="btn btn--quiet btn--on-ink" type="button" data-act="picker" data-from="pickerhead" aria-expanded="true" aria-controls="picker">추가 목록 닫기</button></div>
    ${full ? '<p class="err">최대 3곳까지 비교할 수 있어요. 한 곳을 빼고 넣어 주세요.</p>' : ''}
    <p>${f.part} ${f.type} ${f.origin}, 100g당 싼 순. 정보 없음 가게는 넣을 수 없어요.</p>
    ${cands.length ? `<ul role="list">${cands.map(x => `<li><span>${nameTag(x.s)} <span class="t-muted num">${x.s.dist}m</span><br><span class="t-muted">${x.b ? '100g당 ' + won(x.b.u.v) : '이 고기 없음'}</span></span>
      <button class="btn" type="button" data-act="cmp" data-id="${x.s.id}" data-from="picker" ${full ? 'disabled' : ''} aria-label="${esc(x.s.name)} 비교에 넣기">넣기</button></li>`).join('')}</ul>` : '<p>더 넣을 수 있는 가게가 없어요.</p>'}
  </section>`;
}
function trayChips() { // 담은 가게 칩 (× 로 빼기) + 가게 추가
  const sel = ST.cmpIds.map(id => STORES.find(s => s.id === id));
  return `<div class="cmptray">${sel.map(s => `<button class="cchip" type="button" data-act="cmp" data-id="${s.id}" data-from="chip" aria-label="${esc(s.name)} 비교에서 빼기">${nameTag(s)}<span aria-hidden="true">×</span></button>`).join('')}
    <button class="btn btn--primary btn--sm" type="button" data-act="picker" data-from="add" aria-expanded="${ST.picker}"${ST.picker ? ' aria-controls="picker"' : ''}><span aria-hidden="true">+ </span>가게 추가</button></div>`;
}
function siseBar(rows, sise) { // 시세 막대
  const pts = rows.filter(r => r.b);
  if (sise == null || !pts.length) return `<section class="sise"><h2>동네 시세</h2><p class="sise__none">동네 시세: - (비교할 가게가 아직 적어요)</p></section>`;
  const vals = pts.map(r => r.b.u.v).concat(sise);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.03;
  const pos = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
  return `<section class="sise" aria-labelledby="sise-title"><h2 id="sise-title">동네 시세: 100g당 ${won(sise)}</h2>
    ${pts.map(r => { const p = (r.b.u.v - sise) / sise * 100; const cheap = p < 0;
      const txt = `동네 시세보다 ${Math.abs(p).toFixed(1)}% ${cheap ? '저렴' : '비쌈'}`;
      return `<div class="sise__row" role="img" aria-label="${esc(r.s.name)} 100g당 ${won(r.b.u.v)}, ${txt}">
        <span>${nameTag(r.s)}</span>
        <span class="sise__track"><span class="sise__mid" style="left:${pos(sise)}%"></span><span class="sise__dot sise__dot--${cheap ? 'cheap' : 'pricey'}" style="left:${pos(r.b.u.v)}%"></span></span>
        <span class="num ${cheap ? 'cheap' : 'pricey'}">${cheap ? '−' : '+'}${Math.abs(p).toFixed(1)}%</span></div>`; }).join('')}
    <p class="sise__legend">세로선이 동네 시세(반경 1km 같은 고기 가게들의 중간값)예요. 초록 점은 더 싸고, 주황 점은 더 비싸요.</p></section>`;
}
function viewCmp() {
  const sel = ST.cmpIds.map(id => STORES.find(s => s.id === id));
  if (!sel.length) {
    return `<div class="screen-pad"><div class="empty"><p>아직 비교할 가게가 없어요.</p><p>“가게 추가”를 눌러 2~3곳을 골라 보세요.</p>
      <div class="actions"><button class="btn btn--primary" type="button" data-act="picker" data-from="add" aria-expanded="${ST.picker}"${ST.picker ? ' aria-controls="picker"' : ''}><span aria-hidden="true">+ </span>가게 추가</button><button class="btn" type="button" data-act="tab" data-tab="map" data-from="empty">목록으로 가기</button></div></div>
      ${ST.picker ? pickerHtml(ST.filter) : ''}</div>`;
  }
  const counts = {};
  sel.forEach(s => { const seen = {}; s.menus.filter(m => PARTS.includes(m.part) && TYPES.includes(m.type)).forEach(m => { const k = meatKey(m); if (!seen[k]) { seen[k] = 1; counts[k] = (counts[k] || 0) + 1; } }); });
  const keys = Object.keys(counts);
  const fk = meatKey(ST.filter);
  if (!ST.cmpMeat || !keys.includes(ST.cmpMeat)) ST.cmpMeat = keys.includes(fk) ? fk : keys.slice().sort((a, b) => counts[b] - counts[a])[0]; // D28-5
  const [part, type, origin] = ST.cmpMeat.split('·');
  const f = { part, type, origin };
  const rows = sel.map(s => { const b = bestMenu(s, f); const nwm = noWeight(s, f)[0]; return { s, b, nw: !b && nwm ? nwm : null, none: !b && !nwm }; });
  const sise = dongSise(sel, f);
  const val = r => ST.basis === '가성비' ? (r.b ? r.b.u.v : null)
    : ST.basis === '양' ? (r.b && r.b.m.w && r.b.m.price ? -r.b.m.w : null)
    : (r.b && r.b.m.price && r.b.m.w ? r.b.m.price : r.nw ? r.nw.price : null);
  rows.sort((a, b) => { const va = val(a), vb = val(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return va - vb; });
  const comp = rows.filter(r => val(r) != null);
  const badges = {};
  let verdict = '비교할 수 있는 가게가 2곳 이상이면 결론을 보여 드려요.';
  if (comp.length >= 2) { // D20, D25, D28-4, D28-6
    if (ST.basis === '가성비') {
      const d = (comp[1].b.u.v - comp[0].b.u.v) / comp[1].b.u.v;
      if (d >= 0.03) { badges[comp[0].s.id] = ['가성비 추천', '']; verdict = `<strong>${esc(josa(comp[0].s.name, '이가'))}</strong> 100g당 가장 싸요. <span class="badge">가성비 추천</span>`; }
      else { badges[comp[0].s.id] = ['거의 같아요', 'same']; badges[comp[1].s.id] = ['거의 같아요', 'same']; verdict = `<strong>${esc(comp[0].s.name)}</strong>와 <strong>${esc(comp[1].s.name)}</strong>의 100g당 가격이 거의 같아요. <span class="badge badge--same">거의 같아요</span>`; }
    } else {
      const top = val(comp[0]); const tops = comp.filter(r => val(r) === top); const label = ST.basis === '양' ? '양 최고' : '가장 저렴';
      tops.forEach(r => { badges[r.s.id] = [label, '']; });
      verdict = `${tops.map(r => `<strong>${esc(r.s.name)}</strong>`).join(', ')} <span class="badge">${label}</span>${ST.basis === '가격' && tops.some(r => r.nw) ? ' <span class="t-muted">(중량 미표기)</span>' : ''}`;
    }
  }
  const withU = rows.filter(r => r.b).sort((a, b) => a.b.u.v - b.b.u.v);
  let gains = '';
  if (sel.length === 1) gains = `<p>한 곳만 골랐어요. 한 곳을 더 넣으면 차이를 계산해 드려요.</p>`;
  else if (withU.length >= 2) { const base = withU[0]; gains = withU.slice(1).map(o => `<p>${gainText({ s: base.s, m: base.b.m, u: base.b.u }, { s: o.s, m: o.b.m, u: o.b.u })}</p>`).join(''); }
  const cell = (r, fn) => r.none ? '<span class="t-muted">이 고기 없음</span>' : fn(r);
  const menuOf = r => r.b ? r.b.m : r.nw;
  let h = `<div class="screen-pad">${trayChips()}${ST.picker ? pickerHtml(f) : ''}
    <div class="cmp-controls"><label for="meat">어떤 고기를 비교할까요?</label>
    <select id="meat" name="meat" data-act="meat" autocomplete="off">${keys.map(k => `<option value="${k}" ${k === ST.cmpMeat ? 'selected' : ''}>${k.replace(/·/g, ' ')}</option>`).join('')}</select>
    <fieldset><legend>무엇을 기준으로 볼까요?</legend>${['가성비', '양', '가격'].map(b => `<label class="chip"><input type="radio" name="basis" value="${b}" data-act="basis" ${ST.basis === b ? 'checked' : ''}><span>${b}(${b === '가성비' ? '100g당' : '1인분'})</span></label>`).join('')}</fieldset></div>
    <section class="verdict" aria-labelledby="verdict-title"><h2 id="verdict-title">결론</h2><p class="verdict__main">${verdict}</p><div class="verdict__gain">${gains}</div></section>
    <div class="cmp-table-wrap" tabindex="0" role="region" aria-label="비교 표 (가로로 스크롤할 수 있어요)"><table class="cmp" id="cmp-table"><caption tabindex="-1">${part} ${type} ${origin}, ${ST.basis} 기준</caption>
    <thead><tr><td></td>${rows.map(r => `<th scope="col">${nameTag(r.s)}${badges[r.s.id] ? `<br><span class="badge ${badges[r.s.id][1] ? 'badge--same' : ''}">${badges[r.s.id][0]}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody>
    <tr><th scope="row">메뉴</th>${rows.map(r => `<td>${cell(r, r => esc(menuOf(r).name) + (menuOf(r).aged ? '<br><span class="tag">숙성</span>' : ''))}</td>`).join('')}</tr>
    <tr><th scope="row">100g당</th>${rows.map(r => `<td>${cell(r, r => r.b ? `<span class="unit">${won(r.b.u.v)}</span>` : '알 수 없음<br><span class="t-muted">(중량 미표기)</span>')}</td>`).join('')}</tr>
    <tr><th scope="row">1인분</th>${rows.map(r => `<td>${cell(r, r => { const m = menuOf(r); return m.w && m.price ? `${m.w}g<br>${won(m.price)}` : m.price ? `-<br>${won(m.price)}` : '-'; })}</td>`).join('')}</tr>
    <tr><th scope="row">동네 대비</th>${rows.map(r => `<td>${cell(r, r => { if (!r.b || sise == null) return '-'; const p = (r.b.u.v - sise) / sise * 100; return `<span class="${p < 0 ? 'cheap' : 'pricey'}">${Math.abs(p).toFixed(1)}% ${p < 0 ? '저렴' : '비쌈'}</span>`; })}</td>`).join('')}</tr>
    <tr><th scope="row">거리</th>${rows.map(r => `<td>${r.s.dist}m</td>`).join('')}</tr>
    <tr><th scope="row">메뉴 확인일</th>${rows.map(r => `<td>${r.s.checked}${isStale(r.s) ? '<br>' + staleTag(r.s) : ''}</td>`).join('')}</tr>
    <tr><th scope="row">리뷰</th>${rows.map(r => `<td>${kakaoLink(r.s, 'tlink')}</td>`).join('')}</tr>
    </tbody></table></div>${siseBar(rows, sise)}`;
  if (ST.cmpMeat === '삼겹살·생고기·국내산') h += openq('참가격 인천 평균(100g ○○원)을 여기 보여줄 예정. 참가격 조사 기준 확인 전이라 값 없음 [기획 열린 질문 Q4, R12]');
  return h + `</div>`;
}

// ---------- ③ 즐겨찾기 ----------
function viewFav() {
  const list = STORES.filter(s => ST.favs[s.id]);
  if (!list.length) return `<div class="screen-pad"><div class="empty"><p>아직 즐겨찾기한 가게가 없어요.</p><p>가게 라벨의 ☆를 누르면 여기에 모여요.</p><div class="actions"><button class="btn btn--primary" type="button" data-act="tab" data-tab="map" data-from="empty">목록으로 가기</button></div></div></div>`;
  const f = ST.filter;
  return `<div class="screen-pad"><p class="screen-note">즐겨찾기는 이 폰에만 저장돼요. ${f.part} ${f.type} ${f.origin} 기준으로 보여 줘요.</p><ul class="plain" role="list">${list.map(s => { const b = bestMenu(s, f);
    return b ? labelCard(s, b, 0, 'fav') : `<li class="label label--plain"><div class="label__head"><h3 class="label__name">${nameTag(s)}</h3><span class="label__dist num">${s.dist}m</span>${starBtn(s, 'fav')}</div><div class="label__body"><p class="label__menu">이 필터에 맞는 메뉴가 없어요.</p><div class="actions">${detailBtn(s, 'fav')}</div></div></li>`; }).join('')}</ul></div>`;
}

// ---------- ④ 가게 상세 ----------
function viewDetail() {
  const s = STORES.find(x => x.id === ST.detailId) || STORES[0];
  const fav = !!ST.favs[s.id];
  const ranked = s.menus.filter(m => PARTS.includes(m.part) && TYPES.includes(m.type));
  const others = s.menus.filter(m => !ranked.includes(m));
  const line = m => { const u = unit(m);
    const shown = [m.p100 != null ? `100g ${won(m.p100)}` : '', m.w ? `1인분 ${m.w}g` : '', m.price ? `${m.w ? '' : '1인분 '}${won(m.price)}` : ''].filter(Boolean).join(', ');
    return `<li class="label"><div class="label__head"><h3 class="label__name">${esc(m.name)}</h3>${m.aged ? '<span class="tag tag--on-ink">숙성</span>' : ''}</div>
      <div class="label__body"><p class="label__menu"><span class="t-muted">${m.part} ${m.type} ${m.origin}</span></p>
      <dl class="cells"><div><dt>중량</dt><dd>${m.w ? m.w + 'g' : '-'}</dd></div>
      <div class="unit"><dt>100g당</dt><dd>${u ? `${fmt(u.v)}<small>원</small>` : '<small>중량 미표기</small>'}</dd></div>
      <div><dt>판매가</dt><dd>${m.price ? won(m.price) : '-'}</dd></div></dl>
      <p class="label__meta">메뉴판 표기: ${shown}</p>
      ${u && u.mismatch ? `<p class="note-user">메뉴판에는 100g당 ${won(u.label)}으로 적혀 있지만 계산하면 ${won(u.v)}이에요. 순위에는 계산값을 써요.</p>${openq('표기값과 계산값이 다를 때 어느 쪽을 쓸지는 아직 임시 규칙 [기획 열린 질문 Q2]')}` : ''}</div></li>`; };
  let h = `<div class="screen-pad"><div class="detail-top"><p class="detail-meta">${s.dist}m · 메뉴 확인일 ${s.checked} ${staleTag(s)}</p>
    ${s.memo ? `<p class="detail-memo">${esc(s.memo)}</p>` : ''}
    <div class="actions">${ranked.some(m => unit(m)) ? cmpBtn(s, 'detail', 'btn--primary') : ''}
    <button class="btn" type="button" data-act="fav" data-id="${s.id}" data-from="detailfav"><span aria-hidden="true">${fav ? '★' : '☆'} </span>${fav ? '즐겨찾기 해제' : '즐겨찾기'}</button>
    ${kakaoLink(s)}</div>
    <p class="screen-note">즐겨찾기는 이 폰에만 저장돼요.</p></div>`;
  if (ranked.length) h += `<h2 class="section-title">삼겹살·목살</h2><ul class="plain" role="list">${ranked.map(line).join('')}</ul>`;
  if (others.length) h += `<h2 class="section-title">다른 메뉴 (순위에는 쓰지 않아요)</h2><ul class="plain" role="list">${others.map(line).join('')}</ul>`;
  return h + `</div>`;
}

// ---------- ⑤ 운영자 입력 (메뉴 ⋯ 안) ----------
function newForm() { ST.form = { store: 'g3', name: '', part: '삼겹살', type: '생고기', aged: false, origin: '국내산', p100: '', w: '', price: '', memo: '', date: '2026-11-10' }; ST.dirty = false; }
const FIELD_LABEL = { p100: '100g당 가격', w: '1인분 중량', price: '1인분 가격' };
const showFieldErr = () => ST.dirty || (ST.formMsg && !ST.formMsg.ok);
function check() { // D26-9, R9
  const F = ST.form, num = x => x === '' ? null : Number(x);
  const p100 = num(F.p100), w = num(F.w), price = num(F.price);
  const bad = [['p100', p100], ['w', w], ['price', price]].filter(([, v]) => v != null && !(Number.isInteger(v) && v > 0)).map(([k]) => k);
  if (bad.length) {
    const fe = {}; bad.forEach(k => { fe[k] = `${FIELD_LABEL[k]}: 숫자만 넣어 주세요. (예: 14000)`; });
    return { err: `${bad.map(k => FIELD_LABEL[k]).join(', ')} 칸을 확인해 주세요. 숫자만 넣을 수 있어요.`, fields: bad, fieldErr: fe };
  }
  if (p100 == null && w == null && price == null) {
    const m = '100g당 가격이나 1인분 가격 중 하나는 넣어 주세요.';
    return { err: m, fields: ['p100', 'price'], fieldErr: { p100: `100g당 가격: ${m}`, price: `1인분 가격: ${m}` }, empty: true };
  }
  if (p100 == null && price == null) return { err: '중량만으로는 비교할 수 없어요. 1인분 가격도 넣어 주세요.', fields: ['price'], fieldErr: { price: '1인분 가격: 중량만으로는 비교할 수 없어요. 1인분 가격도 넣어 주세요.' } };
  const u = unit({ p100, w: w && price ? w : null, price: w && price ? price : (p100 == null ? price : null) });
  if (!u) return { info: '중량이 없어 100g당 가격을 계산할 수 없어요. “중량 미표기”로 저장돼요.' };
  return { info: `100g당 ${won(u.v)}으로 계산돼요${u.mismatch ? ' (메뉴판 표기와 달라요)' : ''}` };
}
function calcLine(c) { // 처음 연 빈 폼은 오류가 아니라 안내로 보여 준다
  if (c.err && (showFieldErr() || !c.empty)) return { cls: 'err', text: c.err };
  if (c.err) return { cls: 'calc calc--idle', text: '가격을 넣으면 100g당 가격을 계산해 드려요.' };
  return { cls: 'calc', text: c.info };
}
function field(id, label, inner, hint) {
  return `<div class="field"><label for="${id}">${label}</label>${inner}${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}</div>`;
}
function viewAdmin() {
  if (ST.adminState === '로그인 전') {
    return `<div class="screen-pad"><div class="empty"><p>메뉴 입력은 운영자만 할 수 있어요.</p><div class="actions"><button class="btn btn--primary" type="button" data-act="login">운영자로 로그인</button></div></div></div>`;
  }
  if (!ST.form) newForm();
  const F = ST.form, c = check(), cl = calcLine(c);
  const errOf = k => showFieldErr() && c.fieldErr && c.fieldErr[k] ? c.fieldErr[k] : '';
  const inv = k => `aria-invalid="${!!errOf(k)}" aria-describedby="${k}-err calc"`;
  const opts = (k, arr) => arr.map(v => `<option ${F[k] === v ? 'selected' : ''}>${v}</option>`).join('');
  const numInput = (id, ph) => `<input id="${id}" name="${id}" inputmode="numeric" autocomplete="off" data-field="${id}" value="${esc(F[id])}" placeholder="${ph}" ${inv(id)}><p class="field-err" id="${id}-err">${errOf(id)}</p>`;
  const entered = STORES.filter(s => !s.gray && s.menus.some(m => PARTS.includes(m.part)));
  const ok = entered.filter(s => s.menus.some(m => PARTS.includes(m.part) && unit(m)));
  const ratio = entered.length ? `주안역: 확인한 ${entered.length}곳 중 ${ok.length}곳(${Math.round(ok.length / entered.length * 100)}%)이 100g당 가격을 계산할 수 있어요.` : '아직 확인한 가게가 없어요. 메뉴를 입력하면 여기에 비율이 나와요.';
  return `<div class="screen-pad"><form class="form panel" data-act="save" novalidate>
    <p class="hint">메뉴판에 적힌 그대로 넣어 주세요.</p>
    ${field('store', '메뉴를 입력할 가게', `<select id="store" name="store" data-field="store" autocomplete="off">${STORES.map(s => `<option value="${s.id}" ${F.store === s.id ? 'selected' : ''}>${esc(s.name)}${s.gray ? ' (정보 없음)' : ''}</option>`).join('')}</select>`)}
    ${field('mname', '메뉴 이름 (메뉴판 그대로)', `<input id="mname" name="name" type="text" data-field="name" value="${esc(F.name)}" placeholder="예: 생삼겹살" autocomplete="off">`)}
    <div class="row2">${field('part', '부위', `<select id="part" name="part" data-field="part" autocomplete="off">${opts('part', ['삼겹살', '목살', '항정살', '갈매기살', '기타'])}</select>`)}
      ${field('type', '종류', `<select id="type" name="type" data-field="type" autocomplete="off">${opts('type', ['생고기', '냉동', '대패', '기타'])}</select>`)}</div>
    <div class="row2">${field('origin', '원산지', `<select id="origin" name="origin" data-field="origin" autocomplete="off">${opts('origin', ORIGINS)}</select>`)}
      <div class="field"><label class="check"><input type="checkbox" name="aged" data-field="aged" ${F.aged ? 'checked' : ''}> 숙성 메뉴</label></div></div>
    <fieldset class="pricegroup"><legend>가격 <span class="t-muted">(100g당 가격이나 1인분 가격 중 하나는 꼭)</span></legend>
      ${field('p100', '100g당 가격', numInput('p100', '예: 9000'))}
      <div class="row2">${field('w', '1인분 중량 g', numInput('w', '예: 160'))}
        ${field('price', '1인분 가격', numInput('price', '예: 14000'))}</div>
      <p id="calc" class="${cl.cls}" aria-live="polite">${cl.text}</p>
    </fieldset>
    ${field('memo', '메모 (예: 2인분 이상 주문)', `<input id="memo" name="memo" type="text" data-field="memo" value="${esc(F.memo)}" autocomplete="off">`)}
    <div class="row2">${field('date', '메뉴 확인일', `<input id="date" name="date" type="date" data-field="date" value="${F.date}" autocomplete="off">`)}
      ${field('photo', '메뉴판 사진 (선택)', `<input id="photo" name="photo" type="file" accept="image/*" aria-describedby="photo-hint">`, '운영자만 볼 수 있어요.')}</div>
    <div class="actions"><button class="btn btn--primary" type="submit">메뉴 저장</button></div>
    ${ST.formMsg ? `<p id="form-msg" class="${ST.formMsg.ok ? 'ok' : 'err'}" role="${ST.formMsg.ok ? 'status' : 'alert'}" tabindex="-1">${ST.formMsg.text}</p>` : ''}
    ${openq('저장할 때 카카오 장소 ID와 좌표를 함께 저장. 좌표 저장이 카카오 약관상 괜찮은지 개발 전 확인 [기획 열린 질문 Q9]')}
  </form>
  <h2 class="section-title">중량 표기 비율</h2>
  <p class="panel">${ratio}</p></div>`;
}
function save() {
  const c = check();
  if (c.err) { ST.formMsg = { ok: false, text: c.err, field: c.fields && c.fields[0] }; return; }
  if (ST.saveFails) { ST.formMsg = { ok: false, text: '저장하지 못했어요. 인터넷 연결을 확인하고 다시 저장해 주세요. 입력한 내용은 그대로 있어요.' }; return; }
  const F = ST.form, s = STORES.find(x => x.id === F.store), num = x => x === '' ? null : Number(x);
  s.gray = false; s.checked = F.date; if (F.memo) s.memo = F.memo;
  s.menus.push({ name: F.name || F.part, part: F.part, type: F.type, aged: F.aged, origin: F.origin, p100: num(F.p100), w: num(F.price) ? num(F.w) : null, price: num(F.price) });
  ST.formMsg = { ok: true, text: '저장했어요. 지도에 바로 반영돼요.' };
  newForm();
}

// ---------- 렌더 ----------
const TITLES = { map: ['고기 레이더', '주안역 주변'], cmp: ['비교', ''], fav: ['즐겨찾기', ''], detail: ['', ''], admin: ['운영자 입력', ''] };
function focusKey() {
  const a = document.activeElement;
  if (!a || !a.dataset || !a.dataset.act) return null;
  return { act: a.dataset.act, id: a.dataset.id || '', tab: a.dataset.tab || '', from: a.dataset.from || '' };
}
function findKey(key) {
  let sel = `[data-act="${key.act}"]`;
  if (key.id) sel += `[data-id="${key.id}"]`;
  if (key.tab) sel += `[data-tab="${key.tab}"]`;
  return (key.from && document.querySelector(`${sel}[data-from="${key.from}"]`)) || document.querySelector(sel);
}
function restoreFocus(key, fallback) {
  if (!key) return;
  const el = findKey(key) || (fallback && document.querySelector(fallback)) || document.getElementById('screen');
  if (el) el.focus();
}
function render(opts) {
  opts = opts || {};
  const key = opts.focusMain ? null : focusKey();
  const scr = ST.screen;
  const t = scr === 'detail' ? [STORES.find(s => s.id === ST.detailId).name, ''] : TITLES[scr];
  document.getElementById('title').textContent = t[0];
  document.getElementById('where').textContent = t[1];
  document.title = scr === 'map' ? '고기 레이더' : `${t[0]} - 고기 레이더`;
  const back = document.getElementById('back');
  back.hidden = !(scr === 'detail' || scr === 'admin');
  document.getElementById('back-label').textContent = scr === 'admin' ? '돌아가기' : '목록으로';
  const main = document.getElementById('screen');
  main.className = 'screen' + (scr === 'map' ? ' screen--map' : '');
  main.innerHTML = ({ map: viewMap, cmp: viewCmp, fav: viewFav, detail: viewDetail, admin: viewAdmin })[scr]();
  document.querySelectorAll('.tabbar button').forEach(b => {
    const on = b.dataset.tab === scr || (scr === 'detail' && b.dataset.tab === ST.prev);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.getElementById('tab-cmp').textContent = ST.cmpIds.length ? `비교 (${ST.cmpIds.length})` : '비교';
  const nf = Object.values(ST.favs).filter(Boolean).length;
  document.getElementById('tab-fav').textContent = nf ? `즐겨찾기 (${nf})` : '즐겨찾기';
  const mb = document.getElementById('menu-btn'), ml = document.getElementById('menu-list');
  mb.setAttribute('aria-expanded', String(ST.menuOpen)); ml.hidden = !ST.menuOpen;
  if (ST.menuOpen) mb.setAttribute('aria-controls', 'menu-list'); else mb.removeAttribute('aria-controls');
  document.getElementById('dev').innerHTML = DEV.map(([k, l]) => `<button type="button" data-dev="${k}" aria-pressed="${isDevOn(k)}">${l}</button>`).join('')
    + `<button type="button" data-dev="notes" aria-pressed="${ST.showNotes}">열린 질문 메모 보기</button>`;
  if (opts.focusMain) main.focus();
  else if (opts.focus) { const el = document.querySelector(opts.focus); if (el) el.focus(); }
  else restoreFocus(key, opts.fallback);
}
function isDevOn(k) {
  const [scr, v] = k.split(':');
  if (scr !== ST.screen) return false;
  if (scr === 'map') return ST.mapState === v;
  if (scr === 'cmp') return ST.cmpState === v;
  if (scr === 'fav') return (v === '있음') === Object.values(ST.favs).some(Boolean);
  if (scr === 'detail') return ST.detailId === v;
  return (v === '저장 실패' && ST.saveFails) || (!ST.saveFails && ST.adminState === v);
}
function go(scr) { if (scr !== 'detail' && scr !== 'admin') ST.prev = scr; ST.screen = scr; ST.pin = null; ST.picker = false; ST.menuOpen = false; }
function setDev(k) {
  if (k === 'notes') { ST.showNotes = !ST.showNotes; return; }
  const [scr, v] = k.split(':');
  go(scr);
  if (scr === 'map') { ST.mapState = v; ST.sheet = 'half'; }
  if (scr === 'cmp') { ST.cmpState = v; ST.cmpIds = { '정상': ['s1', 's2', 's3'], '1곳만': ['s1'], '비어 있음': [] }[v]; ST.cmpMeat = null; }
  if (scr === 'fav') ST.favs = v === '있음' ? { s2: true, s5: true, s8: true } : {};
  if (scr === 'detail') ST.detailId = v;
  if (scr === 'admin') { ST.adminState = v === '로그인 전' ? '로그인 전' : '입력'; ST.saveFails = v === '저장 실패'; ST.formMsg = null; }
}
const SHEET_NEXT = { peek: 'half', half: 'full', full: 'peek' };

document.addEventListener('click', e => {
  const dev = e.target.closest('[data-dev]');
  if (dev) { setDev(dev.dataset.dev); render(); const b = document.querySelector(`[data-dev="${dev.dataset.dev}"]`); if (b) b.focus(); return; }
  if (e.target.closest('#back')) { go(ST.prev); render({ focusMain: true }); return; }
  if (ST.menuOpen && !e.target.closest('.menu')) { ST.menuOpen = false; render(); }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'FORM') return;
  const id = el.dataset.id;
  switch (el.dataset.act) {
    case 'tab': go(el.dataset.tab); render({ focusMain: true }); return;
    case 'menu': ST.menuOpen = !ST.menuOpen; render({ focus: ST.menuOpen ? '#menu-list button' : '#menu-btn' }); return;
    case 'admin': go('admin'); render({ focusMain: true }); return;
    case 'pin': ST.pin = ST.pin === id ? null : id; if (ST.pin && ST.sheet === 'peek') ST.sheet = 'half'; break;
    case 'closepin': { const was = ST.pin; ST.pin = null; render({ focus: `[data-act="pin"][data-id="${was}"]` }); return; }
    case 'sheet': ST.sheet = SHEET_NEXT[ST.sheet]; break;
    case 'cmp': toggleCmp(id); render({ fallback: el.dataset.from === 'chip' ? '[data-act="picker"][data-from="add"]' : '#cmp-table caption' }); return;
    case 'detail': ST.detailId = id; ST.screen = 'detail'; ST.pin = null; ST.menuOpen = false; render({ focusMain: true }); return;
    case 'fav': ST.favs[id] = !ST.favs[id]; break;
    case 'picker': ST.picker = !ST.picker; break;
    case 'area': case 'retry': ST.mapState = '정상'; render({ focusMain: true }); return;
    case 'login': ST.adminState = '입력'; render({ focus: '#store' }); return;
    case 'closetoast': { document.getElementById('toast').innerHTML = ''; const k = ST.toastFrom; ST.toastFrom = null; const t = k && findKey(k); (t || document.getElementById('screen')).focus(); return; }
    default: return;
  }
  render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ST.menuOpen) { ST.menuOpen = false; render({ focus: '#menu-btn' }); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'filter') { ST.filter[t.name] = t.value; ST.pin = null; render({ focus: `input[name="${t.name}"][value="${t.value}"]` }); }
  else if (t.dataset.act === 'basis') { ST.basis = t.value; render({ focus: `input[name="basis"][value="${t.value}"]` }); }
  else if (t.dataset.act === 'meat') { ST.cmpMeat = t.value; render({ focus: '#meat' }); }
  else if (t.dataset.field) { ST.form[t.dataset.field] = t.type === 'checkbox' ? t.checked : t.value.trim(); ST.formMsg = null; ST.dirty = true; updateCalc(); }
});
let calcTimer = null;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.field && t.type !== 'checkbox' && t.tagName === 'INPUT') {
    ST.form[t.dataset.field] = t.value.trim(); ST.formMsg = null; ST.dirty = true;
    clearTimeout(calcTimer); calcTimer = setTimeout(updateCalc, 400); // 입력이 멈춘 뒤 갱신 (낭독 과다 방지)
  }
});
function updateCalc() { // 입력 중에는 전체를 다시 그리지 않고 계산 줄과 칸별 오류만 바꾼다 (포커스 유지)
  const el = document.getElementById('calc'); if (!el) return;
  const c = check(), cl = calcLine(c);
  el.className = cl.cls; el.textContent = cl.text;
  ['p100', 'w', 'price'].forEach(k => {
    const msg = showFieldErr() && c.fieldErr && c.fieldErr[k] ? c.fieldErr[k] : '';
    const i = document.getElementById(k); if (i) i.setAttribute('aria-invalid', String(!!msg));
    const p = document.getElementById(k + '-err'); if (p) p.textContent = msg;
  });
}
document.addEventListener('submit', e => {
  if (e.target.dataset.act !== 'save') return;
  e.preventDefault(); save();
  const m = ST.formMsg;
  render({ focus: m && !m.ok && m.field ? `#${m.field}` : '#form-msg' });
});
window.addEventListener('beforeunload', e => { if (ST.screen === 'admin' && ST.dirty) { e.preventDefault(); e.returnValue = ''; } });

// 시트 끌기: 손잡이를 위아래로 끌면 가까운 높이(접힘/반/전체)로 붙는다. 누르기만 하면 다음 높이로
(function sheetDrag() {
  let startY = 0, startH = 0, dragging = false, moved = false, sheetEl = null;
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest('.sheet__handle'); if (!h) return;
    sheetEl = h.closest('.sheet'); startY = e.clientY; startH = sheetEl.getBoundingClientRect().height; dragging = true; moved = false;
  });
  document.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = startY - e.clientY; if (Math.abs(dy) > 6) moved = true;
    if (moved) { sheetEl.style.height = `${Math.max(88, startH + dy)}px`; sheetEl.classList.add('sheet--dragging'); }
  });
  document.addEventListener('pointerup', () => {
    if (!dragging) return; dragging = false;
    if (!moved) return; // 클릭으로 처리
    const total = sheetEl.parentElement.getBoundingClientRect().height, r = sheetEl.getBoundingClientRect().height / total;
    ST.sheet = r < 0.3 ? 'peek' : r < 0.72 ? 'half' : 'full';
    sheetEl.style.height = ''; sheetEl.classList.remove('sheet--dragging');
    const suppress = ev => { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', suppress, true); };
    document.addEventListener('click', suppress, true); // 끌고 난 뒤의 클릭 한 번은 무시
    setTimeout(() => document.removeEventListener('click', suppress, true), 50); // 클릭이 안 생겨도 막기는 풀린다
    render({ focus: '.sheet__handle' });
  });
})();

render();
