import { Button } from "./ui/button";
import { ArrowRight, Stethoscope } from "lucide-react";
import heroImage from "@/assets/hero-medical.jpg";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-5" />
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Stethoscope className="w-4 h-4" />
              <span className="text-sm font-medium">Trusted Healthcare for Rural Communities</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Healthcare Made{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Accessible
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Get instant doctor recommendations based on your symptoms and verify medicine authenticity 
              with a simple photo. Quality healthcare is now within your reach.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg">
                Check Symptoms Now
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg">
                Verify Medicine
              </Button>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Patients Helped</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">500+</div>
                <div className="text-sm text-muted-foreground">Verified Doctors</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
            <img 
              src={heroImage} 
              alt="Professional healthcare consultation" 
              className="relative rounded-3xl shadow-[var(--shadow-lg)] w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
