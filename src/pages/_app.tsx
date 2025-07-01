import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from 'next/font/google';
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Head from 'next/head';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        {/* Mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={inter.className}>
        <Component {...pageProps} />
        <Toaster />
      </main>
    </AuthProvider>
  );
}
