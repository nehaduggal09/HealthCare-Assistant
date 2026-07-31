-- Fix: Doctor Personal Contact Information Exposed to Public Internet
-- Remove the dangerous public policy that exposes doctor PII
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;

-- Create new policy: Only authenticated users can view doctors
CREATE POLICY "Authenticated users can view doctors" 
ON public.doctors 
FOR SELECT 
TO authenticated
USING (true);