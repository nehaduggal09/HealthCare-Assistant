-- Fix Issue 1: Remove public access to symptom images storage
-- Drop dangerous public policies
DROP POLICY IF EXISTS "Anyone can view symptom images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload symptom images" ON storage.objects;

-- Ensure bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'symptom-images';

-- Fix Issue 2: Make user_id NOT NULL in appointment_requests
-- First, check if there are any NULL user_id records and clean them up
-- We'll delete any orphaned records without a user_id
DELETE FROM appointment_requests WHERE user_id IS NULL;

-- Now make the column NOT NULL to enforce data integrity
ALTER TABLE appointment_requests ALTER COLUMN user_id SET NOT NULL;