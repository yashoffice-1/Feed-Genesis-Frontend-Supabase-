
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ViewProvider } from "@/contexts/ViewContext";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";
import { InstagramCallback } from "@/pages/InstagramCallback";

const queryClient = new QueryClient();

const App = () => {
  // Check if this is the Instagram callback URL
  const isInstagramCallback = window.location.pathname === '/instagram-callback';

  if (isInstagramCallback) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <InstagramCallback />
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ViewProvider>
          <Layout>
            <MainContent />
          </Layout>
          <Toaster />
          <Sonner />
        </ViewProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
