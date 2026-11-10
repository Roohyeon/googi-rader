'use strict';
/* 고기 레이더 — 실제 서비스 화면 (dev 묶음 1)
   - 계산 규칙: js/calc.js (자동 테스트: node --test "app/tests/*.test.js")
   - 키: config.js (config.example.js 복사). 키가 비면 설정 안내 화면을 보여 준다
   - 묶음 2: 카카오 지도 + 실시간 고기집 검색(js/kakao.js). 가격 정보(Supabase)는 묶음 3에서 붙인다
   - ?demo=1 로 열면 샘플 데이터(js/sample.js)와 그림 지도로 화면만 볼 수 있다 */
const C = window.Calc;
const { PARTS, TYPES, ORIGINS, fmt, won, won10, esc, unit, meatKey, matches, bestMenu, noWeight, josa, gainText, distM, isMeatPlace, inService } = C;

// ---------- 설정 ----------
const CONFIG = window.APP_CONFIG || {};
const REQUIRED_KEYS = [
  ['KAKAO_JS_KEY', '카카오 JavaScript 키'],
  ['SUPABASE_URL', 'Supabase Project URL'],
  ['SUPABASE_ANON_KEY', 'Supabase Publishable key (예전 anon public)'],
];
const missingKeys = () => REQUIRED_KEYS.filter(([k]) => !CONFIG[k] || !String(CONFIG[k]).trim());
const DEMO = /[?&]demo=1(&|$)/.test(location.search);
const hasKey = k => !!CONFIG[k] && !!String(CONFIG[k]).trim();
const LIVE = !DEMO && hasKey('KAKAO_JS_KEY'); // 카카오 키가 있으면 실제 지도. Supabase 키는 묶음 3부터 필요
let NO_DB = LIVE && !(hasKey('SUPABASE_URL') && hasKey('SUPABASE_ANON_KEY'));
let KEY_PROBLEM = '';
if (LIVE && !NO_DB) {
  try { DB.init(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); }
  catch (e) {
    NO_DB = true;
    KEY_PROBLEM = e.message === 'secret-key' ? 'config.js의 SUPABASE_ANON_KEY에 비밀 키(Secret key)가 들어 있어요. 연결하지 않았어요. Publishable key로 바꾸고, Supabase에서 비밀 키를 새로 발급해 주세요.'
      : e.message === 'bad-url' ? 'config.js의 SUPABASE_URL 모양이 맞지 않아요. https://xxxx.supabase.co 형태로 넣어 주세요.'
      : '가격 정보 연결을 준비하지 못했어요.';
  }
}
const TODAY = new Date(); // 실제 오늘 (오래된 정보 판정은 한국 시간 기준, calc.isStale)

// ---------- 데이터 ----------
// STORES: 지금 지도 영역에서 찾은 가게. KNOWN: 이번 방문 동안 본 가게 전체 (비교·즐겨찾기가 지도 밖으로 나가도 찾을 수 있게). 둘 다 메모리만 (D31)
let STORES = DEMO ? (window.SAMPLE_STORES || []) : [];
const KNOWN = new Map(STORES.map(s => [s.id, s]));
const byId = id => KNOWN.get(id);
// 동네 기준점 (D26-11). 좌표는 임시값: 주안역, 구월동 로데오거리
const AREAS = { juan: { name: '주안역 주변', lat: 37.4649, lng: 126.6807 }, guwol: { name: '구월동 주변', lat: 37.4486, lng: 126.7019 } };
const nameTag = s => `<span translate="no">${esc(s.name)}</span>`;
const placeUrl = s => /^https:\/\/place\.map\.kakao\.com\/\d{1,20}$/.test(s.place_url || '') ? s.place_url : `https://place.map.kakao.com/${encodeURIComponent(s.id)}`;
const distTxt = s => s.dist != null && isFinite(s.dist) ? `${s.dist}m` : '';
const kakaoLink = (s, cls) => `<a class="${cls || 'btn btn--quiet'}" href="${esc(placeUrl(s))}" target="_blank" rel="noopener"><span translate="no">카카오맵</span>에서 리뷰 보기<span class="sr-only"> (${esc(s.name)}, 새 창)</span></a>`;
const isStale = s => C.isStale(s.checked, TODAY);
const pinInfo = (s, f) => C.pinInfo(s, f);
// 거리: 실제 지도는 위경도(메모리만, D31), 샘플은 그림 지도의 % 좌표(1칸 = 20m)
const dist2 = (a, b) => a.lat != null ? distM(a, b) : Math.hypot((a.x - b.x) * 20, (a.y - b.y) * 20);
const centerOf = sel => sel[0].lat != null
  ? { lat: sel.reduce((t, s) => t + s.lat, 0) / sel.length, lng: sel.reduce((t, s) => t + s.lng, 0) / sel.length }
  : { x: sel.reduce((t, s) => t + s.x, 0) / sel.length, y: sel.reduce((t, s) => t + s.y, 0) / sel.length };
const hasPos = s => s.lat != null || s.x != null;
const dongSise = (sel, f) => sel.every(hasPos) ? C.dongSise(sel, STORES.filter(s => !s.gray && hasPos(s)), f, dist2, centerOf) : null; // 좌표 없는 가게가 끼면 표시 안 함

// ---------- 설정 안내 화면 ----------
function viewSetup() {
  const miss = missingKeys().filter(([k]) => k === 'KAKAO_JS_KEY'); // 화면을 막는 건 카카오 키뿐. Supabase 키는 묶음 3에서
  const list = miss.length
    ? `<p>아래 키가 비어 있어요. <code>app/config.js</code>에 넣어 주세요.</p><ul class="setup-list">${miss.map(([k, label]) => `<li><code>${k}</code> — ${label}</li>`).join('')}</ul>
       <p class="t-muted">config.js가 없으면 같은 폴더의 config.example.js를 복사해서 이름을 config.js로 바꾸세요. 비밀 키(service_role)는 넣지 마세요.</p>`
    : `<p>키는 모두 들어 있어요. 카카오 지도와 가격 데이터 연결은 다음 개발 묶음에서 만들어요.</p>`;
  return `<div class="screen-pad"><div class="panel setup"><h2>설정이 필요해요</h2>${list}
    <div class="actions"><a class="btn btn--primary" href="?demo=1">샘플 데이터로 화면 보기</a></div></div></div>`;
}

