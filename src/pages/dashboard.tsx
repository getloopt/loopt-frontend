import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, userData, loading, isAuthenticated, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signup');
    }
  }, [loading, isAuthenticated, router]);
  

  // Show loading state
  if (loading || !isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <div className="sm:hidden">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <NavBarDemo />
          <div className="flex justify-end items-center py-2 mb-2.5 absolute sm:top-4 sm:right-4 top-0 right-2">
            <Button
              className="bg-zinc-800 border-white/20 border-1 hover:bg-[#] hover:text-black hover:cursor-pointer font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-4">Welcome to Dashboard</h1>
          <p>You are logged in as: {user?.email}</p>
        </div>
      </div>

      <div className="hidden sm:block">
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="flex justify-end items-center py-2 mb-2.5 absolute sm:top-4 sm:right-4 top-0 right-2">
              <Button
                className="bg-zinc-800 border-white/20 border-1 hover:bg-white hover:text-black hover:cursor-pointer font-proxima-nova"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
            <h1 className="text-2xl font-bold mb-4 translate-x-3 translate-y-3">Welcome to Dashboard</h1>
            <p>You are logged in as: {user?.email}</p>
            {userData && (
              <div className="mt-4 text-center">
                <p>Department: {userData.department}</p>
                <p>Year: {userData.year}</p>
                <p>Section: {userData.section}</p>
                <p>Semester: {userData.semester}</p>
              </div>
            )}
          </div>
        </Layout>
      </div>
    </div>
  );
}