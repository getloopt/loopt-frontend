import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { loading } = useAuth();

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
