'use strict';
/* Supabase 연결 (dev 묶음 3: 읽기)
   - 라이브러리: vendor/supabase-js-2.118.0.js (버전 고정, 저장소에 함께 둠 → 외부 CDN이 바뀌어도 영향 없음)
   - 키: APP_CONFIG.SUPABASE_URL, SUPABASE_ANON_KEY(= Publishable key). 공개용 키다. 실제 보호는 DB의 RLS 규칙
   - 비밀 키(sb_secret_, service_role)는 여기서 절대 쓰지 않는다. 혹시 들어오면 연결하지 않는다 */
window.DB = (function () {
  let client = null;
  const cache = new Map(); // kakao_place_id → { row, at } (5분)
  const TTL = 5 * 60 * 1000;
  const STORE_COLS = 'id,kakao_place_id,name,place_url,area,checked_at,memo,menus(id,name,part,kind,aged,origin,price_per_100g,weight_g,price)';

  function init(url, key) {
    const k = String(key || '');
    if (/^sb_secret_/.test(k) || /service_role/.test(atobSafe(k.split('.')[1] || ''))) {
      throw new Error('secret-key'); // 비밀 키로는 절대 연결하지 않는다
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(String(url || ''))) throw new Error('bad-url');
    if (!window.supabase || !window.supabase.createClient) throw new Error('lib-missing');
    client = window.supabase.createClient(url, k, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  }
  function atobSafe(s) { try { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); } catch (e) { return ''; } }
  const ready = () => !!client;

  // DB 행 → 화면용 가게 모양
  function toStore(r) {
    return {
      kakaoId: r.kakao_place_id, name: r.name, place_url: r.place_url, area: r.area,
      checked: r.checked_at, memo: r.memo || '',
      menus: (r.menus || []).map(m => ({ id: m.id, name: m.name, part: m.part, type: m.kind, aged: !!m.aged, origin: m.origin, p100: m.price_per_100g, w: m.weight_g, price: m.price })),
    };
  }

  // 지금 지도에 보이는 가게들 중 우리가 확인한 가게만 가져온다
  async function storesByPlaceIds(ids, fresh) { // fresh: 캐시를 건너뛰고 DB에서 새로 읽는다 (수정 화면 열 때)
    if (!client) throw new Error('not-ready');
    if (fresh) ids.forEach(id => cache.delete(id));
    const now = Date.now(), out = new Map(), need = [];
    ids.forEach(id => { const c = cache.get(id); if (c && now - c.at < TTL) { if (c.row) out.set(id, c.row); } else need.push(id); });
    for (let i = 0; i < need.length; i += 100) {
      const chunk = need.slice(i, i + 100);
      const { data, error } = await client.from('stores').select(STORE_COLS).in('kakao_place_id', chunk).order('name', { referencedTable: 'menus' }).order('id', { referencedTable: 'menus' });
      if (error) throw error;
      const got = new Map(data.map(r => [r.kakao_place_id, toStore(r)]));
      chunk.forEach(id => { cache.set(id, { row: got.get(id) || null, at: now }); if (got.has(id)) out.set(id, got.get(id)); });
    }
    return out;
  }

  // 카카오가 안 될 때: 저장된 가게 전체 (좌표 없음 → 목록만, D28-11·D31)
  async function allStores() {
    if (!client) throw new Error('not-ready');
    const { data, error } = await client.from('stores').select(STORE_COLS).order('name').order('name', { referencedTable: 'menus' }).order('id', { referencedTable: 'menus' }).limit(500);
    if (error) throw error;
    return data.map(toStore);
  }

  // ---------- 운영자 (묶음 4) ----------
  // 로그인 정보(세션)는 supabase-js가 이 브라우저에만 보관한다. 남의 기기에서는 꼭 로그아웃
  async function session() { if (!client) return null; const { data } = await client.auth.getSession(); return data.session || null; }
  function onAuth(fn) { if (client) client.auth.onAuthStateChange((_ev, s) => fn(s || null)); }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }
  async function signOut() { if (client) await client.auth.signOut(); }

  const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const PHOTO_MAX = 5 * 1024 * 1024; // DB 저장소 설정과 같은 5MB
  function photoProblem(file) {
    if (!file) return '';
    if (!PHOTO_TYPES[file.type]) return '사진은 jpg, png, webp 파일만 올릴 수 있어요.';
    if (file.size > PHOTO_MAX) return '사진은 5MB 이하만 올릴 수 있어요.';
    return '';
  }

  // 저장은 DB 함수 save_store_menus 하나로 한 번에 처리한다 (06-safe-save.sql). 하나라도 실패하면 아무것도 저장되지 않는다.
  // 실제로 막는 것은 DB 규칙(RLS): 운영자 계정이 아니면 여기서 오류가 난다.
  const menuFields = menu => ({ id: menu.id || null, name: menu.name, part: menu.part, kind: menu.type, aged: !!menu.aged, origin: menu.origin, price_per_100g: menu.p100, weight_g: menu.w, price: menu.price });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  async function saveStoreMenus(mode, store, menus, removedIds, file) {
    if (!client) throw new Error('not-ready');
    if (!/^[0-9]{1,20}$/.test(store.kakaoId)) throw new Error('bad-place');      // 쓰기 전에 먼저 검사
    if (!menus.length || menus.length > 20) throw new Error('bad-menus');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(store.checked || ''))) throw new Error('bad-date');
    const payload = {
      p_mode: mode,
      p_store: { kakao_place_id: store.kakaoId, name: String(store.name).slice(0, 100), place_url: 'https://place.map.kakao.com/' + store.kakaoId, area: store.area, checked_at: store.checked, memo: store.memo || '' },
      p_menus: menus.map(m => { const f = menuFields(m); if (mode === 'new' || !UUID.test(String(f.id || ''))) f.id = null; return f; }),
      p_removed: mode === 'edit' ? (removedIds || []).filter(id => UUID.test(id)) : [],
    };
    const { data: storeId, error } = await client.rpc('save_store_menus', payload);
    cache.delete(store.kakaoId);
    if (error) throw error;
    const photoFailed = await uploadPhoto(storeId, store.kakaoId, file);
    return { photoFailed };
  }
  const saveMenus = (store, menus, file) => saveStoreMenus('new', store, menus, [], file);
  const updateMenus = (store, menus, removedIds, file) => saveStoreMenus('edit', store, menus, removedIds, file);
  async function uploadPhoto(storeId, kakaoId, file) { // 실패해도 메뉴 저장은 그대로 둔다 → true를 돌려 알린다
    if (!file) return false;
    const path = `${kakaoId}/${Date.now()}.${PHOTO_TYPES[file.type]}`;
    const { error: e3 } = await client.storage.from('menu-photos').upload(path, file, { contentType: file.type, upsert: false });
    if (e3) return true;
    const { error: e4 } = await client.from('stores').update({ photo_path: path }).eq('id', storeId);
    return !!e4;
  }

  // 운영자에게만: 저장된 메뉴판 사진을 10분 동안만 열리는 주소로 받는다 (경로는 운영자 전용 함수로만 읽힘)
  async function photoUrl(kakaoId) {
    if (!client) throw new Error('not-ready');
    const { data: path, error } = await client.rpc('menu_photo_path', { p_kakao_id: kakaoId });
    if (error) throw error;
    if (!path) return null;
    const { data: s, error: e2 } = await client.storage.from('menu-photos').createSignedUrl(path, 600);
    if (e2) throw e2;
    return s.signedUrl;
  }

  return { init, ready, storesByPlaceIds, allStores, session, onAuth, signIn, signOut, photoProblem, saveMenus, updateMenus, photoUrl };
})();
