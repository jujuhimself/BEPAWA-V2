
Goal: deliver a permanent staff/permissions/data wiring fix by addressing root causes in identity mapping, route enforcement, DB policies, and mock/static dashboards.

1) Root-cause summary (from code + DB)
- Staff identity split is inconsistent: `user.id` is treated as org id in many places, but `orders.user_id` and `audit_logs.user_id` are FK/RLS-bound to `auth.uid()` (actor). This causes cart/add-order failures and audit insert failures.
- Route permission enforcement is partial:
  - `RouteGuard` uses exact-path map (misses many routes like `/audit`, subroutes, etc.).
  - `/analytics` is currently unguarded in `src/routes/AppRoutes.tsx`.
- POS attribution fix was applied in `EnhancedPOS`, but active routes use `RetailPos.tsx` / `WholesalePOS.tsx`, so staff name still resolves to owner/org id.
- “Staff excluded from pharmacy finder” is currently done by querying `staff_members` client-side, but RLS prevents individual users from seeing all staff rows, so exclusion fails.
- Staff duplicates exist in DB (`staff_members` has multiple active rows for same user/email), creating random permission outcomes.
- Business/analytics “zero” issues come from:
  - wrong role/org filters in some queries,
  - status mismatches (e.g. `delivered_and_paid` not counted),
  - wholesale business tools page still contains hardcoded metrics.

2) Permanent backend/data hardening (migrations)
- Add `profiles.is_staff_account boolean default false not null`.
- Backfill `is_staff_account=true` for all `profiles.id` present in active `staff_members.user_id`.
- Update `handle_new_user` + staff-link updates to always maintain `is_staff_account=true` for staff.
- Add dedupe + guardrails for staff rows:
  - cleanup migration keeping latest active row per `(pharmacy_id, lower(email))` and per `(pharmacy_id, user_id)`.
  - unique partial indexes to prevent duplicate active assignments.
- (Optional but recommended) add `pos_sales.sold_by_user_id uuid` for true staff attribution without overloading org `user_id`; backfill where possible.
- Update RLS only where required (minimal):
  - keep `orders/audit_logs user_id = auth.uid()` model,
  - allow org-scoped reads via existing org columns (`pharmacy_id`, `wholesaler_id`, `retailer_id`) without weakening auth checks.

3) Identity model standardization in app code
- Keep:
  - `user.authUserId` = actor id (always auth user)
  - `user.id` = organization id for staff, own id for non-staff
- Enforce rule:
  - Any table with `user_id` tied to auth/RLS/FK uses `authUserId`.
  - Organization scoping uses `pharmacy_id/wholesaler_id/profile_id` (not `user_id`).
- Apply to:
  - `PublicCatalog.tsx`, `Cart.tsx`, `orderService.ts`, `auditService.ts`, POS pages, and any order/cart insert/update path.

4) Staff permissions: full enforcement
- Replace exact-path map in `RouteGuard.tsx` with robust matching (prefix/segment-based or central route metadata).
- Create a single permission matrix keyed by route patterns and use it in both:
  - `RouteGuard` (hard enforcement),
  - `navigationConfig` (UI visibility).
- Guard unprotected routes (notably `/analytics`) in `AppRoutes.tsx`.
- Ensure staff with empty permissions cannot access protected modules even via direct URL.

5) POS attribution fix (actual active components)
- Update `src/pages/retail/RetailPos.tsx` and `src/pages/wholesale/WholesalePOS.tsx`:
  - write actor attribution from `authUserId` (or `sold_by_user_id` if added),
  - display staff name from actor profile, not org owner profile.
- Keep org-level sales aggregation for business reporting via org columns.

6) Pharmacy finder permanent fix
- Stop relying on client-side `staff_members` reads for exclusion.
- Query only profiles that are true pharmacies:
  - `role='retail'`, `is_approved=true`, non-empty `pharmacy_name`, and `is_staff_account=false`.
- Update `PharmacyFinder.tsx` to use this rule only (no staff-members fetch required).

7) Business Center / Ops Hub / Analytics completion
- `BusinessCenter.tsx`: normalize revenue/expense logic by role and status list (`completed`, `paid`, `delivered`, `delivered_and_paid`, etc.).
- `AnalyticsDashboard.tsx`: include correct org filters and valid statuses; avoid user-id-only assumptions for org views.
- `WholesaleBusinessTools.tsx`: replace hardcoded overview cards and static lists with live queries (or reuse `AnalyticsDashboard` + `FinancialManagement` components with real hooks).

8) Inventory “lag / not refreshing” fixes
- `useProducts` query key should include identity (`user?.id`, `user?.authUserId`, role), not just role.
- Reduce over-aggressive stale cache and add targeted invalidations after create/update/delete.
- Add realtime subscription (products/inventory movements) to update UI without manual refresh.

9) Verification checklist (must pass before closing)
- Staff invite -> login -> role/link/permissions correct on first session.
- Staff can access only assigned modules; direct URL blocked for disallowed routes.
- Staff cannot appear in Individual Find Pharmacy.
- Staff cart/order works (no FK/RLS error), audit logs insert succeeds.
- POS receipt/history shows actual staff identity, not owner.
- Business Center / Operations Hub / Analytics show non-mock live data.
- Product add/edit and inventory updates reflect immediately without full page refresh.
