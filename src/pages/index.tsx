import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { SignupForm } from "@/components/Signup-form";
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { app }   from '../../firebase-config'
import { FirebaseError } from 'firebase/app';
import Cookies from 'universal-cookie';
import Onboarding from "@/components/Onboarding";
import { useState, useEffect } from 'react';



const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const cookies = new Cookies();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();
  


  console.log("Home page loaded");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      <div className="flex flex-col items-center justify-center h-screen">
        {user ? <Onboarding /> : <SignupForm />}

    
      </div>
    </div>
  );
}
