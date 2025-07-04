import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from 'next/font/google';
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NavBarDemo } from '@/components/Navbar';
import { TimetableProvider } from "@/contexts/timetableData";

import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import heavy components
const AnimatePresence = dynamic(
  () => import('framer-motion').then(mod => mod.AnimatePresence),
  { ssr: false }
)

// Instead of importing directly, use dynamic import when needed
const loadSampleData = async () => {
  const { default: sampleTable } = await import('../../data/sampletable')
  return sampleTable
}

// Error Boundary Component for mobile debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-500 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">App Error</h2>
            <p className="text-gray-700 mb-4">Something went wrong:</p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              {this.state.error}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded w-full"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mobile Debug Component
const MobileDebugger = () => {
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      localStorage: (() => {
        try {
          return !!localStorage.getItem('auth_user');
        } catch {
          return false;
        }
      })(),
      timestamp: new Date().toISOString()
    };
    setDebugInfo(JSON.stringify(info, null, 2));
  }, []);

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
  }, []);

  // Routes where we don't want to show the nav bar (e.g., auth pages)
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
    <ErrorBoundary>
      <AuthProvider>
        <TimetableProvider>
          <Head>
            {/* Mobile responsiveness */}
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            {/* Prevent zoom on iOS */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          </Head>
          <main className={inter.className}>
            <MobileDebugger />
            {!hideNav && <NavBarDemo />}
            <AnimatePresence mode="wait" initial={false}>
              <Component {...pageProps} key={router.asPath} />
            </AnimatePresence>
            <Toaster />
          </main>
        </TimetableProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}


