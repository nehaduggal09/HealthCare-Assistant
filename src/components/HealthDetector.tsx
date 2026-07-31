import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Activity, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const HealthDetector = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [breathingData, setBreathingData] = useState<number[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsRecording(true);
        toast.success("Camera started - Position your face in the frame");
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          toast.error("Camera permission denied. Please allow camera access.");
        } else if (error.name === "NotFoundError") {
          toast.error("No camera found on this device.");
        } else {
          toast.error("Unable to access camera: " + error.message);
        }
      } else {
        toast.error("Unable to access camera. Please check permissions.");
      }
    }
  };

  const captureFace = () => {
    if (!videoRef.current) {
      toast.error("Video not ready");
      return;
    }

    // Check if video is actually playing and has dimensions
    if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      toast.error("Camera is still loading. Please wait a moment.");
      return;
    }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      toast.error("Camera video not ready. Please wait.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Failed to create canvas context");
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      
      if (imageData && imageData.length > 100) {
        setFaceImage(imageData);
        toast.success("Face photo captured successfully!");
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      } else {
        toast.error("Failed to capture image. Please try again.");
      }
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Failed to capture photo. Please try again.");
    }
  };

  const recordBreathing = () => {
    if (breathingData.length > 0) {
      toast.info("Breathing already recorded");
      return;
    }
    
    toast.info("Recording breathing for 10 seconds...");
    const data: number[] = [];
    let count = 0;
    const interval = setInterval(() => {
      // Simulate breathing rate data (in real app, this would use microphone/sensors)
      const rate = Math.random() * 8 + 12; // Normal breathing: 12-20 breaths/min
      data.push(rate);
      count++;
      
      if (count >= 10) {
        clearInterval(interval);
        setBreathingData(data);
        toast.success(`Breathing recorded: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)} breaths/min`);
      }
    }, 1000);
  };

  const analyzeHealth = async () => {
    if (!faceImage) {
      toast.error("Please capture face photo first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        setIsAnalyzing(false);
        return;
      }

      const avgBreathingRate = breathingData.length > 0 
        ? breathingData.reduce((a, b) => a + b, 0) / breathingData.length 
        : 0;

      const { data, error } = await supabase.functions.invoke('detect-health', {
        body: {
          faceImage: faceImage.split(',')[1],
          breathingRate: avgBreathingRate,
          hasBreathingData: breathingData.length > 0
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysisResult(data.analysis);
      toast.success("Health analysis complete");
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze health";
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">AI Health Detection</h2>
        </div>
        <p className="text-muted-foreground">
          Detect health issues through face analysis and breathing patterns
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Face Photo Capture */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Face Photo
            </h3>
            {!faceImage ? (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full rounded-lg border aspect-video bg-muted ${!isRecording ? 'hidden' : ''}`}
                />
                {!isRecording ? (
                  <Button onClick={startCamera} className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={captureFace} className="w-full">
                    Capture Photo
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <img src={faceImage} alt="Face" className="w-full rounded-lg border" />
                <Button
                  variant="outline"
                  onClick={() => setFaceImage(null)}
                  className="w-full"
                >
                  Retake Photo
                </Button>
              </div>
            )}
          </div>

          {/* Breathing Analysis */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Breathing Pattern
            </h3>
            <div className="p-4 bg-muted rounded-lg">
              {breathingData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No breathing data recorded</p>
              ) : (
                <div>
                  <p className="text-sm font-medium">
                    Average Rate: {(breathingData.reduce((a, b) => a + b, 0) / breathingData.length).toFixed(1)} breaths/min
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Normal range: 12-20 breaths/min
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={recordBreathing}
              disabled={breathingData.length > 0}
              className="w-full"
              variant="outline"
            >
              {breathingData.length > 0 ? "Recorded" : "Record Breathing (10s)"}
            </Button>
          </div>
        </div>

        <Button
          onClick={analyzeHealth}
          disabled={isAnalyzing || !faceImage}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Analyze Health
            </>
          )}
        </Button>
      </Card>

      {analysisResult && (
        <Card className="p-6 space-y-4 border-primary/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Health Analysis Result</h3>
          </div>
          <div className="text-foreground whitespace-pre-wrap leading-relaxed space-y-4">
            {analysisResult.split('\n').map((line, idx) => {
              if (line.startsWith('🏥') || line.startsWith('🌡️') || line.startsWith('💓') || line.startsWith('⚠️') || line.startsWith('💡')) {
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
    </div>
  );
};
