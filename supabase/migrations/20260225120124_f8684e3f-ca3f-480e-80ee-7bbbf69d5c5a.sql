-- Add explicit product tagging columns for HIV Test Kits and PrEP/PEP
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_hiv_test_kit BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_prep_pep BOOLEAN NOT NULL DEFAULT false;

-- Add explicit service tagging for labs
ALTER TABLE public.prep_pep_services ADD COLUMN IF NOT EXISTS is_tagged_prep BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.prep_pep_services ADD COLUMN IF NOT EXISTS is_tagged_pep BOOLEAN NOT NULL DEFAULT false;

-- Fix: Reset all pharmacies' self_test_available to false
-- Only pharmacies that actually have is_hiv_test_kit=true products should be marked
UPDATE public.profiles SET self_test_available = false WHERE role = 'retail';

-- Tag the one known HIV test kit product
UPDATE public.products SET is_hiv_test_kit = true WHERE LOWER(name) LIKE '%hiv%test%' OR LOWER(name) LIKE '%hiv%kit%' OR (LOWER(category) = 'test kits' AND LOWER(name) LIKE '%hiv%');

-- Now set self_test_available=true only for pharmacies that actually have tagged products
UPDATE public.profiles
SET self_test_available = true
WHERE id IN (
  SELECT DISTINCT user_id FROM public.products WHERE is_hiv_test_kit = true AND stock > 0
) AND role = 'retail';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_hiv_test_kit ON public.products (is_hiv_test_kit) WHERE is_hiv_test_kit = true;
CREATE INDEX IF NOT EXISTS idx_products_prep_pep ON public.products (is_prep_pep) WHERE is_prep_pep = true;