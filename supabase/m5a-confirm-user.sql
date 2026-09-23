-- M5A Test User Confirmation
-- 
-- Run this SQL in Supabase Dashboard > SQL Editor to confirm the test user email.
-- 
-- User details:
--   Email: m5a.test.family@gmail.com
--   User ID: 362d1b13-2d1e-490a-b8c9-3d0000243fb4
--
-- After running this, the test user will be able to authenticate.

UPDATE auth.users 
SET email_confirmed_at = now(),
    confirmed_at = now(),
    confirmation_token = null,
    confirmation_sent_at = null
WHERE email = 'm5a.test.family@gmail.com';

-- Verify the update
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'm5a.test.family@gmail.com';
