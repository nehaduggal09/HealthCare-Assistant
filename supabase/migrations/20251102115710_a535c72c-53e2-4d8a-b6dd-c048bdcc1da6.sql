-- Create doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  experience TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 4.5,
  distance TEXT,
  availability TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointment_requests table
CREATE TABLE public.appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  symptoms TEXT NOT NULL,
  symptom_image_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- Policies for doctors (public read)
CREATE POLICY "Anyone can view doctors"
ON public.doctors
FOR SELECT
TO public
USING (true);

-- Policies for appointment_requests (anyone can create)
CREATE POLICY "Anyone can create appointment requests"
ON public.appointment_requests
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can view their own requests"
ON public.appointment_requests
FOR SELECT
TO public
USING (true);

-- Insert sample doctors
INSERT INTO public.doctors (name, specialization, experience, rating, distance, availability, phone, email, address) VALUES
('Dr. Rajesh Kumar', 'General Physician', '15 years', 4.8, '2.5 km', 'Available Today', '+91-9876543210', 'rajesh.kumar@hospital.com', 'City Hospital, Main Road'),
('Dr. Priya Sharma', 'Internal Medicine', '12 years', 4.9, '3.2 km', 'Available Tomorrow', '+91-9876543211', 'priya.sharma@clinic.com', 'Sharma Clinic, Market Street'),
('Dr. Amit Patel', 'Family Medicine', '10 years', 4.7, '4.1 km', 'Available Today', '+91-9876543212', 'amit.patel@medical.com', 'Patel Medical Center, South Block'),
('Dr. Anjali Verma', 'Pediatrics', '8 years', 4.9, '1.8 km', 'Available Today', '+91-9876543213', 'anjali.verma@hospital.com', 'Children Hospital, Park Avenue'),
('Dr. Vikram Singh', 'Cardiology', '18 years', 4.8, '5.0 km', 'Available Tomorrow', '+91-9876543214', 'vikram.singh@cardiac.com', 'Heart Care Center, Ring Road');

-- Create storage bucket for symptom images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('symptom-images', 'symptom-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for symptom images
CREATE POLICY "Anyone can upload symptom images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'symptom-images');

CREATE POLICY "Anyone can view symptom images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'symptom-images');