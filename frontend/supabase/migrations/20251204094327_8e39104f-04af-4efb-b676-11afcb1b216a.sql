-- Create crop_photos table for documenting growth
CREATE TABLE public.crop_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.farming_sessions(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crop_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own photos"
  ON public.crop_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own photos"
  ON public.crop_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.crop_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for crop photos
INSERT INTO storage.buckets (id, name, public) VALUES ('crop-photos', 'crop-photos', true);

-- Storage policies
CREATE POLICY "Users can upload crop photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crop-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view crop photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crop-photos');

CREATE POLICY "Users can delete their crop photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crop-photos' AND auth.uid()::text = (storage.foldername(name))[1]);