
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ViewProvider } from "@/contexts/ViewContext";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";
import { InstagramCallback } from "@/pages/InstagramCallback";
import { YouTubeCallback } from "@/pages/YouTubeCallback";

const queryClient = new QueryClient();

const App = () => {
  // Check if this is a callback URL
  const isInstagramCallback = window.location.pathname === '/instagram-callback';
  const isYouTubeCallback = window.location.pathname === '/youtube-callback';

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

  if (isYouTubeCallback) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <YouTubeCallback />
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



