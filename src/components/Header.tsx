import { Heart, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "Successfully logged out",
      });
      navigate("/auth");
    }
  };

  return (
    <header className="fixed top-0 w-full bg-card/80 backdrop-blur-md border-b border-border z-50 shadow-[var(--shadow-sm)]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            HealthCare
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#symptoms" className="text-foreground hover:text-primary transition-colors">
            Symptom Checker
          </a>
          <a href="#verify" className="text-foreground hover:text-primary transition-colors">
            Verify Medicine
          </a>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
};
