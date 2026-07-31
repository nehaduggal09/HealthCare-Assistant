import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Search, UserCheck, MapPin, Star, Mic, StopCircle, Loader2, Upload, Phone, Mail } from "lucide-react";
import symptomsIcon from "@/assets/symptoms-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { appointmentSchema } from "@/lib/validation";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  distance: string;
  availability: string;
  phone: string;
  email: string;
  address: string;
}

export const SymptomChecker = () => {
  const [symptoms, setSymptoms] = useState("");
  const [location, setLocation] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [symptomImage, setSymptomImage] = useState<File | null>(null);
  const [symptomImageUrl, setSymptomImageUrl] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSymptomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSymptomImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSymptomImage = async () => {
    if (!symptomImage) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = symptomImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('symptom-images')
        .upload(filePath, symptomImage);

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from('symptom-images')
        .createSignedUrl(filePath, 3600);

      return data?.signedUrl || null;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCheck = async () => {
    if (!symptoms.trim()) return;
    
    setIsAnalyzing(true);
    setShowResults(false);
    
    try {
      const imageUrl = await uploadSymptomImage();
      
      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: { symptoms, location }
      });

      if (error) throw error;

      setAiAnalysis(data.analysis);
      setShowResults(true);
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your symptoms",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBookAppointment = async () => {
    setValidationErrors({});
    
    // Validate all inputs
    const validationResult = appointmentSchema.safeParse({
      patientName,
      patientPhone,
      patientEmail: patientEmail || undefined,
      symptoms,
      location: location || undefined,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please check all fields and try again",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDoctor) {
      toast({
        title: "Missing Information",
        description: "Please select a doctor",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);

    try {
      const imageUrl = await uploadSymptomImage();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('appointment_requests')
        .insert({
          user_id: user.id,
          doctor_id: selectedDoctor.id,
          patient_name: validationResult.data.patientName,
          patient_phone: validationResult.data.patientPhone,
          patient_email: validationResult.data.patientEmail || null,
          symptoms: validationResult.data.symptoms,
          symptom_image_url: imageUrl,
          location: validationResult.data.location || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Appointment Requested",
        description: `Your appointment request has been sent to ${selectedDoctor.name}`,
      });

      setPatientName("");
      setPatientPhone("");
      setPatientEmail("");
      setSelectedDoctor(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          try {
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { audioBase64: base64Audio }
            });

            if (error) throw error;

            setSymptoms(data.text);
            toast({
              title: "Recording Transcribed",
              description: "Your voice has been converted to text",
            });
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        };

        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak your symptoms clearly",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  return (
    <section id="symptoms" className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 space-y-4">
          <div className="flex justify-center">
            <img src={symptomsIcon} alt="Symptoms" className="w-24 h-24 opacity-80" />
          </div>
          <h2 className="text-4xl font-bold">Find the Right Doctor</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Describe your symptoms and we'll recommend qualified doctors near you
          </p>
        </div>

        <Card className="p-8 bg-[var(--gradient-card)] shadow-[var(--shadow-md)] border-0">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe Your Symptoms</label>
              <div className="relative">
                <Textarea 
                  placeholder="E.g., Fever, headache, and body aches for 2 days..."
                  className="min-h-32 resize-none pr-16"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className="absolute right-2 top-2"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
              {isRecording && (
                <p className="text-sm text-destructive animate-pulse">Recording...</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Symptom Photo (Optional)</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
              {symptomImageUrl && (
                <div className="mt-2">
                  <img src={symptomImageUrl} alt="Symptom" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Location (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter your city or area"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={handleCheck}
              disabled={isAnalyzing || !symptoms.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find Doctors
                </>
              )}
            </Button>
          </div>
        </Card>

        {showResults && (
          <div className="mt-12 space-y-6 animate-fade-in">
            {aiAnalysis && (
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-2 text-primary mb-4">
                  <UserCheck className="w-5 h-5" />
                  <h3 className="text-xl font-bold">AI Analysis</h3>
                </div>
                <div className="text-foreground whitespace-pre-wrap leading-relaxed space-y-4">
                  {aiAnalysis.split('\n').map((line, idx) => {
                    if (line.startsWith('🔍') || line.startsWith('📋') || line.startsWith('⚠️') || line.startsWith('💡')) {
                      return <div key={idx} className="font-bold text-lg text-primary mt-4">{line}</div>;
                    } else if (line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
                      return <div key={idx} className="ml-4">{line}</div>;
                    } else if (line.trim()) {
                      return <div key={idx}>{line}</div>;
                    }
                    return <div key={idx} className="h-2"></div>;
                  })}
                </div>
              </Card>
            )}
            <div className="flex items-center gap-2 text-primary">
              <UserCheck className="w-5 h-5" />
              <h3 className="text-2xl font-bold">Recommended Doctors</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor, index) => (
                <Card 
                  key={index} 
                  className="p-6 hover:shadow-[var(--shadow-lg)] transition-all duration-300 hover:-translate-y-1 bg-card border-border"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-secondary">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{doctor.rating}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{doctor.name}</h4>
                      <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
                      <p className="text-sm text-muted-foreground">{doctor.experience} experience</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{doctor.distance} away</span>
                      <span className="text-secondary font-medium">{doctor.availability}</span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default" 
                          className="w-full"
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          Book Appointment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Book Appointment with {doctor.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Your Name *</Label>
                            <Input
                              id="name"
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              placeholder="Enter your name"
                            />
                            {validationErrors.patientName && (
                              <p className="text-sm text-destructive">{validationErrors.patientName}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={patientPhone}
                              onChange={(e) => setPatientPhone(e.target.value)}
                              placeholder="+91-XXXXXXXXXX"
                            />
                            {validationErrors.patientPhone && (
                              <p className="text-sm text-destructive">{validationErrors.patientPhone}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={patientEmail}
                              onChange={(e) => setPatientEmail(e.target.value)}
                              placeholder="your@email.com"
                            />
                            {validationErrors.patientEmail && (
                              <p className="text-sm text-destructive">{validationErrors.patientEmail}</p>
                            )}
                          </div>
                          <div className="space-y-2 p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4" />
                              <span>{doctor.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4" />
                              <span>{doctor.email}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{doctor.address}</p>
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={handleBookAppointment}
                            disabled={isBooking}
                          >
                            {isBooking ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Booking...
                              </>
                            ) : (
                              'Confirm Appointment'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
