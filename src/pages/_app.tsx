import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from 'next/font/google';
import { Toaster } from "sonner";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NavBarDemo } from '@/components/Navbar';
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimetableProvider } from '@/contexts/timetableData';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import heavy components
const AnimatePresence = dynamic(
  () => import('framer-motion').then(mod => mod.AnimatePresence),
  { ssr: false }
);

// Mobile Debug Component - Keeping this for development
const MobileDebugger = () => {
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const info = {
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: (() => {
        try {
          return !!localStorage.getItem(' userData');
        } catch {
          return false;
        }
      })(),
      timestamp: new Date().toISOString()
    };
    setDebugInfo(JSON.stringify(info, null, 2));
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <>
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full z-50 text-xs"
        style={{ zIndex: 9999 }}
      >
        🐛
      </button>
      {showDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 rounded-lg max-w-md w-full max-h-80 overflow-auto">
            <h3 className="font-bold mb-2">Mobile Debug Info</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {debugInfo}
            </pre>
            <button
              onClick={() => setShowDebug(false)}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Client-side mounting check
  useEffect(() => {
    setMounted(true);
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/custom-sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Routes where we don't want to show the nav bar
  const hideNav = ['/', '/signup', '/onboarding'].includes(router.pathname);

  // Show loading screen until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthProvider>
        <TimetableProvider>
          <main className={inter.className}>
            {!hideNav && <NavBarDemo />}
            <MobileDebugger />
            <AnimatePresence mode="wait" initial={false}>
              <Component {...pageProps} key={router.asPath} />
            </AnimatePresence>
            <Toaster />
          </main>
        </TimetableProvider>
      </AuthProvider>
    </>
  );
}


