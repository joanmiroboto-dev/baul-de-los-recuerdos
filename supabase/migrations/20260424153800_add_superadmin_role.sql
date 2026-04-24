-- Add 'superadmin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
COMMIT;

-- Drop the old policy that allowed admins to delete memories
DROP POLICY IF EXISTS "Admins can delete memories" ON public.memories;

-- Create the new policy that only allows superadmins to delete memories
CREATE POLICY "Superadmins can delete memories"
ON public.memories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- Update has_role function to allow superadmin to do everything admin can do, and admin everything editor can do
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'superadmin' AND _role IN ('admin', 'editor', 'viewer'))
        OR (role = 'admin' AND _role IN ('editor', 'viewer'))
        OR (role = 'editor' AND _role = 'viewer')
      )
  )
$$;
