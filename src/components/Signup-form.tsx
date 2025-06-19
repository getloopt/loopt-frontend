import React from 'react'
import { Button } from "@/components/ui/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/ui/card"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import app from '../../firebase-config'
import { FirebaseError } from 'firebase/app';
import Cookies from 'universal-cookie';


const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const cookies = new Cookies();


export function SignupForm() {
  const handleButtonClick = async () => {
    try {
      // Check if there's already a user signed in and sign them out first
      // We don't need to sign out valid users who are already signed in
      if (auth.currentUser && !auth.currentUser.email?.endsWith("@cse.ssn.edu.in")) {
        await signOut(auth);
        console.log("Signed out non-SSN user");
        // Small delay to ensure Firebase processes the sign out
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Clear any stored authentication data
        cookies.remove('firebase:authUser:');
      }
      
      // Clear any cached authentication state and reset provider
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user.email && user.email.endsWith("@cse.ssn.edu.in")) {
        console.log("Signed in as:", user.email);
        cookies.set('user', user.email);
        console.log("Cookies set:", cookies.get('user'));
        // Proceed with your app logic
      } else {
        console.log("User email does not end with @cse.ssn.edu.in");
        alert("Please use your SSN email to sign in.");
        await signOut(auth);
        console.log("Signed out user with email:", auth.currentUser?.email || "No user found");
    
        // Add a small delay to ensure Firebase has fully processed the sign out
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear any cached tokens or authentication state
        if (typeof window !== 'undefined') {
          // Clear any stored authentication data
          localStorage.removeItem('firebase:authUser:');
          sessionStorage.clear();
        }
      }
    } catch (error) {
      // Check if the error is specifically for popup closed by user or cancelled popup request
      if (error instanceof FirebaseError && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request")) {
        console.log("Sign-in popup was closed by the user or cancelled.");
        return; // This return statement exits the function before reaching the alert
      } else if (error instanceof FirebaseError && error.code === "auth/popup-blocked") {
        console.log("Popup was blocked by the browser. Please allow popups for this site.");
        alert("Popup was blocked! Please allow popups for this site and try again.");
        return;
      } else if (error instanceof FirebaseError && error.code === "auth/network-request-failed") {
        console.log("Network error occurred during sign-in.");
        alert("Network error. Please check your internet connection and try again.");
        return;
      } else if (error instanceof FirebaseError) {
        console.error("Google sign-in error:", error);
        alert("Sign-in failed. Please try again.");
        return;
      }
      console.error("Google sign-in error:", error);
      alert("Sign-in failed. Please try again.");
    }
  };

  return (
    <div>
      <Card className="sm:w-[50vw] w-[90vw] max-w-sm card-bg sm:p-15 pl-10 pr-10 border-none shadow-indigo-500 shadow-lg relative overflow-hidden">
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className='text-card-text sm:text-xl'>Sign Up</CardTitle>
          <CardDescription className='mt-2 sm:text-md'>
            Get started with your SSN email to get started
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <Button
            variant="outline"
            className="relative lg:w-[20vw] md:w-[39vw] sm:p-5 p-2 w-full bg-stone-300 text-stone-900"
            onClick={handleButtonClick}
          >
            Sign Up with SSN Google Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
export default cookies
