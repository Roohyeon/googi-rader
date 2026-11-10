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
  async function storesByPlaceIds(ids) {
    if (!client) throw new Error('not-ready');
    const now = Date.now(), out = new Map(), need = [];
    ids.forEach(id => { const c = cache.get(id); if (c && now - c.at < TTL) { if (c.row) out.set(id, c.row); } else need.push(id); });
    for (let i = 0; i < need.length; i += 100) {
      const chunk = need.slice(i, i + 100);
      const { data, error } = await client.from('stores').select(STORE_COLS).in('kakao_place_id', chunk);
      if (error) throw error;
      const got = new Map(data.map(r => [r.kakao_place_id, toStore(r)]));
      chunk.forEach(id => { cache.set(id, { row: got.get(id) || null, at: now }); if (got.has(id)) out.set(id, got.get(id)); });
    }
    return out;
  }

  // 카카오가 안 될 때: 저장된 가게 전체 (좌표 없음 → 목록만, D28-11·D31)
  async function allStores() {
    if (!client) throw new Error('not-ready');
    const { data, error } = await client.from('stores').select(STORE_COLS).order('name').limit(500);
    if (error) throw error;
    return data.map(toStore);
  }

  return { init, ready, storesByPlaceIds, allStores };
})();
