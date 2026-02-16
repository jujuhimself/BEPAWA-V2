
-- Fix the handle_new_user trigger to RELIABLY link staff invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  staff_record RECORD;
  employer_role public.user_role;
  final_role public.user_role;
BEGIN
  RAISE LOG 'handle_new_user: Creating profile for user: %, email: %, role hint: %', NEW.id, NEW.email, NEW.raw_user_meta_data->>'role';

  -- Check if this email has a pending staff invitation (user_id IS NULL means not yet linked)
  SELECT sm.id as staff_id, sm.pharmacy_id, sm.role as staff_role, sm.email as staff_email, p.role as employer_role
  INTO staff_record
  FROM public.staff_members sm
  JOIN public.profiles p ON p.id = sm.pharmacy_id
  WHERE LOWER(sm.email) = LOWER(NEW.email)
    AND sm.user_id IS NULL
    AND sm.is_active = true
  ORDER BY sm.created_at DESC
  LIMIT 1;

  IF staff_record IS NOT NULL THEN
    -- Staff invitation found: use employer's role so dashboard routing works
    final_role := staff_record.employer_role;
    
    -- Link the staff member to this new user immediately
    UPDATE public.staff_members
    SET user_id = NEW.id, is_active = true, updated_at = now()
    WHERE id = staff_record.staff_id;
    
    RAISE LOG 'handle_new_user: Staff invitation LINKED for user %, staff_id %, employer %, role: %', NEW.id, staff_record.staff_id, staff_record.pharmacy_id, final_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'staff' THEN
    -- User selected 'staff' role but no invitation found - check by email again without is_active filter
    SELECT sm.id as staff_id, sm.pharmacy_id, sm.role as staff_role, p.role as employer_role
    INTO staff_record
    FROM public.staff_members sm
    JOIN public.profiles p ON p.id = sm.pharmacy_id
    WHERE LOWER(sm.email) = LOWER(NEW.email)
      AND sm.user_id IS NULL
    ORDER BY sm.created_at DESC
    LIMIT 1;
    
    IF staff_record IS NOT NULL THEN
      final_role := staff_record.employer_role;
      UPDATE public.staff_members
      SET user_id = NEW.id, is_active = true, updated_at = now()
      WHERE id = staff_record.staff_id;
      RAISE LOG 'handle_new_user: Staff invitation LINKED (inactive) for user %, role: %', NEW.id, final_role;
    ELSE
      -- No invitation at all, default to individual
      final_role := 'individual'::public.user_role;
      RAISE LOG 'handle_new_user: No staff invitation found for %, defaulting to individual', NEW.email;
    END IF;
  ELSE
    -- Normal registration
    final_role := CASE 
      WHEN NEW.raw_user_meta_data->>'role' IS NULL THEN 'individual'::public.user_role
      ELSE CAST(NEW.raw_user_meta_data->>'role' AS public.user_role)
    END;
  END IF;

  INSERT INTO public.profiles (
    id, email, name, role, phone, address,
    date_of_birth, emergency_contact,
    pharmacy_name, license_number, pharmacist_name,
    business_name, business_license, tax_id,
    lab_name, lab_license, specializations, operating_hours,
    is_approved
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    final_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    CASE WHEN NEW.raw_user_meta_data->>'dateOfBirth' IS NOT NULL 
         THEN CAST(NEW.raw_user_meta_data->>'dateOfBirth' AS DATE) 
         ELSE NULL END,
    NEW.raw_user_meta_data->>'emergencyContact',
    NEW.raw_user_meta_data->>'pharmacyName',
    NEW.raw_user_meta_data->>'licenseNumber',
    NEW.raw_user_meta_data->>'pharmacistName',
    NEW.raw_user_meta_data->>'businessName',
    NEW.raw_user_meta_data->>'businessLicense',
    NEW.raw_user_meta_data->>'taxId',
    NEW.raw_user_meta_data->>'labName',
    NEW.raw_user_meta_data->>'labLicense',
    CASE WHEN NEW.raw_user_meta_data->>'specializations' IS NOT NULL 
         THEN string_to_array(NEW.raw_user_meta_data->>'specializations', ',') 
         ELSE NULL END,
    NEW.raw_user_meta_data->>'operatingHours',
    -- Staff are always auto-approved, individuals too
    CASE 
      WHEN staff_record IS NOT NULL THEN TRUE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'individual') = 'individual' THEN TRUE
      ELSE FALSE 
    END
  );

  RAISE LOG 'handle_new_user: Profile created for user: %, role: %', NEW.id, final_role;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error for user %: % - SQLSTATE: %', NEW.id, SQLERRM, SQLSTATE;
    RAISE;
END;
$function$;

-- NOW FIX EXISTING BROKEN RECORDS:
-- 1. Link hautlive@gmail.com staff record
UPDATE public.staff_members 
SET user_id = '6ee63d8e-8f6a-409a-ad9f-d8f79b768f25', is_active = true, updated_at = now()
WHERE id = 'bdde6304-1620-4792-b4a4-ea0e8e384d90' AND user_id IS NULL;

-- 2. Fix hautlive@gmail.com profile role to match employer (retail)
UPDATE public.profiles 
SET role = 'retail', is_approved = true
WHERE id = '6ee63d8e-8f6a-409a-ad9f-d8f79b768f25' AND role = 'individual';

-- 3. Fix ALL staff members whose profiles are still 'individual'
UPDATE public.profiles p
SET role = employer.role, is_approved = true
FROM public.staff_members sm
JOIN public.profiles employer ON employer.id = sm.pharmacy_id
WHERE sm.user_id = p.id
  AND sm.is_active = true
  AND p.role = 'individual';
