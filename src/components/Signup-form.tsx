import React from 'react'
import { Button } from "@/components/ui/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/ui/card"
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from '../../firebase-config'
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from "sonner"

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export function SignupForm() {
  const router = useRouter()
  
  const handleButtonClick = async () => {
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
      if (!user.email.endsWith("@cse.ssn.edu.in")) {
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
            className="relative lg:w-[20vw] md:w-[39vw] sm:p-5 p-2 w-full bg-stone-300 text-stone-900 hover:cursor-pointer"
            onClick={handleButtonClick}
          >
            Sign Up with SSN Google Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default SignupForm