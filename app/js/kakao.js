'use strict';
/* 카카오 지도 연결 (dev 묶음 2)
   - 키: window.APP_CONFIG.KAKAO_JS_KEY (공개용 JavaScript 키. 등록한 도메인에서만 동작)
   - 검색 결과는 메모리에만 둔다 (D31: 좌표·주소·카테고리 저장 금지)
   - 임시 규칙(Q-N7, Q-N11): 키워드 5개 × FD6(음식점) × 지금 지도 영역, 키워드마다 최대 2쪽(30곳),
     카테고리에 "육류,고기"가 있는 곳만 고기집으로 본다. 지도 이동이 멈추고 0.5초 뒤 검색 */
window.KMap = (function () {
  const KEYWORDS = ['고기', '삼겹살', '고깃집', '목살', '돼지고기'];
  const MAX_PAGES = 2;
  let sdkPromise = null, map = null, el = null, overlays = [], idleTimer = null, seq = 0, handlers = {};

  function loadSdk(key) {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key) + '&libraries=services&autoload=false';
      const timer = setTimeout(() => reject(new Error('timeout')), 10000);
      s.onerror = () => { clearTimeout(timer); reject(new Error('sdk-load')); };
      s.onload = () => {
        if (!window.kakao || !window.kakao.maps) { clearTimeout(timer); reject(new Error('sdk-missing')); return; }
        window.kakao.maps.load(() => { clearTimeout(timer); resolve(); });
      };
      document.head.appendChild(s);
    }).catch(e => { sdkPromise = null; throw e; }); // 실패하면 다음에 다시 시도할 수 있게
    return sdkPromise;
  }

  // 지도를 처음 만든다. h: { onIdle(), onResults(places), onError(kind), onPin(id) }
  function init(key, center, h) {
    handlers = h;
    return loadSdk(key).then(() => {
      if (map) return;
      el = document.createElement('div');
      el.id = 'kmap';
      el.className = 'kmap';
      const k = window.kakao.maps;
      map = new k.Map(el, { center: new k.LatLng(center.lat, center.lng), level: 4 });
      k.event.addListener(map, 'idle', () => {
        handlers.onIdle && handlers.onIdle();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(search, 500);
      });
    });
  }
  const ready = () => !!map;

  // 화면을 다시 그릴 때마다 같은 지도 요소를 새 자리로 옮긴다 (지도를 새로 만들지 않음)
  function mount(host) {
    if (!map || !host) return;
    if (el.parentNode !== host) {
      const c = map.getCenter();
      host.appendChild(el);
      map.relayout();
      map.setCenter(c);
    }
  }
  function relayout() { if (map) map.relayout(); }
  function setCenter(p) { if (map) map.setCenter(new window.kakao.maps.LatLng(p.lat, p.lng)); }
  function getCenter() { if (!map) return null; const c = map.getCenter(); return { lat: c.getLat(), lng: c.getLng() }; }

  function search() {
    if (!map) return;
    const k = window.kakao.maps, S = k.services.Status, ps = new k.services.Places();
    const my = ++seq, bounds = map.getBounds(), found = new Map();
    let pending = KEYWORDS.length, errors = 0;
    handlers.onSearchStart && handlers.onSearchStart();
    KEYWORDS.forEach(q => {
      ps.keywordSearch(q, (data, status, pg) => {
        if (my !== seq) return; // 더 새 검색이 시작됐으면 버린다
        if (status === S.OK) data.forEach(p => found.set(p.id, p));
        else if (status === S.ERROR) errors++;
        if (status === S.OK && pg && pg.hasNextPage && pg.current < MAX_PAGES) { pg.nextPage(); return; }
        if (--pending === 0) {
          if (errors === KEYWORDS.length) handlers.onError && handlers.onError('search');
          else handlers.onResults && handlers.onResults([...found.values()]);
        }
      }, { bounds, category_group_code: 'FD6' });
    });
  }

  // 핀 = 커스텀 오버레이 안의 버튼. items: [{ id, lat, lng, kind, text, aria, expanded }]
  function setPins(items) {
    if (!map) return;
    const k = window.kakao.maps;
    overlays.forEach(o => o.ov.setMap(null));
    overlays = items.map(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin pin--' + it.kind;
      b.dataset.act = 'pin'; b.dataset.id = it.id; b.dataset.from = 'map';
      b.setAttribute('aria-label', it.aria);
      b.setAttribute('aria-expanded', String(!!it.expanded));
      if (it.expanded) b.setAttribute('aria-controls', 'sheet');
      b.textContent = it.text;
      b.addEventListener('click', e => { e.stopPropagation(); handlers.onPin && handlers.onPin(it.id); });
      const pos = new k.LatLng(it.lat, it.lng);
      const ov = new k.CustomOverlay({ position: pos, content: b, xAnchor: 0, yAnchor: 0, clickable: true, zIndex: it.expanded ? 3 : 1 });
      ov.setMap(map);
      return { ov, b, pos };
    });
    updatePinFocus();
  }

  // 필터 줄 아래 ~ 목록 시트 위 사이에 보이는 핀만 키보드로 갈 수 있게 한다 (디자인 보류 접근성 1)
  function updatePinFocus() {
    if (!map || !el.isConnected) return;
    const proj = map.getProjection(), mr = el.getBoundingClientRect();
    const bar = document.querySelector('.filterbar'), sheet = document.getElementById('sheet');
    const top = bar ? bar.getBoundingClientRect().bottom - mr.top : 0;
    const bottom = sheet ? sheet.getBoundingClientRect().top - mr.top : mr.height;
    overlays.forEach(({ b, pos }) => {
      const p = proj.containerPointFromCoords(pos);
      const shown = p.y <= bottom && p.y - 38 >= top && p.x >= 0 && p.x <= mr.width;
      b.tabIndex = shown ? 0 : -1;
      if (shown) b.removeAttribute('aria-hidden'); else b.setAttribute('aria-hidden', 'true');
    });
  }

  return { init, ready, mount, relayout, setCenter, getCenter, search, setPins, updatePinFocus };
})();
