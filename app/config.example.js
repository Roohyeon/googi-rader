// 고기 레이더 — API 키 넣는 곳 (예시)
// 1) 이 파일을 같은 폴더에 config.js 라는 이름으로 복사하세요.
// 2) config.js 의 빈칸('')에 키를 넣으세요. config.js 는 .gitignore 에 있어서 git 에 올라가지 않습니다.
// 3) 여기에는 "공개용 키"만 넣습니다. 브라우저에 그대로 보이는 키라서, 도메인 등록(카카오)과
//    DB 접근 규칙(Supabase RLS)으로 지킵니다. Supabase service_role 키 같은 "비밀 키"는 절대 넣지 마세요.
window.APP_CONFIG = {
  // 카카오 개발자(developers.kakao.com) > 내 애플리케이션 > 앱 선택 > 앱 키 > "JavaScript 키"
  KAKAO_JS_KEY: '',

  // Supabase(supabase.com) > 프로젝트 > Project Settings > API > "Project URL"
  SUPABASE_URL: '',

  // Supabase > 프로젝트 > Project Settings > API > Project API keys > "anon public" (service_role 아님!)
  SUPABASE_ANON_KEY: '',
};
