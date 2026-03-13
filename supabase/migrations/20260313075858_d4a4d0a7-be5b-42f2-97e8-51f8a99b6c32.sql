-- Phase 3: Add SELECT policies for providers to see orders by pharmacy_id/wholesaler_id
-- This fixes analytics showing 0 for pharmacy/wholesale owners

-- Provider can read orders where they are the pharmacy
CREATE POLICY "Providers can view orders for their pharmacy"
ON public.orders FOR SELECT
TO authenticated
USING (pharmacy_id = auth.uid());

-- Provider can read orders where they are the wholesaler
CREATE POLICY "Providers can view orders for their wholesaler"
ON public.orders FOR SELECT
TO authenticated
USING (wholesaler_id = auth.uid());

-- Staff can view orders for their employer's pharmacy/wholesale
CREATE POLICY "Staff can view employer orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.is_active = true
      AND (sm.pharmacy_id = orders.pharmacy_id OR sm.pharmacy_id = orders.wholesaler_id)
  )
);

-- Provider can update order status for their orders
CREATE POLICY "Providers can update their pharmacy orders"
ON public.orders FOR UPDATE
TO authenticated
USING (pharmacy_id = auth.uid() OR wholesaler_id = auth.uid())
WITH CHECK (pharmacy_id = auth.uid() OR wholesaler_id = auth.uid());

-- Phase 6: Create financial_transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  description text DEFAULT '',
  reference text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financial transactions"
ON public.financial_transactions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create reports storage bucket if not exists (idempotent via DO block)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;