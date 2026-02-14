
-- Add user_id column to staff_members so we can link registered users
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON public.staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON public.staff_members(email);

-- Update RLS policies to allow staff to read their own record
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff_members;
CREATE POLICY "Staff can view own record"
  ON public.staff_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow pharmacy/wholesaler owners to manage their staff (they created them)
DROP POLICY IF EXISTS "Owners manage their staff" ON public.staff_members;
CREATE POLICY "Owners manage their staff"
  ON public.staff_members
  FOR ALL
  USING (pharmacy_id = auth.uid())
  WITH CHECK (pharmacy_id = auth.uid());

-- Allow the system to update staff_members when linking user_id during registration
DROP POLICY IF EXISTS "Users can link themselves to staff invitation" ON public.staff_members;
CREATE POLICY "Users can link themselves to staff invitation"
  ON public.staff_members
  FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Update the handle_new_user trigger to detect staff invitations and assign correct role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  staff_record RECORD;
  employer_role public.user_role;
  final_role public.user_role;
BEGIN
  RAISE LOG 'Creating profile for user: %, role: %', NEW.id, NEW.raw_user_meta_data->>'role';

  -- Check if this email has a pending staff invitation
  SELECT sm.*, p.role as employer_role
  INTO staff_record
  FROM public.staff_members sm
  JOIN public.profiles p ON p.id = sm.pharmacy_id
  WHERE sm.email = LOWER(NEW.email)
    AND sm.user_id IS NULL
  LIMIT 1;

  IF staff_record IS NOT NULL THEN
    -- Staff invitation found: use employer's role so routing works
    final_role := staff_record.employer_role;
    
    -- Link the staff member to this new user
    UPDATE public.staff_members
    SET user_id = NEW.id, updated_at = now()
    WHERE id = staff_record.id;
    
    RAISE LOG 'Staff invitation found for user %, linked to employer %, role: %', NEW.id, staff_record.pharmacy_id, final_role;
  ELSE
    -- Normal registration
    final_role := CASE 
      WHEN NEW.raw_user_meta_data->>'role' IS NULL THEN 'individual'::public.user_role
      WHEN NEW.raw_user_meta_data->>'role' = 'staff' THEN 'individual'::public.user_role
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
    -- Staff are auto-approved, individuals too, others need approval
    CASE 
      WHEN staff_record IS NOT NULL THEN TRUE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'individual') = 'individual' THEN TRUE
      ELSE FALSE 
    END
  );

  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: % - SQLSTATE: %', NEW.id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;
