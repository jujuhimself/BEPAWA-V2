import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import Navbar from "@/components/Navbar";
import AppRoutes from "./routes/AppRoutes";
import ChatBot from "@/components/ChatBot";
import { SubscriptionInit } from "@/components/subscription/SubscriptionInit";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BranchProvider>
            <SubscriptionInit>
              <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <AppRoutes />
                <ChatBot />
              </div>
            </SubscriptionInit>
          </BranchProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
