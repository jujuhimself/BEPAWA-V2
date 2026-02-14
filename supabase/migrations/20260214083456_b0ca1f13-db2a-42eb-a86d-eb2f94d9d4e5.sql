-- Fix existing staff members that registered but weren't linked by the trigger
-- Link staff_members to their user accounts by matching email
UPDATE public.staff_members sm
SET user_id = p.id, updated_at = now()
FROM public.profiles p
WHERE LOWER(sm.email) = LOWER(p.email)
  AND sm.user_id IS NULL;

-- Fix profile roles for staff users who got 'individual' instead of employer's role
UPDATE public.profiles p
SET role = employer.role, is_approved = true
FROM public.staff_members sm
JOIN public.profiles employer ON employer.id = sm.pharmacy_id
WHERE sm.user_id = p.id
  AND sm.is_active = true
  AND p.role = 'individual';