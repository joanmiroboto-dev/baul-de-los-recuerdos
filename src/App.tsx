import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import Timeline from "./pages/Timeline";
import MemoryDetail from "./pages/MemoryDetail";
import UploadMemory from "./components/UploadMemory";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const App = () => <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>} />
            <Route path="/gallery" element={<ProtectedRoute>
                  <Gallery />
                </ProtectedRoute>} />
            <Route path="/timeline" element={<ProtectedRoute>
                  <Timeline />
                </ProtectedRoute>} />
            <Route path="/memory/:id" element={<ProtectedRoute>
                  <MemoryDetail />
                </ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute>
                  <UploadMemory />
                </ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>;
export default App;