// ---------- 상태 ----------
const ST = {
  screen: 'map', prev: 'map', mapState: LIVE ? '로딩' : '정상', cmpState: '정상', adminState: '로그인 전',
  area: 'juan', where: AREAS.juan.name, origin: { lat: AREAS.juan.lat, lng: AREAS.juan.lng }, searching: false, locState: null, locAsked: false,
  filter: { part: '삼겹살', type: '생고기', origin: '국내산' },
  cmpIds: DEMO ? ['s1', 's2', 's3'] : [], cmpMeat: null, basis: '가성비', picker: false,
  dbError: false, authIn: false, busy: false, loginMsg: '', adminStores: null, cmpPick: {}, photos: {}, found: null, findMsg: '', findQ: '', formPhoto: null, formPhotoUrl: null, lastScr: null, lastCount: 0, fsheet: null, formNote: '', pin: null, sheet: 'half', detailId: DEMO ? 's1' : null, favs: DEMO ? { s2: true } : {}, form: null, formMsg: null, saveFails: false, dirty: false,
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

// 알림: 4초 뒤 저절로 사라진다(사용자 요청 2026-11-10). 마우스를 올리거나 키보드로 알림 안에 있으면 그동안은 기다린다.
// 닫기 버튼으로 바로 닫을 수도 있고, 닫으면 알림을 띄운 요소로 포커스를 돌려준다
const TOAST_MS = 4000;
let toastTimer = null;
function hideToast(returnFocus) {
  clearTimeout(toastTimer); toastTimer = null;
  const el = document.getElementById('toast'); if (!el || !el.innerHTML) return;
  const hadFocus = el.contains(document.activeElement);
  el.classList.add('toast--out');
  setTimeout(() => { el.innerHTML = ''; el.classList.remove('toast--out'); }, 180);
  if (returnFocus || hadFocus) { const k = ST.toastFrom; const t = k && findKey(k); (t || document.getElementById('screen')).focus(); }
  ST.toastFrom = null;
}
function armToast() { clearTimeout(toastTimer); toastTimer = setTimeout(() => hideToast(false), TOAST_MS); }
function toast(msg) {
  const a = document.activeElement;
  ST.toastFrom = a && a.dataset ? { act: a.dataset.act, id: a.dataset.id || '', from: a.dataset.from || '' } : null;
  const el = document.getElementById('toast');
  el.classList.remove('toast--out');
  el.innerHTML = `<span>${esc(msg)}</span><button type="button" data-act="closetoast">닫기<span class="sr-only"> (알림)</span></button>`;
  armToast();
}
(function () { // 읽는 동안은 사라지지 않게
  const el = document.getElementById('toast'); if (!el) return;
  const pause = () => clearTimeout(toastTimer);
  const resume = () => { if (el.innerHTML && !el.contains(document.activeElement)) armToast(); };
  el.addEventListener('mouseenter', pause); el.addEventListener('mouseleave', resume);
  el.addEventListener('focusin', pause); el.addEventListener('focusout', () => setTimeout(resume, 0));
})();
function toggleCmp(id) {
  const i = ST.cmpIds.indexOf(id);
  if (i >= 0) ST.cmpIds.splice(i, 1);
  else if (ST.cmpIds.length >= 3) { toast('최대 3곳까지 비교할 수 있어요. 한 곳을 빼고 넣어 주세요.'); return; }
  else ST.cmpIds.push(id);
  ST.cmpMeat = null;
}
const cmpBtn = (s, from, cls) => { const inCmp = ST.cmpIds.includes(s.id);
  return `<button class="btn ${cls || ''}" type="button" data-act="cmp" data-id="${esc(s.id)}" data-from="${from}">${inCmp ? '비교에서 빼기' : '비교에 넣기'}<span class="sr-only"> (${esc(s.name)})</span></button>`; };
const detailBtn = (s, from) => `<button class="btn btn--quiet" type="button" data-act="detail" data-id="${esc(s.id)}" data-from="${from}">상세 보기<span class="sr-only"> (${esc(s.name)})</span></button>`;
const starBtn = (s, from) => { const fav = !!ST.favs[s.id];
  return `<button class="star" type="button" data-act="fav" data-id="${esc(s.id)}" data-from="${from}" aria-pressed="${fav}" aria-label="${esc(s.name)} 즐겨찾기"><span aria-hidden="true">${fav ? '★' : '☆'}</span></button>`; };
const staleTag = s => isStale(s) ? '<span class="warn"><span aria-hidden="true">⚠ </span>오래된 정보일 수 있어요</span>' : '';

// ---------- 라벨 카드 ----------
function labelCard(s, b, rank, from) {
  const m = b.m;
  return `<li class="label">
    <div class="label__head">
      ${rank ? `<span class="label__rank">${rank}<span class="sr-only">위</span></span>` : ''}
      <h3 class="label__name">${nameTag(s)}</h3>
      <span class="label__dist num">${distTxt(s)}</span>
      ${starBtn(s, from)}
    </div>
    <div class="label__body">
    <p class="label__menu">${esc(m.name)}${m.aged ? '<span class="tag">숙성</span>' : ''} <span class="t-muted">${esc(m.origin)}</span></p>
    <dl class="cells">
      <div><dt>중량</dt><dd>${m.w && m.price ? m.w + 'g' : '-'}</dd></div>
      <div class="unit"><dt>100g당</dt><dd>${fmt(b.u.v)}<small>원</small></dd></div>
      <div><dt>판매가</dt><dd>${m.w && m.price ? won(m.price) : '-'}</dd></div>
    </dl>
    <p class="label__meta">메뉴 확인일 ${esc(s.checked)} ${staleTag(s)}</p>
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
const FKEYS = [['part', '부위', PARTS], ['type', '종류', TYPES], ['origin', '원산지', ORIGINS]];
function filterTabs(f) { // 헤더 밑 탭 3개: 누르면 아래에서 선택지가 올라온다
  return `<div class="ftabs" role="group" aria-label="고기 고르기">${FKEYS.map(([k, l]) => `<button class="ftab" type="button" data-act="fsheet" data-k="${k}" aria-haspopup="dialog" aria-expanded="${ST.fsheet === k}">
    <span class="ftab__k">${l}</span><span class="ftab__v">${esc(f[k])}</span><svg class="ftab__arrow" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1 1.5l5 5 5-5"/></svg></button>`).join('')}</div>`;
}
function filterSheet(f) {
  const [k, l, vals] = FKEYS.find(x => x[0] === ST.fsheet);
  return `<div class="fsheet-layer"><div class="fsheet-backdrop" data-act="fclose" aria-hidden="true"></div>
    <div class="fsheet" id="fsheet" role="dialog" aria-modal="true" aria-labelledby="fsheet-title">
      <div class="fsheet__grip" aria-hidden="true"></div>
      <h2 class="fsheet__title" id="fsheet-title">${l} 고르기</h2>
      <div class="fopts" role="radiogroup" aria-labelledby="fsheet-title">${vals.map(v => `<button type="button" class="fopt" role="radio" aria-checked="${f[k] === v}" tabindex="${f[k] === v ? 0 : -1}" data-act="fpick" data-k="${k}" data-v="${esc(v)}"><span>${esc(v)}</span><svg class="fopt__check" viewBox="0 0 16 12" aria-hidden="true" focusable="false"><path d="M1.5 6.5l4 4 9-9"/></svg></button>`).join('')}</div>
      <button class="btn btn--quiet btn--block" type="button" data-act="fclose">닫기</button>
    </div></div>`;
}
function filterRow(f) { // 한 줄 가로 스크롤 칩. 세 묶음은 각각 라디오 그룹
  const grp = (name, legend, vals) => `<fieldset class="fgroup"><legend class="sr-only">${legend}</legend>${vals.map(v => `<label class="chip"><input type="radio" name="${name}" value="${v}" data-act="filter" ${f[name] === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</fieldset>`;
  return `<div class="filterbar" role="group" aria-label="고기 고르기">${grp('part', '부위', PARTS)}<span class="fsep" aria-hidden="true"></span>${grp('type', '종류', TYPES)}<span class="fsep" aria-hidden="true"></span>${grp('origin', '원산지', ORIGINS)}</div>`;
}
function pinView(f) { // 핀을 고르면 시트 안에 그 가게를 보여 준다 (지도를 가리지 않고, 화면 밖으로 밀리지 않음)
  const s = byId(ST.pin), p = pinInfo(s, f), b = bestMenu(s, f);
  const back = `<button class="btn btn--quiet btn--sm" type="button" data-act="closepin">목록으로<span class="sr-only"> (가게 정보 닫기)</span></button>`;
  let body;
  if (b) body = `<ul class="plain" role="list">${labelCard(s, b, 0, 'pin')}</ul>`;
  else body = `<div class="label label--plain"><div class="label__head"><h3 class="label__name">${nameTag(s)}</h3><span class="label__dist num">${distTxt(s)}</span>${s.gray ? '' : starBtn(s, 'pin')}</div>
    <div class="label__body"><p class="label__menu">${s.gray ? '정보 없음. 아직 메뉴를 확인하지 않은 가게예요.' : p.text === '필터 밖' ? '이 필터에 맞는 메뉴가 없어요.' : p.text}</p>
    <div class="actions">${s.gray ? (LIVE && ST.authIn && s.dbChecked ? `<button class="btn btn--primary" type="button" data-act="newfor" data-id="${esc(s.id)}">이 가게 메뉴 입력하기</button>` : '') + kakaoLink(s) : detailBtn(s, 'pin')}</div></div></div>`;
  return `<div class="sheet__title"><h2 id="sheet-title">선택한 가게</h2>${back}</div>${body}`;
}
function listView(f, visible) {
  const ranked = visible.filter(s => !s.gray).map(s => ({ s, b: bestMenu(s, f) })).filter(x => x.b).sort((a, b) => a.b.u.v - b.b.u.v);
  const nw = visible.filter(s => !s.gray && !bestMenu(s, f)).map(s => ({ s, ms: noWeight(s, f) })).filter(x => x.ms.length);
  ST.lastCount = ranked.length;
  let h = `<div class="sheet__title"><h2 id="sheet-title">100g당 싼 순</h2><p>${esc(f.part)} ${esc(f.type)} ${esc(f.origin)} ${ranked.length}곳${ST.searching ? ' · 다시 찾는 중…' : ''}</p></div>`;
  if (ST.mapState === '빈 목록' || (!ranked.length && !nw.length)) {
    const n = visible.length;
    return h + `<div class="empty"><p>이 조건의 메뉴를 확인한 가게가 아직 없어요.</p><p>${LIVE ? (n ? `지도에 고기집 ${n}곳이 있지만 아직 메뉴를 확인하지 않았어요. 핀을 누르면 카카오맵 정보를 볼 수 있어요.` : '이 지도 안에서 고기집을 찾지 못했어요. 지도를 옮기거나 넓혀 보세요.') : '다른 부위나 종류를 골라 보세요.'}</p></div>`;
  }
  h += `<ol class="ranked" role="list">${ranked.map((x, i) => labelCard(x.s, x.b, i + 1, 'list')).join('')}</ol>`;
  if (nw.length) {
    h += `<h3 class="group-title">중량 미표기</h3><p class="group-note">100g당 가격을 계산할 수 없어요.</p><ul class="plain" role="list">${nw.map(x => `<li class="label label--plain">
      <div class="label__head"><h4 class="label__name">${nameTag(x.s)}</h4><span class="label__dist num">${distTxt(x.s)}</span></div>
      <div class="label__body">${x.ms.map(m => `<p class="label__menu">${esc(m.name)} 1인분 <span class="num">${won(m.price)}</span></p>`).join('')}
      <div class="actions">${detailBtn(x.s, 'list')}</div></div></li>`).join('')}</ul>`;
  }
  return h;
}
function viewMap() {
  const st = ST.mapState, f = ST.filter;
  const visible = st === '카카오 오류' ? STORES.filter(s => !s.gray) : STORES;
  let pins = '';
  if (!LIVE && (st === '정상' || st === '빈 목록' || st === '카카오 오류')) {
    pins = visible.map(s => { const p = pinInfo(s, f);
      return `<button class="pin pin--${p.kind}" type="button" style="left:${s.x}%;top:${s.y}%" data-act="pin" data-id="${esc(s.id)}" data-from="map" aria-label="${esc(p.aria)}" aria-expanded="${ST.pin === s.id}"${ST.pin === s.id ? ' aria-controls="sheet"' : ''}>${p.text}</button>`; }).join('');
  }
  let sheet;
  if (st === '위치 거부' || st === '지역 밖') {
    const msg = st === '위치 거부' ? '위치를 쓰지 않아도 괜찮아요. 어느 동네부터 볼까요?' : '아직 이 지역은 준비 중이에요. 지금은 인천 미추홀구·남동구만 볼 수 있어요.';
    sheet = `<div class="empty"><p>${msg}</p><div class="actions"><button class="btn btn--primary" type="button" data-act="area" data-area="juan">주안역 주변 보기</button><button class="btn" type="button" data-act="area" data-area="guwol">구월동 보기</button></div></div>`;
  } else if (st === '로딩') sheet = `<p class="loading" role="status">주변 고기집을 찾고 있어요…</p>`;
  else sheet = (st === '카카오 오류' ? `<div class="banner" role="status"><strong>지금은 가게 목록을 불러올 수 없어요. 확인해 둔 가게만 보여 드릴게요.</strong><button class="btn btn--sm" type="button" data-act="retry">다시 불러오기</button></div>` : '')
    + (KEY_PROBLEM ? `<div class="banner"${ST.keyAlerted ? '' : ' role="alert"'}><strong>${esc(KEY_PROBLEM)}</strong></div>`
      : NO_DB ? `<p class="banner banner--info" role="note">가격 정보는 아직 연결 전이에요. 지금은 지도에서 찾은 고기집만 보여요.</p>` : '')
    + (ST.dbError ? `<div class="banner" role="status"><strong>가격 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</strong><button class="btn btn--sm" type="button" data-act="retry">다시 불러오기</button></div>` : '')
    + (ST.pin && byId(ST.pin) ? pinView(f) : listView(f, visible));
  if (KEY_PROBLEM) setTimeout(() => { ST.keyAlerted = true; }, 0);
  const areabar = LIVE && st !== '위치 거부' && st !== '지역 밖' ? `<div class="areabar" role="group" aria-label="동네 바로가기">${[['juan', '주안역'], ['guwol', '구월동']].map(([k, l]) => `<button class="chipbtn" type="button" data-act="area" data-area="${k}" aria-pressed="${ST.area === k && ST.where !== '내 위치 주변'}">${l}</button>`).join('')}<button class="chipbtn" type="button" data-act="locate" aria-pressed="${ST.where === '내 위치 주변'}">내 위치</button></div>` : '';
  sheet = areabar + sheet;
  const tray = ST.cmpIds.length ? `<div class="tray"><span>비교 ${ST.cmpIds.length}곳</span><button class="btn btn--primary btn--sm" type="button" data-act="tab" data-tab="cmp" data-from="tray">비교 보기</button></div>` : '';
  const sheetLabel = { peek: '목록 펼치기', half: '목록 더 펼치기', full: '목록 접기' }[ST.sheet];
  return `<div class="mapview">
    ${filterTabs(f)}
    <p class="legend"><span class="legend__price">8,333</span> 100g당 가격 <span class="legend__none">점선</span> 가격 없음</p>
    <section class="sheet sheet--${ST.sheet}" id="sheet" aria-labelledby="sheet-title">
      <button class="sheet__handle" type="button" data-act="sheet" aria-label="${sheetLabel}"><span aria-hidden="true"></span></button>
      <div class="sheet__body" id="sheet-body">${sheet}</div>${tray}
    </section>

    ${LIVE ? `<div class="mapctl" role="group" aria-label="지도 확대·축소"><button class="mapctl__btn" type="button" data-act="zoom" data-d="-1" aria-label="지도 확대">+</button><button class="mapctl__btn" type="button" data-act="zoom" data-d="1" aria-label="지도 축소">−</button></div>` : ''}
    ${LIVE ? `<section class="map map--kakao" aria-label="고기집 지도" id="map-host"></section>`
      : `<section class="map" aria-label="고기집 지도 (샘플)">${MAP_SVG}<span class="station" aria-hidden="true">주안역</span><div role="group" aria-label="지도 핀">${pins}</div></section>`}
    ${ST.fsheet ? filterSheet(f) : ''}
  </div>`;
}

// ---------- ② 비교 (결론 먼저) ----------
function pickerHtml(f) { // D29
  const full = ST.cmpIds.length >= 3;
  const cands = STORES.filter(s => !s.gray && !ST.cmpIds.includes(s.id)).map(s => ({ s, b: bestMenu(s, f) }))
    .sort((a, b) => (a.b ? a.b.u.v : 1e9) - (b.b ? b.b.u.v : 1e9));
  return `<section class="picker" id="picker" aria-labelledby="picker-title">
    <div class="picker__head"><h2 id="picker-title" tabindex="-1">비교에 넣을 가게</h2><button class="btn btn--quiet btn--on-ink" type="button" data-act="picker" data-from="pickerhead" aria-expanded="true" aria-controls="picker">추가 목록 닫기</button></div>
    ${full ? '<p class="err">최대 3곳까지 비교할 수 있어요. 한 곳을 빼고 넣어 주세요.</p>' : ''}
    <p>${esc(f.part)} ${esc(f.type)} ${esc(f.origin)}, 100g당 싼 순. 정보 없음 가게는 넣을 수 없어요.</p>
    ${cands.length ? `<ul role="list">${cands.map(x => `<li><span>${nameTag(x.s)} <span class="t-muted num">${distTxt(x.s)}</span><br><span class="t-muted">${x.b ? '100g당 ' + won(x.b.u.v) : '다른 메뉴만 있어요'}</span></span>
      <button class="btn" type="button" data-act="cmp" data-id="${esc(x.s.id)}" data-from="picker" ${full ? 'disabled' : ''} aria-label="넣기 (${esc(x.s.name)})">넣기</button></li>`).join('')}</ul>` : '<p>더 넣을 수 있는 가게가 없어요.</p>'}
  </section>`;
}
function trayChips() { // 담은 가게 칩 (× 로 빼기) + 가게 추가
  const sel = ST.cmpIds.map(byId).filter(Boolean);
  return `<div class="cmptray">${sel.map(s => `<button class="cchip" type="button" data-act="cmp" data-id="${esc(s.id)}" data-from="chip" aria-label="${esc(s.name)} 비교에서 빼기">${nameTag(s)}<span aria-hidden="true">×</span></button>`).join('')}
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
function pickedMenu(s) { // 가게마다 비교할 메뉴: 사용자가 고른 것, 없으면 지금 필터에 맞는 가장 싼 메뉴, 그것도 없으면 100g당 계산되는 첫 메뉴
  const ms = s.menus || [];
  if (!ms.length) return null;
  let i = ST.cmpPick[s.id];
  if (i == null || !ms[i]) {
    const b = bestMenu(s, ST.filter);
    i = b ? ms.indexOf(b.m) : ms.findIndex(m => unit(m));
    if (i < 0) i = 0;
    ST.cmpPick[s.id] = i;
  }
  return ms[i];
}
function viewCmp() {
  const sel = ST.cmpIds.map(byId).filter(Boolean);
  if (!sel.length) {
    return `<div class="screen-pad"><div class="empty"><p class="empty__title">아직 비교할 가게가 없어요.</p><p>“가게 추가”를 눌러 2~3곳을 골라 보세요.</p>
      <div class="actions"><button class="btn btn--primary" type="button" data-act="picker" data-from="add" aria-expanded="${ST.picker}"${ST.picker ? ' aria-controls="picker"' : ''}><span aria-hidden="true">+ </span>가게 추가</button><button class="btn" type="button" data-act="tab" data-tab="map" data-from="empty">목록으로 가기</button></div></div>
      ${ST.picker ? pickerHtml(ST.filter) : ''}</div>`;
  }
  // 고른 메뉴끼리 그대로 비교한다 (같은 고기인지 따지지 않음, 사용자 결정 2026-11-10)
  const rows = sel.map(s => { const m = pickedMenu(s), u = m && unit(m); return { s, m, b: u ? { m, u } : null, nw: m && !u && m.price ? m : null, none: !m }; });
  const keys = rows.filter(r => r.m).map(r => meatKey(r.m));
  const same = keys.length === rows.length && keys.every(k => k === keys[0]);
  let sise = null, meatName = '';
  if (same && keys.length) { const [part, type, origin] = keys[0].split('·'); meatName = `${part} ${type} ${origin}`; sise = dongSise(sel, { part, type, origin }); }
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
  const cell = (r, fn) => r.none ? '<span class="t-muted">메뉴 없음</span>' : fn(r);
  const pickBox = `<section class="card cmp-pick" aria-labelledby="pick-title"><h2 class="card__title" id="pick-title">가게마다 비교할 메뉴</h2>
    ${sel.map((s, i) => { const ms = s.menus || []; pickedMenu(s);
      return `<div class="field cmp-pick__row"><label for="cm-${i}">${nameTag(s)}</label>${ms.length
        ? `<select id="cm-${i}" data-act="cmpmenu" data-id="${esc(s.id)}" autocomplete="off">${ms.map((m, j) => { const u = unit(m); return `<option value="${j}" ${j === ST.cmpPick[s.id] ? 'selected' : ''}>${esc(m.name)} · ${esc(m.part)}${u ? ` · 100g ${won(u.v)}` : m.price ? ` · 1인분 ${won(m.price)}` : ''}</option>`; }).join('')}</select>`
        : '<p class="t-muted">아직 확인한 메뉴가 없어요.</p>'}</div>`; }).join('')}
  </section>`;
  const h = `<div class="screen-pad stack">${trayChips()}${ST.picker ? pickerHtml(ST.filter) : ''}
    ${pickBox}
    <fieldset class="basis"><legend>무엇을 기준으로 볼까요?</legend><div class="chips">${['가성비', '양', '가격'].map(b => `<label class="chip"><input type="radio" name="basis" value="${b}" data-act="basis" ${ST.basis === b ? 'checked' : ''}><span>${b}(${b === '가성비' ? '100g당' : '1인분'})</span></label>`).join('')}</div></fieldset>
    <section class="verdict" aria-labelledby="verdict-title"><h2 id="verdict-title">결론</h2><p class="verdict__main">${verdict}</p><div class="verdict__gain">${gains}</div></section>
    <div class="cmp-table-wrap" tabindex="0" role="region" aria-label="비교 표 (가로로 스크롤할 수 있어요)"><table class="cmp" id="cmp-table"><caption tabindex="-1">${same && meatName ? esc(meatName) : '고른 메뉴끼리'}, ${ST.basis} 기준</caption>
    <thead><tr><td></td>${rows.map(r => `<th scope="col">${nameTag(r.s)}${badges[r.s.id] ? `<br><span class="badge ${badges[r.s.id][1] ? 'badge--same' : ''}">${badges[r.s.id][0]}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody>
    <tr><th scope="row">메뉴</th>${rows.map(r => `<td>${cell(r, r => esc(r.m.name) + `<br><span class="t-muted">${esc(r.m.part)} ${esc(r.m.type)}</span>` + (r.m.aged ? ' <span class="tag">숙성</span>' : ''))}</td>`).join('')}</tr>
    <tr><th scope="row">100g당</th>${rows.map(r => `<td>${cell(r, r => r.b ? `<span class="unit">${fmt(r.b.u.v)}<small>원</small></span>` : '알 수 없음<br><span class="t-muted">(중량 미표기)</span>')}</td>`).join('')}</tr>
    <tr><th scope="row">1인분</th>${rows.map(r => `<td class="nowrap">${cell(r, r => { const m = r.m; return m.w && m.price ? `${esc(m.w)}g<br>${won(m.price)}` : m.price ? `-<br>${won(m.price)}` : '-'; })}</td>`).join('')}</tr>
    <tr><th scope="row">동네 대비</th>${rows.map(r => `<td class="nowrap">${cell(r, r => { if (!r.b || sise == null) return '-'; const p = (r.b.u.v - sise) / sise * 100; return `<span class="${p < 0 ? 'cheap' : 'pricey'}">${Math.abs(p).toFixed(1)}% ${p < 0 ? '저렴' : '비쌈'}</span>`; })}</td>`).join('')}</tr>
    <tr><th scope="row">메모</th>${rows.map(r => `<td>${r.s.memo ? esc(r.s.memo) : '-'}</td>`).join('')}</tr>
    <tr><th scope="row">거리</th>${rows.map(r => `<td class="nowrap">${distTxt(r.s) || '-'}</td>`).join('')}</tr>
    <tr><th scope="row">확인일</th>${rows.map(r => `<td class="nowrap">${esc(r.s.checked || '-')}${r.s.checked && isStale(r.s) ? '<br>' + staleTag(r.s) : ''}</td>`).join('')}</tr>
    <tr><th scope="row">리뷰</th>${rows.map(r => `<td><a class="tlink" href="${esc(placeUrl(r.s))}" target="_blank" rel="noopener"><span translate="no">카카오맵</span><span class="sr-only"> ${esc(r.s.name)} 리뷰 보기 (새 창)</span></a></td>`).join('')}</tr>
    </tbody></table></div>
    ${same ? siseBar(rows, sise) : `<section class="sise"><h2>동네 시세</h2><p class="sise__none">고른 메뉴가 모두 같은 고기(부위·종류·원산지)일 때만 동네 시세와 비교해요.</p></section>`}`;
  return h + `</div>`;
}

// ---------- ③ 즐겨찾기 ----------
function viewFav() {
  const list = Object.keys(ST.favs).filter(id => ST.favs[id]).map(byId).filter(Boolean);
  if (!list.length) return `<div class="screen-pad"><div class="empty"><p>아직 즐겨찾기한 가게가 없어요.</p><p>가게 라벨의 ☆를 누르면 여기에 모여요.</p><div class="actions"><button class="btn btn--primary" type="button" data-act="tab" data-tab="map" data-from="empty">목록으로 가기</button></div></div></div>`;
  const f = ST.filter;
  return `<div class="screen-pad">${ST.favErr ? '<div class="banner" role="status"><strong>즐겨찾기 가게의 가격 정보를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</strong></div>' : ''}<p class="screen-note">즐겨찾기는 이 폰에만 저장돼요. ${esc(f.part)} ${esc(f.type)} ${esc(f.origin)} 기준으로 보여 줘요.</p><ul class="plain" role="list">${list.map(s => { const b = bestMenu(s, f);
    return b ? labelCard(s, b, 0, 'fav') : `<li class="label label--plain"><div class="label__head"><h3 class="label__name">${nameTag(s)}</h3><span class="label__dist num">${distTxt(s)}</span>${starBtn(s, 'fav')}</div><div class="label__body"><p class="label__menu">${s.gray ? '아직 메뉴를 확인하지 않은 가게예요.' : '이 필터에 맞는 메뉴가 없어요.'}</p><div class="actions">${detailBtn(s, 'fav')}</div></div></li>`; }).join('')}</ul></div>`;
}

// ---------- ④ 가게 상세 ----------
function viewDetail() {
  const s = byId(ST.detailId);
  if (!s) return `<div class="screen-pad"><div class="empty"><p>가게 정보를 찾지 못했어요.</p><div class="actions"><button class="btn btn--primary" type="button" data-act="tab" data-tab="map" data-from="empty">목록으로 가기</button></div></div></div>`;
  const fav = !!ST.favs[s.id];
  const ranked = s.menus.filter(m => PARTS.includes(m.part) && TYPES.includes(m.type));
  const others = s.menus.filter(m => !ranked.includes(m));
  const line = m => { const u = unit(m);
    const shown = [m.p100 != null ? `100g ${won(m.p100)}` : '', m.w ? `1인분 ${esc(m.w)}g` : '', m.price ? `${m.w ? '' : '1인분 '}${won(m.price)}` : ''].filter(Boolean).join(', ');
    return `<li class="label"><div class="label__head"><h3 class="label__name">${esc(m.name)}</h3>${m.aged ? '<span class="tag tag--on-ink">숙성</span>' : ''}</div>
      <div class="label__body"><p class="label__menu"><span class="t-muted">${esc(m.part)} ${esc(m.type)} ${esc(m.origin)}</span></p>
      <dl class="cells"><div><dt>중량</dt><dd>${m.w ? esc(m.w) + 'g' : '-'}</dd></div>
      <div class="unit"><dt>100g당</dt><dd>${u ? `${fmt(u.v)}<small>원</small>` : '<small>중량 미표기</small>'}</dd></div>
      <div><dt>판매가</dt><dd>${m.price ? won(m.price) : '-'}</dd></div></dl>
      <p class="label__meta">메뉴판 표기: ${shown}</p>
      ${u && u.mismatch ? `<p class="note-user">메뉴판에는 100g당 ${won(u.label)}으로 적혀 있지만 계산하면 ${won(u.v)}이에요. 순위에는 계산값을 써요.</p>${openq('표기값과 계산값이 다를 때 어느 쪽을 쓸지는 아직 임시 규칙 [기획 열린 질문 Q2]')}` : ''}</div></li>`; };
  let h = `<div class="screen-pad"><div class="detail-top"><p class="detail-meta">${distTxt(s)} · ${s.checked ? `메뉴 확인일 ${esc(s.checked)} ${staleTag(s)}` : '아직 메뉴를 확인하지 않은 가게예요.'}</p>
    ${s.memo ? `<p class="detail-memo">${esc(s.memo)}</p>` : ''}
    <div class="actions">${s.menus.length ? cmpBtn(s, 'detail', 'btn--primary') : ''}
    <button class="btn" type="button" data-act="fav" data-id="${esc(s.id)}" data-from="detailfav"><span aria-hidden="true">${fav ? '★' : '☆'} </span>${fav ? '즐겨찾기 해제' : '즐겨찾기'}</button>
    ${kakaoLink(s)}</div>
    <p class="screen-note">즐겨찾기는 이 폰에만 저장돼요.</p></div>`;
  if (ranked.length) h += `<h2 class="section-title">삼겹살·목살</h2><ul class="plain" role="list">${ranked.map(line).join('')}</ul>`;
  if (others.length) h += `<h2 class="section-title">다른 메뉴 <span class="t-muted">지도 순위에는 쓰지 않아요</span></h2><ul class="plain" role="list">${others.map(line).join('')}</ul>`;
  if (!s.menus.length) h += `<div class="empty"><p class="empty__title">아직 메뉴를 확인하지 않은 가게예요.</p><p>카카오맵에서 가게 정보를 볼 수 있어요.</p></div>`;
  if (LIVE && ST.authIn && s.dbChecked) h += `<div class="admin-actions">${s.gray
    ? `<button class="btn btn--primary" type="button" data-act="newfor" data-id="${esc(s.id)}">이 가게 메뉴 입력하기</button>`
    : `<button class="btn btn--primary" type="button" data-act="editstore" data-id="${esc(s.id)}">수정하기<span class="sr-only"> (${esc(s.name)})</span></button>`}<span class="t-muted">운영자만 보여요</span></div>`;
  if (LIVE && ST.authIn && !s.gray) h += adminPhoto(s);
  return h + `</div>`;
}

// ---------- ⑤ 운영자 입력 (메뉴 ⋯ 안) ----------
// 입력할 수 있는 부위: 순위·필터는 삼겹살·목살만 쓰고(PARTS), 나머지는 가게 상세의 "다른 메뉴"로 보인다
const INPUT_PARTS = ['삼겹살', '오겹살', '목살', '항정살', '갈매기살', '갈비', '기타'];
const INPUT_TYPES = ['생고기', '냉동', '대패', '기타'];
function guessArea(s) { // D26-14: 주안역·구월동 로데오거리 기준 반경 1km, 아니면 기타
  if (!s || s.lat == null) return '기타';
  if (distM(s, AREAS.juan) <= 1000) return '주안';
  if (distM(s, AREAS.guwol) <= 1000) return '구월';
  return '기타';
}
const blankMenu = prev => ({ name: '', part: prev ? prev.part : '삼겹살', type: prev ? prev.type : '생고기', aged: false, origin: prev ? prev.origin : '국내산', p100: '', w: '', price: '' });
function clearPhoto() { if (ST.formPhotoUrl) URL.revokeObjectURL(ST.formPhotoUrl); ST.formPhotoUrl = null; ST.formPhoto = null; }
function newForm(preset) { // 빈 입력창. preset: 가게 상세의 "메뉴 입력하기"로 들어왔을 때만 그 가게를 골라 둔다
  const pick = preset && byId(preset) && byId(preset).gray ? preset : '';
  clearPhoto();
  ST.form = { edit: false, store: pick, area: guessArea(byId(pick)), areaTouched: false, memo: '', date: C.kstDate(new Date()), menus: [blankMenu()], removed: [] };
  ST.dirty = false; ST.found = null; ST.findMsg = ''; ST.findQ = ''; ST.formMsg = null;
}
function editForm(id, fromStore) { // 이미 입력한 가게 고치기: 저장된 값을 채워서 연다
  const r = fromStore ? null : (ST.adminStores || []).find(x => x.kakaoId === id), s = byId(id);
  const src = r || s; if (!src) return false;
  if (!s) KNOWN.set(id, { id, name: src.name, menus: src.menus, gray: false, checked: src.checked, memo: src.memo, area: src.area, dist: null });
  const str = v => v == null ? '' : String(v);
  clearPhoto();
  ST.form = { edit: true, store: id, area: src.area || guessArea(s), areaTouched: true, memo: src.memo || '', date: src.checked || C.kstDate(new Date()),
    menus: (src.menus || []).map(m => ({ id: m.id || null, name: m.name, part: m.part, type: m.type, aged: !!m.aged, origin: m.origin, p100: str(m.p100), w: str(m.w), price: str(m.price) })), removed: [] };
  if (!ST.form.menus.length) ST.form.menus = [blankMenu()];
  ST.dirty = false; ST.found = null; ST.findMsg = ''; ST.formMsg = null;
  return true;
}
const FIELD_LABEL = { p100: '100g당 가격', w: '1인분 중량', price: '1인분 가격' };
const showFieldErr = () => ST.dirty || (ST.formMsg && !ST.formMsg.ok);
function checkMenu(M) { // D26-9, R9 (메뉴 하나)
  const num = x => x === '' ? null : Number(x);
  const p100 = num(M.p100), w = num(M.w), price = num(M.price);
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
  // DB 제한과 같은 범위 (01-schema.sql)
  const big = [['p100', p100, 1000000, '100만 원'], ['w', w, 5000, '5,000g'], ['price', price, 10000000, '1,000만 원']].filter(([, v, max]) => v != null && v > max);
  if (big.length) { const fe = {}; big.forEach(([k, , , lim]) => { fe[k] = `${FIELD_LABEL[k]}: ${lim} 이하로 넣어 주세요.`; });
    return { err: `${big.map(([k]) => FIELD_LABEL[k]).join(', ')} 값이 너무 커요.`, fields: big.map(([k]) => k), fieldErr: fe }; }
  if (String(M.name || '').length > 60) return { err: '메뉴 이름은 60자까지 넣을 수 있어요.', fields: ['mname'] };
  const u = unit({ p100, w: w && price ? w : null, price: w && price ? price : (p100 == null ? price : null) });
  if (!u) return { info: '중량이 없어 100g당 가격을 계산할 수 없어요. “중량 미표기”로 저장돼요.' };
  return { info: `100g당 ${won(u.v)}으로 계산돼요${u.mismatch ? ' (메뉴판 표기와 달라요)' : ''}` };
}
function checkForm() { // 저장 전 전체 검사. 첫 번째 문제만 알려 주고 그 칸으로 포커스
  const F = ST.form;
  const storeFocus = document.getElementById('store') && document.getElementById('store').tagName === 'SELECT' ? '#store' : '#find';
  if (!byId(F.store)) return { err: '메뉴를 입력할 가게를 골라 주세요.', focus: storeFocus };
  if (LIVE && !F.edit && !byId(F.store).dbChecked) return { err: '이 가게의 입력 기록을 아직 확인하지 못했어요. 인터넷 연결을 확인하고 지도를 다시 불러온 뒤 저장해 주세요.', focus: storeFocus };
  const today = C.kstDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(F.date || ''))) return { err: '메뉴 확인일을 넣어 주세요.', focus: '#date' };
  if (F.date > today) return { err: '메뉴 확인일은 오늘보다 뒤일 수 없어요.', focus: '#date' };
  if (F.date < '2020-01-01') return { err: '메뉴 확인일이 너무 오래됐어요. 2020년 이후 날짜를 넣어 주세요.', focus: '#date' };
  if (String(F.memo || '').length > 200) return { err: '메모는 200자까지 넣을 수 있어요.', focus: '#memo' };
  for (let i = 0; i < F.menus.length; i++) {
    const c = checkMenu(F.menus[i]);
    if (c.err) return { err: (F.menus.length > 1 ? `메뉴 ${i + 1}: ` : '') + c.err, focus: `#${(c.fields && c.fields[0]) || 'p100'}-${i}` };
  }
  return {};
}
function calcLine(c) { // 처음 연 빈 폼은 오류가 아니라 안내로 보여 준다
  if (c.err && (showFieldErr() || !c.empty)) return { cls: 'calc calc--err', text: c.err };
  if (c.err) return { cls: 'calc calc--idle', text: '가격을 넣으면 100g당 가격을 계산해 드려요.' };
  return { cls: 'calc', text: c.info };
}
function field(id, label, inner, hint) {
  return `<div class="field"><label for="${id}">${label}</label>${inner}${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}</div>`;
}
function menuRow(M, i, n) {
  const c = checkMenu(M), cl = calcLine(c);
  const errOf = k => showFieldErr() && c.fieldErr && c.fieldErr[k] ? c.fieldErr[k] : '';
  const inv = k => `aria-invalid="${!!errOf(k)}" aria-describedby="${k}-${i}-err calc-${i}"`;
  const sel = (k, arr) => `<select id="${k}-${i}" data-mi="${i}" data-mfield="${k}" autocomplete="off">${arr.map(v => `<option ${M[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
  const num = (k, ph) => `<input id="${k}-${i}" inputmode="numeric" autocomplete="off" data-mi="${i}" data-mfield="${k}" value="${esc(M[k])}" placeholder="${ph}" ${inv(k)}><p class="field-err" id="${k}-${i}-err">${errOf(k)}</p>`;
  return `<fieldset class="menu-card"><legend class="menu-card__title">메뉴 ${i + 1}</legend>
    ${n > 1 ? `<button class="btn btn--quiet btn--sm menu-card__del" type="button" data-act="delmenu" data-i="${i}">빼기<span class="sr-only"> (메뉴 ${i + 1})</span></button>` : ''}
    ${field(`mname-${i}`, '메뉴 이름 <span class="t-muted">메뉴판 그대로</span>', `<input id="mname-${i}" type="text" data-mi="${i}" data-mfield="name" value="${esc(M.name)}" placeholder="예: 생삼겹살, 오겹살, 돼지갈비" maxlength="60" autocomplete="off">`)}
    <div class="row3 row3--sel">${field(`part-${i}`, '부위', sel('part', INPUT_PARTS))}${field(`type-${i}`, '종류', sel('type', INPUT_TYPES))}${field(`origin-${i}`, '원산지', sel('origin', ORIGINS))}</div>
    <label class="check"><input type="checkbox" id="aged-${i}" data-mi="${i}" data-mfield="aged" ${M.aged ? 'checked' : ''}><span>숙성 메뉴</span></label>
    <div class="row3">${field(`p100-${i}`, '100g당 가격', num('p100', '9000'))}${field(`w-${i}`, '1인분 중량(g)', num('w', '160'))}${field(`price-${i}`, '1인분 가격', num('price', '14000'))}</div>
    <p id="calc-${i}" class="${cl.cls}" aria-live="polite">${esc(cl.text)}</p>
  </fieldset>`;
}
function viewLogin() { // 운영자 로그인 (D26-4, P-3: 이메일+비밀번호, 운영자 1명)
  const m = ST.loginMsg, why = ST.formMsg && !ST.formMsg.ok ? ST.formMsg.text : '';
  const inv = ST.loginMsg ? ' aria-invalid="true" aria-describedby="login-msg"' : '';
  return `<div class="screen-pad"><form class="card form login" data-act="signin" novalidate>
    <h2 class="card__title">운영자 로그인</h2>
    <p class="hint">메뉴 입력은 운영자만 할 수 있어요.</p>
    ${why ? `<p class="msg msg--err" role="status">${esc(why)}</p>` : ''}
    ${field('email', '이메일', `<input id="email" name="email" type="email" autocomplete="username" required spellcheck="false" maxlength="200" value="${esc(ST.loginEmail || '')}"${inv}>`)}
    ${field('pw', '비밀번호', `<input id="pw" name="password" type="password" autocomplete="current-password" required maxlength="200"${inv}>`)}
    <button class="btn btn--primary btn--block" type="submit" ${ST.busy ? 'disabled' : ''}>${ST.busy ? '로그인하는 중…' : '로그인'}</button>
    ${m ? `<p id="login-msg" class="msg msg--err" role="alert" tabindex="-1">${esc(m)}</p>` : ''}
    <p class="hint">공용 컴퓨터나 남의 폰에서는 입력이 끝나면 꼭 로그아웃해 주세요.</p>
  </form></div>`;
}
function ratioText() { // R14: 상권별 중량 표기 비율 (D26-8, D28-9). 실서비스는 DB의 전체 가게로 센다
  const all = LIVE ? (ST.adminStores || []) : STORES.filter(s => !s.gray).map(s => ({ ...s, area: '주안' }));
  if (LIVE && ST.adminErr) return '<p class="t-muted">입력한 가게 목록을 불러오지 못해 비율을 계산할 수 없어요.</p>';
  if (LIVE && !ST.adminStores) return '불러오는 중…';
  const rows = ['주안', '구월', '기타'].map(a => {
    const entered = all.filter(s => s.area === a && s.menus.some(m => ['삼겹살', '목살'].includes(m.part)));
    const ok = entered.filter(s => s.menus.some(m => ['삼겹살', '목살'].includes(m.part) && unit(m)));
    return entered.length ? `<li><strong>${a}</strong> 확인한 ${entered.length}곳 중 ${ok.length}곳(${Math.round(ok.length / entered.length * 100)}%)이 100g당 가격을 계산할 수 있어요.</li>` : '';
  }).filter(Boolean);
  return rows.length ? `<ul class="ratio">${rows.join('')}</ul>` : '<p class="t-muted">아직 확인한 가게가 없어요. 메뉴를 입력하면 여기에 비율이 나와요.</p>';
}
function storeOptions(F) { // 아직 입력하지 않은 가게만 (입력한 가게는 "수정하기"로만 고친다)
  const ok = s => s.gray && (!LIVE || s.dbChecked); // 실제 모드: DB에 입력 기록이 없다고 확인된 가게만
  const list = STORES.filter(ok); const cur = byId(F.store);
  if (cur && ok(cur) && !list.includes(cur)) list.unshift(cur);
  return list;
}
function enteredList() { // 운영자: 입력한 가게 목록 + 수정하기
  if (!LIVE) return '';
  if (ST.adminErr) return `<section class="card"><h2 class="card__title">입력한 가게</h2><p class="msg msg--err">입력한 가게 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p><div class="actions"><button class="btn" type="button" data-act="reloadadmin">다시 불러오기</button></div></section>`;
  if (!ST.adminStores) return `<section class="card"><h2 class="card__title">입력한 가게</h2><p class="t-muted">불러오는 중…</p></section>`;
  const list = ST.adminStores.slice().sort((a, b) => String(b.checked).localeCompare(String(a.checked)));
  return `<section class="card" aria-labelledby="sec-entered"><div class="card__head"><h2 class="card__title" id="sec-entered">입력한 가게 <span class="count">${list.length}</span></h2></div>
    ${list.length ? `<ul class="entered" role="list">${list.slice(0, 100).map(s => `<li><span class="entered__text"><strong>${esc(s.name)}</strong><span class="t-muted">${esc(s.area)} · 메뉴 ${s.menus.length}개 · ${esc(s.checked)}</span></span>
      <button class="btn btn--sm" type="button" data-act="editstore" data-id="${esc(s.kakaoId)}">수정하기<span class="sr-only"> (${esc(s.name)})</span></button></li>`).join('')}</ul>${list.length > 100 ? `<p class="hint">최근 100곳만 보여 줘요. 나머지는 지도에서 가게를 눌러 수정할 수 있어요.</p>` : ''}${list.length >= 500 ? '<p class="hint">가게가 500곳을 넘어 일부만 셌어요.</p>' : ''}` : '<p class="t-muted">아직 입력한 가게가 없어요.</p>'}
  </section>`;
}
function viewAdmin() {
  if (LIVE && NO_DB) return `<div class="screen-pad"><div class="empty"><p class="empty__title">가격 DB가 연결되지 않아 메뉴를 입력할 수 없어요.</p><p>app/config.js의 Supabase 칸을 확인해 주세요.</p></div></div>`;
  if (LIVE && !ST.authIn) return viewLogin();
  if (!LIVE && ST.adminState === '로그인 전') {
    return `<div class="screen-pad"><div class="empty"><p>메뉴 입력은 운영자만 할 수 있어요.</p><div class="actions"><button class="btn btn--primary" type="button" data-act="login">운영자로 로그인</button></div></div></div>`;
  }
  if (!ST.form && LIVE && ST.screen === 'admin' && ST.loadingEdit) return `<div class="screen-pad"><p class="loading">가게 기록을 불러오는 중…</p></div>`;
  if (!ST.form) newForm();
  const F = ST.form, n = F.menus.length, opts = storeOptions(F);
  const found = ST.found && ST.found.length ? `<ul class="found" role="list">${ST.found.map(p => `<li><button type="button" class="found__item" data-act="pickstore" data-id="${esc(p.id)}"><strong>${esc(p.place_name)}</strong><span>${esc(p.road_address_name || p.address_name || '')}</span></button></li>`).join('')}</ul>` : '';
  const storeSel = opts.length
    ? `<select id="store" name="store" data-field="store" autocomplete="off" aria-invalid="${!!(ST.formMsg && !ST.formMsg.ok && /#store/.test(ST.formMsg.focus || ''))}" aria-describedby="form-msg"><option value="" ${F.store ? '' : 'selected'}>가게를 골라 주세요</option>${opts.map(s => `<option value="${esc(s.id)}" ${F.store === s.id ? 'selected' : ''}>${esc(s.name)}${distTxt(s) ? ' · ' + distTxt(s) : ''}</option>`).join('')}</select>`
    : `<p class="t-muted">지도에 아직 입력하지 않은 가게가 없어요. 위에서 이름으로 찾아 주세요.</p>`;
  const editStore = F.edit ? byId(F.store) : null;
  const msg = ST.formMsg ? `<p id="form-msg" class="msg ${ST.formMsg.ok ? 'msg--ok' : 'msg--err'}" role="${ST.formMsg.ok ? 'status' : 'alert'}" tabindex="-1">${esc(ST.formMsg.text)}</p>` : '';
  return `<div class="screen-pad stack">
    ${LIVE ? `<div class="admin-bar"><span><span class="dot" aria-hidden="true"></span>운영자로 로그인했어요</span><button class="btn btn--quiet btn--sm btn--on-dark" type="button" data-act="signout">로그아웃</button></div>` : ''}
    <form class="stack" data-act="save" novalidate>
      ${F.edit ? `<section class="card form-section edit-head" aria-labelledby="sec-store">
        <div class="card__head"><h2 class="card__title" id="sec-store">가게 수정</h2><button class="btn btn--quiet btn--sm" type="button" data-act="canceledit">수정 취소</button></div>
        <p class="edit-head__name">${esc(editStore ? editStore.name : '')}</p>
        ${ST.formNote ? `<p class="hint" role="status">${esc(ST.formNote)}</p>` : ''}
        ${LIVE ? field('area', '상권', `<select id="area" name="area" data-field="area" autocomplete="off">${['주안', '구월', '기타'].map(a => `<option ${F.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`) : ''}
      </section>` : `<section class="card form-section" aria-labelledby="sec-store">
        <h2 class="card__title" id="sec-store">가게</h2>
        ${LIVE ? `<div class="field"><label for="find">가게 이름으로 찾기</label>
          <div class="searchrow"><input id="find" type="search" placeholder="예: 마포주먹고기" autocomplete="off" maxlength="50" value="${esc(ST.findQ || '')}" enterkeyhint="search"><button class="btn" type="button" data-act="storesearch">찾기</button></div>
          ${ST.findMsg ? `<p class="hint" role="status">${esc(ST.findMsg)}</p>` : ''}${found}</div>` : ''}
        ${opts.length ? field('store', '메뉴를 입력할 가게', storeSel) : `<div class="field"><span class="field__label">메뉴를 입력할 가게</span>${storeSel}</div>`}
        ${LIVE ? field('area', '상권', `<select id="area" name="area" data-field="area" autocomplete="off" aria-describedby="area-hint">${['주안', '구월', '기타'].map(a => `<option ${F.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`, '주안역·구월동 로데오거리에서 1km 안이면 자동으로 골라져요.') : ''}
      </section>`}
      <section class="card form-section" aria-labelledby="sec-menu">
        <div class="card__head"><h2 class="card__title" id="sec-menu">메뉴 <span class="count">${n}</span></h2></div>
        <p class="hint">메뉴판에 적힌 그대로 넣어 주세요. 메뉴마다 100g당 가격이나 1인분 가격 중 하나는 꼭 넣어요.</p>
        ${F.menus.map((M, i) => menuRow(M, i, n)).join('')}
        <button class="btn btn--dashed btn--block" type="button" data-act="addmenu" ${n >= 20 ? 'disabled' : ''}><span aria-hidden="true">+ </span>메뉴 추가</button>
      </section>
      <section class="card form-section" aria-labelledby="sec-info">
        <h2 class="card__title" id="sec-info">확인 정보</h2>
        <div class="row2">${field('date', '메뉴 확인일', `<input id="date" name="date" type="date" data-field="date" value="${esc(F.date)}" max="${C.kstDate(new Date())}" autocomplete="off">`)}
          ${field('memo', '메모', `<input id="memo" name="memo" type="text" data-field="memo" value="${esc(F.memo)}" placeholder="예: 2인분 이상 주문" maxlength="200" autocomplete="off">`)}</div>
        <div class="field"><span class="field__label" id="photo-label">메뉴판 사진 <span class="t-muted">선택</span></span>
          <label class="filepick" for="photo"><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-labelledby="photo-label" aria-describedby="photo-hint"><span class="btn">사진 고르기</span><span class="filepick__name">${ST.formPhoto ? esc(ST.formPhoto.name) : '고른 사진 없음'}</span></label>
          <p class="hint" id="photo-hint">운영자만 볼 수 있어요. 5MB 이하 jpg·png·webp.</p>
          ${ST.formPhotoUrl ? `<div class="photo-preview"><img src="${esc(ST.formPhotoUrl)}" alt="고른 메뉴판 사진 미리보기"><button class="btn btn--quiet btn--sm" type="button" data-act="removephoto">사진 빼기</button></div>` : ''}
        </div>
      </section>
      <div class="form-submit">
        <button class="btn btn--primary btn--block btn--lg" type="submit" ${ST.busy ? 'disabled' : ''}>${ST.busy ? '저장하는 중…' : F.edit ? '수정 저장' : `메뉴 ${n}개 저장`}</button>
        ${msg}
      </div>
    </form>
    ${F.edit ? '' : enteredList()}
    <section class="card" aria-labelledby="sec-ratio"><h2 class="card__title" id="sec-ratio">중량 표기 비율</h2>${ratioText()}</section>
  </div>`;
}
const SAVE_FAIL = '저장하지 못했어요. 인터넷 연결을 확인하고 다시 저장해 주세요. 입력한 내용은 그대로 있어요.';
function saveErrorText(e) { // DB가 거부한 이유를 사람 말로 (키·토큰 같은 값은 보여 주지 않음)
  const code = String((e && e.code) || ''), msg = String((e && e.message) || '');
  if (/already entered/i.test(msg)) return '이미 입력한 가게예요. 아래 "입력한 가게"에서 수정하기로 고쳐 주세요.';
  if (code === 'PGRST202' || /could not find the function/i.test(msg)) return 'DB 업데이트가 필요해요. dev/googi-radar/sql/06-safe-save.sql을 SQL Editor에서 실행해 주세요.';
  if (code === 'P0002' || /store not found/i.test(msg)) return '이 가게를 DB에서 찾지 못했어요. 새로 입력해 주세요.';
  if (code === '42501' || code === 'PGRST116' || /row-level security|permission denied|not allowed/i.test(msg)) return '이 계정은 운영자로 등록되지 않아 저장할 수 없어요.';
  if (code === '22007' || code === '22008' || /bad-date/.test(msg)) return '메뉴 확인일을 확인해 주세요.';
  if (/JWT|expired|not authenticated|401/i.test(msg + code)) return '로그인이 끝났어요. 다시 로그인한 뒤 저장해 주세요. 입력한 내용은 그대로 있어요.';
  if (code === '23514' || code === '22001') return '입력한 값이 허용 범위를 벗어났어요. 숫자와 글자 수, 부위를 확인해 주세요.';
  return SAVE_FAIL;
}
const toMenu = M => { const num = x => x === '' ? null : Number(x); return { id: M.id || null, name: M.name || M.part, part: M.part, type: M.type, aged: M.aged, origin: M.origin, p100: num(M.p100), w: num(M.price) ? num(M.w) : null, price: num(M.price) }; };
async function saveLive() {
  try { if (!(await DB.session())) { ST.authIn = false; ST.formMsg = { ok: false, text: '로그인이 끝났어요. 다시 로그인한 뒤 저장해 주세요. 입력한 내용은 그대로 있어요.' }; return null; } }
  catch (e) { /* 세션 확인 실패는 저장 시도에서 다시 걸러진다 */ }
  const c = checkForm();
  if (c.err) { ST.formMsg = { ok: false, text: c.err, focus: c.focus }; ST.dirty = true; return; }
  const pp = DB.photoProblem(ST.formPhoto);
  if (pp) { ST.formMsg = { ok: false, text: pp, focus: '#photo' }; return; }
  const F = ST.form, s = byId(F.store), menus = F.menus.map(toMenu);
  const info = { kakaoId: s.id, name: s.name, area: F.area, checked: F.date, memo: F.memo };
  try {
    const r = F.edit ? await DB.updateMenus(info, menus, F.removed || [], ST.formPhoto) : await DB.saveMenus(info, menus, ST.formPhoto);
    const done = F.edit ? `${s.name} 메뉴를 수정했어요.` : `${s.name}에 메뉴 ${menus.length}개를 저장했어요.`;
    delete ST.photos[s.id];
    clearPhoto(); ST.form = null; ST.formNote = '';
    mergeDb(); mergeOne(s); loadAdminStores();
    return r.photoFailed ? `${done} 사진은 올리지 못했어요.` : done; // 성공하면 알림 문구를 돌려준다
  } catch (e) {
    let text = saveErrorText(e);
    if (/운영자로 등록되지 않아/.test(text)) { try { if (!(await DB.session())) text = '로그인이 끝났어요. 다시 로그인한 뒤 저장해 주세요. 입력한 내용은 그대로 있어요.'; } catch (e2) { /* 그대로 */ } }
    ST.formMsg = { ok: false, text };
    if (/로그인이 끝났어요/.test(ST.formMsg.text)) ST.authIn = false;
    return null;
  }
}
async function loadAdminStores() {
  try { ST.adminStores = await DB.allStores(); ST.adminErr = false; } catch (e) { ST.adminStores = null; ST.adminErr = true; }
  if (ST.screen === 'admin') bgRender();
}
function save() { // 샘플 모드(?demo=1): 메모리에만 저장
  const c = checkForm();
  if (c.err) { ST.formMsg = { ok: false, text: c.err, focus: c.focus }; ST.dirty = true; return; }
  if (ST.saveFails) { ST.formMsg = { ok: false, text: SAVE_FAIL }; return; }
  const F = ST.form, s = byId(F.store);
  s.gray = false; s.checked = F.date; if (F.memo) s.memo = F.memo;
  if (F.edit) s.menus = F.menus.map(toMenu); else F.menus.forEach(M => s.menus.push(toMenu(M)));
  const done = F.edit ? `${s.name} 메뉴를 수정했어요.` : `${s.name}에 메뉴 ${F.menus.length}개를 저장했어요.`;
  ST.form = null;
  return done;
}
function adminPhoto(s) { // 운영자에게만: 저장된 메뉴판 사진 (D28-12, 사용자 결정 2026-11-10 "운영자만")
  if (ST.photoAt && ST.photoAt[s.id] && Date.now() - ST.photoAt[s.id] > 9 * 60 * 1000) delete ST.photos[s.id]; // 10분짜리 주소가 끝나기 전에 새로
  const v = ST.photos[s.id];
  if (v === undefined) {
    ST.photos[s.id] = 'loading'; ST.photoAt = ST.photoAt || {};
    DB.photoUrl(s.id).then(u => { ST.photos[s.id] = u || 'none'; ST.photoAt[s.id] = Date.now(); }).catch(() => { ST.photos[s.id] = 'err'; })
      .finally(() => { if (ST.screen === 'detail' && ST.detailId === s.id) bgRender(); });
  }
  const body = v === 'none' ? '<p class="t-muted">저장된 사진이 없어요.</p>' : v === 'err' ? '<p class="t-muted">사진을 불러오지 못했어요.</p>'
    : v && v !== 'loading' ? `<a class="photo-link" href="${esc(v)}" target="_blank" rel="noopener"><img class="photo" src="${esc(v)}" alt="${esc(s.name)} 메뉴판 사진"><span class="sr-only"> (크게 보기, 새 창)</span></a>` : '<p class="t-muted">불러오는 중…</p>';
  return `<section class="card" aria-labelledby="photo-title"><h2 class="card__title" id="photo-title">메뉴판 사진 <span class="t-muted">운영자만 보여요</span></h2>${body}</section>`;
}

// ---------- 렌더 ----------
const TITLES = { map: ['고기 레이더', '주안역 주변'], cmp: ['비교', ''], fav: ['즐겨찾기', ''], detail: ['', ''], admin: ['운영자 입력', ''] };
function focusKey() {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const sel = typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  if (a.id && !(a.dataset && a.dataset.act)) return { elId: a.id, sel }; // 입력칸 등: id로 다시 찾는다
  if (!a.dataset || !a.dataset.act) return null;
  return { act: a.dataset.act, id: a.dataset.id || '', tab: a.dataset.tab || '', from: a.dataset.from || '', k: a.dataset.k || '' };
}
function findKey(key) {
  let sel = `[data-act="${key.act}"]`;
  if (key.id) sel += `[data-id="${esc(key.id)}"]`;
  if (key.tab) sel += `[data-tab="${key.tab}"]`;
  if (key.k) sel += `[data-k="${key.k}"]`;
  return (key.from && document.querySelector(`${sel}[data-from="${key.from}"]`)) || document.querySelector(sel);
}
function restoreFocus(key, fallback) {
  if (!key) return;
  if (key.elId) {
    const el = document.getElementById(key.elId);
    if (el) { el.focus(); if (key.sel && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(key.sel[0], key.sel[1]); } catch (e) { /* 일부 입력 종류는 지원 안 함 */ } } return; }
  }
  const el = (key.act && findKey(key)) || (fallback && document.querySelector(fallback)) || document.getElementById('screen');
  if (el) el.focus();
}
let composing = false;
document.addEventListener('compositionstart', () => { composing = true; });
document.addEventListener('compositionend', () => { composing = false; });
const typing = () => { const a = document.activeElement; return composing || (!!a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && !!a.closest('#screen')); };
function bgRender() { // 네트워크 결과처럼 사용자가 시키지 않은 다시 그리기
  if (typing()) { ST.pendingRender = true; return; }
  ST.pendingRender = false; render();
}
document.addEventListener('focusout', () => { setTimeout(() => { if (ST.pendingRender && !typing()) { ST.pendingRender = false; render(); } }, 0); });
function render(opts) {
  opts = opts || {};
  const key = opts.focusMain ? null : focusKey();
  const scr = ST.screen;
  const t = scr === 'detail' ? [(byId(ST.detailId) || { name: '가게 상세' }).name, ''] : scr === 'map' ? ['고기 레이더', ST.where] : TITLES[scr];
  document.getElementById('title').textContent = t[0];
  document.getElementById('where').textContent = t[1];
  document.title = scr === 'map' ? '고기 레이더' : `${t[0]} - 고기 레이더`;
  const back = document.getElementById('back');
  back.hidden = !(scr === 'detail' || scr === 'admin');
  document.getElementById('back-label').textContent = scr === 'admin' ? '돌아가기' : ({ cmp: '비교로', fav: '즐겨찾기로' })[ST.prev] || '목록으로';
  const main = document.getElementById('screen');
  const entering = scr !== ST.lastScr && scr !== 'map'; ST.lastScr = scr;
  main.className = 'screen' + (scr === 'map' ? ' screen--map' : '') + (entering ? ' screen--enter' : '');
  try {
    main.innerHTML = !DEMO && !LIVE ? viewSetup() : ({ map: viewMap, cmp: viewCmp, fav: viewFav, detail: viewDetail, admin: viewAdmin })[scr]();
    if (LIVE && scr === 'map') livePins();
  } catch (e) { // 데이터 하나가 이상해도 화면 전체가 멈추지 않게
    console.error('화면 그리기 오류:', e && e.message);
    main.innerHTML = `<div class="screen-pad"><div class="empty"><p class="empty__title">화면을 그리다 문제가 생겼어요.</p><p>새로고침해 주세요. 계속되면 다른 탭으로 옮겨 보세요.</p></div></div>`;
  }
  // 아래 선택지가 열려 있으면 뒤쪽은 건드릴 수 없게 (접근성 2.4.3·4.1.2: 모바일 화면 읽기 프로그램이 밖으로 나가지 않게)
  const modal = scr === 'map' && !!ST.fsheet;
  document.querySelectorAll('.appbar, .tabbar').forEach(el => { el.inert = modal; });
  if (modal) document.querySelectorAll('.mapview > :not(.fsheet-layer)').forEach(el => { el.inert = true; });
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
  const devEl = document.getElementById('dev'); // 개발용 상태 전환: index.html에 있을 때만 (실서비스 index.html에는 없음)
  if (devEl) devEl.innerHTML = DEV.map(([k, l]) => `<button type="button" data-dev="${k}" aria-pressed="${isDevOn(k)}">${l}</button>`).join('')
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
function go(scr) {
  if (ST.screen === 'admin' && scr !== 'admin') ST.formMsg = null; // 운영자 화면을 떠나면 지난 안내는 지운다
  if (scr !== 'detail' && scr !== 'admin') ST.prev = scr; ST.screen = scr; ST.pin = null; ST.picker = false; ST.menuOpen = false; ST.fsheet = null;
}
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
    case 'admin': go('admin'); if (LIVE && ST.authIn && !ST.adminStores) loadAdminStores(); if (!ST.form) newForm(); render({ focusMain: true }); return;
    case 'pin': ST.pin = ST.pin === id ? null : id; if (ST.pin && ST.sheet === 'peek') ST.sheet = 'half'; render(); if (ST.pin && byId(ST.pin)) announce(`${byId(ST.pin).name} 정보를 목록 자리에 보여 줘요`); return;
    case 'closepin': { const was = ST.pin; ST.pin = null; render({ focus: `[data-act="pin"][data-id="${esc(was)}"]` }); return; }
    case 'sheet': ST.sheet = SHEET_NEXT[ST.sheet]; break;
    case 'cmp': {
      const had = ST.cmpIds.includes(id), from = el.dataset.from; toggleCmp(id); const now = ST.cmpIds.includes(id), s = byId(id);
      if (from === 'picker') { render({ focus: now ? '#picker [data-act="cmp"]:not([disabled])' : null }); if (now && !document.querySelector('#picker [data-act="cmp"]:not([disabled])')) { const h = document.getElementById('picker-title'); if (h) h.focus(); } }
      else render({ fallback: from === 'chip' ? '[data-act="picker"][data-from="add"]' : '#cmp-table caption' });
      if (had !== now && s) announce(`${s.name}${now ? '을(를) 비교에 넣었어요' : '을(를) 비교에서 뺐어요'}. 지금 ${ST.cmpIds.length}곳`);
      return; }
    case 'detail': ST.detailId = id; ST.screen = 'detail'; ST.pin = null; ST.menuOpen = false; render({ focusMain: true }); return;
    case 'fav': ST.favs[id] = !ST.favs[id]; saveFavs(); break;
    case 'addmenu': { const ms = ST.form.menus; if (ms.length >= 20) return; ms.push(blankMenu(ms[ms.length - 1])); ST.formMsg = null; render({ focus: `#mname-${ms.length - 1}` }); return; }
    case 'delmenu': { const i = Number(el.dataset.i), ms = ST.form.menus; if (ms.length > 1) { const [gone] = ms.splice(i, 1); if (gone && gone.id) ST.form.removed.push(gone.id); } ST.formMsg = null; render({ focus: `#mname-${Math.max(0, i - 1)}` }); return; }
    case 'removephoto': clearPhoto(); render({ focus: '#photo' }); return;
    case 'storesearch': storeSearch(); return;
    case 'pickstore': {
      const pl = (ST.found || []).find(x => x.id === id); if (!pl) return;
      const s = fromPlace(pl); ST.found = null; ST.findMsg = '확인하는 중…'; render({ focus: '#find' });
      const pickSeq = ST.pickSeq = (ST.pickSeq || 0) + 1;
      mergeOne(s, true).then(ok => {
        if (!ST.form || ST.screen !== 'admin' || pickSeq !== ST.pickSeq) return; // 그 사이 로그아웃·화면 이동·다른 가게 선택
        if (!ok) { ST.findMsg = '이 가게의 입력 기록을 확인하지 못했어요. 인터넷 연결을 확인하고 다시 골라 주세요.'; render({ focus: '#find' }); announce(ST.findMsg); return; }
        if (!s.gray) {
          if (ST.dirty && !window.confirm(`${s.name}은(는) 이미 입력한 가게예요. 쓰던 내용을 지우고 수정 화면으로 열까요?`)) {
            ST.findMsg = `${s.name}은(는) 이미 입력한 가게예요. 수정하려면 아래 "입력한 가게"에서 수정하기를 눌러 주세요.`; render({ focus: '#find' }); announce(ST.findMsg); return;
          }
          if (editForm(s.id, true)) { ST.formNote = '이미 입력한 가게라 수정 화면으로 열었어요.'; render({ focus: '#area' }); return; }
        }
        ST.form.store = s.id; if (!ST.form.areaTouched) ST.form.area = guessArea(s);
        ST.findMsg = `${pl.place_name}을(를) 골랐어요.`; render({ focus: '#store' }); announce(ST.findMsg);
      }); return; }
    case 'editstore':
      if (ST.screen === 'admin' && ST.dirty && !window.confirm('입력하던 내용이 사라져요. 이 가게를 수정할까요?')) return;
      if (LIVE && !NO_DB) {
        go('admin'); ST.form = null; ST.formNote = ''; ST.loadingEdit = true; render({ focusMain: true });
        const s = byId(id) || { id, name: ((ST.adminStores || []).find(x => x.kakaoId === id) || {}).name || '', menus: [], gray: true };
        KNOWN.set(id, s);
        mergeOne(s, true).then(ok => {
          ST.loadingEdit = false;
          if (ST.screen !== 'admin') return;
          if (!ok || s.gray || !editForm(id, true)) { newForm(); ST.formMsg = { ok: false, text: ok ? '이 가게의 입력 기록이 없어요. 새로 입력해 주세요.' : '최신 기록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.' }; }
          if (ST.authIn && !ST.adminStores) loadAdminStores();
          render({ focus: ST.formMsg ? '#form-msg' : '#area' });
        });
        return;
      }
      go('admin'); if (!editForm(id)) { newForm(); } ST.formNote = ''; render({ focusMain: true }); return;
    case 'newfor': // 지도·상세의 "정보 없음" 가게 → 그 가게가 골라진 입력창, 바로 메뉴 이름부터
      go('admin'); ST.pendingStore = LIVE && !ST.authIn ? id : null; newForm(id); if (LIVE && ST.authIn && !ST.adminStores) loadAdminStores(); render(LIVE && !ST.authIn ? { focus: '#email' } : { focus: '#mname-0' }); return;
    case 'canceledit': if (ST.dirty && !window.confirm('고치던 내용이 사라져요. 수정을 취소할까요?')) return; newForm(); ST.formNote = ''; render({ focus: '#find' }); return;
    case 'reloadadmin': ST.adminErr = false; render(); loadAdminStores(); return;
    case 'zoom': if (window.KMap) KMap.zoom(Number(el.dataset.d)); return;
    case 'locate': announce('내 위치를 찾고 있어요'); locate(true); return;
    case 'fsheet': ST.fsheet = el.dataset.k; render({ focus: '.fopt[aria-checked="true"]' }); return;
    case 'fpick': { const k = el.dataset.k; ST.filter[k] = el.dataset.v; ST.fsheet = null; ST.pin = null; render({ focus: `[data-act="fsheet"][data-k="${k}"]` });
      announce(`${ST.filter.part} ${ST.filter.type} ${ST.filter.origin}, 100g당 가격을 아는 가게 ${rankedCount()}곳`); return; }
    case 'fclose': { const k = ST.fsheet; ST.fsheet = null; render({ focus: `[data-act="fsheet"][data-k="${k}"]` }); return; }
    case 'picker': ST.picker = !ST.picker; break;
    case 'area': {
      if (LIVE) { const a = AREAS[el.dataset.area] || AREAS.juan; ST.area = el.dataset.area; ST.where = a.name; ST.origin = { lat: a.lat, lng: a.lng }; ST.locState = '정상'; ST.mapState = '정상'; ST.pin = null; KMap.setCenter(a); }
      else ST.mapState = '정상';
      render({ focusMain: true }); return; }
    case 'retry': if (LIVE) {
      if (window.KMap && KMap.ready()) { const kakaoBad = ST.mapState === '카카오 오류'; ST.dbError = false; if (kakaoBad) { ST.mapState = '로딩'; KMap.search(); } else mergeDb(); render({ focusMain: true }); return; }
      startLive(); return; } ST.mapState = '정상'; render({ focusMain: true }); return;
    case 'login': ST.adminState = '입력'; render({ focus: '#store' }); return;
    case 'signout': DB.signOut().catch(() => { /* 서버 응답이 없어도 이 브라우저의 로그인은 지운다 */ }).finally(() => { ST.pendingStore = null; ST.authIn = false; ST.loginMsg = ''; clearPhoto(); ST.form = null; ST.adminStores = null; ST.photos = {}; render({ focus: '#email' }); }); return;
    case 'closetoast': hideToast(true); return;
    default: return;
  }
  render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ST.menuOpen) { ST.menuOpen = false; render({ focus: '#menu-btn' }); }
  if (e.key === 'Enter' && e.target.id === 'find') { e.preventDefault(); storeSearch(); } // 검색칸의 엔터가 폼 저장이 되지 않게
  if (ST.fsheet) { // 아래 선택지: Esc 닫기, 위·아래 화살표로 이동, Tab은 안에서만 돈다
    const box = document.getElementById('fsheet'); if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); const k = ST.fsheet; ST.fsheet = null; render({ focus: `[data-act="fsheet"][data-k="${k}"]` }); return; }
    const opts = [...box.querySelectorAll('.fopt')], at = opts.indexOf(document.activeElement);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && at >= 0) {
      e.preventDefault(); const nx = opts[(at + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length];
      opts.forEach(o => { o.tabIndex = o === nx ? 0 : -1; }); nx.focus(); return;
    }
    if (e.key === 'Tab') {
      const f = [opts.find(o => o.tabIndex === 0) || opts[0], box.querySelector('[data-act="fclose"].btn')].filter(Boolean);
      const i = f.indexOf(document.activeElement); e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus();
    }
  }
});
function storeSearch() { // 운영자: 가게 이름으로 카카오에서 찾기 (결과는 메모리에만, D31)
  const inp = document.getElementById('find'), q = inp ? inp.value.trim() : '';
  ST.findQ = q;
  if (!q) { ST.findMsg = '찾을 가게 이름을 넣어 주세요.'; render({ focus: '#find' }); return; }
  if (!window.KMap || !KMap.ready()) { ST.findMsg = '지도가 준비되면 찾을 수 있어요. 잠시 뒤 다시 해 주세요.'; render({ focus: '#find' }); return; }
  ST.findMsg = '찾는 중…'; ST.found = null; render({ focus: '#find' });
  KMap.findPlaces(q, KMap.getCenter() || AREAS.juan).then(list => {
    ST.found = list.slice(0, 10);
    ST.findMsg = list.length ? `${ST.found.length}곳을 찾았어요. 아래에서 골라 주세요.` : '찾지 못했어요. 가게 이름을 다르게 넣어 보세요.';
    render({ focus: list.length ? '.found__item' : '#find' }); announce(ST.findMsg);
  }).catch(() => { ST.findMsg = '검색하지 못했어요. 잠시 뒤 다시 해 주세요.'; render({ focus: '#find' }); });
}
async function mergeOne(s, fresh) { // 검색으로 고른 가게가 이미 DB에 있으면 메뉴를 붙인다. 확인 못 하면 false (→ 새로 입력 못 하게)
  if (NO_DB) return false;
  try { const rows = await DB.storesByPlaceIds([s.id], fresh); applyRow(s, rows.get(s.id)); s.dbChecked = true; return true; } catch (e) { return false; }
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'filter') { ST.filter[t.name] = t.value; ST.pin = null; render({ focus: `input[name="${t.name}"][value="${t.value}"]` }); announce(`${ST.filter.part} ${ST.filter.type} ${ST.filter.origin}, 100g당 가격을 아는 가게 ${rankedCount()}곳`); }
  else if (t.dataset.act === 'cmpmenu') { ST.cmpPick[t.dataset.id] = Number(t.value); render({ focus: `[data-act="cmpmenu"][data-id="${esc(t.dataset.id)}"]` }); }
  else if (t.id === 'photo') {
    const file = t.files && t.files[0]; clearPhoto();
    const pp = file ? DB.photoProblem(file) : '';
    if (file && !pp) { ST.formPhoto = file; ST.formPhotoUrl = URL.createObjectURL(file); }
    ST.formMsg = pp ? { ok: false, text: pp } : null;
    render({ focus: '#photo' });
  }
  else if (t.dataset.mfield) {
    const i = Number(t.dataset.mi), M = ST.form.menus[i]; if (!M) return;
    M[t.dataset.mfield] = t.type === 'checkbox' ? t.checked : t.value.trim(); ST.formMsg = null; ST.dirty = true; updateCalc(i);
  }
  else if (t.dataset.act === 'basis') { ST.basis = t.value; render({ focus: `input[name="basis"][value="${t.value}"]` }); }
  else if (t.dataset.act === 'meat') { ST.cmpMeat = t.value; render({ focus: '#meat' }); }
  else if (t.dataset.field) {
    ST.form[t.dataset.field] = t.type === 'checkbox' ? t.checked : t.value.trim(); ST.formMsg = null; ST.dirty = true;
    if (t.dataset.field === 'area') ST.form.areaTouched = true;
    if (t.dataset.field === 'store' && !ST.form.areaTouched) { ST.form.area = guessArea(byId(t.value)); const a = document.getElementById('area'); if (a) a.value = ST.form.area; }
  }
});
let calcTimer = null;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'find') ST.findQ = t.value;
  if (t.id === 'email') ST.loginEmail = t.value;
  if (t.dataset.field && t.type !== 'checkbox' && t.tagName === 'INPUT') { ST.form[t.dataset.field] = t.value.trim(); ST.formMsg = null; ST.dirty = true; }
  if (t.dataset.mfield && t.type !== 'checkbox' && t.tagName === 'INPUT') {
    const i = Number(t.dataset.mi), M = ST.form.menus[i]; if (!M) return;
    M[t.dataset.mfield] = t.value.trim(); ST.formMsg = null; ST.dirty = true;
    clearTimeout(calcTimer); calcTimer = setTimeout(() => updateCalc(i), 400); // 입력이 멈춘 뒤 갱신 (낭독 과다 방지)
  }
});
function updateCalc(i) { // 입력 중에는 전체를 다시 그리지 않고 그 메뉴의 계산 줄과 칸별 오류만 바꾼다 (포커스 유지)
  const el = document.getElementById(`calc-${i}`), M = ST.form && ST.form.menus[i]; if (!el || !M) return;
  const c = checkMenu(M), cl = calcLine(c);
  el.className = cl.cls; el.textContent = cl.text;
  ['p100', 'w', 'price'].forEach(k => {
    const msg = showFieldErr() && c.fieldErr && c.fieldErr[k] ? c.fieldErr[k] : '';
    const inp = document.getElementById(`${k}-${i}`); if (inp) inp.setAttribute('aria-invalid', String(!!msg));
    const p = document.getElementById(`${k}-${i}-err`); if (p) p.textContent = msg;
  });
}
document.addEventListener('submit', async e => {
  const act = e.target.dataset.act;
  if (act !== 'save' && act !== 'signin') return;
  e.preventDefault();
  if (ST.busy) return; // 두 번 눌러도 한 번만
  if (act === 'signin') {
    const email = e.target.email.value.trim(), pw = e.target.password.value;
    ST.loginEmail = email;
    if (!email || !pw) { ST.loginMsg = '이메일과 비밀번호를 넣어 주세요.'; render({ focus: email ? '#pw' : '#email' }); return; }
    ST.busy = true;
    const btn = e.target.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = '로그인하는 중…'; } // 칸을 지우지 않게 다시 그리지 않는다
    try {
      await DB.signIn(email, pw); ST.authIn = true; ST.loginMsg = '';
      const F = ST.form, typed = F && (ST.dirty || F.edit || F.menus.some(m => m.name || m.p100 || m.w || m.price));
      if (!typed || ST.pendingStore) newForm(ST.pendingStore); // 쓰던 내용이 있으면 그대로 둔다
      ST.pendingStore = null; ST.formMsg = typed ? { ok: true, text: '다시 로그인했어요. 입력하던 내용은 그대로 있어요. 저장을 다시 눌러 주세요.' } : null;
      loadAdminStores();
    }
    catch (err) {
      const em = String((err && (err.code || '')) + ' ' + (err && err.message || ''));
      ST.loginMsg = /invalid|credentials/i.test(em) ? '이메일 또는 비밀번호가 맞지 않아요.'
        : /rate|too many|over_request/i.test(em) ? '로그인을 너무 많이 시도했어요. 잠시 뒤 다시 해 주세요.'
        : /not.?confirmed/i.test(em) ? '이메일 인증이 끝나지 않은 계정이에요. Supabase의 Authentication > Users에서 계정을 확인해 주세요.'
        : /fetch|network|failed/i.test(em) ? '로그인하지 못했어요. 인터넷 연결을 확인해 주세요.'
        : '로그인하지 못했어요. 잠시 뒤 다시 해 주세요.';
    }
    ST.busy = false;
    render({ focus: ST.authIn ? (ST.formMsg ? '#form-msg' : ST.form && ST.form.store ? '#mname-0' : '#find') : '#pw' }); // 실패하면 비밀번호 칸으로 (오류 문구는 칸에 연결됨)
    return;
  }
  let done;
  if (LIVE) { ST.busy = true; render(); done = await saveLive(); ST.busy = false; }
  else done = save();
  if (done) { go('map'); render({ focusMain: true }); toast(done); return; } // 저장 성공: 지도·목록으로 돌아가 한 번만 알린다
  const m = ST.formMsg;
  render({ focus: m && !m.ok && m.focus ? m.focus : '#form-msg' });
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
  document.addEventListener('pointercancel', () => { if (dragging && sheetEl) { sheetEl.style.height = ''; sheetEl.classList.remove('sheet--dragging'); } dragging = false; });
  document.addEventListener('pointerup', () => {
    if (!dragging) return; dragging = false;
    if (!moved) return; // 클릭으로 처리
    if (!sheetEl.isConnected) { render({ focus: '.sheet__handle' }); return; } // 끄는 도중 화면이 다시 그려짐
    const total = sheetEl.parentElement.getBoundingClientRect().height, r = sheetEl.getBoundingClientRect().height / total;
    ST.sheet = r < 0.3 ? 'peek' : r < 0.72 ? 'half' : 'full';
    sheetEl.style.height = ''; sheetEl.classList.remove('sheet--dragging');
    const suppress = ev => { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', suppress, true); };
    document.addEventListener('click', suppress, true); // 끌고 난 뒤의 클릭 한 번은 무시
    setTimeout(() => document.removeEventListener('click', suppress, true), 50); // 클릭이 안 생겨도 막기는 풀린다
    render({ focus: '.sheet__handle' });
  });
})();

