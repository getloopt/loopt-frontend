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

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export function SignupForm() {
  const router = useRouter()
  
  const handleButtonClick = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user.email && user.email.endsWith("@cse.ssn.edu.in")) {
        console.log("Signed in as:", user.email);
        
        // Check if user exists in Firestore
        const usersCollection = collection(db, "users");
        const userQuery = query(usersCollection, where("email", "==", user.email));
        const querySnapshot = await getDocs(userQuery);
        
        if (querySnapshot.empty) {
          // User doesn't exist in Firestore - redirect to onboarding
          router.push('/onboarding');
        } else {
          // User exists in Firestore - redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        console.log("User email does not end with @cse.ssn.edu.in");
        alert("Please use your SSN email to sign in.");
        await signOut(auth);
        console.log("Signed out user with email:", user.email);
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
          case "auth/cancelled-popup-request":
            console.log("Sign-in popup was closed by the user or cancelled.");
            return;
          case "auth/popup-blocked":
            console.log("Popup was blocked by the browser.");
            alert("Popup was blocked! Please allow popups for this site and try again.");
            return;
          case "auth/network-request-failed":
            console.log("Network error occurred during sign-in.");
            alert("Network error. Please check your internet connection and try again.");
            return;
          default:
            console.error("Google sign-in error:", error);
            alert("Sign-in failed. Please try again.");
            return;
        }
      }
      console.error("Google sign-in error:", error);
      alert("Sign-in failed. Please try again.");
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
