-- Fix Issue 1: Grant SELECT on profiles table (was revoked, causing "permission denied" errors)
GRANT SELECT ON public.profiles TO anon, authenticated;
