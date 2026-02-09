
-- PrEP/PEP Services offered by labs/health facilities
CREATE TABLE public.prep_pep_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('prep', 'pep')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  consultation_required BOOLEAN NOT NULL DEFAULT true,
  stock_status TEXT NOT NULL DEFAULT 'available' CHECK (stock_status IN ('available', 'unavailable')),
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lab_id, service_type)
);

-- PrEP/PEP Bookings by individual users (reuses COD order lifecycle)
CREATE TABLE public.prep_pep_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('prep', 'pep', 'hiv_self_test', 'circumcision')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_time TEXT,
  consultation_notes TEXT,
  ai_consultation_done BOOLEAN NOT NULL DEFAULT false,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prep_pep_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_pep_bookings ENABLE ROW LEVEL SECURITY;

-- RLS for prep_pep_services
CREATE POLICY "Anyone can view available services"
  ON public.prep_pep_services FOR SELECT
  USING (true);

CREATE POLICY "Labs can manage their own services"
  ON public.prep_pep_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = lab_id);

CREATE POLICY "Labs can update their own services"
  ON public.prep_pep_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = lab_id);

CREATE POLICY "Labs can delete their own services"
  ON public.prep_pep_services FOR DELETE
  TO authenticated
  USING (auth.uid() = lab_id);

-- RLS for prep_pep_bookings
CREATE POLICY "Users can view their own bookings"
  ON public.prep_pep_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = lab_id);

CREATE POLICY "Users can create bookings"
  ON public.prep_pep_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Labs and users can update bookings"
  ON public.prep_pep_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = lab_id);

-- Indexes
CREATE INDEX idx_prep_pep_services_lab ON public.prep_pep_services(lab_id);
CREATE INDEX idx_prep_pep_bookings_user ON public.prep_pep_bookings(user_id);
CREATE INDEX idx_prep_pep_bookings_lab ON public.prep_pep_bookings(lab_id);
CREATE INDEX idx_prep_pep_bookings_status ON public.prep_pep_bookings(status);

-- Trigger for updated_at
CREATE TRIGGER update_prep_pep_services_updated_at
  BEFORE UPDATE ON public.prep_pep_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prep_pep_bookings_updated_at
  BEFORE UPDATE ON public.prep_pep_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
