"use client"
import Onboarding from "@/components/Onboarding";
import { auth } from '../../firebase-config'
import { db } from '../../firebase-config'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default function OnboardingPage() {
    const checkUserInDatabase = async () => {
        const usersCollection = collection(db, "users");
        const userQuery = query(usersCollection, where("email", "==", auth.currentUser?.email));
        const querySnapshot = await getDocs(userQuery);
        console.log("querySnapshot",querySnapshot)
    }

    console.log("onboarding page",auth.currentUser)
    if(auth.currentUser){
        checkUserInDatabase()
   
    }
    else{
        console.log("no user found")
    }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Onboarding />
    </div>
  );
} 