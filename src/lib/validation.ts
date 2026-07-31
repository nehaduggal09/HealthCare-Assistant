import { z } from "zod";

export const appointmentSchema = z.object({
  patientName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  patientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  patientEmail: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  symptoms: z.string().trim().min(10, "Please describe symptoms in at least 10 characters").max(2000, "Symptoms description must be less than 2000 characters"),
  location: z.string().max(200, "Location must be less than 200 characters").optional(),
});

export const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be less than 100 characters"),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type AuthFormData = z.infer<typeof authSchema>;
