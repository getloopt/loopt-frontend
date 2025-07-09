"use client"
import Onboarding from "@/components/Onboarding";
import { auth } from '../../firebase-config'
import { db } from '../../firebase-config'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useAuth } from '@/contexts/AuthContext'

export default function OnboardingPage() {
    const isOnline = useNetworkStatus();
    const { user } = useAuth();
    const checkUserInDatabase = async () => {
        // Only check database if online
        if (!isOnline) {
            console.log("Offline - skipping database check")
            localStorage.getItem(user?.uid!)
            return;
        }
        
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