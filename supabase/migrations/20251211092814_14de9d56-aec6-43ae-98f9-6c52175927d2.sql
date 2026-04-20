-- Allow users who uploaded the memory to update it
CREATE POLICY "Uploaders can update own memories" 
ON public.memories 
FOR UPDATE 
USING (uploaded_by = auth.uid());