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
import { WifiOff, ArrowLeft, Mail, RotateCcw, MailCheck } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import { motion, AnimatePresence } from "framer-motion"

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export function SignupForm() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [email, setEmail] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);

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

    // Validate email format window.localStorage
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
      url: 'https://heyloopt.com' + '/onboarding',
      // This must be true.
      handleCodeInApp: true 
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      
      // Show the email sent confirmation screen with animation
      setShowEmailSent(true);
      toast.success("Email link sent to your email");
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email link", {
        description: "Please try again"
      });
    }
  };

  const handleGoBack = () => {
    setShowEmailSent(false);
  };

  const handleResendEmail = async () => {
    if (!email) return;
    
    const actionCodeSettings = {
      url: window.location.origin + '/onboarding',
      handleCodeInApp: true 
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      toast.success("Email link resent!", {
        description: "Please check your email inbox and spam folder"
      });
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error("Failed to resend email link", {
        description: "Please try again"
      });
    }
  };

  return (
    <div className="relative overflow-hidden shadow-2xl shadow-indigo-500 drop-shadow-2xl">
      <AnimatePresence mode="wait">
        {!showEmailSent ? (
          // Original Sign Up Form
          <motion.div
            key="signup-form"
            initial={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Card className="sm:w-[50vw] w-[90vw] max-w-sm card-bg sm:p-8 pl-10 pr-10 border-none shadow-2xl shadow-indigo-500 relative overflow-hidden">
              <CardHeader className="flex flex-col gap-2 justify-center items-center">
                <CardTitle className='text-card-text sm:text-xl text-center'>Sign Up</CardTitle>
          
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
                <div className="grid w-full items-center gap-1.5 mt-2">
                  <Label htmlFor="email" className="text-muted-foreground font-proxima-nova font-medium text-sm text-center"> OR </Label>
                  <Input type="text" placeholder="Enter your email" className='bg-zinc-800 p-6 text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80 placeholder:text-sm mt-2' 
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
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
                    <>
                    <MailCheck className="w-4 h-4 mr-2" />
                    Sign In with Email Link
                    </>
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
          </motion.div>
        ) : (
          // Email Sent Confirmation Card
          <motion.div
            key="email-sent"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Card className="sm:w-[50vw] w-[90vw] max-w-sm card-bg sm:p-8 pl-10 pr-10 border-none shadow-lg shadow-indigo-500/25 drop-shadow-2xl relative overflow-hidden">
              <CardHeader className="flex flex-col gap-2">
                {/* Back Button */}
                <Button
                  variant="ghost"
                  className="w-fit pr-4 pl-4 pt-2 pb-2 mb-2 rounded-full text-gray-600 hover:cursor-pointer !hover:!bg-none "
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                {/* Email Icon and Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-indigo-500" />
                  </div>
                  <CardTitle className='text-card-text sm:text-xl'>
                    Please check your email!
                  </CardTitle>
                </div>
                
                <CardDescription className='mt-2 sm:text-md text-gray-600'>
                  If there is an account associated with{' '} check your spam folder mainly!
                  <span className="font-medium text-indigo-500">{email}</span>, you will receive an email
                  with a link to sign in.
                </CardDescription>
              </CardHeader>
              
              <CardFooter className="flex-col gap-2">
                {/* Resend Email Button */}
                <Button
                  variant="outline"
                  className="relative lg:w-[20vw] md:w-[39vw] sm:p-5 p-2 w-full bg-stone-300 text-stone-900 hover:bg-stone-400 hover:cursor-pointer"
                  onClick={handleResendEmail}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resend Email
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SignupForm