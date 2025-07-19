import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase-config';
import { useRouter } from 'next/router';
import { toast } from "sonner";
import { useNetworkStatus } from '../hooks/use-network-status';

export interface UserData {
  email: string;
  department?: string;
  year?: string;
  section?: string;
  semester?: string;
  CanUploadEdit?: boolean;
  hasVerified?: boolean;
  uid?: string;
  customNotificationPrompt?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}
//i want only the firebase userdata function to be there for now


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const isOnline = useNetworkStatus();

  const fetchUserData = async (email: string): Promise<UserData | null> => {
    // Don't fetch data for non-SSN emails
    if (!email.endsWith("@cse.ssn.edu.in")) {
      // Sign out non-SSN users
      try {
        await auth.signOut();
      } catch (error) {
        console.log("Error signing out non-SSN user:", error);
      }
      return null;
    }

    try {
      // First try to get data from Firestore when online
      if (isOnline) {
        console.log('🔍 Attempting Firestore query for email:', email);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const firestoreData = userDoc.data() as UserData;
          console.log('✅ Found user data in Firestore:', firestoreData);
          
          // Also cache in localStorage for offline use
          if (auth.currentUser?.uid) {
            localStorage.setItem('userData', JSON.stringify(firestoreData));
            console.log('✅ Cached Firestore data to localStorage');
            

            
          }
          
          return firestoreData;
        } else {
          console.log('❌ No user data found in Firestore');
        }
      }

      // If offline or Firestore query failed, try getting from localStorage
      if (auth.currentUser?.uid) {
        console.log('🔍 Attempting localStorage retrieval with key:', auth.currentUser.uid);
        const cachedUserData = localStorage.getItem('userData');
        if (cachedUserData) {
          const parsedData = JSON.parse(cachedUserData) as UserData;
          console.log('✅ Found user data in localStorage:', parsedData);
          return parsedData;
        } else {
          console.log('❌ No user data found in localStorage');
        }
      } else {
        console.log('❌ No currentUser.uid available for localStorage lookup');
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      
      // Try localStorage as fallback if main try block fails
      if (auth.currentUser?.uid && !isOnline) {
        const cachedUserData = localStorage.getItem('userData');
        if (cachedUserData) {
          return JSON.parse(cachedUserData) as UserData;
        }
      }
      
      return null;
    }
  };

  const refreshUserData = async () => {
    if (user?.email) {
      const data = await fetchUserData(user.email);
      setUserData(data);
    }
  };

  

  const logout = async () => {
    try {
      if (isOnline) {
        await auth.signOut();
      } else {
        
        
        // If offline, show notification but still clear local data
        toast.info('📱 Logged out locally - will sync when online', {
          description: 'Your logout will be synced when you reconnect',
          duration: 3000,
        });
      }
      
      setUser(null);
      setUserData(null);
      
      // Clear local storage
      if (typeof window !== 'undefined' && auth.currentUser?.uid) {
        localStorage.removeItem('userData');
        sessionStorage.removeItem('offline_auth_notified');
      }
      
      router.push('/signup');
    } catch (error) {
      console.error("Error signing out:", error);
      
      // Force local logout even if Firebase fails
      setUser(null);
      setUserData(null);
      if (typeof window !== 'undefined' && auth.currentUser?.uid) {
          localStorage.removeItem('userData');
        sessionStorage.removeItem('offline_auth_notified');
      }
      router.push('/signup');
    }
  };

  // Add route change effect to refresh data when coming from onboarding
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // If user is navigating to dashboard and we have a user but no userData, refresh
      if (url === '/dashboard' && user && !userData) {
        console.log('🔄 Route change to dashboard detected - refreshing user data');
        refreshUserData();
      }
    };

         router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [user, userData, router.events, refreshUserData]);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (!firebaseUser) {
        // User is not authenticated
        setUser(null);
        setUserData(null);
        
        if (initializing && mounted) {
          const currentPath = router.pathname;
          if (currentPath !== '/signup' && currentPath !== '/') {
            router.push('/signup');
          }
        }
        setLoading(false);
        setInitializing(false);
        return;
      }

      // User is authenticated
      setUser(firebaseUser);
      
      try {
        console.log('🔍 Fetching user data for:', firebaseUser.email);
        const data = await fetchUserData(firebaseUser.email!);
        
        if (data) {
          console.log('✅ User data fetched successfully:', data);
          setUserData(data);
          
          // Redirect based on user verification status
          if (initializing && mounted) {
            const currentPath = router.pathname;
            if (currentPath === '/signup' || currentPath === '/') {
              router.push('/dashboard');
            }
          }
        } else {
          console.log('❌ No user data found - checking if user needs onboarding');
          
          // If we're not on onboarding page, redirect there
          if (initializing && mounted) {
            const currentPath = router.pathname;
            if (currentPath !== '/onboarding') {
              console.log('🔄 Redirecting to onboarding');
              router.push('/onboarding');
            }
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setUser(null);
        setUserData(null);
        if (initializing && mounted) {
          router.push('/signup');
        }
      }
      
      setLoading(false);
      setInitializing(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router, initializing]);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    isOffline: !isOnline,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
