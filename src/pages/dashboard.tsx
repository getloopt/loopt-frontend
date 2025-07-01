import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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