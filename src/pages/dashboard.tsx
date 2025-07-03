import { useLayoutEffect, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import CurrentTimeTable from '@/components/correct-timetable/CurrentTimeTable';


export default function Dashboard() {
  const router = useRouter();
  const { user, userData, loading, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // runs before first paint
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're not loading and not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/signup');
    }
  }, [loading, isAuthenticated, router]);

  // Only show loading on initial mount, not during route changes
  if (!mounted) {
    return null;
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
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
      <div className="sm:hidden">
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
          <CurrentTimeTable />
        </motion.div>
      </div>

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
            <div className="max-md:translate-x-17 lg:translate-x-30 xl:translate-x-50">
              <CurrentTimeTable />
            </div>
          </motion.div>
        </Layout>
      </div>
    </motion.div>
  );
}