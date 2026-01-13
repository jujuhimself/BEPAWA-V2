-- =====================================================
-- COD + BODA DELIVERY SYSTEM MIGRATION (FIXED)
-- Extends existing orders system for Dodoma pilot
-- =====================================================

-- 1. Add 'delivery' role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery';

-- 2. Add delivery-related columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_collected NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS cash_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rider_assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 3. Create stock_reservations table for inventory locking
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'fulfilled', 'released')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id)
);

-- 4. Enable RLS on stock_reservations
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for stock_reservations (fixed UUID casting)
CREATE POLICY "Users can view their order reservations" 
ON public.stock_reservations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = stock_reservations.order_id 
    AND (orders.user_id = auth.uid() OR orders.pharmacy_id::uuid = auth.uid())
  )
);

CREATE POLICY "Pharmacies can manage reservations for their orders" 
ON public.stock_reservations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = stock_reservations.order_id 
    AND orders.pharmacy_id::uuid = auth.uid()
  )
);

CREATE POLICY "Admins can manage all reservations" 
ON public.stock_reservations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 6. Create delivery_assignments table for rider tracking
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  pharmacy_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'picked_up', 'delivered', 'failed', 'cancelled')),
  pickup_address TEXT,
  delivery_address TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_pickup_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  delivery_notes TEXT,
  failure_reason TEXT,
  cash_amount NUMERIC(10,2),
  cash_collected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Enable RLS on delivery_assignments
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for delivery_assignments
CREATE POLICY "Riders can view their assignments" 
ON public.delivery_assignments 
FOR SELECT 
USING (rider_id = auth.uid());

CREATE POLICY "Riders can update their assignments" 
ON public.delivery_assignments 
FOR UPDATE 
USING (rider_id = auth.uid());

CREATE POLICY "Pharmacies can view and manage their delivery assignments" 
ON public.delivery_assignments 
FOR ALL 
USING (pharmacy_id = auth.uid());

CREATE POLICY "Order owners can view their delivery assignments" 
ON public.delivery_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = delivery_assignments.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all delivery assignments" 
ON public.delivery_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON public.orders(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON public.stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON public.stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON public.stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_rider ON public.delivery_assignments(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_pharmacy ON public.delivery_assignments(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON public.delivery_assignments(status);

-- 10. Create trigger for updating updated_at on stock_reservations
CREATE TRIGGER update_stock_reservations_updated_at
BEFORE UPDATE ON public.stock_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Create trigger for updating updated_at on delivery_assignments
CREATE TRIGGER update_delivery_assignments_updated_at
BEFORE UPDATE ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Function to reserve stock for an order
CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_order_id UUID,
  p_items JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::INTEGER;
    
    IF v_product_id IS NULL THEN
      CONTINUE;
    END IF;
    
    SELECT stock INTO v_current_stock 
    FROM products 
    WHERE id = v_product_id;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
    END IF;
    
    INSERT INTO stock_reservations (order_id, product_id, quantity, status)
    VALUES (p_order_id, v_product_id, v_quantity, 'reserved')
    ON CONFLICT (order_id, product_id) 
    DO UPDATE SET quantity = EXCLUDED.quantity, status = 'reserved', released_at = NULL;
  END LOOP;
END;
$$;

-- 13. Function to release reserved stock
CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE stock_reservations 
  SET status = 'released', released_at = NOW(), updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'reserved';
END;
$$;

-- 14. Function to fulfill reservations (permanently deduct stock)
CREATE OR REPLACE FUNCTION public.fulfill_order_stock(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation RECORD;
BEGIN
  FOR reservation IN 
    SELECT * FROM stock_reservations 
    WHERE order_id = p_order_id AND status = 'reserved'
  LOOP
    UPDATE products 
    SET stock = stock - reservation.quantity, 
        updated_at = NOW()
    WHERE id = reservation.product_id;
    
    UPDATE stock_reservations 
    SET status = 'fulfilled', updated_at = NOW()
    WHERE id = reservation.id;
    
    INSERT INTO inventory_movements (
      user_id, 
      product_id, 
      movement_type, 
      quantity, 
      reason
    )
    SELECT 
      o.user_id,
      reservation.product_id,
      'out',
      reservation.quantity,
      'Order ' || o.order_number || ' fulfilled'
    FROM orders o
    WHERE o.id = p_order_id;
  END LOOP;
END;
$$;