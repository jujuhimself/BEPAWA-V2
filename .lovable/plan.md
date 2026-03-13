
Goal: restore production-safe, accurate pharmacy business data without breaking existing services, and permanently stop staff accounts from appearing as pharmacies.

What I verified (root causes)
1) Staff still appears in Find Pharmacies because /pharmacy-directory uses src/pages/PharmacyDirectory.tsx, not PharmacyFinder.tsx.  
   - PharmacyDirectory currently queries profiles where role='retail' only, with no staff exclusion.
2) Low stock + expiring are mixed across pharmacies because inventoryService.getLowStockProducts/getExpiringProducts query all products with no org filter.
3) Business analytics showing 0 is a combination of:
   - Frontend queries that rely on provider fields (pharmacy_id/wholesaler_id) while many orders don’t consistently set them.
   - RLS on orders only allows user_id=auth.uid(), so pharmacy/wholesale provider views can’t read customer orders scoped by pharmacy_id/wholesaler_id.
   - AnalyticsDashboard revenue currently focuses on orders and underuses POS revenue for KPI totals.
4) “Add transaction” is not wired:
   - financialService.getTransactions returns [] and addTransaction returns null (stubbed).
   - financial_transactions table is absent.
5) “Recent reports downloadable” is mock:
   - InventoryReports renders hardcoded recent reports and fake toasts.
   - reportingService expects storage bucket "reports" and generated_reports records, but no live wiring from InventoryReports.
6) Cart/order conflict still occurs in some flows because actor-vs-employer identity usage is inconsistent across pages/services.
7) Current build has a stability issue: src/config/subscription.ts uses process.env in browser code (TS error).

Implementation plan (safe phased rollout)
Phase 0 — Stabilize build first (no behavior change)
- Fix src/config/subscription.ts to use import.meta.env.DEV (or Vite env) instead of process.env.
- Keep tsconfig clean (no loosening needed for this).

Phase 1 — Permanent staff exclusion from pharmacy directory
- Refactor src/pages/PharmacyDirectory.tsx to use the same exclusion strategy as PharmacyFinder:
  1) Fetch active staff user IDs via RPC get_active_staff_user_ids().
  2) Exclude those IDs from profiles query.
  3) Keep pharmacy-only filters (role retail + approved + valid business name fields).
- Also update product stock query in PharmacyDirectory to only load products for the filtered pharmacy IDs.
- Create a shared helper (e.g., src/services/pharmacyDirectoryService.ts) used by both PharmacyDirectory and PharmacyFinder so this doesn’t drift again.
- Guarantee “no new staff visible” by relying on live staff_members linkage via RPC (not static local state).

Phase 2 — Fix order identity model + cart reliability
- Standardize a single actor ID source in frontend order/cart flows:
  - actorUserId = user.authUserId || user.id
- Apply consistently in all order writes/reads (Cart, PublicCatalog, PharmacyStore, MyOrders, wholesale ordering entry points).
- For checkout order creation, always set provider columns from cart line items:
  - pharmacy_id for retail provider orders
  - wholesaler_id for wholesale provider orders
- Keep user_id as authenticated actor (to satisfy FK + RLS).

Phase 3 — RLS policy patch for provider analytics/order visibility
- Add missing SELECT policies on orders so providers can read orders where:
  - pharmacy_id = auth.uid() OR wholesaler_id = auth.uid()
  - plus staff viewing employer orders via staff_members mapping.
- Keep INSERT policy strict (user_id must be auth.uid()) to prevent impersonation.
- Add/update UPDATE policies only for required provider status transitions, scoped by provider ownership.
- Validate with sample staff + owner accounts before finalizing.

Phase 4 — Fix mixed inventory metrics (low stock / expiring / dashboard)
- Update inventoryService:
  - getLowStockProducts and getExpiringProducts must filter by org ownership (user_id/pharmacy_id/wholesaler_id based on role + staff employer mapping).
  - Avoid global product scans.
- Update InventoryDashboard and hooks to use scoped queries only.
- Reconcile Expiring Soon to ignore null expiry_date and past-deleted records; keep date-window logic deterministic.

Phase 5 — Replace analytics “0” behavior with true live business data
- Update AnalyticsDashboard KPI aggregation:
  - Revenue = POS sales + paid/completed provider orders.
  - Include statuses: completed, paid, delivered, delivered_and_paid.
  - Keep timeframe filter consistent across orders and POS.
- Update BusinessCenter monthly metrics to same revenue/status rules.
- Ensure provider scope uses pharmacy_id/wholesaler_id and staff inherits employer scope.
- Remove remaining pseudo/random values from analytics-facing cards.

Phase 6 — Make Add Transaction actually work
- DB migration:
  - Create public.financial_transactions (id, user_id, type, amount, category, description, transaction_date, timestamps).
  - Enable RLS + owner policies (auth.uid() = user_id).
- Implement financialService.getTransactions/addTransaction/delete/update against this table.
- Keep FinancialManagement UI unchanged except now fully live.

Phase 7 — Make Recent Reports truly downloadable
- Wire InventoryReports to real report generation path:
  - Generate report file (CSV first, then PDF/Excel format options incrementally).
  - Persist metadata in generated_reports.
  - Store files in reports bucket and save file_path.
  - Download button pulls actual file from storage/file_path.
- Replace hardcoded “Recent Reports” array with generated_reports query for current org/user.

Phase 8 — Staff permissions confidence pass
- Validate RouteGuard + navigation consistency against current permission keys (pos/inventory/orders/business_tools/analytics/credit_crm/audit/alerts).
- Verify direct URL blocking for disallowed modules (not just hidden nav links).

Technical details (for implementation)
- Files to update (primary):
  - src/pages/PharmacyDirectory.tsx
  - src/components/PharmacyFinder.tsx (align via shared service)
  - src/pages/Cart.tsx
  - src/pages/PublicCatalog.tsx
  - src/pages/PharmacyStore.tsx
  - src/pages/MyOrders.tsx
  - src/components/AnalyticsDashboard.tsx
  - src/pages/BusinessCenter.tsx
  - src/services/inventoryService.ts
  - src/services/financialService.ts
  - src/components/inventory/InventoryReports.tsx
  - src/services/reportingService.ts
  - src/config/subscription.ts
- DB migrations:
  1) orders RLS provider/staff SELECT policies (and needed UPDATE policies)
  2) financial_transactions table + RLS
  3) reports storage access policy support if needed
- Security constraints respected:
  - Keep sensitive tables behind RLS.
  - Keep user_id actor-bound for writes.
  - No auth schema modifications.

Verification checklist before closing
1) Staff account does not appear in /pharmacy-directory and individual find-pharmacy views.
2) New invited staff also never appears in directory.
3) Staff/owner can add to cart and checkout without FK 409.
4) Business analytics and Business Center show non-zero real values when POS/orders exist.
5) Low stock + expiring show only current pharmacy/wholesaler inventory.
6) Add Transaction creates and displays live entries.
7) Recent reports download real files.
8) Staff permission matrix blocks unauthorized route access by direct URL.
9) Regression pass: product create/edit/upload and other connected services remain operational.
