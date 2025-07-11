import { useLayoutEffect, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import CurrentTimeTable from '@/components/correct-timetable/CurrentTimeTable';
import { NotificationSettings } from '@/components/ui/ui/notifications';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/config';


// Emergency fallback component for mobile
const MobileErrorFallback = ({ error }: { error: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-xl font-bold text-red-600 mb-4">Dashboard Error</h2>
      <p className="text-gray-700 mb-4">Mobile dashboard failed to load:</p>
      <div className="bg-gray-100 p-3 rounded text-sm font-mono mb-4">
        {error}
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        Reload Page
      </button>
      <button 
        onClick={() => window.location.href = '/signup'} 
        className="bg-gray-500 text-white px-4 py-2 rounded w-full"
      >
        Go to Login
      </button>
    </div>
  </div>
);

// Safe mobile dashboard component
const MobileDashboard = () => {
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      localStorage: (() => {
        try {
          const authUser = localStorage.getItem('auth_user');
          const timetableData = localStorage.getItem('timetable_data');
          return {
            hasAuth: !!authUser,
            hasTimetable: !!timetableData,
            authData: authUser ? JSON.parse(authUser) : null
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : 'Unknown error' };
        }
      })()
    };
    setDebugInfo(JSON.stringify(info, null, 2));
  }, []);

  if (error) {
    return <MobileErrorFallback error={error} />;
  }

  try {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-screen p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          delay: 0.1,
          ease: "easeOut"
        }}
      >
        <div className="w-full max-w-4xl space-y-4">
          <NotificationSettings />
          <CurrentTimeTable />
        </div>
        
      </motion.div>
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(errorMessage);
    return <MobileErrorFallback error={errorMessage} />;
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState('');

  // runs before first paint
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      // Only redirect if we're not loading and not authenticated
      if (!loading && !isAuthenticated) {
        console.log('Dashboard: Redirecting to signup - not authenticated');
        router.push('/signup');
      }
    } catch (err) {
      console.error('Dashboard: Auth check error:', err);
      setAuthError(err instanceof Error ? err.message : 'Unknown authentication error');
    }
  }, [loading, isAuthenticated, router]);

  // 🔥 UPDATED: Direct server action call
  const sendTestNotification = async () => {
    try {
      const userId = user?.uid;
      if (!userId) {
        toast.error('No user ID found. Please make sure you are logged in.');
        return;
      }

      console.log('🧪 TESTING: Sending test notification for user:', userId);
      
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        if (permission !== 'granted') {
          toast.warning('Please enable notifications first by clicking the bell icon!');
          return;
        }
      }

      // Call API route instead of server action directly
      const response = await fetch(getApiUrl('sendNotification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test button was clicked! Your notification system is working perfectly. 🎉',
          userId: userId,
          icon: '/images/icon512_rounded.png',
          title: '🧪 Test Notification - Button Clicked!'
        })
      });
      
      if (response.ok) {
        console.log('✅ Test notification sent successfully');
        toast.success('Test notification sent!', {
          description: 'Check your browser notifications',
          duration: 3000
        });
      } else {
        const errorData = await response.json();
        console.error('❌ API call failed:', errorData);
        toast.error(`Failed to send notification: ${errorData.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Only show loading on initial mount, not during route changes
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  // Show auth error if there's one
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700 mb-4">Failed to check authentication:</p>
          <div className="bg-gray-100 p-3 rounded text-sm font-mono mb-4">
            {authError}
          </div>
          <button 
            onClick={() => window.location.href = '/signup'} 
            className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">Checking Authentication...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to Login...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Mobile view with error handling */}
      <div className="sm:hidden">
        <MobileDashboard />
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block ml-4">
        <Layout>
          <motion.div 
            className="flex flex-col items-center justify-center min-h-screen p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1,
              ease: "easeOut"
            }}
          >
            <div className="max-md:translate-x-17 lg:translate-x-30 xl:translate-x-50 space-y-4">
              <NotificationSettings />
              <CurrentTimeTable />
            </div>
          </motion.div>
        </Layout>
      </div>
    </motion.div>
  );
}