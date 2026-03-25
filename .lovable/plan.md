

## Problem Diagnosis

Two distinct issues found:

### Issue 1: "Permission denied for table profiles" (users cannot sign in)

The `profiles` table ACL shows `anon=awdDxtm` and `authenticated=awdDxtm` -- note the missing `r` (SELECT) privilege. Both roles can insert, update, delete, but **cannot read** from the profiles table. This was likely caused by a previous migration (`20250628070410-fix-directory-access.sql`) that disabled RLS and may have inadvertently revoked SELECT, or a manual change in Supabase dashboard.

Even though RLS policies exist (including `"Allow read access to profiles" USING (true)`), PostgreSQL requires **both** the table-level GRANT and the RLS policy to pass. Without `SELECT` granted, the RLS policy is irrelevant.

**Fix:** Run a migration that grants SELECT back:
```sql
GRANT SELECT ON public.profiles TO anon, authenticated;
```

### Issue 2: Admin account showing Pharmacy Dashboard

Frank (`frank@bepawaa.com`, profile role = `admin`) has **two active `staff_members` rows** linking him to pharmacy `407ef503` (owned by `frankjeremiah55@gmail.com`, role = `retail`):
- Staff record `b2fc0f29` with role `pos-only`
- Staff record `58dbbdf4` with role `admin`

When Frank logs in, `checkAndLinkStaffInvitation()` finds these active staff records and returns `StaffInfo` with `employerId = 407ef503`. Then `convertProfileToUser()` sets `user.id = staffInfo.employerId` (the pharmacy owner's ID), making Frank operate as the pharmacy. Additionally, `ensureStaffProfileRole()` overwrites Frank's profile role from `admin` to `retail`.

**Fix (two parts):**

1. **Database:** Deactivate Frank's staff_members records so the staff linking stops hijacking his admin account:
```sql
UPDATE staff_members SET is_active = false 
WHERE user_id = '370f38d5-909a-4a30-8b16-c4aba3c8649b';

-- Also restore his admin role (in case it was overwritten again)
UPDATE profiles SET role = 'admin' 
WHERE id = '370f38d5-909a-4a30-8b16-c4aba3c8649b';
```

2. **Code:** In `AuthContext.tsx`, skip staff linking for admin users so this cannot happen again. In `checkAndLinkStaffInvitation`, add an early return:
```typescript
const checkAndLinkStaffInvitation = async (userId: string, email: string): Promise<StaffInfo | null> => {
  // Never link admin accounts to staff — admin role takes priority
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (profileCheck?.role === 'admin') {
    return null;
  }
  // ... rest of existing logic
};
```

Also in `convertProfileToUser` and `ensureStaffProfileRole`: add a guard so admin profiles are never overwritten.

## Implementation Steps

1. **Migration: Grant SELECT on profiles** -- fixes sign-in for all users
2. **Data fix: Deactivate Frank's staff records and restore admin role** -- fixes admin dashboard immediately  
3. **Code fix in AuthContext.tsx** -- prevents admin accounts from being hijacked by staff linking in the future

## Technical Details

- The ACL string `awdDxtm` means: append (INSERT), write (UPDATE), delete (DELETE), truncate, references, trigger, maintain -- but no `r` (read/SELECT)
- The `get_current_user_role()` security-definer function bypasses RLS but still needs table-level SELECT grant to work from client queries
- Staff linking is designed to let pharmacy employees operate under their employer's context, but it should never apply to admin accounts

