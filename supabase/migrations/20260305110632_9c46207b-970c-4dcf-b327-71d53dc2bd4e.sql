
-- Dedupe email-based staff rows (where user_id IS NULL)
DELETE FROM public.staff_members
WHERE id NOT IN (
  SELECT DISTINCT ON (pharmacy_id, lower(email)) id
  FROM public.staff_members
  WHERE is_active = true AND user_id IS NULL
  ORDER BY pharmacy_id, lower(email), updated_at DESC
)
AND is_active = true 
AND user_id IS NULL;

-- Now create the email index
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_unique_active_email 
  ON public.staff_members (pharmacy_id, lower(email)) 
  WHERE is_active = true AND user_id IS NULL;