// ---------- 즐겨찾기: 이 브라우저에만 저장 (D23, R17). 저장하는 건 카카오 장소 ID와 이름뿐 (D31) ----------
const FAV_KEY = 'googi-radar.favs.v1';
function saveFavs() {
  if (!LIVE) return;
  try {
    const o = {};
    Object.keys(ST.favs).filter(id => ST.favs[id]).forEach(id => { const s = byId(id); o[id] = { name: s ? String(s.name).slice(0, 100) : '' }; });
    localStorage.setItem(FAV_KEY, JSON.stringify(o));
  } catch (e) { /* 저장 못 해도 화면은 그대로 동작 */ }
}
function loadFavs() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(FAV_KEY) || '{}') || {}; } catch (e) { o = {}; }
  const ids = [];
  Object.keys(o).forEach(id => {
    if (!/^[0-9]{1,20}$/.test(id) || ids.length >= 200) return; // 모양이 이상한 값은 버린다
    const name = o[id] && typeof o[id].name === 'string' ? o[id].name.slice(0, 100) : '';
    ST.favs[id] = true; ids.push(id);
    if (!KNOWN.has(id)) KNOWN.set(id, { id, name: name || '이름 없는 가게', menus: [], gray: true, checked: null, memo: '', dist: null });
  });
  return ids;
}
const rankedCount = () => STORES.filter(s => !s.gray && bestMenu(s, ST.filter)).length;
function announce(text) { // 화면 읽기 프로그램에 짧게 알림 (화면을 다시 그려도 지워지지 않는 자리)
  const el = document.getElementById('announce'); if (!el) return;
  el.textContent = ''; setTimeout(() => { el.textContent = text; }, 60);
}

