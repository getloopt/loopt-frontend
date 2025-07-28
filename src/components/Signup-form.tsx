import React, { useState } from 'react'
import { Button } from "@/components/ui/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/ui/card"
import { Input } from "@/components/ui/ui/input"
import { signInWithPopup, GoogleAuthProvider, signOut, sendSignInLinkToEmail } from "firebase/auth";
import { auth, db } from '../../firebase-config'
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from "sonner"
import { useNetworkStatus } from '../hooks/use-network-status';
import { WifiOff } from 'lucide-react';
import { Label } from '@radix-ui/react-label';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export function SignupForm() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [email, setEmail] = useState("");
  const handleButtonClick = async () => {
    // Check if user is offline
    if (!isOnline) {
      toast.error("📱 You're offline", {
        description: "Please connect to the internet to sign in",
        duration: 4000,
      });
      return;
    }
    try {
      // Step 1: Get Google Auth Result
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Step 2: Validate Email - Exit early if invalid
      if (!user.email) {
        toast.error("No email provided with this Google account");
        await signOut(auth);
        return; // Exit before any Firestore operations
      }

      // Step 3: Check Email Domain - Exit early if not SSN
      if (!user.email.endsWith("@cse.ssn.edu.in") && !user.email.endsWith("@ssn.edu.in")) {
        toast.error("Please use your SSN email to sign in", {
          description: "Only @cse.ssn.edu.in email addresses are allowed"
        });
        await signOut(auth);
        return; // Exit before any Firestore operations
      }

      // Step 4: Only reach here if email is valid SSN email
      const usersCollection = collection(db, "users");
      const userQuery = query(usersCollection, where("email", "==", user.email));
      
      try {
        const querySnapshot = await getDocs(userQuery);
        if (querySnapshot.empty) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        toast.error("Unable to complete sign in", {
          description: "Please try again"
        });
        await signOut(auth);
      }

    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
          case "auth/cancelled-popup-request":
            return; // Silent return - user initiated
          case "auth/popup-blocked":
            toast.error("Popup Blocked", {
              description: "Please allow popups for this site and try again"
            });
            return;
          case "auth/account-exists-with-different-credential":
            toast.error("Account Already Exists", {
              description: "This email is already associated with another sign-in method"
            });
            return;
          case "auth/invalid-credential":
            toast.error("Invalid Credentials", {
              description: "Please try signing in again"
            });
            return;
          default:
            console.error("Auth error:", error.code, error.message);
            toast.error("Sign-in Failed", {
              description: "Please try again later"
            });
            return;
        }
      }
      
      // Unknown error
      console.error("Unexpected error:", error);
      toast.error("Sign-in Failed", {
        description: "An unexpected error occurred"
      });
    }
  };

  const handleEmailLinkClick = async () => {
    // Check if user is offline
    if (!isOnline) {
      toast.error("📱 You're offline", {
        description: "Please connect to the internet to sign in",
        duration: 4000,
      });
      return;
    }

    // Validate email format
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Check Email Domain - Only allow SSN emails
    if (!email.endsWith("@cse.ssn.edu.in") && !email.endsWith("@ssn.edu.in")) {
      toast.error("Please use your SSN email to sign in", {
        description: "Only @cse.ssn.edu.in or @ssn.edu.in email addresses are allowed"
      });
      return;
    }

    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this
      // URL must be in the authorized domains list in the Firebase Console.
      url: window.location.origin + '/onboarding',
      // This must be true.
      handleCodeInApp: true 
      
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    toast.success("Email link sent to your email");

  };
  return (
    <div>
      <Card className="sm:w-[50vw] w-[90vw] max-w-sm card-bg sm:p-8 pl-10 pr-10 border-none shadow-indigo-500 shadow-lg relative overflow-hidden">
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className='text-card-text sm:text-xl'>Sign Up</CardTitle>
          <CardDescription className='mt-2 sm:text-md'>
            Get started with your SSN email to get started
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <Button
            variant="outline"
            className={`relative lg:w-[20vw] md:w-[39vw] sm:p-5 p-2 w-full ${
              isOnline 
                ? 'bg-stone-300 text-stone-900 hover:cursor-pointer' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleButtonClick}
            disabled={!isOnline}
          >
            {isOnline ? (
              'Sign Up with SSN Google Account'
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2" />
                Sign In (Offline)
              </>
            )}
          </Button>
          <div className="grid w-full items-center gap-1.5 mt-4">
            <Label htmlFor="email" className="text-muted-foreground font-proxima-nova font-medium text-sm"> If the sign in with Google doesn't work, try with email link</Label>
            <Input type="text" placeholder="Enter your email" className='bg-zinc-800 p-6 text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80 placeholder:text-sm mt-2' 
            onChange={(e) => setEmail(e.target.value)}
            />
            <Button
            variant="outline"
            className={`relative lg:w-[20vw] md:w-[39vw] sm:p-5 p-2 w-full mt-4 ${
              isOnline 
                ? 'bg-stone-300 text-stone-900 hover:cursor-pointer' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleEmailLinkClick}
            disabled={!isOnline}
          >
            {isOnline ? (
              'Sign In with Email Link'
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2" />
                Sign In with Email Link (Offline)
              </>
            )}
          </Button>

          </div>

         

          {!isOnline && (
            <p className="text-sm text-gray-600 text-center mt-2">
              Connect to the internet to sign in
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default SignupForm