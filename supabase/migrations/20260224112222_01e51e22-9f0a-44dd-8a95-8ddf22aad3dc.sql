
-- Allow staff members to access their employer's products
CREATE POLICY "Staff can view employer products" ON products
  FOR SELECT USING (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow staff to update employer products (stock changes)
CREATE POLICY "Staff can update employer products" ON products
  FOR UPDATE USING (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow staff to create POS sales for employer
CREATE POLICY "Staff can create employer pos_sales" ON pos_sales
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow staff to view employer pos_sales
CREATE POLICY "Staff can view employer pos_sales" ON pos_sales
  FOR SELECT USING (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow staff to create POS sale items for employer sales
CREATE POLICY "Staff can create employer pos_sale_items" ON pos_sale_items
  FOR INSERT WITH CHECK (
    pos_sale_id IN (
      SELECT id FROM pos_sales WHERE user_id IN (
        SELECT pharmacy_id FROM staff_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Allow staff to create inventory movements for employer products
CREATE POLICY "Staff can create employer inventory_movements" ON inventory_movements
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow staff to view employer inventory movements
CREATE POLICY "Staff can view employer inventory_movements" ON inventory_movements
  FOR SELECT USING (
    user_id IN (
      SELECT pharmacy_id FROM staff_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