// ---------- 실제 지도 (묶음 2) ----------
function livePins() { // 화면을 다시 그린 뒤: 지도 요소를 새 자리에 붙이고 핀을 다시 만든다
  const host = document.getElementById('map-host');
  if (!host || !window.KMap || !KMap.ready()) return;
  KMap.mount(host);
  const f = ST.filter;
  KMap.setPins(STORES.filter(s => s.lat != null && s.lng != null).map(s => { const p = pinInfo(s, f); return { id: s.id, lat: s.lat, lng: s.lng, kind: p.kind, text: p.text, aria: p.aria, expanded: ST.pin === s.id }; }));
}
function applyRow(s, r) { // DB에 있는 가게면 메뉴·확인일을 붙이고, 없으면 "정보 없음"
  if (r) { s.menus = r.menus; s.gray = !r.menus.length; s.checked = r.checked; s.memo = r.memo; s.area = r.area; if (r.place_url) s.place_url = r.place_url; }
  else { s.menus = []; s.gray = true; s.checked = null; s.memo = ''; }
}
let dbSeq = 0;
async function mergeDb() {
  if (NO_DB) return;
  const my = ++dbSeq, asked = STORES.slice();
  try {
    const rows = await DB.storesByPlaceIds(asked.map(s => s.id));
    if (my !== dbSeq) return; // 그 사이 새 검색이나 저장된 가게 목록 읽기가 있었으면 버린다
    asked.forEach(s => { applyRow(s, rows.get(s.id)); s.dbChecked = true; }); // 물어본 가게에만 적용
    ST.dbError = false;
  } catch (e) {
    if (my !== dbSeq) return;
    ST.dbError = true;
    console.warn('가격 정보 읽기 실패:', e && e.message); // 키 값은 출력하지 않는다
  }
  if (ST.screen === 'map') bgRender();
}
async function savedOnly() { // 카카오가 안 될 때: 저장된 우리 가게만 목록으로 (좌표가 없으니 핀은 없음, D28-11)
  if (NO_DB) { if (ST.screen === 'map') bgRender(); return; }
  const my = ++dbSeq;
  try {
    const rows = await DB.allStores();
    if (my !== dbSeq) return;
    STORES = rows.map(r => { const s = KNOWN.get(r.kakaoId) || { id: r.kakaoId, name: r.name, dist: null }; applyRow(s, r); s.dbChecked = true; KNOWN.set(s.id, s); return s; });
    ST.dbError = false;
  } catch (e) { if (my !== dbSeq) return; ST.dbError = true; }
  if (ST.screen === 'map') bgRender();
}
function fromPlace(p) { // 카카오 장소 → 화면용 가게 (메모리만). 가격 정보는 mergeDb가 붙인다
  const s = KNOWN.get(p.id) || { id: p.id, name: p.place_name, place_url: p.place_url, menus: [], gray: true, checked: null, memo: '' };
  s.lat = Number(p.y); s.lng = Number(p.x);
  s.dist = Math.round(distM(ST.origin, s) / 10) * 10;
  KNOWN.set(s.id, s);
  return s;
}
const liveHandlers = {
  onSearchStart() { ST.searching = true; },
  onResults(places) {
    ST.searching = false;
    STORES = places.filter(isMeatPlace).map(fromPlace).sort((a, b) => a.dist - b.dist);
    if (ST.mapState === '로딩' || ST.mapState === '카카오 오류') ST.mapState = ST.locState || '정상';
    if (ST.pin && !STORES.some(s => s.id === ST.pin)) ST.pin = null;
    if (ST.screen === 'map') bgRender();
    mergeDb();
  },
  onError() { ST.searching = false; ST.mapState = '카카오 오류'; savedOnly(); },
  onIdle() { KMap.updatePinFocus(); },
  onPin(id) { ST.pin = ST.pin === id ? null : id; if (ST.pin && ST.sheet === 'peek') ST.sheet = 'half'; render({ focus: `[data-act="pin"][data-id="${esc(id)}"]` }); if (ST.pin && byId(ST.pin)) announce(`${byId(ST.pin).name} 정보를 목록 자리에 보여 줘요`); },
};
function locate(manual) { // R2: 허용 → 내 위치 / 거부·실패 → 주안역·구월동 고르기 / 지역 밖 → 준비 중 안내 (D26-16)
  if (!navigator.geolocation) { ST.locState = '위치 거부'; ST.mapState = '위치 거부'; render(); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (inService(me)) { ST.origin = me; ST.where = '내 위치 주변'; ST.locState = '정상'; if (ST.mapState === '위치 거부' || ST.mapState === '지역 밖') ST.mapState = '정상'; KMap.setCenter(me); if (manual) announce('내 위치 주변을 보여 줘요'); }
    else { ST.locState = '지역 밖'; ST.mapState = '지역 밖'; }
    if (ST.screen === 'map') bgRender();
  }, () => {
    ST.locState = '위치 거부'; ST.mapState = '위치 거부';
    if (ST.screen === 'map') bgRender();
  }, { timeout: 8000, maximumAge: 600000 });
}
function startLive() {
  if (!window.KMap) { ST.mapState = '카카오 오류'; savedOnly(); return; } // js/kakao.js를 못 불러온 경우
  ST.mapState = '로딩'; render();
  KMap.init(CONFIG.KAKAO_JS_KEY, AREAS.juan, liveHandlers).then(() => {
    render(); // 지도 요소를 붙인다 → idle 이벤트가 검색을 부른다
    setTimeout(() => { if (ST.mapState === '로딩' && !ST.searching) KMap.search(); }, 1500); // idle이 안 오는 경우만
    if (!ST.locAsked) { ST.locAsked = true; locate(); }
  }).catch(() => { ST.mapState = '카카오 오류'; savedOnly(); });
}
window.addEventListener('resize', () => { if (LIVE && window.KMap) { KMap.relayout(); KMap.updatePinFocus(); } });

const favIds = LIVE ? loadFavs() : [];
render();
if (LIVE) startLive();
if (LIVE && !NO_DB && favIds.length) DB.storesByPlaceIds(favIds).then(rows => favIds.forEach(id => { const s = byId(id), r = rows.get(id); if (s) { applyRow(s, r); s.dbChecked = true; } })).then(() => { ST.favErr = false; bgRender(); }).catch(() => { ST.favErr = true; bgRender(); });
if (LIVE && !NO_DB) { // 이전에 로그인해 둔 운영자 세션이 있으면 이어서 쓴다
  DB.session().then(s => { const was = ST.authIn; ST.authIn = !!s; if (ST.authIn && ST.screen === 'admin' && !ST.adminStores) loadAdminStores(); if (was !== ST.authIn && ST.screen === 'admin') bgRender(); }).catch(() => {});
  DB.onAuth(s => { const was = ST.authIn; ST.authIn = !!s; if (was !== ST.authIn && ST.screen === 'admin') bgRender(); });
}
