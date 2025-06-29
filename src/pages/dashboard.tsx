import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import CurrentTimeTable from '@/components/correct-timetable/CurrentTimeTable';

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
          <div className="flex justify-end items-center py-2 mb-2.5 absolute top-0 right-2 sm:hidden">
            <Button
              className="bg-zinc-800 border-white/20 border-1 hover:bg-white hover:text-black hover:cursor-pointer font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
          <CurrentTimeTable />
        </div>
      </div>

      <div className="hidden sm:block ml-4">
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
        
            <div className="max-md:translate-x-17 lg:translate-x-30 xl:translate-x-50">
            <CurrentTimeTable />
            </div>
          
          </div>
        </Layout>
      </div>
    </div>
  );
}