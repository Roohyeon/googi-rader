/* 고기 레이더 — 계산 규칙 (순수 함수). 브라우저(window.Calc)와 Node 테스트(require) 양쪽에서 쓴다.
   근거: planning/googi-radar/03-spec.md R3, R4, R7, R10, D17, D20, D21, D24, D26-9·10·12·17, D28-1·2·7 */
(function (root) {
  'use strict';

  const PARTS = ['삼겹살', '목살'];
  const TYPES = ['생고기', '냉동', '대패'];
  const ORIGINS = ['국내산', '수입'];

  const fmt = n => Math.round(n).toLocaleString('ko-KR');
  const won = n => fmt(n) + '원';
  const won10 = n => (Math.round(n / 10) * 10).toLocaleString('ko-KR') + '원'; // 이득 문구는 10원 단위 (D26-12)
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // R3: 100g당 가격(반올림 전 값). 중량 미표기면 null.
  // 1인분 중량·가격이 있으면 계산값. 메뉴판 100g당 표기가 계산값과 10원 이상 다르면 계산값을 쓰고 mismatch 표시(D26-10, 기획 열린 질문 Q2 임시 규칙)
  function unit(m) {
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

  // D24: 가게 단위 순위. 조건(부위·종류·원산지)에 맞는 메뉴 중 100g당 최저가
  function bestMenu(s, f) {
    let best = null;
    (s.menus || []).filter(m => matches(m, f)).forEach(m => { const u = unit(m); if (u && (!best || u.v < best.u.v)) best = { m, u }; });
    return best;
  }
  const noWeight = (s, f) => (s.menus || []).filter(m => matches(m, f) && !unit(m));

  // R10: 오늘(한국 시간) > 확인일 + 6개월이면 오래된 정보. 6개월 뒤 같은 날이 없으면 그 달 말일
  function kstDate(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
  function addMonthsClamp(ymd, n) {
    let [y, m, d] = ymd.split('-').map(Number);
    m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12) + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
  }
  const isStale = (checked, today) => kstDate(today) > addMonthsClamp(checked, 6);

  // D22, D28-1, D28-2: 핀 종류. 가격 있는 핀만 흰 꼬리표, 나머지는 점선(가격 없음)
  function pinInfo(s, f) {
    if (s.gray) return { kind: 'none', text: '정보 없음', aria: `${s.name}, 정보 없음` };
    const b = bestMenu(s, f);
    if (b) return { kind: 'price', text: fmt(b.u.v), aria: `${s.name}, 100g당 ${won(b.u.v)}` };
    const ranked = (s.menus || []).some(m => PARTS.includes(m.part) && TYPES.includes(m.type) && unit(m));
    if (ranked) return { kind: 'none', text: '필터 밖', aria: `${s.name}, 필터 밖: 이 필터에 맞는 메뉴가 없어요` };
    const onlyNoWeight = (s.menus || []).length > 0 && s.menus.every(m => !unit(m));
    const t = onlyNoWeight ? '중량 미표기' : '다른 메뉴만';
    return { kind: 'none', text: t, aria: `${s.name}, ${t}` };
  }

  // R7, D18, D26-5, D26-17, D28-7, D31: 동네 시세 = 비교 가게들 중심 반경 1km 안, 같은 고기, 가게당 최저가의 중간값(5곳 이상)
  // sel: 비교 가게들, cands: 후보 가게들(D31: 지금 지도 검색에 잡힌 가게), dist(a,b): 두 가게 사이 거리(m), center(sel): 중심점
  function dongSise(sel, cands, f, dist, center) {
    if (!sel.length) return null;
    for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) if (dist(sel[i], sel[j]) > 2000) return null;
    const c = center(sel);
    const vals = cands.filter(s => dist(s, c) <= 1000).map(s => bestMenu(s, f)).filter(Boolean).map(b => b.u.v).sort((a, b) => a - b);
    if (vals.length < 5) return null;
    const n = vals.length;
    return n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
  }

  // D20: 100g당 가격 차이율 = (비싼 쪽 − 싼 쪽) ÷ 비싼 쪽. 3% 이상이면 싼 쪽 "추천", 미만이면 "거의 같아요"
  const gapRatio = (a, b) => (Math.max(a, b) - Math.min(a, b)) / Math.max(a, b);
  const isRecommend = (a, b) => gapRatio(a, b) >= 0.03;

  function josa(word, pair) { const c = word.charCodeAt(word.length - 1) - 0xAC00; return word + (c >= 0 && c <= 11171 && c % 28 !== 0 ? pair[0] : pair[1]); }

  // D21, D26-12: 늘어난 그램의 가치는 상대 가게 100g당 가격으로 계산. a, b = { s: {name}, m: {w, price}, u: {v} }
  function gainText(a, b) {
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

  const api = { PARTS, TYPES, ORIGINS, fmt, won, won10, esc, unit, meatKey, matches, bestMenu, noWeight, kstDate, addMonthsClamp, isStale, pinInfo, dongSise, gapRatio, isRecommend, josa, gainText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof window !== 'undefined' ? window : globalThis);
