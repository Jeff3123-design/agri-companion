-- Add GDU tracking columns to farming_sessions
ALTER TABLE public.farming_sessions
ADD COLUMN IF NOT EXISTS planting_date DATE,
ADD COLUMN IF NOT EXISTS accumulated_gdu DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'Not Started';

-- Update status to default to 'pending' for new users (no auto-start)
ALTER TABLE public.farming_sessions 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create table for daily temperature data and GDU calculations
CREATE TABLE IF NOT EXISTS public.daily_gdu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.farming_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  temp_max DECIMAL(5, 2),
  temp_min DECIMAL(5, 2),
  gdu DECIMAL(6, 2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual', -- 'manual' or 'api'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, date)
);

-- Enable RLS on daily_gdu
ALTER TABLE public.daily_gdu ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_gdu
CREATE POLICY "Users can view their own GDU data"
ON public.daily_gdu
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GDU data"
ON public.daily_gdu
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GDU data"
ON public.daily_gdu
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GDU data"
ON public.daily_gdu
FOR DELETE
USING (auth.uid() = user_id);