import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase-config';
import { useRouter } from 'next/router';
import { toast } from "sonner";

export interface UserData {
  email: string;
  department?: string;
  year?: string;
  section?: string;
  semester?: string;
  CanUploadEdit?: boolean;
  hasVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

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
      const usersCollection = collection(db, "users");
      const userQuery = query(usersCollection, where("email", "==", email));
      const querySnapshot = await getDocs(userQuery);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return {
          email,
          department: data.department,
          year: data.year,
          section: data.section,
          semester: data.semester,
          CanUploadEdit: data.CanUploadEdit,
          hasVerified: data.hasVerified,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
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
      await auth.signOut();
      setUser(null);
      setUserData(null);
      router.push('/signup');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // User is not authenticated
        setUser(null);
        setUserData(null);
        if (initializing) {
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
      
      if (!firebaseUser.email) {
        // No email provided
        toast.error("No email provided with this account");
        await logout();
        return;
      }

      if (!firebaseUser.email.endsWith("@cse.ssn.edu.in")) {
        // Not an SSN email
        toast.error("Please use your SSN email to sign in", {
          description: "Only @cse.ssn.edu.in email addresses are allowed"
        });
        await logout();
        return;
      }

      // Only fetch data for SSN emails
      const data = await fetchUserData(firebaseUser.email);
      setUserData(data);
      
      // Handle routing on initial load
      if (initializing) {
        const currentPath = router.pathname;
        
        // Don't redirect if user is already on a protected page
        if (currentPath === '/dashboard' || currentPath === '/about') {
          setLoading(false);
          setInitializing(false);
          return;
        }
        
        if (!data && currentPath !== '/onboarding') {
          // User exists in Firebase Auth but not in Firestore
          router.push('/onboarding');
        } else if (data && (currentPath === '/' || currentPath === '/signup')) {
          // User exists in both and is on home/signup
          router.push('/dashboard');
        }
      }
      
      setLoading(false);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [router, initializing]);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 