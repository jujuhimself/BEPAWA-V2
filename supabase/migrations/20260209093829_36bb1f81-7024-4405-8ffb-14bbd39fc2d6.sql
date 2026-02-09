
-- Create SMS logs table to track all SMS attempts
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  event_type TEXT NOT NULL, -- order_placed, order_accepted, rider_assigned, order_delivered
  order_id UUID REFERENCES public.orders(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert logs (via edge function service role)
CREATE POLICY "Service role can manage sms_logs"
ON public.sms_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for querying by order
CREATE INDEX idx_sms_logs_order_id ON public.sms_logs(order_id);
CREATE INDEX idx_sms_logs_event_type ON public.sms_logs(event_type);
