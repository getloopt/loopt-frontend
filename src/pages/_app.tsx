import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from 'next/font/google';
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NavBarDemo } from '@/components/Navbar';
import { TimetableProvider } from "@/contexts/timetableData";

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Routes where we don't want to show the nav bar (e.g., auth pages)
  const hideNav = ['/', '/signup', '/onboarding'].includes(router.pathname);
  return (
    <AuthProvider>
      <TimetableProvider>
        <Head>
          {/* Mobile responsiveness */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <main className={inter.className}>
          {!hideNav && <NavBarDemo />}
          <Component {...pageProps} />
          <Toaster />
        </main>
      </TimetableProvider>
    </AuthProvider>
  );
}


