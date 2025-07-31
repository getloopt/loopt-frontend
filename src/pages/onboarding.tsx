"use client"
import Onboarding from "@/components/Onboarding";
import { auth } from '../../firebase-config'
import { db } from '../../firebase-config'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useRef } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter } from "next/router";
import { toast } from "sonner";

export default function OnboardingPage() {
    const isOnline = useNetworkStatus();
    const { user } = useAuth();
    const router = useRouter();
    const signInAttempted = useRef(false);

    useEffect(() => {
        const completeSignIn = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href);
                        // window.localStorage.removeItem('emailForSignIn');
                        router.replace('/onboarding', undefined, { shallow: true });
                    } catch (error) {
                        toast.error("Failed to sign in.", { description: "The link may be invalid or expired." });
                        router.push('/signup');
                    }
                } else {
                    toast.error("Could not complete sign-in.", { description: "Email not found." });
                    router.push('/signup');
                }
            }
        };

        const checkUser = async () => {
            if (user && isOnline) {
                const usersCollection = collection(db, "users");
                const userQuery = query(usersCollection, where("email", "==", user.email));
                const querySnapshot = await getDocs(userQuery);
                if (!querySnapshot.empty) {
                    router.push('/dashboard');
                }
            }
        };

        if (!user && !signInAttempted.current) {
            signInAttempted.current = true;
            completeSignIn();
        } else {
            checkUser();
        }
    }, [user, isOnline, router]);


    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p>Signing you in...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Onboarding />
        </div>
    );
} 