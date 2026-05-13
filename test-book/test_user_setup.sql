-- 테스트 계정 생성을 위한 SQL
-- 이 SQL은 직접 Supabase SQL Editor에서 실행하거나, 아래 JS 로직으로 대체할 수 있습니다.
-- 여기서는 수동 생성을 위한 방법을 안내합니다:
-- Supabase Dashboard -> Authentication -> Users -> Add User 로 수동 생성하는 것이 가장 안전합니다.

-- 만약 SQL로 프로필 정보를 미리 넣고 싶다면 아래를 실행하세요.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com') THEN
        INSERT INTO public.profiles (id, nickname, points, accepted_answers)
        SELECT id, '테스트유저', 100, 5
        FROM auth.users 
        WHERE email = 'test@example.com'
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
