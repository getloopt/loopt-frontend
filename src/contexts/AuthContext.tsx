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
        const userData = {
          email,
          department: data.department,
          year: data.year,
          section: data.section,
          semester: data.semester,
          CanUploadEdit: data.CanUploadEdit,
          hasVerified: data.hasVerified,
        };
        
        return userData;
      } else {
        return null;
      }
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
        const data = await fetchUserData(firebaseUser.email!);
        
        if (data) {
          setUserData(data);
          
          // Check if user has verified their email
          // TODO: Add proper email verification logic
          // if (!data.hasVerified) {
          //   toast.error("Please verify your email address first!");
          //   await auth.signOut();
          //   setUser(null);
          //   setUserData(null);
          //   router.push('/signup');
          //   return;
          // }
          
          // Redirect based on user verification status
          if (initializing && mounted) {
            const currentPath = router.pathname;
            if (currentPath === '/signup' || currentPath === '/') {
              router.push('/dashboard');
            }
          }
        } else {
          // User not found in database
          setUser(null);
          setUserData(null);
          if (initializing && mounted) {
            router.push('/signup');
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
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 