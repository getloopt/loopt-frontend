import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect based on authentication state
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/signup");
      }
    }
  }, [loading, isAuthenticated, router]);

  // Only show a simple loader while we decide where to send the user
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // The AuthProvider will handle all routing logic
  return null;
}
