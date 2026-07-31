import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import medicineIcon from "@/assets/medicine-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

export const MedicineVerifier = () => {
  const [image, setImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<"authentic" | "fake" | "warning" | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [aiVerification, setAiVerification] = useState("");
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setImage(base64Image);
        setIsVerifying(true);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Please log in to verify medicine");

          const { data, error } = await supabase.functions.invoke('verify-medicine', {
            body: { imageBase64: base64Image }
          });

          if (error) throw error;

          setAiVerification(data.verification);
          
          // Parse AI response to determine result
          const verificationLower = data.verification.toLowerCase();
          if (verificationLower.includes('authentic') || verificationLower.includes('genuine')) {
            setVerificationResult('authentic');
          } else if (verificationLower.includes('fake') || verificationLower.includes('counterfeit')) {
            setVerificationResult('fake');
          } else {
            setVerificationResult('warning');
          }

          toast({
            title: "Verification Complete",
            description: "AI has analyzed your medicine image",
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
          setVerificationResult('warning');
        } finally {
          setIsVerifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getResultContent = () => {
    switch (verificationResult) {
      case 'authentic':
        return {
          icon: <CheckCircle2 className="w-16 h-16 text-secondary" />,
          title: "Medicine Verified",
          message: "This medicine appears to be authentic based on AI analysis.",
          color: "text-secondary",
        };
      case 'fake':
        return {
          icon: <XCircle className="w-16 h-16 text-destructive" />,
          title: "Warning: Potentially Fake",
          message: "This medicine shows suspicious signs. Please consult with a pharmacist.",
          color: "text-destructive",
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-amber-500" />,
          title: "Unable to Verify",
          message: "We couldn't verify this medicine conclusively. Please consult a professional.",
          color: "text-amber-500",
        };
      default:
        return null;
    }
  };

  const resultContent = getResultContent();

  return (
    <section id="verify" className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12 space-y-4">
          <div className="flex justify-center">
            <img src={medicineIcon} alt="Medicine Verification" className="w-24 h-24 opacity-80" />
          </div>
          <h2 className="text-4xl font-bold">Verify Medicine Authenticity</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a photo of your medicine to check if it's authentic and safe to use
          </p>
        </div>

        <Card className="p-8 bg-[var(--gradient-card)] shadow-[var(--shadow-md)] border-0">
          <div className="space-y-6">
            {!image ? (
              <label className="flex flex-col items-center justify-center min-h-80 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                <span className="text-lg font-medium text-foreground mb-2">
                  Upload Medicine Photo
                </span>
                <span className="text-sm text-muted-foreground mb-4">
                  Click to browse or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG (Max 10MB)
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            ) : (
              <div className="space-y-6">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={image} 
                    alt="Uploaded medicine" 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {isVerifying && (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verifying medicine authenticity...</p>
                  </div>
                )}

                {verificationResult && !isVerifying && (
                  <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-4 rounded-lg ${
                      verificationResult === "authentic" ? "bg-secondary/10" : 
                      verificationResult === "fake" ? "bg-destructive/10" : "bg-amber-500/10"
                    }`}>
                      {resultContent?.icon}
                      <div>
                        <h4 className="font-bold text-lg">{resultContent?.title}</h4>
                        <p className="text-sm text-muted-foreground">{resultContent?.message}</p>
                      </div>
                    </div>
                    
                    {aiVerification && (
                      <Card className="p-4 bg-card border-border">
                        <h5 className="font-semibold mb-2">Detailed Analysis:</h5>
                        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                          {aiVerification}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setImage(null);
                    setVerificationResult(null);
                    setAiVerification("");
                  }}
                >
                  Upload Another Image
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-semibold text-primary mb-3">Tips for Better Verification</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Ensure good lighting and clear focus</li>
            <li>• Capture the medicine label and batch number clearly</li>
            <li>• Include any security holograms or seals in the photo</li>
            <li>• Take photos from multiple angles if possible</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
